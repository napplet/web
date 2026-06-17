/**
 * @napplet/nap/shell -- NAP-SHELL module (the foundational bootstrap handshake).
 *
 * NAP-SHELL is mandatory and foundational: it defines `shell.supports()` itself
 * and is the one domain NOT discoverable via `supports()` (and NOT a member of
 * `NAP_DOMAINS`). This subpath re-exports the canonical NAP-SHELL types from
 * `@napplet/core`, the pure shim helpers, and the SDK getters, and registers the
 * 'shell' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { ShellEnvironment, NappletShell } from '@napplet/nap/shell';
 * import { DOMAIN, createShellEnvironment, makeSupports, shellSupports } from '@napplet/nap/shell';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  ShellCapabilities,
  ShellEnvironment,
  NappletShell,
  ShellReadyMessage,
  ShellInitMessage,
} from './types.js';

export {
  createShellEnvironment,
  makeSupports,
  defaultSupports,
} from './shim.js';

export {
  shellSupports,
  shellServices,
  shellClass,
  shellReady,
  shellOnReady,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the foundational shell domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shim wires the real handshake handler at
 * runtime. `shell` is foundational (not in NAP_DOMAINS); registerNap accepts any
 * bare domain string and only populates the dispatch registry, so this is safe.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
