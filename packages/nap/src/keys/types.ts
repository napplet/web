/**
 * Napplet NAP keys types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/keys -- Keyboard forwarding and action keybinding message types
 * for the JSON envelope wire protocol.
 *
 * Defines 6 message types for keyboard interaction:
 * - Napplet -> Shell: forward, registerAction, unregisterAction
 * - Shell -> Napplet: registerAction.result, bindings, action
 *
 * All types form a discriminated union on the `type` field.
 * Keyboard forwarding enables shell-level hotkeys in sandboxed iframes.
 * Action registration lets napplets declare named actions the shell can bind to keys.
 */

import type { NappletMessage } from '@napplet/core';

/** The NAP domain name for keys messages. */
export const DOMAIN = 'keys' as const;

/**
 * A napplet-declared named action that the shell can bind to a key.
 *
 * @example
 * ```ts
 * const saveAction: Action = {
 *   id: 'editor.save',
 *   label: 'Save',
 *   defaultKey: 'Ctrl+S',
 * };
 * ```
 */
export interface Action {
  /** Unique action identifier, e.g. "editor.save", "viewer.zoom-in". */
  id: string;
  /** Human-readable label for the shell's keybinding UI. */
  label: string;
  /** Suggested binding hint, e.g. "Ctrl+S" -- shell MAY ignore. */
  defaultKey?: string;
}

/**
 * Shell response to an action registration request.
 *
 * @example
 * ```ts
 * const result: RegisterResult = {
 *   actionId: 'editor.save',
 *   binding: 'Ctrl+S',
 * };
 * ```
 */
export interface RegisterResult {
  /** The registered action's identifier. */
  actionId: string;
  /** Key combo the shell assigned, if any (undefined = unbound). */
  binding?: string;
}

/**
 * An action-to-key mapping in the bindings list.
 *
 * @example
 * ```ts
 * const binding: KeyBinding = {
 *   actionId: 'editor.save',
 *   key: 'Ctrl+S',
 * };
 * ```
 */
export interface KeyBinding {
  /** The action this binding maps to. */
  actionId: string;
  /** Key combo string, e.g. "Ctrl+S". */
  key: string;
}

/**
 * Base interface for all keys NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface KeysMessage extends NappletMessage {
  /** Message type in "keys.<action>" format. */
  type: `keys.${string}`;
}

/**
 * Forward a keystroke from the napplet to the shell.
 * Fire-and-forget (no correlation ID). High frequency -- one per keystroke.
 *
 * @example
 * ```ts
 * const msg: KeysForwardMessage = {
 *   type: 'keys.forward',
 *   key: 'j',
 *   code: 'KeyJ',
 *   ctrl: false,
 *   alt: false,
 *   shift: false,
 *   meta: false,
 * };
 * ```
 */
export interface KeysForwardMessage extends KeysMessage {
  type: 'keys.forward';
  /** KeyboardEvent.key -- character intent (e.g., "s", "Enter", "ArrowDown"). */
  key: string;
  /** KeyboardEvent.code -- physical key position (e.g., "KeyS", "Enter"). */
  code: string;
  /** KeyboardEvent.ctrlKey. */
  ctrl: boolean;
  /** KeyboardEvent.altKey. */
  alt: boolean;
  /** KeyboardEvent.shiftKey. */
  shift: boolean;
  /** KeyboardEvent.metaKey. */
  meta: boolean;
}

/**
 * Register a named action that the shell can bind to a key.
 * Uses `id` for correlation with the result message.
 *
 * @example
 * ```ts
 * const msg: KeysRegisterActionMessage = {
 *   type: 'keys.registerAction',
 *   id: 'r1',
 *   action: { id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S' },
 * };
 * ```
 */
export interface KeysRegisterActionMessage extends KeysMessage {
  type: 'keys.registerAction';
  /** Correlation ID. */
  id: string;
  /** The action to register. */
  action: Action;
}

/**
 * Unregister a previously registered action.
 * Fire-and-forget (no correlation ID).
 *
 * @example
 * ```ts
 * const msg: KeysUnregisterActionMessage = {
 *   type: 'keys.unregisterAction',
 *   actionId: 'editor.save',
 * };
 * ```
 */
export interface KeysUnregisterActionMessage extends KeysMessage {
  type: 'keys.unregisterAction';
  /** The action to unregister. */
  actionId: string;
}

/**
 * Result of a keys.registerAction request.
 * Carries the same correlation `id` as the request.
 *
 * @example
 * ```ts
 * const msg: KeysRegisterActionResultMessage = {
 *   type: 'keys.registerAction.result',
 *   id: 'r1',
 *   actionId: 'editor.save',
 *   binding: 'Ctrl+S',
 * };
 * ```
 */
export interface KeysRegisterActionResultMessage extends KeysMessage {
  type: 'keys.registerAction.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The registered action's identifier. */
  actionId: string;
  /** Key combo the shell assigned, if any. */
  binding?: string;
  /** Error message on failure (e.g., "duplicate action ID"). */
  error?: string;
}

/**
 * Shell-initiated push of the complete binding list for this napplet.
 * Sent whenever bindings change (initial load, user rebind, action register/unregister).
 * Contains the complete list -- not a diff.
 *
 * @example
 * ```ts
 * const msg: KeysBindingsMessage = {
 *   type: 'keys.bindings',
 *   bindings: [
 *     { actionId: 'editor.save', key: 'Ctrl+S' },
 *     { actionId: 'editor.undo', key: 'Ctrl+Z' },
 *   ],
 * };
 * ```
 */
export interface KeysBindingsMessage extends KeysMessage {
  type: 'keys.bindings';
  /** Complete binding list for this napplet. */
  bindings: KeyBinding[];
}

/**
 * Shell-initiated push to trigger an action in the napplet.
 * Sent when the user presses a globally-bound key that targets this napplet's action.
 *
 * @example
 * ```ts
 * const msg: KeysActionMessage = {
 *   type: 'keys.action',
 *   actionId: 'editor.save',
 * };
 * ```
 */
export interface KeysActionMessage extends KeysMessage {
  type: 'keys.action';
  /** The action to trigger. */
  actionId: string;
}

/** Napplet -> Shell keys request messages. */
export type KeysRequestMessage =
  | KeysForwardMessage
  | KeysRegisterActionMessage
  | KeysUnregisterActionMessage;

/** Shell -> Napplet keys result/push messages. */
export type KeysResultMessage =
  | KeysRegisterActionResultMessage
  | KeysBindingsMessage
  | KeysActionMessage;

/** All keys NAP message types (discriminated union on `type` field). */
export type KeysNapMessage = KeysRequestMessage | KeysResultMessage;
