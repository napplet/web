// @napplet/nap/keys -- Keys NAP shim (keyboard forwarding + action keybindings)
// Full NAP-KEYS smart forwarding, suppress list, action handlers, and shell-push binding updates.

import type {
  KeysForwardMessage,
  KeysRegisterActionMessage,
  KeysUnregisterActionMessage,
  KeysRegisterActionResultMessage,
  KeysBindingsMessage,
  KeysActionMessage,
} from './types.js';
import type { Subscription } from '@napplet/core';

/** Suppress list: key combo string -> actionId. Derived from keys.bindings pushes. */
const suppressMap = new Map<string, string>();

/** Local action handlers: actionId -> Set of callbacks. */
const actionHandlers = new Map<string, Set<() => void>>();

/** Pending registerAction requests: correlation id -> { resolve, reject }. */
const pendingRegistrations = new Map<string, {
  resolve: (value: { actionId: string; binding?: string }) => void;
  reject: (reason: Error) => void;
}>();

/** Guard against double-install. */
let installed = false;
let activeCleanup: (() => void) | null = null;

const RESERVED_KEYS = new Set(['Tab', 'Shift+Tab', 'Escape']);

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

/**
 * Returns true if the given event target is a text-entry input element.
 * Text inputs should not forward keystrokes to avoid credential leakage.
 */
function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type?.toLowerCase() ?? 'text';
    const textTypes = new Set([
      'text', 'search', 'email', 'url', 'password', 'number', 'tel', 'date',
      'datetime-local', 'month', 'time', 'week',
    ]);
    return textTypes.has(type) || type === '';
  }
  if ((target as HTMLElement).isContentEditable) return true;
  const ce = (target as HTMLElement).contentEditable;
  if (ce === 'true' || ce === 'plaintext-only') return true;
  return false;
}

/**
 * Returns true if the key is a lone modifier key.
 */
function isModifierOnly(key: string): boolean {
  return key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta';
}

/**
 * Normalize a KeyboardEvent to a key combo string.
 * Modifiers in alphabetical order: Alt+Ctrl+Meta+Shift+Key.
 */
function normalizeCombo(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.altKey) parts.push('Alt');
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.metaKey) parts.push('Meta');
  if (event.shiftKey) parts.push('Shift');
  parts.push(event.key);
  return parts.join('+');
}

function handleBindings(msg: KeysBindingsMessage): void {
  suppressMap.clear();
  for (const binding of msg.bindings) {
    suppressMap.set(binding.key, binding.actionId);
  }
}

/**
 * Handle keys.registerAction.result from the shell.
 * Resolves the pending registration promise.
 */
function handleRegisterResult(msg: KeysRegisterActionResultMessage): void {
  const pending = pendingRegistrations.get(msg.id);
  if (!pending) return;
  pendingRegistrations.delete(msg.id);

  if (msg.error) {
    pending.reject(new Error(msg.error));
    return;
  }

  pending.resolve({
    actionId: msg.actionId,
    binding: msg.binding,
  });
}

/**
 * Handle keys.action push from the shell.
 * Triggers local action handlers for the given actionId.
 */
function handleAction(msg: KeysActionMessage): void {
  const handlers = actionHandlers.get(msg.actionId);
  if (!handlers) return;
  for (const cb of handlers) {
    cb();
  }
}

/**
 * Capture-phase keydown handler implementing NAP-KEYS smart forwarding:
 * 1. Skip text inputs (prevent credential leakage)
 * 2. Skip bare modifiers
 * 3. Skip IME composition
 * 4. Normalize to combo string
 * 5. If suppressed: preventDefault, trigger local action, do NOT forward
 * 6. If not suppressed: forward to shell
 */
function handleKeydown(event: KeyboardEvent): void {
  // 1. Text input guard
  if (isTextInput(event.target)) return;

  // 2. Bare modifier guard
  if (isModifierOnly(event.key)) return;

  // 3. IME composition guard
  if (event.isComposing) return;

  // 4. Normalize combo
  const combo = normalizeCombo(event);

  // 5. Check suppress list (skip reserved keys)
  if (!RESERVED_KEYS.has(combo) && suppressMap.has(combo)) {
    event.preventDefault();

    // Trigger local action handler
    const actionId = suppressMap.get(combo)!;
    const handlers = actionHandlers.get(actionId);
    if (handlers) {
      for (const cb of handlers) {
        cb();
      }
    }
    return;
  }

  // 6. Forward to shell
  const msg: KeysForwardMessage = {
    type: 'keys.forward',
    key: event.key,
    code: event.code,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
  window.parent.postMessage(msg, '*');
}

/**
 * Handle keys.* messages from the shell via the central message listener.
 */
export function handleKeysMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<KeysBindingsMessage>(msg, 'keys.bindings')) {
    handleBindings(msg);
  } else if (isMessageType<KeysRegisterActionResultMessage>(msg, 'keys.registerAction.result')) {
    handleRegisterResult(msg);
  } else if (isMessageType<KeysActionMessage>(msg, 'keys.action')) {
    handleAction(msg);
  }
}

/**
 * Register a named action with the shell.
 * Returns the shell's assigned binding, if any.
 */
export function registerAction(action: {
  id: string;
  label: string;
  defaultKey?: string;
}): Promise<{ actionId: string; binding?: string }> {
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    pendingRegistrations.set(id, { resolve, reject });

    const msg: KeysRegisterActionMessage = {
      type: 'keys.registerAction',
      id,
      action,
    };
    window.parent.postMessage(msg, '*');

    setTimeout(() => {
      if (pendingRegistrations.delete(id)) {
        reject(new Error('keys.registerAction timed out'));
      }
    }, 30_000);
  });
}

/**
 * Unregister a previously registered action.
 * Fire-and-forget -- no response expected.
 */
export function unregisterAction(actionId: string): void {
  const msg: KeysUnregisterActionMessage = {
    type: 'keys.unregisterAction',
    actionId,
  };
  window.parent.postMessage(msg, '*');
}

/**
 * Register a local handler for a bound action.
 * Returns a Subscription with close() to unregister.
 */
export function onAction(actionId: string, callback: () => void): Subscription {
  if (!actionHandlers.has(actionId)) {
    actionHandlers.set(actionId, new Set());
  }
  actionHandlers.get(actionId)!.add(callback);

  return {
    close(): void {
      const handlers = actionHandlers.get(actionId);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) actionHandlers.delete(actionId);
      }
    },
  };
}

/**
 * Install the keys shim: capture-phase keydown listener for smart forwarding.
 *
 * @returns cleanup function that removes the listener
 */
export function installKeysShim(): () => void {
  if (installed && activeCleanup) {
    return activeCleanup;
  }

  document.addEventListener('keydown', handleKeydown, true);
  installed = true;

  activeCleanup = () => {
    document.removeEventListener('keydown', handleKeydown, true);
    suppressMap.clear();
    actionHandlers.clear();
    pendingRegistrations.clear();
    installed = false;
    activeCleanup = null;
  };

  return activeCleanup;
}
