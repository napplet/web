/** Runtime-mediated NIP-35 discovery and torrent jobs. @module */
export * from './types.js';
export * from './shim.js';
export * from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

registerNap(DOMAIN, () => { /* The runtime installs the actual handler. */ });
