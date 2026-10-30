/** NAP-BLOSSOM request correlation. HTTP and authorization remain runtime-owned. */
import { postToShell } from '../boundary.js';
import type {
  BlossomBlobCheckRequest,
  BlossomGetRequest,
  BlossomCheckRequest,
  BlossomUploadRequest,
  BlossomMirrorRequest,
  BlossomMediaRequest,
  BlossomListRequest,
  BlossomDeleteRequest,
  BlossomAddServerRequest,
  BlossomBlobCheckResult,
  BlossomBytesResult,
  BlossomCheckResult,
  BlossomDescriptorResult,
  BlossomListResult,
  BlossomDeleteResult,
  BlossomServerListResult,
  BlossomOutboundMessage,
} from './types.js';
export { parseUri, formatUri } from './uri.js';

const REQUEST_TIMEOUT_MS = 30_000;
const pending = new Map<string, {
  type: string;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();
let installed = false;

function sendRequest<T>(type: BlossomOutboundMessage['type'], payload: Record<string, unknown> = {}): Promise<T> {
  const id = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`${type} timed out`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { type: `${type}.result`, resolve: (result) => resolve(result as T), reject, timeout });
    try { postToShell({ type, id, ...payload }); }
    catch (error) {
      pending.delete(id);
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Correlate a result from the runtime's parent-source-checked router.
 * @param message Incoming envelope.
 * @returns Nothing; unrelated IDs and result types are ignored.
 * @example handleBlossomMessage({ type: 'blossom.servers.result', id, result });
 */
export function handleBlossomMessage(message: { type: string; [key: string]: unknown }): void {
  if (typeof message.id !== 'string') return;
  const entry = pending.get(message.id);
  if (!entry || message.type !== entry.type) return;
  pending.delete(message.id);
  clearTimeout(entry.timeout);
  if (typeof message.error === 'string') entry.reject(new Error(message.error));
  else if (message.result === undefined || message.result === null) entry.reject(new Error(`${message.type} returned no result`));
  else entry.resolve(message.result);
}

/**
 * Install correlation state without issuing a request.
 * @returns Idempotent cleanup that rejects outstanding requests.
 * @example const cleanup = installBlossomShim();
 */
export function installBlossomShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    installed = false;
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error('blossom shim disposed'));
    }
    pending.clear();
  };
}

/**
 * Check blob presence without fetching bytes.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await check(request);
 */
export function check(request: BlossomBlobCheckRequest): Promise<BlossomBlobCheckResult> { return sendRequest('blossom.check', { request }); }

/**
 * Retrieve blob bytes through the runtime.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await get(request);
 */
export function get(request: BlossomGetRequest): Promise<BlossomBytesResult> { return sendRequest('blossom.get', { request }); }

/**
 * Check advisory upload requirements.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await checkUpload(request);
 */
export function checkUpload(request: BlossomCheckRequest): Promise<BlossomCheckResult> { return sendRequest('blossom.checkUpload', { request }); }

/**
 * Upload exact bytes to the selected server.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await upload(request);
 */
export function upload(request: BlossomUploadRequest): Promise<BlossomDescriptorResult> { return sendRequest('blossom.upload', { request }); }

/**
 * Ask the selected server to mirror a blob.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await mirror(request);
 */
export function mirror(request: BlossomMirrorRequest): Promise<BlossomDescriptorResult> { return sendRequest('blossom.mirror', { request }); }

/**
 * Check advisory media requirements.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await checkMedia(request);
 */
export function checkMedia(request: BlossomCheckRequest): Promise<BlossomCheckResult> { return sendRequest('blossom.checkMedia', { request }); }

/**
 * Upload media that the server may transform.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await media(request);
 */
export function media(request: BlossomMediaRequest): Promise<BlossomDescriptorResult> { return sendRequest('blossom.media', { request }); }

/**
 * List blobs using the optional server endpoint.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await list(request);
 */
export function list(request: BlossomListRequest): Promise<BlossomListResult> { return sendRequest('blossom.list', { request }); }

/**
 * Delete exactly one blob from the selected server.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await deleteBlob(request);
 */
export function deleteBlob(request: BlossomDeleteRequest): Promise<BlossomDeleteResult> { return sendRequest('blossom.delete', { request }); }

/**
 * Read the shell-user ordered server list.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await servers();
 */
export function servers(): Promise<BlossomServerListResult> { return sendRequest('blossom.servers'); }

/**
 * Add a server to the shell-user list.
 * @param request Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await addServer(request);
 */
export function addServer(request: BlossomAddServerRequest): Promise<BlossomServerListResult> { return sendRequest('blossom.addServer', { request }); }

/**
 * Remove a server from the shell-user list.
 * @param server Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await removeServer(server);
 */
export function removeServer(server: string): Promise<BlossomServerListResult> { return sendRequest('blossom.removeServer', { server }); }

/**
 * Reorder the existing shell-user server set.
 * @param servers Operation input.
 * @returns Runtime outcome, including typed failures.
 * @example const result = await reorderServers(servers);
 */
export function reorderServers(servers: string[]): Promise<BlossomServerListResult> { return sendRequest('blossom.reorderServers', { servers }); }

/** Ergonomic name matching the runtime operation. */
export { deleteBlob as delete };
