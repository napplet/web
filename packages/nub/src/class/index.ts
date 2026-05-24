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

import { registerNub } from '@napplet/core';
import { DOMAIN } from './types.js';
import { handleClassMessage } from './shim.js';

registerNub(DOMAIN, handleClassMessage);
