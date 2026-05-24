/**
 * @napplet/core -- JSON envelope types for the napplet-shell wire protocol.
 *
 * Defines the base types for the JSON envelope wire format introduced
 * in NIP-5D v4. All messages between napplet and shell use a `type`
 * field as a discriminant in `domain.action` format.
 *
 * @example
 * ```ts
 * import type { NappletMessage, NubDomain, ShellSupports } from '@napplet/core';
 * import { NUB_DOMAINS } from '@napplet/core';
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
 * String literal union of the twelve NUB (Napplet Unified Blueprint) domains.
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
 * const domain: NubDomain = 'relay';
 * const isValid = NUB_DOMAINS.includes(domain); // true
 * ```
 */
export type NubDomain = 'relay' | 'identity' | 'storage' | 'ifc' | 'theme' | 'keys' | 'media' | 'notify' | 'config' | 'resource' | 'connect' | 'class';

/**
 * Runtime-accessible constant array of all NUB domain names.
 * Useful for iteration, validation, and capability enumeration.
 *
 * @example
 * ```ts
 * for (const domain of NUB_DOMAINS) {
 *   console.log(`Checking support for: ${domain}`);
 * }
 * ```
 */
export const NUB_DOMAINS: readonly NubDomain[] = ['relay', 'identity', 'storage', 'ifc', 'theme', 'keys', 'media', 'notify', 'config', 'resource', 'connect', 'class'] as const;

/**
 * Namespaced capability string for {@link ShellSupports.supports}.
 *
 * Accepts two prefix namespaces plus bare NUB domain shorthand:
 *
 * | Prefix  | Example             | Meaning                        |
 * |---------|---------------------|--------------------------------|
 * | `nub:`  | `'nub:relay'`       | Shell implements the relay NUB |
 * | `perm:` | `'perm:popups'`     | Shell grants popup permission  |
 * | `perm:` | `'perm:strict-csp'` | **@deprecated (v0.29.0)** — superseded by `nub:connect` + `nub:class`. Shell enforces strict CSP posture (v0.28.0). |
 * | *(bare)*| `'relay'`           | Shorthand for `'nub:relay'`    |
 *
 * Bare strings are valid only for NUB domains.
 * Permissions MUST use the `perm:` prefix.
 *
 * @example
 * ```ts
 * const cap: NamespacedCapability = 'nub:relay';
 * const bare: NamespacedCapability = 'relay'; // shorthand OK
 * const perm: NamespacedCapability = 'perm:popups';
 * const csp: NamespacedCapability = 'perm:strict-csp';
 * ```
 *
 * @deprecated `perm:strict-csp` — superseded in v0.29.0 by `nub:connect` + `nub:class`.
 * Shells implementing NUB-CONNECT and NUB-CLASS replace the v0.28.0 `perm:strict-csp` model.
 */
export type NamespacedCapability =
  | NubDomain
  | `nub:${NubDomain}`
  | `perm:${string}`;

/**
 * Interface for the shell capability query API.
 * Allows napplets to check whether the shell supports a NUB domain
 * or a permission at runtime.
 *
 * @example
 * ```ts
 * // NUB domain queries (bare shorthand or prefixed):
 * shell.supports('relay');       // shorthand for 'nub:relay'
 * shell.supports('nub:storage'); // explicit NUB prefix
 *
 * // Permission queries:
 * shell.supports('perm:popups'); // popup permission
 * ```
 */
export interface ShellSupports {
  /** Check whether the shell supports a NUB capability or permission. */
  supports(capability: NamespacedCapability): boolean;
}

/**
 * Type for the `window.napplet.shell` namespace.
 * Extends {@link ShellSupports} to provide capability queries.
 *
 * @example
 * ```ts
 * // In a napplet iframe:
 * if (window.napplet.shell.supports('nub:relay')) {
 *   const signed = await window.napplet.relay.publish(template);
 * }
 *
 * // Bare NUB domain shorthand also works:
 * if (window.napplet.shell.supports('relay')) { ... }
 *
 * // Permission queries:
 * window.napplet.shell.supports('perm:popups');
 * ```
 */
export interface NappletGlobalShell extends ShellSupports {}
