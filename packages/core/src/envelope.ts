/**
 * @napplet/core -- JSON envelope types for the napplet-shell wire protocol.
 *
 * Defines the base types for the JSON envelope wire format introduced
 * in NIP-5D v4. All messages between napplet and shell use a `type`
 * field as a discriminant in `domain.action` format.
 *
 * @example
 * ```ts
 * import type { NappletMessage, NapDomain } from '@napplet/core';
 * import { NAP_DOMAINS } from '@napplet/core';
 * ```
 *
 * @packageDocumentation
 */

/**
 * Base interface for all JSON envelope messages exchanged between
 * napplet and shell. The `type` field is a string discriminant
 * in `domain.action` format (e.g., `"relay.subscribe"`, `"storage.get"`).
 *
 * Concrete message types extend this interface with domain-specific payload fields.
 *
 * @example
 * ```ts
 * const msg: NappletMessage = { type: 'relay.subscribe' };
 *
 * // Concrete message with payload:
 * interface RelaySubscribe extends NappletMessage {
 *   type: 'relay.subscribe';
 *   filters: NostrFilter[];
 * }
 * ```
 */
export interface NappletMessage {
  /** Message type discriminant in "domain.action" format (e.g., "relay.subscribe", "storage.get") */
  type: string;
}

/**
 * String literal union of the active NAP (Nostr Applet Protocol) domains.
 * Each domain corresponds to a capability namespace that a shell may support.
 *
 * | Domain     | Scope                                              |
 * |------------|----------------------------------------------------|
 * | `relay`    | NIP-01 relay proxy (subscribe, publish)            |
 * | `identity` | Read-only user identity queries                    |
 * | `storage`  | Scoped key-value storage proxy                     |
 * | `inc`      | Inter-napplet communication (INC peer bus)           |
 * | `theme`    | Theme tokens and appearance settings               |
 * | `keys`     | Keyboard forwarding and action keybindings         |
 * | `media`    | Media session control and playback                 |
 * | `notify`   | Shell-rendered notifications                       |
 * | `config`   | Per-napplet declarative configuration              |
 * | `resource` | Byte-fetching primitive (URL → Blob)               |
 * | `ble`      | Runtime-mediated Bluetooth LE/GATT sessions       |
 * | `webrtc`   | Runtime-mediated WebRTC signaling and data sessions |
 * | `link`     | Shell-mediated user-visible link opening           |
 * | `lists`    | Runtime-mediated NIP-51 list mutations            |
 * | `serial`   | Runtime-mediated serial device access             |
 * | `common`   | Common social actions                              |
 * | `dm`       | Runtime-mediated direct messages                  |
 *
 * @example
 * ```ts
 * const domain: NapDomain = 'relay';
 * const isValid = NAP_DOMAINS.includes(domain); // true
 * ```
 */
export type NapDomain = 'relay' | 'identity' | 'storage' | 'inc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'cvm' | 'outbox' | 'upload' | 'intent' | 'ble' | 'webrtc' | 'link' | 'lists' | 'serial' | 'common' | 'dm';

/**
 * Runtime-accessible constant array of all NAP domain names.
 * Useful for iteration, validation, and runtime injection configuration.
 *
 * @example
 * ```ts
 * const selected = NAP_DOMAINS.filter((domain) => domain !== 'ble');
 * ```
 */
export const NAP_DOMAINS: readonly NapDomain[] = ['relay', 'identity', 'storage', 'inc', 'theme', 'keys', 'media', 'notify', 'config', 'resource', 'cvm', 'outbox', 'upload', 'intent', 'ble', 'webrtc', 'link', 'lists', 'serial', 'common', 'dm'] as const;
