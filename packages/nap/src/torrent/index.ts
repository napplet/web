/** Runtime-mediated torrent transfers and verified content access. @module */
export * from './types.js';
export * from './shim.js';
export * from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

registerNap(DOMAIN, () => { /* The runtime installs the actual handler. */ });
