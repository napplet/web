/**
 * @napplet/core -- NAP-SHELL bootstrap handshake & capability negotiation types.
 *
 * NAP-SHELL is the **foundational** capability: it defines `shell.supports()`
 * itself and is therefore the one NAP that cannot be discovered through
 * `shell.supports()`. Every conformant runtime implements NAP-SHELL
 * unconditionally; a napplet MAY assume it is present.
 *
 * The handshake is two fire-and-forget messages: the napplet posts
 * {@link ShellReadyMessage} (`shell.ready`, no payload) to signal its receiver
 * is live, and the runtime replies exactly once with {@link ShellInitMessage}
 * (`shell.init`) carrying the environment — capabilities and services.
 * The napplet caches that environment, which is what makes
 * {@link NappletShell.supports} answerable **synchronously and locally**.
 *
 * @example
 * ```ts
 * import type { ShellEnvironment, NappletShell } from '@napplet/core';
 *
 * const env = await window.napplet.shell.ready();
 * if (window.napplet.shell.supports('relay')) { ... }
 * if (window.napplet.shell.supports('inc', 'NAP-2')) { ... }
 * ```
 *
 * @packageDocumentation
 */

import type { NappletMessage } from '../envelope.js';
import type { Subscription } from './nostr.js';

/**
 * The runtime's capability set, sufficient to answer
 * `supports(domain, protocol?)` for every capability it offers.
 *
 * The byte layout of the capability object is **not normative** in NAP-SHELL;
 * the `{ domains, protocols }` shape is the concrete wire shape used here.
 *
 * @example
 * ```ts
 * const caps: ShellCapabilities = {
 *   domains: ['relay', 'inc'],
 *   protocols: { inc: ['NAP-2'] },
 * };
 * ```
 */
export interface ShellCapabilities {
  /** NAP domains the runtime offers (e.g. `['relay', 'inc']`). */
  domains: string[];
  /** Per-domain numbered protocols the runtime speaks (e.g. `{ inc: ['NAP-2'] }`). */
  protocols: Record<string, string[]>;
}

/**
 * The environment the runtime delivers in `shell.init`: the capability set and
 * the named services it exposes for this napplet.
 *
 * @example
 * ```ts
 * const env: ShellEnvironment = {
 *   capabilities: { domains: ['relay'], protocols: {} },
 *   services: ['signer'],
 * };
 * ```
 */
export interface ShellEnvironment {
  /** Capability set sufficient to answer `supports(domain, protocol?)`. */
  capabilities: ShellCapabilities;
  /** Named services the runtime exposes for this napplet. */
  services: string[];
}

/**
 * The `window.napplet.shell` API — NAP-SHELL's foundational, mandatory surface.
 *
 * Unlike every other NAP domain, `shell` is not discoverable via
 * {@link NappletShell.supports}; it is always present.
 *
 * @example
 * ```ts
 * // Synchronous, local capability queries (no wire round-trip):
 * window.napplet.shell.supports('relay');         // true if the runtime offers relay
 * window.napplet.shell.supports('inc', 'NAP-2');  // true if it also speaks NAP-2
 * window.napplet.shell.supports('unknown');       // false — domain not offered
 *
 * // Await environment delivery, or react to it:
 * const env = await window.napplet.shell.ready();
 * const sub = window.napplet.shell.onReady((e) => start(e));
 * ```
 */
export interface NappletShell {
  /**
   * Synchronous capability query, answered from the cached environment.
   * `protocol` narrows a domain to a specific numbered wire protocol within it.
   * Returns `false` before the environment is delivered, and `false` for any
   * unknown domain or protocol.
   */
  supports(domain: string, protocol?: string): boolean;

  /** The named services the runtime exposes for this napplet (`[]` before init). */
  readonly services: readonly string[];

  /**
   * Resolves once the environment has been delivered. Repeated calls after
   * delivery resolve immediately with the same environment.
   */
  ready(): Promise<ShellEnvironment>;

  /**
   * Fires once when the environment is delivered (or immediately if already
   * delivered). Use to gate identity- or capability-dependent startup.
   */
  onReady(handler: (env: ShellEnvironment) => void): Subscription;
}

/**
 * Napplet → runtime liveness signal. Carries **no payload** by design — it is a
 * bare "my receiver is installed" ping. It MUST NOT carry napplet identity or
 * capability claims; identity is assigned by the runtime at napplet creation
 * (NIP-5A), not asserted over this channel.
 *
 * @example
 * ```ts
 * const msg: ShellReadyMessage = { type: 'shell.ready' };
 * ```
 */
export interface ShellReadyMessage extends NappletMessage {
  type: 'shell.ready';
}

/**
 * Runtime → napplet environment delivery. Sent **exactly once** in response to
 * the first {@link ShellReadyMessage}.
 *
 * @example
 * ```ts
 * const msg: ShellInitMessage = {
 *   type: 'shell.init',
 *   capabilities: { domains: ['relay'], protocols: {} },
 *   services: [],
 * };
 * ```
 */
export interface ShellInitMessage extends NappletMessage {
  type: 'shell.init';
  /** Capability set sufficient to answer `supports(domain, protocol?)`. */
  capabilities: ShellCapabilities;
  /** Named services the runtime exposes for this napplet. */
  services: string[];
}
