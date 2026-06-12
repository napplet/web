/**
 * @napplet/nap/resource -- SDK helpers wrapping window.napplet.resource.
 *
 * These convenience functions delegate to `window.napplet.resource.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal } from '@napplet/core';

function requireResource(): NappletGlobal['resource'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.resource) {
    throw new Error('window.napplet.resource not installed -- import @napplet/shim first');
  }
  return w.napplet.resource;
}

/**
 * Fetch bytes for a URL through the shell's resource pipeline.
 *
 * @param url  URL identifying the resource (any registered scheme:
 *             `data:`, `https:`, `blossom:`, `nostr:`, ...)
 * @returns Promise resolving to the fetched bytes as a Blob
 *
 * @example
 * ```ts
 * import { resourceBytes } from '@napplet/nap/resource';
 *
 * const blob = await resourceBytes('https://example.com/avatar.png');
 * const url = URL.createObjectURL(blob);
 * ```
 */
export function resourceBytes(url: string): Promise<Blob> {
  return requireResource().bytes(url);
}

/**
 * Fetch bytes and return a managed object URL handle.
 * Call `revoke()` to release the underlying Blob URL.
 *
 * @param url  URL identifying the resource
 * @returns Synchronous handle `{ url, revoke }`. The `url` field is populated
 *          when the underlying fetch resolves; await any returned `ready`
 *          promise (shim-specific extension) before reading.
 *
 * @example
 * ```ts
 * import { resourceBytesAsObjectURL } from '@napplet/nap/resource';
 *
 * const handle = resourceBytesAsObjectURL('blossom:abc123...');
 * imgEl.src = handle.url;
 * imgEl.onload = () => handle.revoke();
 * ```
 */
export function resourceBytesAsObjectURL(url: string): { url: string; revoke: () => void } {
  return requireResource().bytesAsObjectURL(url);
}
