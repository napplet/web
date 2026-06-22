/**
 * @napplet/core -- JSON envelope types for the napplet-shell wire protocol.
 *
 * Defines the base types for the JSON envelope wire format introduced
 * in NIP-5D v4. All messages between napplet and shell use a `type`
 * field as a discriminant in `domain.action` format.
 *
 * @example
 * ```ts
 * import type { NappletMessage, NapDomain, NapProtocolId, ShellSupports } from '@napplet/core';
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
 * String literal union of the fifteen NAP (Nostr Applet Protocol) domains.
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
 * | `webrtc`   | Runtime-mediated WebRTC signaling and data sessions |
 *
 * @example
 * ```ts
 * const domain: NapDomain = 'relay';
 * const isValid = NAP_DOMAINS.includes(domain); // true
 * ```
 */
export type NapDomain = 'relay' | 'identity' | 'storage' | 'inc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'cvm' | 'outbox' | 'upload' | 'intent' | 'webrtc';

/**
 * Runtime-accessible constant array of all NAP domain names.
 * Useful for iteration, validation, and capability enumeration.
 *
 * @example
 * ```ts
 * for (const domain of NAP_DOMAINS) {
 *   console.log(`Checking support for: ${domain}`);
 * }
 * ```
 */
export const NAP_DOMAINS: readonly NapDomain[] = ['relay', 'identity', 'storage', 'inc', 'theme', 'keys', 'media', 'notify', 'config', 'resource', 'cvm', 'outbox', 'upload', 'intent', 'webrtc'] as const;

/**
 * Namespaced capability string for {@link ShellSupports.supports}.
 *
 * Accepts NAP capability prefixes plus bare domain shorthand:
 *
 * | Prefix  | Example             | Meaning                        |
 * |---------|---------------------|--------------------------------|
 * | `nap:`  | `'nap:relay'`       | Shell implements the relay NAP |
 * | `perm:` | `'perm:popups'`     | Shell grants popup permission  |
 * | *(bare)*| `'relay'`           | Shorthand for `'nap:relay'`    |
 *
 * Bare strings are valid only for NAP domains. Permissions MUST use the
 * `perm:` prefix.
 *
 * @example
 * ```ts
 * const cap: NamespacedCapability = 'nap:relay';
 * const bare: NamespacedCapability = 'relay'; // shorthand OK
 * const perm: NamespacedCapability = 'perm:popups';
 * ```
 */
export type NamespacedCapability =
  | NapDomain
  | `nap:${NapDomain}`
  | `perm:${string}`;

/**
 * Numbered NAP protocol identifier for napplet-to-napplet message semantics.
 *
 * NAP-WORD interfaces are discovered with the first `supports()` argument.
 * NAP-NN message protocols are negotiated with the optional second argument.
 *
 * @example
 * ```ts
 * const protocol: NapProtocolId = 'NAP-01';
 * window.napplet.shell.supports('inc', protocol);
 * ```
 */
export type NapProtocolId = `NAP-${number}`;

/** Numbered protocol identifier accepted by shell.supports(). */
export type ProtocolId = NapProtocolId;

/**
 * Interface for the shell capability query API.
 * Allows napplets to check whether the shell supports a NAP domain,
 * a permission, or a numbered NAP protocol at runtime.
 *
 * @example
 * ```ts
 * // NAP domain queries (bare shorthand or prefixed):
 * shell.supports('relay');       // shorthand for 'nap:relay'
 * shell.supports('nap:storage'); // explicit NAP prefix
 *
 * // Permission queries:
 * shell.supports('perm:popups'); // popup permission
 *
 * // Numbered protocol queries over an interface:
 * shell.supports('inc', 'NAP-01');
 * ```
 */
export interface ShellSupports {
  /** Check whether the shell supports a NAP capability, permission, or numbered protocol. */
  supports(capability: NamespacedCapability, protocol?: ProtocolId): boolean;
}
