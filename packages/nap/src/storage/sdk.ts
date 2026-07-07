/**
 * Napplet NAP storage sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/storage -- SDK helpers wrapping window.napplet.storage.
 *
 * These convenience functions delegate to `window.napplet.storage.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal } from '@napplet/core';

function requireStorage(): NonNullable<NappletGlobal['storage']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.storage) {
    throw new Error('window.napplet.storage is unavailable -- runtime did not inject this domain');
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

/**
 * Retrieve a per-instance value by key. Returns null if the key does not exist.
 *
 * Per-instance storage is scoped to this napplet instance (sets
 * `scope: "instance"` on the wire) rather than shared across instances.
 *
 * @param key  The storage key
 * @returns The stored string value, or null if not found
 *
 * @example
 * ```ts
 * import { storageInstanceGetItem } from '@napplet/nap/storage';
 *
 * const draft = await storageInstanceGetItem('draft');
 * ```
 */
export function storageInstanceGetItem(key: string): Promise<string | null> {
  return requireStorage().instance.getItem(key);
}

/**
 * Store a per-instance key-value pair.
 *
 * @param key    The storage key
 * @param value  The string value to store
 *
 * @example
 * ```ts
 * import { storageInstanceSetItem } from '@napplet/nap/storage';
 *
 * await storageInstanceSetItem('draft', 'hello');
 * ```
 */
export function storageInstanceSetItem(key: string, value: string): Promise<void> {
  return requireStorage().instance.setItem(key, value);
}

/**
 * Remove a per-instance key.
 *
 * @param key  The storage key to remove
 *
 * @example
 * ```ts
 * import { storageInstanceRemoveItem } from '@napplet/nap/storage';
 *
 * await storageInstanceRemoveItem('draft');
 * ```
 */
export function storageInstanceRemoveItem(key: string): Promise<void> {
  return requireStorage().instance.removeItem(key);
}

/**
 * List all per-instance keys for this napplet instance.
 *
 * @returns Array of storage key strings
 *
 * @example
 * ```ts
 * import { storageInstanceKeys } from '@napplet/nap/storage';
 *
 * const allKeys = await storageInstanceKeys();
 * ```
 */
export function storageInstanceKeys(): Promise<string[]> {
  return requireStorage().instance.keys();
}
