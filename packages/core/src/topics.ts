/**
 * @napplet/core — Topic constants for the napplet INC-PEER event bus.
 *
 * These constants define the topic strings used in INC-PEER
 * events for shell commands, state operations, audio,
 * and UI coordination.
 */

/**
 * Built-in topic constants for the napplet shell INC-PEER protocol.
 *
 * @example
 * ```ts
 * import { TOPICS } from '@napplet/core';
 *
 * // Open a profile view via INC-PEER
 * shim.publish({ kind: 29003, tags: [['t', TOPICS.PROFILE_OPEN]], content: '{}' });
 * ```
 *
 * ## Topic Prefix Conventions
 *
 * Topic strings follow a prefix convention that signals message direction:
 *
 * | Prefix | Direction | Meaning |
 * |--------|-----------|---------|
 * | `shell:*` | napplet → shell | Commands sent by a napplet to the shell |
 * | `napplet:*` | shell → napplet | Responses/notifications sent by shell to napplet |
 * | `{service}:*` | bidirectional | Service-scoped messages; direction is per-topic |
 *
 * Examples of `{service}:*` prefixes: `auth:*`, `stream:*`, `profile:*`,
 * `wm:*`, `keybinds:*`, `chat:*`, `audio:*`.
 */
export const TOPICS = {
  STREAM_CHANNEL_SWITCH: 'stream:channel-switch',
  STREAM_CURRENT_CONTEXT_GET: 'stream:current-context-get',
  STREAM_CURRENT_CONTEXT: 'stream:current-context',

  PROFILE_OPEN: 'profile:open',

  KEYBINDS_GET: 'keybinds:get-all',
  KEYBINDS_ALL: 'keybinds:all',
  KEYBINDS_UPDATE: 'keybinds:update',
  KEYBINDS_RESET: 'keybinds:reset',
  KEYBINDS_CAPTURE_START: 'keybinds:capture-start',
  KEYBINDS_CAPTURE_END: 'keybinds:capture-end',

  WM_FOCUSED_WINDOW_CHANGED: 'wm:focused-window-changed',

  CHAT_OPEN_DM: 'chat:open-dm',

} as const;

/** Key type for the TOPICS constant object. */
export type TopicKey = keyof typeof TOPICS;

/** Value type for the TOPICS constant object. */
export type TopicValue = (typeof TOPICS)[TopicKey];
