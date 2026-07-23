/**
 * @napplet/core — Topic constants for the napplet INC-PEER event bus.
 *
 * These constants define topic strings used by the INC event bus for shell
 * commands, local coordination, and advisory napplet conventions.
 */

/**
 * Built-in topic constants for the napplet INC event bus.
 *
 * @example
 * ```ts
 * import { TOPICS } from '@napplet/core';
 *
 * // Address a profile napplet using its advisory open convention.
 * emit(TOPICS.PROFILE_OPEN);
 * ```
 *
 * ## Topic Prefix Conventions
 *
 * Topic strings follow advisory direction and scope conventions. Convention
 * topic strings are opaque: their names do not prescribe a payload schema or
 * Nostr event kind.
 *
 * | Prefix | Direction | Meaning |
 * |--------|-----------|---------|
 * | `shell:*` | napplet → shell | Commands sent by a napplet to the shell |
 * | `napplet:<archetype>/<intent>` | bidirectional | Advisory convention names between napplets |
 * | `{service}:*` | bidirectional | Service-scoped messages; direction is per-topic |
 *
 * Examples of `{service}:*` prefixes: `auth:*`, `stream:*`, `profile:*`,
 * `wm:*`, `keybinds:*`, `chat:*`, `audio:*`.
 */
export const TOPICS = {
  STREAM_CHANNEL_SWITCH: 'stream:channel-switch',
  STREAM_CURRENT_CONTEXT_GET: 'stream:current-context-get',
  STREAM_CURRENT_CONTEXT: 'stream:current-context',

  NOTE_OPEN: 'napplet:note/open',
  PROFILE_OPEN: 'napplet:profile/open',
  DM_OPEN: 'napplet:dm/open',

  KEYBINDS_GET: 'keybinds:get-all',
  KEYBINDS_ALL: 'keybinds:all',
  KEYBINDS_UPDATE: 'keybinds:update',
  KEYBINDS_RESET: 'keybinds:reset',
  KEYBINDS_CAPTURE_START: 'keybinds:capture-start',
  KEYBINDS_CAPTURE_END: 'keybinds:capture-end',

  WM_FOCUSED_WINDOW_CHANGED: 'wm:focused-window-changed',

} as const;

/** Key type for the TOPICS constant object. */
export type TopicKey = keyof typeof TOPICS;

/** Value type for the TOPICS constant object. */
export type TopicValue = (typeof TOPICS)[TopicKey];
