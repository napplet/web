/**
 * Storage shim -- napplet-side localStorage-like API over postMessage.
 *
 * Without allow-same-origin, iframes have opaque origins and cannot access
 * localStorage directly. This shim provides an async API that sends
 * storage.* envelope messages directly to the shell's storage proxy.
 *
 * Usage (via window.napplet global):
 *   import '@napplet/shim';
 *   const value = await window.napplet.storage.getItem('my-key');
 *   await window.napplet.storage.setItem('my-key', 'my-value');
 *   await window.napplet.storage.removeItem('my-key');
 *   const allKeys = await window.napplet.storage.keys();
 */

import type {
  StorageGetMessage,
  StorageSetMessage,
  StorageRemoveMessage,
  StorageKeysMessage,
  StorageGetResultMessage,
  StorageKeysResultMessage,
} from './types.js';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

const pendingResponses = new Map<string, PendingRequest>();

/** Timeout for state requests (5 seconds). */
const REQUEST_TIMEOUT_MS = 5000;

function handleStateResponse(event: MessageEvent): void {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;
  if (!msg.type.startsWith('storage.') || !msg.type.endsWith('.result')) return;

  const id = msg.id as string | undefined;
  if (!id) return;

  const pending = pendingResponses.get(id);
  if (!pending) return;
  pendingResponses.delete(id);

  if (msg.error) {
    pending.reject(new Error(msg.error as string));
    return;
  }

  // Return the full result message (caller extracts what they need)
  pending.resolve(msg);
}

function sendStorageRequest(
  message: StorageGetMessage | StorageSetMessage | StorageRemoveMessage | StorageKeysMessage,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    pendingResponses.set(message.id, { resolve, reject });

    window.parent.postMessage(message, '*');

    // 5-second timeout
    setTimeout(() => {
      if (pendingResponses.delete(message.id)) {
        reject(new Error('State request timed out'));
      }
    }, REQUEST_TIMEOUT_MS);
  });
}

/**
 * Async localStorage-like state API for sandboxed napplets.
 *
 * Routes all state operations through the shell's state proxy via postMessage.
 * Each napplet's state is namespaced by its identity -- napplets cannot read each other's data.
 * A per-napplet 512 KB quota is enforced by the shell.
 */
export const nappletStorage = {
  /**
   * Retrieve a stored value by key.
   * Returns null if the key does not exist (matching localStorage semantics).
   *
   * @param key  The state key
   * @returns The stored value, or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    const msg: StorageGetMessage = {
      type: 'storage.get',
      id: crypto.randomUUID(),
      key,
    };
    const result = await sendStorageRequest(msg) as StorageGetResultMessage;
    return result.value;
  },

  /**
   * Store a key-value pair.
   *
   * @param key    The state key
   * @param value  The string value to store
   * @throws If the napplet exceeds its 512 KB state quota
   */
  async setItem(key: string, value: string): Promise<void> {
    const msg: StorageSetMessage = {
      type: 'storage.set',
      id: crypto.randomUUID(),
      key,
      value,
    };
    await sendStorageRequest(msg);
  },

  /**
   * Remove a stored key.
   *
   * @param key  The state key to remove
   */
  async removeItem(key: string): Promise<void> {
    const msg: StorageRemoveMessage = {
      type: 'storage.remove',
      id: crypto.randomUUID(),
      key,
    };
    await sendStorageRequest(msg);
  },

  /**
   * List all keys stored by this napplet.
   *
   * @returns Array of state key strings
   */
  async keys(): Promise<string[]> {
    const msg: StorageKeysMessage = {
      type: 'storage.keys',
      id: crypto.randomUUID(),
    };
    const result = await sendStorageRequest(msg) as StorageKeysResultMessage;
    return result.keys;
  },
};

/**
 * Install the storage response listener.
 * Called by @napplet/shim during initialization.
 *
 * @returns cleanup function that removes the listener
 */
export function installStorageShim(): () => void {
  window.addEventListener('message', handleStateResponse);

  return () => {
    window.removeEventListener('message', handleStateResponse);
    pendingResponses.clear();
  };
}
