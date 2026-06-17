/**
 * @napplet/nap/shell -- NAP-SHELL domain types (the foundational handshake).
 *
 * NAP-SHELL is the one mandatory, foundational NAP: it defines `shell.supports()`
 * itself and is therefore the single domain that is NOT discoverable via
 * `supports()` (and NOT a member of `NAP_DOMAINS`). The canonical type shapes
 * live in `@napplet/core` (the single source of truth); this subpath provides the
 * domain-addressed entry point and the `DOMAIN` constant, mirroring how the other
 * NAP subpaths own their domain surface.
 *
 * @example
 * ```ts
 * import type { ShellEnvironment, NappletShell } from '@napplet/nap/shell';
 * import { DOMAIN } from '@napplet/nap/shell'; // 'shell'
 * ```
 */

/** The NAP domain name for the foundational shell handshake. */
export const DOMAIN = 'shell' as const;

// Re-export the canonical NAP-SHELL shapes from core (single source of truth).
export type {
  ShellCapabilities,
  ShellEnvironment,
  NappletShell,
  ShellReadyMessage,
  ShellInitMessage,
} from '@napplet/core';
