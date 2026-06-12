/**
 * @napplet/nap/class -- Class NAP module barrel.
 *
 * Exposes the `class.assigned` wire type, the installer, the dispatcher
 * handler, and the readonly SDK getter. Importing this barrel registers
 * the `class` domain with the core dispatch singleton AND wires the
 * `class.assigned` handler -- so a napplet that imports
 * `@napplet/nap/class` gets the full runtime surface in one line.
 *
 * Per NAP-CLASS.md: this NAP has exactly one wire message (shell -> napplet,
 * terminal). The barrel's registerNap side-effect wires it directly rather
 * than requiring a separate `installClassShim()` call for dispatch routing
 * -- the installer is only responsible for the window mount.
 *
 * @example
 * ```ts
 * import type { ClassAssignedMessage, NappletClass } from '@napplet/nap/class';
 * import { DOMAIN, installClassShim, getClass } from '@napplet/nap/class';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  ClassMessage,
  ClassAssignedMessage,
  NappletClass,
  ClassNapMessage,
} from './types.js';

export {
  installClassShim,
  handleClassMessage,
} from './shim.js';

export { getClass } from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';
import { handleClassMessage } from './shim.js';

registerNap(DOMAIN, handleClassMessage);
