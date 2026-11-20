/**
 * Napplet NAP resource shim entrypoint.
 *
 * @module
 */

// @napplet/nap/resource -- Resource NAP shim (byte-fetching primitives)
// Single-flight cache, AbortSignal cancellation, and strict decoding of the
// canonical base64 `ResourceBytes` wire encoding into Blobs.

import { postToShell } from '../boundary.js';
import type {
  ResourceBytesMessage,
  ResourceBytesManyMessage,
  ResourceBytesItem,
  ResourceBytesWireItem,
  ResourceBytesManyResultMessage,
  ResourceBytesManyErrorMessage,
  ResourceBytesResultMessage,
  ResourceBytesErrorMessage,
  ResourceCancelMessage,
  ResourceInfo,
  ResourceInfoMessage,
  ResourceInfoResultMessage,
  ResourceInfoErrorMessage,
} from './types.js';

/** Default timeout for resource fetch requests (30 seconds; aligns with other NAPs). */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Single-flight cache: canonical URL string -> in-flight Promise<Blob>.
 * N concurrent bytes(sameUrl) calls share one entry → 1 work-unit, N resolutions.
 * Entries are deleted when the underlying promise settles (success, error, or abort)
 * so retries are possible.
 */
export const inflight = new Map<string, Promise<Blob>>();

type Pending<T> = {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

/** Pending `resource.bytes` wire requests. */
const pendingBytes = new Map<string, Pending<Blob>>();

/** Pending `resource.info` wire requests. */
const pendingInfo = new Map<string, Pending<ResourceInfo>>();

/** Pending `resource.bytesMany` wire requests, with the number of URLs sent. */
const pendingMany = new Map<string, Pending<ResourceBytesItem[]> & { count: number }>();

/** Guard against double-install. */
let installed = false;

// ─── ResourceBytes decoding ─────────────────────────────────────────────────

/** RFC 4648 §4 standard alphabet with required `=` padding, no whitespace. */
const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Decode NAP-RESOURCE `ResourceBytes` (canonical padded base64) into a Blob
 * whose media type is the runtime-classified `mime`.
 *
 * Rejects anything that is not canonical text: host byte objects (Blob,
 * ArrayBuffer, integer arrays), whitespace, missing padding, the URL-safe
 * alphabet, data-URL prefixes, and non-zero pad bits.
 *
 * @param value  Wire `blob` field value.
 * @param mime   Runtime-classified MIME type for the resulting Blob.
 * @returns The decoded Blob.
 * @throws Error when `value` is not canonical `ResourceBytes` or `mime` is not text.
 *
 * @example
 * ```ts
 * const blob = decodeResourceBytes('AAEC/w==', 'application/octet-stream');
 * // blob.size === 4, bytes 00 01 02 ff
 * ```
 */
export function decodeResourceBytes(value: unknown, mime: unknown): Blob {
  if (typeof value !== 'string') {
    throw new Error('invalid ResourceBytes: wire blob must be base64 text');
  }
  if (typeof mime !== 'string') {
    throw new Error('invalid ResourceBytes: mime must be text');
  }
  if (!CANONICAL_BASE64.test(value)) {
    throw new Error('invalid ResourceBytes: not canonical padded base64');
  }
  const binary = atob(value);
  // Re-encoding catches non-zero pad bits, which the alphabet check allows.
  if (btoa(binary) !== value) {
    throw new Error('invalid ResourceBytes: non-zero pad bits');
  }
  const octets = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    octets[i] = binary.charCodeAt(i);
  }
  return new Blob([octets.buffer], { type: mime });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Decode one wire `resource.bytesMany.result` item, or throw on a malformed item. */
function decodeManyItem(item: unknown): ResourceBytesItem {
  if (!isRecord(item) || typeof item.url !== 'string' || typeof item.ok !== 'boolean') {
    throw new Error('invalid resource.bytesMany.result item: url and ok are required');
  }
  const wire = item as unknown as ResourceBytesWireItem;
  if (wire.ok) {
    const decoded: ResourceBytesItem = {
      url: wire.url,
      ok: true,
      blob: decodeResourceBytes(wire.blob, wire.mime),
      mime: wire.mime,
    };
    if (typeof wire.message === 'string') decoded.message = wire.message;
    return decoded;
  }
  if ('blob' in item) {
    throw new Error('invalid resource.bytesMany.result item: failed items carry no blob');
  }
  if (typeof wire.error !== 'string') {
    throw new Error('invalid resource.bytesMany.result item: failed items require error');
  }
  return wire;
}

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

/**
 * Handle resource.* result messages from the shell via the central message listener.
 * Called by @napplet/shim's central dispatch loop (Phase 128 wires this in).
 */
export function handleResourceMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<ResourceInfoResultMessage>(msg, 'resource.info.result')) {
    const result = msg;
    const p = pendingInfo.get(result.id);
    if (!p) return;
    pendingInfo.delete(result.id);
    clearTimeout(p.timeout);
    p.resolve(result.info);
  } else if (isMessageType<ResourceInfoErrorMessage>(msg, 'resource.info.error')) {
    const err = msg;
    const p = pendingInfo.get(err.id);
    if (!p) return;
    pendingInfo.delete(err.id);
    clearTimeout(p.timeout);
    p.reject(new Error(err.message ? `${err.error}: ${err.message}` : err.error));
  } else if (isMessageType<ResourceBytesResultMessage>(msg, 'resource.bytes.result')) {
    const result = msg;
    const p = pendingBytes.get(result.id);
    if (!p) return;
    pendingBytes.delete(result.id);
    clearTimeout(p.timeout);
    let blob: Blob;
    try {
      blob = decodeResourceBytes(result.blob, result.mime);
    } catch (error) {
      p.reject(error as Error);
      return;
    }
    p.resolve(blob);
  } else if (isMessageType<ResourceBytesErrorMessage>(msg, 'resource.bytes.error')) {
    const err = msg;
    const p = pendingBytes.get(err.id);
    if (!p) return;
    pendingBytes.delete(err.id);
    clearTimeout(p.timeout);
    p.reject(new Error(err.message ? `${err.error}: ${err.message}` : err.error));
  } else if (isMessageType<ResourceBytesManyResultMessage>(msg, 'resource.bytesMany.result')) {
    const result = msg;
    const p = pendingMany.get(result.id);
    if (!p) return;
    pendingMany.delete(result.id);
    clearTimeout(p.timeout);
    let items: ResourceBytesItem[];
    try {
      if (!Array.isArray(result.items) || result.items.length !== p.count) {
        throw new Error('invalid resource.bytesMany.result: items must match the request order and length');
      }
      items = result.items.map(decodeManyItem);
    } catch (error) {
      p.reject(error as Error);
      return;
    }
    p.resolve(items);
  } else if (isMessageType<ResourceBytesManyErrorMessage>(msg, 'resource.bytesMany.error')) {
    const err = msg;
    const p = pendingMany.get(err.id);
    if (!p) return;
    pendingMany.delete(err.id);
    clearTimeout(p.timeout);
    p.reject(new Error(err.message ? `${err.error}: ${err.message}` : err.error));
  }
}

/** Send a resource.info request envelope and return advisory runtime info. */
export function sendInfoRequest(id: string): Promise<ResourceInfo> {
  return new Promise<ResourceInfo>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingInfo.delete(id)) {
        reject(new Error('resource.info timed out'));
      }
    }, REQUEST_TIMEOUT_MS);
    pendingInfo.set(id, { resolve, reject, timeout });

    const msg: ResourceInfoMessage = {
      type: 'resource.info',
      id,
    };
    postToShell(msg);
  });
}

/**
 * Send a resource.bytes request envelope to the parent and return a Promise<Blob>.
 * Wires into pending Map + installs a timeout. Cancellation is handled by the caller
 * (bytes()) via signal listener -- this helper does not own the AbortSignal.
 */
export function sendBytesRequest(url: string, id: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingBytes.delete(id)) {
        reject(new Error(`resource.bytes timed out for ${url}`));
      }
    }, REQUEST_TIMEOUT_MS);
    pendingBytes.set(id, { resolve, reject, timeout });

    const msg: ResourceBytesMessage = {
      type: 'resource.bytes',
      id,
      url,
    };
    postToShell(msg);
  });
}

/**
 * Send a resource.bytesMany request envelope and return ordered per-URL items.
 */
export function sendBytesManyRequest(urls: string[], id: string): Promise<ResourceBytesItem[]> {
  return new Promise<ResourceBytesItem[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingMany.delete(id)) {
        reject(new Error(`resource.bytesMany timed out for ${urls.length} URLs`));
      }
    }, REQUEST_TIMEOUT_MS);
    pendingMany.set(id, { resolve, reject, timeout, count: urls.length });

    const msg: ResourceBytesManyMessage = {
      type: 'resource.bytesMany',
      id,
      urls,
    };
    postToShell(msg);
  });
}

/**
 * Send a resource.cancel envelope (fire-and-forget) for an in-flight request.
 */
function sendCancel(id: string): void {
  const msg: ResourceCancelMessage = {
    type: 'resource.cancel',
    id,
  };
  postToShell(msg);
}

/**
 * Wire an AbortSignal to a Promise<Blob>. If the signal is already aborted,
 * reject immediately. If it fires later, send a `resource.cancel` envelope
 * (when cancelId is provided) and reject with AbortError.
 */
export function wireSignal(
  work: Promise<Blob>,
  signal?: AbortSignal,
  cancelId: string | null = null,
  cancelPending?: (reason: Error) => void,
): Promise<Blob> {
  if (!signal) return work;
  if (signal.aborted) {
    const error = new DOMException('Aborted', 'AbortError');
    if (cancelId) sendCancel(cancelId);
    cancelPending?.(error);
    return Promise.reject(error);
  }
  return new Promise<Blob>((resolve, reject) => {
    const onAbort = () => {
      const error = new DOMException('Aborted', 'AbortError');
      if (cancelId) sendCancel(cancelId);
      cancelPending?.(error);
      reject(error);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      (b) => {
        signal.removeEventListener('abort', onAbort);
        resolve(b);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
}

export function cancelBytes(id: string, reason: Error): void {
  const p = pendingBytes.get(id);
  if (!p) return;
  pendingBytes.delete(id);
  clearTimeout(p.timeout);
  p.reject(reason);
}

function cancelMany(id: string, reason: Error): void {
  const p = pendingMany.get(id);
  if (!p) return;
  pendingMany.delete(id);
  clearTimeout(p.timeout);
  p.reject(reason);
}

export function wireManySignal(
  work: Promise<ResourceBytesItem[]>,
  signal?: AbortSignal,
  cancelId: string | null = null,
): Promise<ResourceBytesItem[]> {
  if (!signal) return work;
  if (signal.aborted) {
    const error = new DOMException('Aborted', 'AbortError');
    if (cancelId) sendCancel(cancelId);
    if (cancelId) cancelMany(cancelId, error);
    return Promise.reject(error);
  }
  return new Promise<ResourceBytesItem[]>((resolve, reject) => {
    const onAbort = () => {
      const error = new DOMException('Aborted', 'AbortError');
      if (cancelId) sendCancel(cancelId);
      if (cancelId) cancelMany(cancelId, error);
      reject(error);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      (items) => {
        signal.removeEventListener('abort', onAbort);
        resolve(items);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
}

/**
 * Install the resource shim. Currently a registration-only entry point --
 * resource fetches are issued on demand, not at install time.
 *
 * @returns cleanup function that clears all in-flight + pending state
 */
export function installResourceShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }
  installed = true;
  return () => {
    inflight.clear();
    pendingInfo.clear();
    pendingBytes.clear();
    pendingMany.clear();
    installed = false;
  };
}
