/**
 * Napplet NAP resource shim entrypoint.
 *
 * @module
 */

// @napplet/nap/resource -- Resource NAP shim (byte-fetching primitives)
// Single-flight cache, AbortSignal cancellation, data: scheme decoded inline (zero shell round-trip).

import { postToShell } from '../boundary.js';
import type {
  ResourceBytesMessage,
  ResourceBytesManyMessage,
  ResourceBytesItem,
  ResourceBytesManyResultMessage,
  ResourceBytesManyErrorMessage,
  ResourceBytesResultMessage,
  ResourceBytesErrorMessage,
  ResourceCancelMessage,
  ResourceInfo,
  ResourceInfoMessage,
  ResourceInfoResultMessage,
  ResourceInfoErrorMessage,
  ResourceSidecarEntry,
} from './types.js';

/** Default timeout for resource fetch requests (30 seconds; aligns with other NAPs). */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Single-flight cache: canonical URL string -> in-flight Promise<Blob>.
 * N concurrent bytes(sameUrl) calls share one entry → 1 work-unit, N resolutions.
 * Entries are deleted when the underlying promise settles (success, error, or abort)
 * so retries are possible.
 */
const inflight = new Map<string, Promise<Blob>>();

type Pending<T> = {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

/** Pending `resource.bytes` wire requests. */
const pendingBytes = new Map<string, Pending<Blob>>();

/** Pending `resource.info` wire requests. */
const pendingInfo = new Map<string, Pending<ResourceInfo>>();

/** Pending `resource.bytesMany` wire requests. */
const pendingMany = new Map<string, Pending<ResourceBytesItem[]>>();

/** Guard against double-install. */
let installed = false;

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
    p.resolve(result.blob);
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
    p.resolve(result.items);
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
function sendInfoRequest(id: string): Promise<ResourceInfo> {
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
function sendBytesRequest(url: string, id: string): Promise<Blob> {
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
function sendBytesManyRequest(urls: string[], id: string): Promise<ResourceBytesItem[]> {
  return new Promise<ResourceBytesItem[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingMany.delete(id)) {
        reject(new Error(`resource.bytesMany timed out for ${urls.length} URLs`));
      }
    }, REQUEST_TIMEOUT_MS);
    pendingMany.set(id, { resolve, reject, timeout });

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

function isHexByte(value: string): boolean {
  return /^[0-9a-fA-F]{2}$/.test(value);
}

function percentDecodeToBytes(value: string): Uint8Array {
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === '%' && isHexByte(value.slice(i + 1, i + 3))) {
      bytes.push(Number.parseInt(value.slice(i + 1, i + 3), 16));
      i += 2;
      continue;
    }
    bytes.push(...encoder.encode(char));
  }
  return new Uint8Array(bytes);
}

function percentDecodeToString(value: string): string {
  let output = '';
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === '%' && isHexByte(value.slice(i + 1, i + 3))) {
      output += String.fromCharCode(Number.parseInt(value.slice(i + 1, i + 3), 16));
      i += 2;
      continue;
    }
    output += char;
  }
  return output;
}

function base64ToBytes(value: string): Uint8Array {
  const decoded = atob(percentDecodeToString(value).replace(/\s/g, ''));
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * Decode a `data:` URI in-shim without browser network primitives.
 * Zero postMessage round-trip. Used by bytes() when the URL scheme is `data:`.
 */
function decodeDataUrl(url: string): Promise<Blob> {
  const comma = url.indexOf(',');
  if (comma < 0) return Promise.reject(new Error('invalid data URL'));

  const metadata = url.slice('data:'.length, comma);
  const data = url.slice(comma + 1);
  const parts = metadata.split(';').filter((part) => part.length > 0);
  const isBase64 = parts.some((part) => part.toLowerCase() === 'base64');
  const type = parts.filter((part) => part.toLowerCase() !== 'base64').join(';');

  try {
    const bytes = isBase64 ? base64ToBytes(data) : percentDecodeToBytes(data);
    return Promise.resolve(new Blob([toArrayBuffer(bytes)], { type }));
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error('invalid data URL'));
  }
}

/**
 * Wire an AbortSignal to a Promise<Blob>. If the signal is already aborted,
 * reject immediately. If it fires later, send a `resource.cancel` envelope
 * (when cancelId is provided) and reject with AbortError.
 */
function wireSignal(
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

function cancelBytes(id: string, reason: Error): void {
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

function wireManySignal(
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
 * Inspect resource schemes and coarse policy limits disclosed by the shell.
 *
 * This is advisory introspection only. Callers can issue `bytes` or `bytesMany`
 * without calling `info()` first.
 *
 * @returns Promise resolving to the resource info snapshot.
 */
export function info(): Promise<ResourceInfo> {
  return sendInfoRequest(crypto.randomUUID());
}

/**
 * Fetch bytes for a URL through the shell's resource pipeline.
 *
 * - `data:` URLs are decoded inline (no postMessage round-trip).
 * - All other schemes route through the shell via a `resource.bytes` envelope.
 * - Concurrent calls for the same URL share a single in-flight Promise (single-flight cache).
 * - Aborted signals are honored synchronously and via cancel envelope.
 *
 * @param url   URL identifying the resource (any registered scheme)
 * @param opts  Optional `{ signal }` for AbortController cancellation
 * @returns Promise resolving to the fetched bytes as a Blob
 *
 * @example
 * ```ts
 * const blob = await bytes('https://example.com/avatar.png');
 *
 * // With cancellation:
 * const ac = new AbortController();
 * const promise = bytes('blossom:abc...', { signal: ac.signal });
 * ac.abort(); // -> rejects with AbortError, sends resource.cancel envelope
 * ```
 */
export function bytes(url: string, opts?: { signal?: AbortSignal }): Promise<Blob> {
  // Synchronous abort check -- reject before any work or envelope dispatch.
  if (opts?.signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  // Single-flight: dedupe concurrent calls.
  const cached = inflight.get(url);
  if (cached) {
    return wireSignal(cached, opts?.signal);
  }

  // Determine work strategy: data: inline, otherwise shell round-trip.
  let work: Promise<Blob>;
  let cancelId: string | null = null;

  try {
    const protocol = new URL(url).protocol; // 'data:', 'https:', 'blossom:', 'htree:', 'nostr:', ...
    if (protocol === 'data:') {
      work = decodeDataUrl(url);
    } else {
      cancelId = crypto.randomUUID();
      work = sendBytesRequest(url, cancelId);
    }
  } catch {
    return Promise.reject(new Error(`invalid URL: ${url}`));
  }

  // Cleanup inflight entry on settle (success or failure).
  work = work.finally(() => {
    inflight.delete(url);
  });

  inflight.set(url, work);

  // Wire abort: if signal fires after dispatch, send cancel envelope and reject.
  return wireSignal(
    work,
    opts?.signal,
    cancelId,
    cancelId ? (reason) => cancelBytes(cancelId, reason) : undefined,
  );
}

/**
 * Fetch bytes for many URLs through one shell envelope.
 *
 * `items` preserves the input order and length. Failed URLs are represented as
 * `ok: false` items so successful siblings remain available to the caller.
 *
 * @param urls  Non-empty URL list.
 * @param opts  Optional `{ signal }` for AbortController cancellation.
 * @returns Promise resolving to ordered per-URL resource result items.
 */
export function bytesMany(
  urls: string[],
  opts?: { signal?: AbortSignal },
): Promise<ResourceBytesItem[]> {
  if (urls.length === 0) {
    return Promise.reject(new Error('invalid-request: urls must be non-empty'));
  }
  if (opts?.signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  const id = crypto.randomUUID();
  const work = sendBytesManyRequest(urls, id);
  return wireManySignal(work, opts?.signal, id);
}

/**
 * Convenience wrapper around bytes(url) returning a managed object URL handle.
 *
 * The returned `url` is initially an empty string; it is replaced with the
 * actual blob URL once the underlying fetch resolves. Callers SHOULD await
 * `ready` (a non-enumerable Promise extension) before assigning to img/audio
 * or use a then-callback pattern.
 *
 * The synchronous return shape `{ url, revoke }` matches the locked
 * NappletGlobal['resource'] contract; a non-enumerable `ready` Promise is
 * defined on the handle for callers that need to await blob materialization.
 *
 * `revoke()` is idempotent -- multiple calls release the URL exactly once.
 * If `revoke()` is called BEFORE the underlying fetch resolves, the resolved
 * blob URL is never created (cancellation of object-URL allocation, not the
 * underlying fetch).
 *
 * @param url  URL identifying the resource
 * @returns `{ url, revoke }` handle. After `await (handle as any).ready`,
 *          `url` is the blob URL.
 *
 * @example
 * ```ts
 * const handle = bytesAsObjectURL('blossom:abc123...');
 * await (handle as { ready: Promise<unknown> }).ready;
 * imgEl.src = handle.url;
 * imgEl.onload = () => handle.revoke();
 * ```
 */
export function bytesAsObjectURL(url: string): { url: string; revoke: () => void } {
  const handle = { url: '', revoke: () => { /* set below */ } };
  let objectUrl: string | null = null;
  let revoked = false;

  const ready = bytes(url).then((blob) => {
    if (revoked) return; // bail if caller revoked before fetch settled
    objectUrl = URL.createObjectURL(blob);
    handle.url = objectUrl;
    return objectUrl;
  });

  handle.revoke = () => {
    if (revoked) return;
    revoked = true;
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    // If revoke() is called before fetch settles, ready handler bails via revoked flag.
  };

  // Attach ready promise as a non-enumerable property so callers can await
  // without mutating the locked NappletGlobal['resource'] return shape.
  Object.defineProperty(handle, 'ready', {
    value: ready,
    enumerable: false,
    writable: false,
  });

  return handle;
}

/**
 * Pre-populate the single-flight cache from sidecar entries (consumed by
 * Phase 127 NAP-RELAY sidecar amendment). After this call, subsequent
 * bytes(entry.url) for hydrated URLs resolves synchronously from cache.
 *
 * Note: hydrated entries live in the inflight map until the first consumer
 * settles them; v0.28.0 has no long-lived blob cache (deferred).
 *
 * @param entries  Pre-resolved resource entries from a relay event sidecar
 *
 * @example
 * ```ts
 * hydrateResourceCache([
 *   { url: 'https://example.com/a.png', blob: aBlob, mime: 'image/png' },
 *   { url: 'blossom:def456', blob: bBlob, mime: 'image/jpeg' },
 * ]);
 * // Subsequent bytes('https://example.com/a.png') resolves from cache.
 * ```
 */
export function hydrateResourceCache(entries?: ResourceSidecarEntry[]): void {
  if (!entries || entries.length === 0) return;
  for (const entry of entries) {
    // Resolve immediately; finally() will delete after first consumer settles.
    inflight.set(entry.url, Promise.resolve(entry.blob));
  }
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
