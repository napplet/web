/** NAP-CATALOG layered entrypoint. Living proposal: https://github.com/napplet/naps/pull/95. */
import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

export { DOMAIN } from './types.js';
export type * from './types.js';
export { catalog, get, installCatalogShim, handleCatalogMessage } from './shim.js';
export { catalogGet } from './sdk.js';

registerNap(DOMAIN, () => { /* The runtime supplies the domain handler. */ });
