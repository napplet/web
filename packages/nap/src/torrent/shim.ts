/** NAP-TORRENT request correlation and runtime job notifications. @module */
import { postToShell } from '../boundary.js';
import type { Subscription } from '@napplet/core';
import type {
  TorrentAddRequest,
  TorrentCancelResult,
  TorrentCapabilities,
  TorrentErrorEvent,
  TorrentFileActionResult,
  TorrentFileSelection,
  TorrentFileSetResult,
  TorrentFileStatus,
  TorrentJobAck,
  TorrentJobFilter,
  TorrentJobState,
  TorrentJobStatus,
  TorrentJobSummary,
  TorrentMetadataResult,
  TorrentMetainfoResult,
  TorrentOutboundMessage,
  TorrentPendingRequest,
  TorrentPickOptions,
  TorrentProgressEvent,
  TorrentReadRequest,
  TorrentReadResult,
  TorrentRemoveOptions,
  TorrentRemoveResult,
  TorrentSettingsResult,
  TorrentStateEvent,
  TorrentUpdateRequest,
} from './types.js';

const REQUEST_TIMEOUT_MS = 30_000;
interface PendingRequest {
  type: string;
  resolve: (message: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  cancelTarget?: string;
}
const pending = new Map<string, PendingRequest>();
const stateHandlers = new Set<(event: TorrentStateEvent) => void>();
const progressHandlers = new Set<(event: TorrentProgressEvent) => void>();
const errorHandlers = new Set<(event: TorrentErrorEvent) => void>();
const CANCELLABLE_RESULTS = new Set(['torrent.read.result', 'torrent.exportMetainfo.result', 'torrent.saveFile.result']);
let installed = false;

function withRequestId<T>(promise: Promise<T>, requestId: string): TorrentPendingRequest<T> {
  return Object.defineProperty(promise, 'requestId', { value: requestId }) as TorrentPendingRequest<T>;
}

function sendRequest(
  type: TorrentOutboundMessage['type'], payload: Record<string, unknown>, timeoutMs: number,
): TorrentPendingRequest<Record<string, unknown>> {
  const id = crypto.randomUUID();
  const promise = new Promise<Record<string, unknown>>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`${type} timed out`));
    }, timeoutMs);
    const entry: PendingRequest = { type: `${type}.result`, resolve, reject, timeout };
    if (type === 'torrent.cancel' && typeof payload.requestId === 'string') entry.cancelTarget = payload.requestId;
    pending.set(id, entry);
    try {
      postToShell({ type, id, ...payload });
    } catch (error) {
      pending.delete(id);
      clearTimeout(timeout);
      reject(error);
    }
  });
  return withRequestId(promise, id);
}

function requestField<T>(
  type: TorrentOutboundMessage['type'], payload: Record<string, unknown>, field: string, timeoutMs = REQUEST_TIMEOUT_MS,
): TorrentPendingRequest<T> {
  const request = sendRequest(type, payload, timeoutMs);
  return withRequestId(request.then((message) => {
    if (message[field] === undefined) throw new Error(`${type} returned no ${field}`);
    return message[field] as T;
  }), request.requestId);
}

function finishRequest(id: string, entry: PendingRequest, message: Record<string, unknown>): void {
  pending.delete(id);
  clearTimeout(entry.timeout);
  if (typeof message.error === 'string') entry.reject(new Error(message.error));
  else entry.resolve(message);
}

function handleResult(message: Record<string, unknown>): void {
  if (typeof message.id !== 'string') return;
  const entry = pending.get(message.id);
  if (!entry || entry.type !== message.type) return;
  const result = message.result as TorrentCancelResult | undefined;
  if (entry.cancelTarget && result?.ok === true && result.cancelled === true) {
    const target = pending.get(entry.cancelTarget);
    if (target && CANCELLABLE_RESULTS.has(target.type)) {
      finishRequest(entry.cancelTarget, target, { result: { ok: false, error: 'cancelled' } });
    }
  }
  finishRequest(message.id, entry, message);
}

const JOB_STATES: readonly string[] = ['queued', 'metadata', 'downloading', 'seeding', 'paused', 'complete', 'cancelled', 'error'];
function isJobState(value: unknown): value is TorrentJobState {
  return typeof value === 'string' && JOB_STATES.includes(value);
}

function notifyListeners<T>(handlers: Set<(event: T) => void>, event: T): void {
  for (const handler of Array.from(handlers)) {
    if (!handlers.has(handler)) continue;
    try { handler(event); }
    catch (error) { queueMicrotask(() => { throw error; }); }
  }
}

/** Route a trusted runtime envelope to requests or job listeners.
 * @param message Envelope received through the central shell message listener.
 * @example handleTorrentMessage({ type: 'torrent.error', jobId: 'job', error: 'no-peers' });
 */
export function handleTorrentMessage(message: { type: string; [key: string]: unknown }): void {
  if (message.type.endsWith('.result')) { handleResult(message); return; }
  if ('id' in message || typeof message.jobId !== 'string') return;
  if (message.type === 'torrent.state' && isJobState(message.state)) {
    const event: TorrentStateEvent = { jobId: message.jobId, state: message.state };
    if (message.status && typeof message.status === 'object') event.status = message.status as TorrentJobStatus;
    notifyListeners(stateHandlers, event);
  } else if (message.type === 'torrent.progress' && message.status && typeof message.status === 'object') {
    const event: TorrentProgressEvent = { jobId: message.jobId, status: message.status as TorrentJobStatus };
    notifyListeners(progressHandlers, event);
  } else if (message.type === 'torrent.error' && typeof message.error === 'string') {
    const event: TorrentErrorEvent = { jobId: message.jobId, error: message.error };
    if (typeof message.reason === 'string') event.reason = message.reason;
    notifyListeners(errorHandlers, event);
  }
}

/** Ask the runtime to perform torrent.capabilities.
 * @returns Runtime capabilities; typed refusals remain resolved values.
 * @example await capabilities();
 */
export function capabilities(): Promise<TorrentCapabilities> {
  return requestField<TorrentCapabilities>('torrent.capabilities', {}, 'capabilities');
}

/** Ask the runtime to perform torrent.pickFiles.
 * @param options Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await pickFiles(options);
 */
export function pickFiles(options?: TorrentPickOptions): Promise<TorrentFileSetResult> {
  return requestField<TorrentFileSetResult>('torrent.pickFiles', options === undefined ? {} : { options }, 'result');
}

/** Ask the runtime to perform torrent.add.
 * @param request Operation argument supplied to the runtime.
 * @returns Runtime ack; typed refusals remain resolved values.
 * @example await add(request);
 */
export function add(request: TorrentAddRequest): Promise<TorrentJobAck> {
  return requestField<TorrentJobAck>('torrent.add', { request }, 'ack');
}

/** Ask the runtime to perform torrent.status.
 * @param jobId Operation argument supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await status(jobId);
 */
export function status(jobId: string): Promise<TorrentJobStatus> {
  return requestField<TorrentJobStatus>('torrent.status', { jobId }, 'status');
}

/** Ask the runtime to perform torrent.jobs.
 * @param filter Operation argument supplied to the runtime.
 * @returns Runtime jobs; typed refusals remain resolved values.
 * @example await jobs(filter);
 */
export function jobs(filter?: TorrentJobFilter): Promise<TorrentJobSummary[]> {
  return requestField<TorrentJobSummary[]>('torrent.jobs', filter === undefined ? {} : { filter }, 'jobs');
}

/** Ask the runtime to perform torrent.files.
 * @param jobId Operation argument supplied to the runtime.
 * @returns Runtime files; typed refusals remain resolved values.
 * @example await files(jobId);
 */
export function files(jobId: string): Promise<TorrentFileStatus[]> {
  return requestField<TorrentFileStatus[]>('torrent.files', { jobId }, 'files');
}

/** Ask the runtime to perform torrent.selectFiles.
 * @param jobId Operation argument supplied to the runtime.
 * @param selection Operation argument supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await selectFiles(jobId, selection);
 */
export function selectFiles(jobId: string, selection: TorrentFileSelection): Promise<TorrentJobStatus> {
  return requestField<TorrentJobStatus>('torrent.selectFiles', { jobId, selection }, 'status');
}

/** Ask the runtime to perform torrent.pause.
 * @param jobId Operation argument supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await pause(jobId);
 */
export function pause(jobId: string): Promise<TorrentJobStatus> {
  return requestField<TorrentJobStatus>('torrent.pause', { jobId }, 'status');
}

/** Ask the runtime to perform torrent.resume.
 * @param jobId Operation argument supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await resume(jobId);
 */
export function resume(jobId: string): Promise<TorrentJobStatus> {
  return requestField<TorrentJobStatus>('torrent.resume', { jobId }, 'status');
}

/** Ask the runtime to perform torrent.remove.
 * @param jobId Operation argument supplied to the runtime.
 * @param options Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await remove(jobId, options);
 */
export function remove(jobId: string, options?: TorrentRemoveOptions): Promise<TorrentRemoveResult> {
  return requestField<TorrentRemoveResult>('torrent.remove', { jobId, ...(options === undefined ? {} : { options }) }, 'result');
}

/** Ask the runtime to perform torrent.metadata.
 * @param jobId Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await metadata(jobId);
 */
export function metadata(jobId: string): Promise<TorrentMetadataResult> {
  return requestField<TorrentMetadataResult>('torrent.metadata', { jobId }, 'result');
}

/** Ask the runtime to perform torrent.read.
 * @param request Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * The returned Promise exposes requestId for cancel().
 * @example await read(request);
 */
export function read(request: TorrentReadRequest): TorrentPendingRequest<TorrentReadResult> {
  const waitMs = Number.isFinite(request.waitMs) ? Math.max(0, Math.min(request.waitMs ?? 0, 30_000)) : 0;
  return requestField<TorrentReadResult>('torrent.read', { request }, 'result', REQUEST_TIMEOUT_MS + waitMs);
}

/** Ask the runtime to perform torrent.exportMetainfo.
 * @param jobId Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * The returned Promise exposes requestId for cancel().
 * @example await exportMetainfo(jobId);
 */
export function exportMetainfo(jobId: string): TorrentPendingRequest<TorrentMetainfoResult> {
  return requestField<TorrentMetainfoResult>('torrent.exportMetainfo', { jobId }, 'result');
}

/** Ask the runtime to perform torrent.saveFile.
 * @param jobId Operation argument supplied to the runtime.
 * @param fileIndex Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * The returned Promise exposes requestId for cancel().
 * @example await saveFile(jobId, fileIndex);
 */
export function saveFile(jobId: string, fileIndex: number): TorrentPendingRequest<TorrentFileActionResult> {
  return requestField<TorrentFileActionResult>('torrent.saveFile', { jobId, fileIndex }, 'result');
}

/** Ask the runtime to perform torrent.openFile.
 * @param jobId Operation argument supplied to the runtime.
 * @param fileIndex Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await openFile(jobId, fileIndex);
 */
export function openFile(jobId: string, fileIndex: number): Promise<TorrentFileActionResult> {
  return requestField<TorrentFileActionResult>('torrent.openFile', { jobId, fileIndex }, 'result');
}

/** Ask the runtime to perform torrent.cancel.
 * @param requestId Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await cancel(requestId);
 */
export function cancel(requestId: string): Promise<TorrentCancelResult> {
  return requestField<TorrentCancelResult>('torrent.cancel', { requestId }, 'result');
}

function validSettings(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  for (const field of ['revision', 'downloadLimitBytesPerSecond', 'uploadLimitBytesPerSecond']) {
    if (!Number.isSafeInteger(settings[field]) || Number(settings[field]) < 0) return false;
  }
  if (typeof settings.seedAfterComplete !== 'boolean' || typeof settings.endpointsRedacted !== 'boolean') return false;
  for (const field of ['trackers', 'webSeeds']) {
    const endpoints = settings[field];
    if (endpoints !== undefined && (!Array.isArray(endpoints) || !endpoints.every((endpoint) => typeof endpoint === 'string'))) return false;
  }
  return true;
}

function expectSettingsResult(value: unknown): TorrentSettingsResult {
  if (value && typeof value === 'object') {
    const result = value as Record<string, unknown>;
    const valid = result.ok === true ? result.error === undefined && validSettings(result.settings)
      : result.ok === false && typeof result.error === 'string'
        && (result.error === 'revision-conflict' ? validSettings(result.settings) : result.settings === undefined);
    if (valid) return result as TorrentSettingsResult;
  }
  throw new Error('torrent.update returned an invalid settings result');
}

/** Ask the runtime to perform torrent.update.
 * @param request Operation argument supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await update(request);
 */
export function update(request: TorrentUpdateRequest): Promise<TorrentSettingsResult> {
  return requestField<unknown>('torrent.update', { request }, 'result').then(expectSettingsResult);
}

/** Listen for torrent job state notifications.
 * @param handler Receives the job-scoped notification.
 * @returns A local listener subscription; close sends no wire message.
 * @example const subscription = onState(event => console.log(event.jobId));
 */
export function onState(handler: (event: TorrentStateEvent) => void): Subscription {
  const listener = (event: TorrentStateEvent) => handler(event);
  stateHandlers.add(listener);
  return { close: () => { stateHandlers.delete(listener); } };
}

/** Listen for torrent job progress notifications.
 * @param handler Receives the job-scoped notification.
 * @returns A local listener subscription; close sends no wire message.
 * @example const subscription = onProgress(event => console.log(event.jobId));
 */
export function onProgress(handler: (event: TorrentProgressEvent) => void): Subscription {
  const listener = (event: TorrentProgressEvent) => handler(event);
  progressHandlers.add(listener);
  return { close: () => { progressHandlers.delete(listener); } };
}

/** Listen for torrent job error notifications.
 * @param handler Receives the job-scoped notification.
 * @returns A local listener subscription; close sends no wire message.
 * @example const subscription = onError(event => console.log(event.jobId));
 */
export function onError(handler: (event: TorrentErrorEvent) => void): Subscription {
  const listener = (event: TorrentErrorEvent) => handler(event);
  errorHandlers.add(listener);
  return { close: () => { errorHandlers.delete(listener); } };
}

/** Install the torrent transport without issuing requests.
 * @returns Cleanup that rejects outstanding requests and removes listeners.
 * @example const dispose = installTorrentShim();
 */
export function installTorrentShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error('torrent shim disposed'));
    }
    pending.clear();
    stateHandlers.clear(); progressHandlers.clear(); errorHandlers.clear();
    installed = false;
  };
}
