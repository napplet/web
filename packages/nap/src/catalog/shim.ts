/** Runtime-side NAP-CATALOG request correlation. */
import type { CatalogApi, CatalogSnapshot } from '@napplet/core';
import { postToShell } from '../boundary.js';

const REQUEST_TIMEOUT_MS = 30_000;
const pendingRequests = new Map<string, {
  resolve: (snapshot: CatalogSnapshot) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();
let installed = false;

/**
 * Route a parent-authenticated catalog result to its pending call.
 * @param message The envelope received by the central runtime listener.
 * @returns Nothing; unmatched messages are ignored.
 * @example handleCatalogMessage({ type: 'catalog.get.result', id, snapshot });
 */
export function handleCatalogMessage(message: { type: string; [key: string]: unknown }): void {
  if (message.type !== 'catalog.get.result' || typeof message.id !== 'string') return;
  const pending = pendingRequests.get(message.id);
  if (!pending) return;
  pendingRequests.delete(message.id);
  clearTimeout(pending.timeout);
  if (typeof message.error === 'string') {
    pending.reject(new Error(message.error));
  } else if (message.snapshot && typeof message.snapshot === 'object') {
    pending.resolve(message.snapshot as CatalogSnapshot);
  } else {
    pending.reject(new Error('Invalid catalog.get.result: missing snapshot or error'));
  }
}

/**
 * Request the runtime's caller-filtered catalog without launching any napplet.
 * @returns A snapshot or rejection on a runtime error, timeout, or disposal.
 * @example const snapshot = await get();
 */
export function get(): Promise<CatalogSnapshot> {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingRequests.delete(id)) reject(new Error('catalog.get timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingRequests.set(id, { resolve, reject, timeout });
    try {
      postToShell({ type: 'catalog.get', id });
    } catch (error) {
      pendingRequests.delete(id);
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/** Runtime-injected read-only catalog API. */
export const catalog: CatalogApi = { get };

/**
 * Install the catalog request lifecycle without sending a request.
 * @returns Cleanup that rejects pending calls and permits reinstall.
 * @example const cleanup = installCatalogShim();
 */
export function installCatalogShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const pending of pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Catalog shim disposed'));
    }
    pendingRequests.clear();
    installed = false;
  };
}
