/**
 * Napplet NAP resource shim entrypoint.
 *
 * @module
 */

// @napplet/nap/resource -- Resource NAP shim (byte-fetching primitives)
// Single-flight cache, AbortSignal cancellation, all schemes pass through runtime policy.

import { decodeResourceBlob } from '@napplet/core';
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

/** Pending `resource.bytesMany` wire requests. */
const pendingMany = new Map<string, Pending<ResourceBytesItem[]> & { urls: string[] }>();

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
    try { p.resolve(decodeResourceBlob(result.blob, result.mime)); }
    catch (error) { p.reject(error as Error); }
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
    try {
      if (!Array.isArray(result.items) || result.items.length !== p.urls.length) {
        throw new Error('decode-failed: resource result length mismatch');
      }
      const items = Array.from(result.items, (item, index) => {
        if (!item || item.url !== p.urls[index] || typeof item.ok !== 'boolean') {
          throw new Error('decode-failed: resource result order or shape mismatch');
        }
        if (item.ok) return { ...item, blob: decodeResourceBlob(item.blob, item.mime) };
        if (typeof item.error !== 'string' || 'blob' in item) {
          throw new Error('decode-failed: invalid resource error item');
        }
        return item;
      });
      p.resolve(items);
    } catch (error) { p.reject(error as Error); }
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
 * Send a resource.bytesMany request envelope and return ordered per-resource items.
 */
export function sendBytesManyRequest(urls: string[], id: string): Promise<ResourceBytesItem[]> {
  return new Promise<ResourceBytesItem[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingMany.delete(id)) {
        reject(new Error(`resource.bytesMany timed out for ${urls.length} URLs`));
      }
    }, REQUEST_TIMEOUT_MS);
    pendingMany.set(id, { resolve, reject, timeout, urls: [...urls] });

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
