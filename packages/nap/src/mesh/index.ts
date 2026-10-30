/** NAP-MESH package entrypoint. See https://github.com/napplet/naps/pull/122. */
export { DOMAIN } from './types.js';
export type * from './types.js';
export { installMeshShim, handleMeshMessage, info, publish, subscribe, blobs } from './shim.js';
export { meshInfo, meshPublish, meshSubscribe, meshBlobs } from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

registerNap(DOMAIN, () => { /* Shell or shim supplies the runtime handler. */ });
