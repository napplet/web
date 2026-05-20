// @napplet/nub/resource -- Resource NUB shim (byte-fetching primitive: bytes, bytesAsObjectURL)
// Single-flight cache, AbortSignal cancellation, data: scheme decoded inline (zero shell round-trip).

import type {
  ResourceBytesMessage,
  ResourceBytesResultMessage,
  ResourceBytesErrorMessage,
  ResourceCancelMessage,
  ResourceSidecarEntry,
} from './types.js';

// ─── Constants ─────────────────────────────────────────────────────────────

/** Default timeout for resource fetch requests (30 seconds; aligns with other NUBs). */
const REQUEST_TIMEOUT_MS = 30_000;

// ─── State ──────────────────────────────────────────────────────────────────

/**
 * Single-flight cache: canonical URL string -> in-flight Promise<Blob>.
 * N concurrent bytes(sameUrl) calls share one entry → 1 work-unit, N resolutions.
 * Entries are deleted when the underlying promise settles (success, error, or abort)
 * so retries are possible.
 */
const inflight = new Map<string, Promise<Blob>>();

/** Pending wire requests: correlation id -> { resolve, reject, url }. */
const pending = new Map<string, {
  resolve: (blob: Blob) => void;
  reject: (reason: Error) => void;
  url: string;
}>();

/** Guard against double-install. */
let installed = false;

// ─── Shell message router ──────────────────────────────────────────────────

/**
 * Handle resource.* result messages from the shell via the central message listener.
 * Called by @napplet/shim's central dispatch loop (Phase 128 wires this in).
 */
export function handleResourceMessage(msg: { type: string; [key: string]: unknown }): void {
  const type = msg.type;
  if (type === 'resource.bytes.result') {
    const result = msg as unknown as ResourceBytesResultMessage;
    const p = pending.get(result.id);
    if (!p) return;
    pending.delete(result.id);
    p.resolve(result.blob);
  } else if (type === 'resource.bytes.error') {
    const err = msg as unknown as ResourceBytesErrorMessage;
    const p = pending.get(err.id);
    if (!p) return;
    pending.delete(err.id);
    p.reject(new Error(err.message ? `${err.error}: ${err.message}` : err.error));
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────

/**
 * Send a resource.bytes request envelope to the parent and return a Promise<Blob>.
 * Wires into pending Map + installs a timeout. Cancellation is handled by the caller
 * (bytes()) via signal listener -- this helper does not own the AbortSignal.
 */
function sendBytesRequest(url: string, id: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject, url });

    const msg: ResourceBytesMessage = {
      type: 'resource.bytes',
      id,
      url,
    };
    window.parent.postMessage(msg, '*');

    setTimeout(() => {
      if (pending.delete(id)) {
        reject(new Error(`resource.bytes timed out for ${url}`));
      }
    }, REQUEST_TIMEOUT_MS);
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
  window.parent.postMessage(msg, '*');
}

/**
 * Decode a `data:` URI in-shim using the browser's native fetch parser.
 * Zero postMessage round-trip. Used by bytes() when the URL scheme is `data:`.
 */
function decodeDataUrl(url: string): Promise<Blob> {
  return fetch(url).then((r) => r.blob());
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
): Promise<Blob> {
  if (!signal) return work;
  if (signal.aborted) {
    if (cancelId) sendCancel(cancelId);
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return new Promise<Blob>((resolve, reject) => {
    const onAbort = () => {
      if (cancelId) sendCancel(cancelId);
      reject(new DOMException('Aborted', 'AbortError'));
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

// ─── Public API (installed on window.napplet.resource) ─────────────────────

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
    const protocol = new URL(url).protocol; // 'data:', 'https:', 'blossom:', 'nostr:', ...
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
  return wireSignal(work, opts?.signal, cancelId);
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
 * Phase 127 NUB-RELAY sidecar amendment). After this call, subsequent
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

// ─── Install / cleanup ──────────────────────────────────────────────────────

/**
 * Install the resource shim. Currently a registration-only entry point --
 * resource fetches are issued on demand, not at install time.
 *
 * @returns cleanup function that clears all in-flight + pending state
 */
export function installResourceShim(): () => void {
  if (installed) {
    return () => { /* already installed */ };
  }
  installed = true;
  return () => {
    inflight.clear();
    pending.clear();
    installed = false;
  };
}
