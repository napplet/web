/**
 * @napplet/nap/keys -- SDK helpers wrapping window.napplet.keys.
 *
 * These convenience functions delegate to `window.napplet.keys.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, Subscription } from '@napplet/core';

function requireKeys(): NappletGlobal['keys'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.keys) {
    throw new Error('window.napplet.keys not installed -- import @napplet/shim first');
  }
  return w.napplet.keys;
}

/**
 * Declare a named action that the shell can bind to a key.
 *
 * @param action  The action to register (id, label, optional defaultKey)
 * @returns The assigned binding, if any
 *
 * @example
 * ```ts
 * import { keysRegisterAction } from '@napplet/nap/keys';
 *
 * const result = await keysRegisterAction({
 *   id: 'editor.save',
 *   label: 'Save',
 *   defaultKey: 'Ctrl+S',
 * });
 * ```
 */
export function keysRegisterAction(action: {
  id: string;
  label: string;
  defaultKey?: string;
}): Promise<{ actionId: string; binding?: string }> {
  return requireKeys().registerAction(action);
}

/**
 * Remove a previously registered action.
 *
 * @param actionId  The action to unregister
 *
 * @example
 * ```ts
 * import { keysUnregisterAction } from '@napplet/nap/keys';
 *
 * keysUnregisterAction('editor.save');
 * ```
 */
export function keysUnregisterAction(actionId: string): void {
  requireKeys().unregisterAction(actionId);
}

/**
 * Register a local handler for when a bound key is pressed.
 *
 * @param actionId  The action to listen for
 * @param callback  Called when the action is triggered
 * @returns A Subscription with `close()` to stop listening
 *
 * @example
 * ```ts
 * import { keysOnAction } from '@napplet/nap/keys';
 *
 * const sub = keysOnAction('editor.save', () => {
 *   console.log('Save triggered!');
 * });
 * // Later: sub.close();
 * ```
 */
export function keysOnAction(actionId: string, callback: () => void): Subscription {
  return requireKeys().onAction(actionId, callback);
}

/**
 * Convenience: register a named action AND wire a local handler in one call.
 * Returns a handle whose `close()` both unregisters the action and removes
 * the onAction listener.
 *
 * @param action   The action to register (id, label, optional defaultKey)
 * @param handler  Called when the shell triggers this action
 * @returns The assigned binding plus a `close()` teardown function
 *
 * @example
 * ```ts
 * import { keysRegister } from '@napplet/nap/keys';
 *
 * const handle = await keysRegister(
 *   { id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S' },
 *   () => saveDocument(),
 * );
 *
 * // Later, tear down both registration and listener:
 * handle.close();
 * ```
 */
export async function keysRegister(
  action: { id: string; label: string; defaultKey?: string },
  handler: () => void,
): Promise<{ actionId: string; binding?: string; close: () => void }> {
  const n = requireKeys();
  const result = await n.registerAction(action);
  const sub = n.onAction(action.id, handler);
  return {
    ...result,
    close() {
      sub.close();
      n.unregisterAction(action.id);
    },
  };
}
