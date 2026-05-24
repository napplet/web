/**
 * @napplet/nub/class -- Class NUB module barrel.
 *
 * Exposes the `class.assigned` wire type, the installer, the dispatcher
 * handler, and the readonly SDK getter. Importing this barrel registers
 * the `class` domain with the core dispatch singleton AND wires the
 * `class.assigned` handler -- so a napplet that imports
 * `@napplet/nub/class` gets the full runtime surface in one line.
 *
 * Per NUB-CLASS.md: this NUB has exactly one wire message (shell -> napplet,
 * terminal). The barrel's registerNub side-effect wires it directly rather
 * than requiring a separate `installClassShim()` call for dispatch routing
 * -- the installer is only responsible for the window mount.
 *
 * @example
 * ```ts
 * import type { ClassAssignedMessage, NappletClass } from '@napplet/nub/class';
 * import { DOMAIN, installClassShim, getClass } from '@napplet/nub/class';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  ClassMessage,
  ClassAssignedMessage,
  NappletClass,
  ClassNubMessage,
} from './types.js';

export {
  installClassShim,
  handleClassMessage,
} from './shim.js';

export { getClass } from './sdk.js';

import { registerNub, type NubHandler } from '@napplet/core';
import { DOMAIN } from './types.js';
import { handleClassMessage } from './shim.js';

/**
 * Register the class domain with the core dispatch singleton and wire the
 * class.assigned handler in one step. After this module is evaluated, the
 * central dispatcher routes `class.assigned` envelopes straight to
 * handleClassMessage, which updates module-local state exposed via
 * window.napplet.class (after installClassShim() mounts the getter).
 *
 * The `as unknown as NubHandler` cast bridges handleClassMessage's
 * dispatcher-compatible signature (`{ type: string; [key: string]: unknown }`,
 * matching the resource NUB precedent) with the narrower `NappletMessage`
 * parameter that `NubHandler` expects (`{ type: string }`). TypeScript
 * parameter contravariance rejects the direct assignment, but at runtime any
 * envelope arriving here is a plain object so the structural widening is
 * sound. The alternative would require widening NubHandler in @napplet/core,
 * which is out of scope for Phase 137.
 */
registerNub(DOMAIN, handleClassMessage as unknown as NubHandler);
