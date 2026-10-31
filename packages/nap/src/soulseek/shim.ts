/** NAP-SOULSEEK request correlation for the runtime-injected `soulseek` domain. @module */
import { postToShell } from '../boundary.js';
import { SOULSEEK_ERROR_CODES } from './types.js';
import type {
  SoulseekByteCount,
  SoulseekChunk,
  SoulseekErrorCode,
  SoulseekFailure,
  SoulseekHandleKind,
  SoulseekInfo,
  SoulseekOutboundMessage,
  SoulseekQuery,
  SoulseekQueryPage,
  SoulseekReleased,
  SoulseekSaved,
  SoulseekSearchRequest,
  SoulseekTransfer,
} from './types.js';

/** Local transport deadline for operations the runtime answers from retained state. */
const REQUEST_TIMEOUT_MS = 30_000;
/** Local transport deadline for operations the shell may gate behind a user prompt. */
const CONSENT_TIMEOUT_MS = 120_000;
const CONSENT_OPERATIONS: ReadonlySet<string> = new Set([
  'soulseek.search', 'soulseek.browse', 'soulseek.download', 'soulseek.read', 'soulseek.save',
]);

interface PendingRequest {
  type: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
const pending = new Map<string, PendingRequest>();
let installed = false;

/**
 * A NAP-SOULSEEK `Failure` surfaced as a rejection. `code` is the specification
 * error code; `message` is the runtime's non-machine-readable diagnostic.
 */
export class SoulseekError extends Error implements SoulseekFailure {
  /** NAP-SOULSEEK error code. */
  readonly code: SoulseekErrorCode;

  /**
   * @param failure The `error` record from a result envelope.
   * @example throw new SoulseekError({ code: 'not_found', message: 'Handle is unavailable' });
   */
  constructor(failure: SoulseekFailure) {
    super(failure.message);
    this.name = 'SoulseekError';
    this.code = failure.code;
  }
}

function isFailure(value: unknown): value is SoulseekFailure {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === 'string' && (SOULSEEK_ERROR_CODES as readonly string[]).includes(record.code)
    && typeof record.message === 'string';
}

function sendRequest<T>(type: SoulseekOutboundMessage['type'], payload: Record<string, unknown>): Promise<T> {
  const id = crypto.randomUUID();
  const timeoutMs = CONSENT_OPERATIONS.has(type) ? CONSENT_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`${type} timed out`));
    }, timeoutMs);
    pending.set(id, { type: `${type}.result`, resolve: resolve as (value: unknown) => void, reject, timeout });
    try {
      postToShell({ type, id, ...payload });
    } catch (error) {
      pending.delete(id);
      clearTimeout(timeout);
      reject(error as Error);
    }
  });
}

/** Route a trusted runtime result envelope to its pending request.
 * @param message Envelope received through the central shell message listener.
 * @example handleSoulseekMessage({ type: 'soulseek.info.result', id: 'q1', value: info });
 */
export function handleSoulseekMessage(message: { type: string; [key: string]: unknown }): void {
  if (typeof message.id !== 'string') return;
  const entry = pending.get(message.id);
  if (!entry || entry.type !== message.type) return;
  pending.delete(message.id);
  clearTimeout(entry.timeout);
  const hasValue = message.value !== undefined && message.value !== null;
  const hasError = message.error !== undefined && message.error !== null;
  if (hasValue === hasError) {
    entry.reject(new Error(`${message.type} must carry exactly one of value or error`));
  } else if (hasError) {
    entry.reject(isFailure(message.error)
      ? new SoulseekError(message.error)
      : new Error(`${message.type} returned a malformed error`));
  } else {
    entry.resolve(message.value);
  }
}

/** Ask the runtime to perform soulseek.info.
 * @returns Account state and captured policy limits.
 * @example const { state, maxPageSize } = await info();
 */
export function info(): Promise<SoulseekInfo> {
  return sendRequest<SoulseekInfo>('soulseek.info', {});
}

/** Ask the runtime to perform soulseek.search.
 * @param request Search expression and optional target peer.
 * @returns The admitted query snapshot; acceptance is not completion.
 * @example const query = await search({ text: 'field recording' });
 */
export function search(request: SoulseekSearchRequest): Promise<SoulseekQuery> {
  return sendRequest<SoulseekQuery>('soulseek.search', { request });
}

/** Ask the runtime to perform soulseek.browse.
 * @param username Case-preserving peer name.
 * @returns The admitted query snapshot.
 * @example const query = await browse('field-recorder');
 */
export function browse(username: string): Promise<SoulseekQuery> {
  return sendRequest<SoulseekQuery>('soulseek.browse', { username });
}

/** Ask the runtime to perform soulseek.results.
 * @param queryId Owned query handle.
 * @param after Zero-based offset; the runtime defaults it to 0 when omitted.
 * @param limit Positive page size; the runtime defaults it to the query's `maxPageSize` when omitted.
 * @returns One page and the query snapshot taken with it.
 * @example const page = await results(query.queryId, 0, 25);
 */
export function results(queryId: string, after?: number, limit?: number): Promise<SoulseekQueryPage> {
  const payload: Record<string, unknown> = { queryId };
  if (after !== undefined) payload.after = after;
  if (limit !== undefined) payload.limit = limit;
  return sendRequest<SoulseekQueryPage>('soulseek.results', payload);
}

/** Ask the runtime to perform soulseek.stop.
 * @param queryId Owned query handle.
 * @returns The frozen or unchanged terminal query snapshot.
 * @example await stop(query.queryId);
 */
export function stop(queryId: string): Promise<SoulseekQuery> {
  return sendRequest<SoulseekQuery>('soulseek.stop', { queryId });
}

/** Ask the runtime to perform soulseek.download.
 * @param fileId Live file handle issued to this endpoint.
 * @returns The admitted or existing transfer for that handle.
 * @example const transfer = await download(file.fileId);
 */
export function download(fileId: string): Promise<SoulseekTransfer> {
  return sendRequest<SoulseekTransfer>('soulseek.download', { fileId });
}

/** Ask the runtime to perform soulseek.transfers.
 * @returns All non-released transfers owned by this endpoint, in admission order.
 * @example const owned = await transfers();
 */
export function transfers(): Promise<SoulseekTransfer[]> {
  return sendRequest<SoulseekTransfer[]>('soulseek.transfers', {});
}

/** Ask the runtime to perform soulseek.status.
 * @param transferId Owned transfer handle.
 * @returns One transfer snapshot.
 * @example const snapshot = await status(transfer.transferId);
 */
export function status(transferId: string): Promise<SoulseekTransfer> {
  return sendRequest<SoulseekTransfer>('soulseek.status', { transferId });
}

/** Ask the runtime to perform soulseek.pause.
 * @param transferId Owned transfer handle.
 * @returns The paused snapshot.
 * @example await pause(transfer.transferId);
 */
export function pause(transferId: string): Promise<SoulseekTransfer> {
  return sendRequest<SoulseekTransfer>('soulseek.pause', { transferId });
}

/** Ask the runtime to perform soulseek.resume.
 * @param transferId Owned transfer handle.
 * @returns The re-queued snapshot.
 * @example await resume(transfer.transferId);
 */
export function resume(transferId: string): Promise<SoulseekTransfer> {
  return sendRequest<SoulseekTransfer>('soulseek.resume', { transferId });
}

/** Ask the runtime to perform soulseek.cancel.
 * @param transferId Owned transfer handle.
 * @returns The cancelled or unchanged terminal snapshot.
 * @example await cancel(transfer.transferId);
 */
export function cancel(transferId: string): Promise<SoulseekTransfer> {
  return sendRequest<SoulseekTransfer>('soulseek.cancel', { transferId });
}

/** Ask the runtime to perform soulseek.read.
 * @param transferId Owned, complete transfer handle.
 * @param offset Canonical decimal text offset.
 * @param length Positive byte count, at most the transfer's captured `maxReadBytes`.
 * @returns A base64 chunk; empty with `eof: true` at the end of the file.
 * @example const chunk = await read(transfer.transferId, '0', 65536);
 */
export function read(transferId: string, offset: SoulseekByteCount, length: number): Promise<SoulseekChunk> {
  return sendRequest<SoulseekChunk>('soulseek.read', { transferId, offset, length });
}

/** Ask the runtime to perform soulseek.save.
 * @param transferId Owned, complete transfer handle.
 * @returns `{ saved: true }` once the shell has exported the bytes.
 * @example await save(transfer.transferId);
 */
export function save(transferId: string): Promise<SoulseekSaved> {
  return sendRequest<SoulseekSaved>('soulseek.save', { transferId });
}

/** Ask the runtime to perform soulseek.release.
 * @param kind `"query"` or `"transfer"`.
 * @param handle The owned handle to remove.
 * @returns Whether a live owned handle was removed.
 * @example await release('query', query.queryId);
 */
export function release(kind: SoulseekHandleKind, handle: string): Promise<SoulseekReleased> {
  return sendRequest<SoulseekReleased>('soulseek.release', { kind, handle });
}

/** Install the soulseek transport without issuing requests.
 * @returns Cleanup that rejects outstanding requests.
 * @example const dispose = installSoulseekShim();
 */
export function installSoulseekShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error('soulseek shim disposed'));
    }
    pending.clear();
    installed = false;
  };
}
