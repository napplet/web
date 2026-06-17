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
  StorageScope,
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

// Scope-aware request builders shared by the shared (top-level) and instance
// surfaces. When scope === 'instance', the `scope` field is included on the
// wire; otherwise it is omitted entirely so shared requests stay byte-identical
// to pre-scope builds (NAP-STORAGE: "shared" is the default and the absence of
// `scope` MUST behave exactly as a shared request).

async function getItemScoped(key: string, scope?: StorageScope): Promise<string | null> {
  const msg: StorageGetMessage = {
    type: 'storage.get',
    id: crypto.randomUUID(),
    key,
    ...(scope === 'instance' ? { scope } : {}),
  };
  const result = await sendStorageRequest(msg) as StorageGetResultMessage;
  return result.value;
}

async function setItemScoped(key: string, value: string, scope?: StorageScope): Promise<void> {
  const msg: StorageSetMessage = {
    type: 'storage.set',
    id: crypto.randomUUID(),
    key,
    value,
    ...(scope === 'instance' ? { scope } : {}),
  };
  await sendStorageRequest(msg);
}

async function removeItemScoped(key: string, scope?: StorageScope): Promise<void> {
  const msg: StorageRemoveMessage = {
    type: 'storage.remove',
    id: crypto.randomUUID(),
    key,
    ...(scope === 'instance' ? { scope } : {}),
  };
  await sendStorageRequest(msg);
}

async function keysScoped(scope?: StorageScope): Promise<string[]> {
  const msg: StorageKeysMessage = {
    type: 'storage.keys',
    id: crypto.randomUUID(),
    ...(scope === 'instance' ? { scope } : {}),
  };
  const result = await sendStorageRequest(msg) as StorageKeysResultMessage;
  return result.keys;
}

/**
 * Async localStorage-like state API for sandboxed napplets.
 *
 * Routes all state operations through the shell's state proxy via postMessage.
 * Each napplet's state is namespaced by its identity -- napplets cannot read each other's data.
 * A per-napplet 512 KB quota is enforced by the shell.
 *
 * Top-level methods use the default `"shared"` scope and emit no `scope` field
 * on the wire. The `instance` sub-object is sugar that sets `scope: "instance"`
 * for per-instance storage (NAP-STORAGE).
 */
export const nappletStorage = {
  /**
   * Retrieve a stored value by key.
   * Returns null if the key does not exist (matching localStorage semantics).
   *
   * @param key  The state key
   * @returns The stored value, or null if not found
   */
  getItem(key: string): Promise<string | null> {
    return getItemScoped(key);
  },

  /**
   * Store a key-value pair.
   *
   * @param key    The state key
   * @param value  The string value to store
   * @throws If the napplet exceeds its 512 KB state quota
   */
  setItem(key: string, value: string): Promise<void> {
    return setItemScoped(key, value);
  },

  /**
   * Remove a stored key.
   *
   * @param key  The state key to remove
   */
  removeItem(key: string): Promise<void> {
    return removeItemScoped(key);
  },

  /**
   * List all keys stored by this napplet.
   *
   * @returns Array of state key strings
   */
  keys(): Promise<string[]> {
    return keysScoped();
  },

  /**
   * Per-instance storage: identical surface to the shared methods, but every
   * request carries `scope: "instance"` so the shell scopes the value to this
   * napplet instance rather than sharing it across instances (NAP-STORAGE).
   */
  instance: {
    /**
     * Retrieve a per-instance value by key. Returns null if not found.
     * @param key  The state key
     */
    getItem(key: string): Promise<string | null> {
      return getItemScoped(key, 'instance');
    },

    /**
     * Store a per-instance key-value pair.
     * @param key    The state key
     * @param value  The string value to store
     */
    setItem(key: string, value: string): Promise<void> {
      return setItemScoped(key, value, 'instance');
    },

    /**
     * Remove a per-instance key.
     * @param key  The state key to remove
     */
    removeItem(key: string): Promise<void> {
      return removeItemScoped(key, 'instance');
    },

    /**
     * List all per-instance keys for this napplet instance.
     */
    keys(): Promise<string[]> {
      return keysScoped('instance');
    },
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
