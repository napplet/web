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
 * String literal union of the twelve NAP (Nostr Applet Protocol) domains.
 * Each domain corresponds to a capability namespace that a shell may support.
 *
 * | Domain     | Scope                                              |
 * |------------|----------------------------------------------------|
 * | `relay`    | NIP-01 relay proxy (subscribe, publish)            |
 * | `identity` | Read-only user identity queries                    |
 * | `storage`  | Scoped key-value storage proxy                     |
 * | `ifc`      | Inter-frame communication (IFC peer bus)           |
 * | `theme`    | Theme tokens and appearance settings               |
 * | `keys`     | Keyboard forwarding and action keybindings         |
 * | `media`    | Media session control and playback                 |
 * | `notify`   | Shell-rendered notifications                       |
 * | `config`   | Per-napplet declarative configuration              |
 * | `resource` | Byte-fetching primitive (URL → Blob)               |
 * | `connect`  | User-gated direct network access (CSP connect-src) |
 * | `class`    | Shell-assigned napplet class / security posture    |
 *
 * @example
 * ```ts
 * const domain: NapDomain = 'relay';
 * const isValid = NAP_DOMAINS.includes(domain); // true
 * ```
 */
export type NapDomain = 'relay' | 'identity' | 'storage' | 'ifc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'connect' | 'class';

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
export const NAP_DOMAINS: readonly NapDomain[] = ['relay', 'identity', 'storage', 'ifc', 'theme', 'keys', 'media', 'notify', 'config', 'resource', 'connect', 'class'] as const;

/**
 * Namespaced capability string for {@link ShellSupports.supports}.
 *
 * Accepts NAP capability prefixes plus bare domain shorthand:
 *
 * | Prefix  | Example             | Meaning                        |
 * |---------|---------------------|--------------------------------|
 * | `nap:`  | `'nap:relay'`       | Shell implements the relay NAP |
 * | `perm:` | `'perm:popups'`     | Shell grants popup permission  |
 * | `perm:` | `'perm:strict-csp'` | **@deprecated (v0.29.0)** — superseded by `nap:connect` + `nap:class`. Shell enforces strict CSP posture (v0.28.0). |
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
 * const csp: NamespacedCapability = 'perm:strict-csp';
 * ```
 *
 * @deprecated `perm:strict-csp` — superseded in v0.29.0 by `nap:connect` + `nap:class`.
 * Shells implementing NAP-CONNECT and NAP-CLASS replace the v0.28.0 `perm:strict-csp` model.
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
 * window.napplet.shell.supports('ifc', protocol);
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
 * shell.supports('ifc', 'NAP-01');
 * ```
 */
export interface ShellSupports {
  /** Check whether the shell supports a NAP capability, permission, or numbered protocol. */
  supports(capability: NamespacedCapability, protocol?: ProtocolId): boolean;
}

/**
 * Type for the `window.napplet.shell` namespace.
 * Extends {@link ShellSupports} to provide capability queries.
 *
 * @example
 * ```ts
 * // In a napplet iframe:
 * if (window.napplet.shell.supports('nap:relay')) {
 *   const signed = await window.napplet.relay.publish(template);
 * }
 *
 * // Bare NAP domain shorthand also works:
 * if (window.napplet.shell.supports('relay')) { ... }
 *
 * // Permission queries:
 * window.napplet.shell.supports('perm:popups');
 *
 * // NAP-NN protocol queries:
 * window.napplet.shell.supports('ifc', 'NAP-01');
 * ```
 */
export interface NappletGlobalShell extends ShellSupports {}
