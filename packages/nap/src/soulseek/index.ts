/** Runtime-mediated Soulseek discovery and downloads. Canonical proposal: https://github.com/napplet/naps/pull/135. @module */
export * from './types.js';
export * from './shim.js';
export * from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

registerNap(DOMAIN, () => { /* The runtime installs the actual handler. */ });
