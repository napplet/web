/**
 * Napplet NAP resource sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/resource -- SDK helpers wrapping window.napplet.resource.
 *
 * These convenience functions delegate to `window.napplet.resource.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal } from '@napplet/core';
import type { ResourceBytesItem, ResourceInfo } from './types.js';

function requireResource(): NonNullable<NappletGlobal['resource']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.resource) {
    throw new Error('window.napplet.resource is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.resource;
}

/**
 * Inspect resource schemes and coarse runtime policy limits.
 *
 * @returns Promise resolving to advisory resource info.
 */
export function resourceInfo(): Promise<ResourceInfo> {
  return requireResource().info();
}

/** Alias for {@link resourceInfo} on the SDK subpath. */
export const info = resourceInfo;

/**
 * Fetch bytes for a URL through the shell's resource pipeline.
 *
 * @param url  URL identifying the resource (any registered scheme:
 *             `data:`, `https:`, `blossom:`, `htree:`, `nostr:`, ...)
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
export function resourceBytes(url: string, opts?: { signal?: AbortSignal }): Promise<Blob> {
  return requireResource().bytes(url, opts);
}

/** Alias for {@link resourceBytes} on the SDK subpath. */
export const bytes = resourceBytes;

/**
 * Fetch bytes for many URLs through the shell's resource pipeline.
 *
 * @param urls  Non-empty URL list.
 * @param opts  Optional `{ signal }` for AbortController cancellation.
 * @returns Promise resolving to ordered per-URL result items.
 *
 * @example
 * ```ts
 * import { resourceBytesMany } from '@napplet/nap/resource';
 *
 * const items = await resourceBytesMany([
 *   'https://example.com/avatar.png',
 *   'blossom:sha256:...',
 *   'htree://example-root/path',
 * ]);
 * ```
 */
export function resourceBytesMany(
  urls: string[],
  opts?: { signal?: AbortSignal },
): Promise<ResourceBytesItem[]> {
  return requireResource().bytesMany(urls, opts);
}

/** Alias for {@link resourceBytesMany} on the SDK subpath. */
export const bytesMany = resourceBytesMany;

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

/** Alias for {@link resourceBytesAsObjectURL} on the SDK subpath. */
export const bytesAsObjectURL = resourceBytesAsObjectURL;
