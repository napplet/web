/** NAP-TORRENT request correlation and runtime job notifications. @module */
import { postToShell } from '../boundary.js';
import type { NostrEvent, Subscription } from '@napplet/core';
import type {
  TorrentCapabilities,
  TorrentDescriptor,
  TorrentDescriptorResult,
  TorrentMagnetResult,
  TorrentSearchQuery,
  TorrentSearchResult,
  TorrentPublishRequest,
  TorrentCommentRequest,
  TorrentPublishResult,
  TorrentPickOptions,
  TorrentFileSetResult,
  TorrentAddRequest,
  TorrentJobAck,
  TorrentJobStatus,
  TorrentJobState,
  TorrentJobSummary,
  TorrentJobFilter,
  TorrentFileStatus,
  TorrentFileSelection,
  TorrentRemoveOptions,
  TorrentRemoveResult,
  TorrentStateEvent,
  TorrentProgressEvent,
  TorrentErrorEvent,
  TorrentOutboundMessage,
} from './types.js';

const REQUEST_TIMEOUT_MS = 30_000;
interface PendingRequest {
  type: string;
  resolve: (message: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
const pending = new Map<string, PendingRequest>();
const stateHandlers = new Set<(event: TorrentStateEvent) => void>();
const progressHandlers = new Set<(event: TorrentProgressEvent) => void>();
const errorHandlers = new Set<(event: TorrentErrorEvent) => void>();
let installed = false;

function sendRequest(type: TorrentOutboundMessage['type'], payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`${type} timed out`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { type: `${type}.result`, resolve, reject, timeout });
    try {
      postToShell({ type, id, ...payload });
    } catch (error) {
      pending.delete(id);
      clearTimeout(timeout);
      reject(error);
    }
  });
}

function expectField<T>(message: Record<string, unknown>, field: string, operation: string): T {
  if (message[field] === undefined) throw new Error(`${operation} returned no ${field}`);
  return message[field] as T;
}

function handleResult(message: Record<string, unknown>): void {
  if (typeof message.id !== 'string') return;
  const entry = pending.get(message.id);
  if (!entry || entry.type !== message.type) return;
  pending.delete(message.id);
  clearTimeout(entry.timeout);
  if (typeof message.error === 'string') entry.reject(new Error(message.error));
  else entry.resolve(message);
}

const JOB_STATES: readonly string[] = ['queued', 'metadata', 'downloading', 'seeding', 'paused', 'complete', 'cancelled', 'error'];
function isJobState(value: unknown): value is TorrentJobState {
  return typeof value === 'string' && JOB_STATES.includes(value);
}

function notifyListeners<T>(handlers: Set<(event: T) => void>, event: T): void {
  for (const handler of [...handlers]) {
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
  if (typeof message.jobId !== 'string') return;
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
export async function capabilities(): Promise<TorrentCapabilities> {
  const message = await sendRequest('torrent.capabilities', {});
  return expectField<TorrentCapabilities>(message, 'capabilities', 'torrent.capabilities');
}

/** Ask the runtime to perform torrent.fromEvent.
 * @param event Operation event supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await fromEvent(event);
 */
export async function fromEvent(event: NostrEvent): Promise<TorrentDescriptorResult> {
  const message = await sendRequest('torrent.fromEvent', { event });
  return expectField<TorrentDescriptorResult>(message, 'result', 'torrent.fromEvent');
}

/** Ask the runtime to perform torrent.toMagnet.
 * @param descriptor Operation descriptor supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await toMagnet(descriptor);
 */
export async function toMagnet(descriptor: TorrentDescriptor): Promise<TorrentMagnetResult> {
  const message = await sendRequest('torrent.toMagnet', { descriptor });
  return expectField<TorrentMagnetResult>(message, 'result', 'torrent.toMagnet');
}

/** Ask the runtime to perform torrent.search.
 * @param query Operation query supplied to the runtime.
 * @returns Runtime results; typed refusals remain resolved values.
 * @example await search(query);
 */
export async function search(query: TorrentSearchQuery): Promise<TorrentSearchResult[]> {
  const message = await sendRequest('torrent.search', { query });
  return expectField<TorrentSearchResult[]>(message, 'results', 'torrent.search');
}

/** Ask the runtime to perform torrent.publish.
 * @param request Operation request supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await publish(request);
 */
export async function publish(request: TorrentPublishRequest): Promise<TorrentPublishResult> {
  const message = await sendRequest('torrent.publish', { request });
  return expectField<TorrentPublishResult>(message, 'result', 'torrent.publish');
}

/** Ask the runtime to perform torrent.comment.
 * @param request Operation request supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await comment(request);
 */
export async function comment(request: TorrentCommentRequest): Promise<TorrentPublishResult> {
  const message = await sendRequest('torrent.comment', { request });
  return expectField<TorrentPublishResult>(message, 'result', 'torrent.comment');
}

/** Ask the runtime to perform torrent.pickFiles.
 * @param options Operation options supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await pickFiles(options);
 */
export async function pickFiles(options?: TorrentPickOptions): Promise<TorrentFileSetResult> {
  const message = await sendRequest('torrent.pickFiles', options === undefined ? {} : { options });
  return expectField<TorrentFileSetResult>(message, 'result', 'torrent.pickFiles');
}

/** Ask the runtime to perform torrent.add.
 * @param request Operation request supplied to the runtime.
 * @returns Runtime ack; typed refusals remain resolved values.
 * @example await add(request);
 */
export async function add(request: TorrentAddRequest): Promise<TorrentJobAck> {
  const message = await sendRequest('torrent.add', { request });
  return expectField<TorrentJobAck>(message, 'ack', 'torrent.add');
}

/** Ask the runtime to perform torrent.status.
 * @param jobId Operation jobId supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await status(jobId);
 */
export async function status(jobId: string): Promise<TorrentJobStatus> {
  const message = await sendRequest('torrent.status', { jobId });
  return expectField<TorrentJobStatus>(message, 'status', 'torrent.status');
}

/** Ask the runtime to perform torrent.jobs.
 * @param filter Operation filter supplied to the runtime.
 * @returns Runtime jobs; typed refusals remain resolved values.
 * @example await jobs(filter);
 */
export async function jobs(filter?: TorrentJobFilter): Promise<TorrentJobSummary[]> {
  const message = await sendRequest('torrent.jobs', filter === undefined ? {} : { filter });
  return expectField<TorrentJobSummary[]>(message, 'jobs', 'torrent.jobs');
}

/** Ask the runtime to perform torrent.files.
 * @param jobId Operation jobId supplied to the runtime.
 * @returns Runtime files; typed refusals remain resolved values.
 * @example await files(jobId);
 */
export async function files(jobId: string): Promise<TorrentFileStatus[]> {
  const message = await sendRequest('torrent.files', { jobId });
  return expectField<TorrentFileStatus[]>(message, 'files', 'torrent.files');
}

/** Ask the runtime to perform torrent.selectFiles.
 * @param jobId Operation jobId supplied to the runtime.
 * @param selection Operation selection supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await selectFiles(jobId, selection);
 */
export async function selectFiles(jobId: string, selection: TorrentFileSelection): Promise<TorrentJobStatus> {
  const message = await sendRequest('torrent.selectFiles', { jobId, selection });
  return expectField<TorrentJobStatus>(message, 'status', 'torrent.selectFiles');
}

/** Ask the runtime to perform torrent.pause.
 * @param jobId Operation jobId supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await pause(jobId);
 */
export async function pause(jobId: string): Promise<TorrentJobStatus> {
  const message = await sendRequest('torrent.pause', { jobId });
  return expectField<TorrentJobStatus>(message, 'status', 'torrent.pause');
}

/** Ask the runtime to perform torrent.resume.
 * @param jobId Operation jobId supplied to the runtime.
 * @returns Runtime status; typed refusals remain resolved values.
 * @example await resume(jobId);
 */
export async function resume(jobId: string): Promise<TorrentJobStatus> {
  const message = await sendRequest('torrent.resume', { jobId });
  return expectField<TorrentJobStatus>(message, 'status', 'torrent.resume');
}

/** Ask the runtime to perform torrent.remove.
 * @param jobId Operation jobId supplied to the runtime.
 * @param options Operation options supplied to the runtime.
 * @returns Runtime result; typed refusals remain resolved values.
 * @example await remove(jobId, options);
 */
export async function remove(jobId: string, options?: TorrentRemoveOptions): Promise<TorrentRemoveResult> {
  const message = await sendRequest('torrent.remove', { jobId, ...(options === undefined ? {} : { options }) });
  return expectField<TorrentRemoveResult>(message, 'result', 'torrent.remove');
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
