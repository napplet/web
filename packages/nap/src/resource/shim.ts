/**
 * Napplet NAP resource shim entrypoint.
 *
 * @module
 */

import type {
  ResourceBytesItem,
  ResourceBytesRequest,
  ResourceInfo,
  ResourceSidecarEntry,
} from './types.js';
import {
  cancelBytes,
  decodeDataUrl,
  inflight,
  sendBytesManyRequest,
  sendBytesRequest,
  sendInfoRequest,
  wireManySignal,
  wireSignal,
} from './resource-transport.js';

export { handleResourceMessage, installResourceShim } from './resource-transport.js';

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
 * @param opts  Optional advisory Blossom `servers` and `{ signal }` for cancellation
 * @returns Promise resolving to the fetched bytes as a Blob
 *
 * @example
 * ```ts
 * const blob = await bytes('https://example.com/avatar.png');
 *
 * // With cancellation:
 * const ac = new AbortController();
 * const promise = bytes('blossom:<sha256>.bin', { signal: ac.signal });
 * ac.abort(); // -> rejects with AbortError, sends resource.cancel envelope
 * ```
 */
export function bytes(url: string, opts?: { servers?: string[]; signal?: AbortSignal }): Promise<Blob> {
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
      work = sendBytesRequest(url, cancelId, opts?.servers);
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
 * Fetch bytes for many per-resource requests through one shell envelope.
 *
 * `items` preserves the input order and length. Failed URLs are represented as
 * `ok: false` items so successful siblings remain available to the caller.
 *
 * @param requests  Non-empty resource request list with optional per-resource Blossom servers.
 * @param opts  Optional `{ signal }` for AbortController cancellation.
 * @returns Promise resolving to ordered per-URL resource result items.
 */
export function bytesMany(
  requests: ResourceBytesRequest[],
  opts?: { signal?: AbortSignal },
): Promise<ResourceBytesItem[]> {
  if (requests.length === 0) {
    return Promise.reject(new Error('invalid-request: requests must be non-empty'));
  }
  if (opts?.signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  const id = crypto.randomUUID();
  const work = sendBytesManyRequest(requests, id);
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
 * const handle = bytesAsObjectURL('blossom:<sha256>.png');
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
 *   { url: 'blossom:def456.jpg', blob: bBlob, mime: 'image/jpeg' },
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
