/**
 * Side-effect entrypoint that installs `window.napplet` for bundled napplet code.
 *
 * Importing this module installs all currently bundled domain shims. Hosts that
 * need an explicit domain allowlist should use `@napplet/shim/prelude`.
 *
 * @module
 */

export type { NappletShimInstallOptions } from './runtime.js';
export { installNappletGlobal } from './runtime.js';

import { installNappletGlobal } from './runtime.js';

installNappletGlobal();
