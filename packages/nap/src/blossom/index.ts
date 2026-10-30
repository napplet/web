/** NAP-BLOSSOM package entrypoint. Canonical proposal: https://github.com/napplet/naps/pull/71. */
import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';
export { DOMAIN } from './types.js';
export type * from './types.js';
export * from './shim.js';
export {
  blossomCheck,
  blossomGet,
  blossomCheckUpload,
  blossomUpload,
  blossomMirror,
  blossomCheckMedia,
  blossomMedia,
  blossomList,
  blossomDelete,
  blossomServers,
  blossomAddServer,
  blossomRemoveServer,
  blossomReorderServers,
  blossomParseUri,
  blossomFormatUri,
} from './sdk.js';

registerNap(DOMAIN, () => { /* The runtime supplies the domain handler. */ });
