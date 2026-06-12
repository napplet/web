/**
 * @napplet/nap/storage -- SDK helpers wrapping window.napplet.storage.
 *
 * These convenience functions delegate to `window.napplet.storage.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal } from '@napplet/core';

function requireStorage(): NappletGlobal['storage'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.storage) {
    throw new Error('window.napplet.storage not installed -- import @napplet/shim first');
  }
  return w.napplet.storage;
}

/**
 * Retrieve a stored value by key. Returns null if the key does not exist.
 *
 * @param key  The storage key
 * @returns The stored string value, or null if not found
 *
 * @example
 * ```ts
 * import { storageGetItem } from '@napplet/nap/storage';
 *
 * const theme = await storageGetItem('theme');
 * ```
 */
export function storageGetItem(key: string): Promise<string | null> {
  return requireStorage().getItem(key);
}

/**
 * Store a key-value pair.
 *
 * @param key    The storage key
 * @param value  The string value to store
 *
 * @example
 * ```ts
 * import { storageSetItem } from '@napplet/nap/storage';
 *
 * await storageSetItem('theme', 'dark');
 * ```
 */
export function storageSetItem(key: string, value: string): Promise<void> {
  return requireStorage().setItem(key, value);
}

/**
 * Remove a stored key.
 *
 * @param key  The storage key to remove
 *
 * @example
 * ```ts
 * import { storageRemoveItem } from '@napplet/nap/storage';
 *
 * await storageRemoveItem('theme');
 * ```
 */
export function storageRemoveItem(key: string): Promise<void> {
  return requireStorage().removeItem(key);
}

/**
 * List all keys stored by this napplet.
 *
 * @returns Array of storage key strings
 *
 * @example
 * ```ts
 * import { storageKeys } from '@napplet/nap/storage';
 *
 * const allKeys = await storageKeys();
 * ```
 */
export function storageKeys(): Promise<string[]> {
  return requireStorage().keys();
}
