/**
 * Napplet NAP resource shim entrypoint.
 *
 * @module
 */

import type { RelayEventResult } from '@napplet/core';
import type {
  ResourceBytesItem,
  ResourceInfo,
  ResourceSidecarEntry,
} from './types.js';
import {
  cancelBytes,
  decodeResourceBytes,
  inflight,
  sendBytesManyRequest,
  sendBytesRequest,
  sendInfoRequest,
  wireManySignal,
  wireSignal,
} from './resource-transport.js';

export { decodeResourceBytes, handleResourceMessage, installResourceShim } from './resource-transport.js';

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
 * - Every URL, including `data:` and bare `nhash` aliases, routes through the
 *   runtime via a `resource.bytes` envelope. The runtime owns scheme dispatch,
 *   URL validation (`invalid-request`), size caps, MIME sniffing, and SVG
 *   rasterization.
 * - The base64 `ResourceBytes` result is strictly decoded into a Blob typed
 *   with the runtime-classified MIME; a non-canonical encoding rejects.
 * - Concurrent calls for the same URL share a single in-flight Promise (single-flight cache).
 * - Aborted signals are honored synchronously and via cancel envelope.
 *
 * @param url   URL identifying the resource (any registered scheme)
 * @param opts  Optional `{ signal }` for cancellation
 * @returns Promise resolving to the decoded bytes as a Blob
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

  // Every URL goes to the runtime: it owns scheme dispatch and URL validation.
  const cancelId = crypto.randomUUID();
  let work = sendBytesRequest(url, cancelId);

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
    (reason) => cancelBytes(cancelId, reason),
  );
}

/**
 * Fetch bytes for many URLs through one shell envelope.
 *
 * `items` preserves the input order and length. Failed URLs are represented as
 * `ok: false` items so successful siblings remain available to the caller.
 *
 * @param urls  Non-empty URL list (any registered scheme).
 * @param opts  Optional `{ signal }` for AbortController cancellation.
 * @returns Promise resolving to ordered per-URL resource result items.
 *
 * @example
 * ```ts
 * const items = await bytesMany(['https://example.com/a.png', 'blossom:<sha256>.png']);
 * ```
 */
export function bytesMany(
  urls: string[],
  opts?: { signal?: AbortSignal },
): Promise<ResourceBytesItem[]> {
  if (!Array.isArray(urls) || urls.length === 0) {
    return Promise.reject(new Error('invalid-request: urls must be a non-empty list'));
  }
  if (!urls.every((url) => typeof url === 'string')) {
    return Promise.reject(new Error('invalid-request: bytesMany takes URL strings, not request objects'));
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
 * Pre-populate the single-flight cache from resource sidecar entries carried
 * by an importing NAP (NAP-RELAY / NAP-OUTBOX `RelayEventResult.sidecar.resources`).
 * Relay and outbox shims call this before invoking the napplet's event handler.
 * After this call, `bytes(entry.url)` for a hydrated URL resolves from cache.
 *
 * Each entry's `blob` is wire `ResourceBytes` (canonical padded base64) and is
 * decoded into a Blob typed with `entry.mime`. Entries with an invalid
 * encoding or shape are skipped and never cached.
 *
 * Hydrated entries stay in the in-flight map until the shim is torn down;
 * there is no separate long-lived blob cache.
 *
 * @param entries  Pre-resolved resource entries from an event sidecar
 * @returns The entries that decoded and were cached
 *
 * @example
 * ```ts
 * hydrateResourceCache([
 *   { url: 'https://example.com/a.png', blob: 'iVBORw0KGgo=', mime: 'image/png' },
 * ]);
 * // Subsequent bytes('https://example.com/a.png') resolves from cache.
 * ```
 */
export function hydrateResourceCache(entries?: ResourceSidecarEntry[]): ResourceSidecarEntry[] {
  const accepted: ResourceSidecarEntry[] = [];
  if (!Array.isArray(entries)) return accepted;
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null || typeof entry.url !== 'string') continue;
    let blob: Blob;
    try {
      blob = decodeResourceBytes(entry.blob, entry.mime);
    } catch {
      continue; // invalid encoding is a protocol failure: never cache it
    }
    inflight.set(entry.url, Promise.resolve(blob));
    accepted.push(entry);
  }
  return accepted;
}

/**
 * Hydrate the resource cache from a `RelayEventResult` sidecar and drop any
 * entry that failed decoding from the result, so an invalid encoding reaches
 * neither the cache nor the napplet's event handler. Relay and outbox shims
 * call this before handing the result to the napplet.
 *
 * @param result  Event result whose `sidecar.resources` is filtered in place
 * @returns The same result object
 *
 * @example
 * ```ts
 * onEvent(hydrateEventSidecar(msg.result));
 * ```
 */
export function hydrateEventSidecar<T extends RelayEventResult>(result: T): T {
  const sidecar = result?.sidecar;
  if (!sidecar || !('resources' in sidecar)) return result;
  const accepted = hydrateResourceCache(sidecar.resources);
  if (accepted.length > 0) {
    sidecar.resources = accepted;
  } else {
    delete sidecar.resources;
  }
  return result;
}
