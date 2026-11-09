/** NAP-BLOSSOM wrappers for runtime-mediated blob access and local URI helpers. */
import type { BlossomApi } from '@napplet/core';
import * as helpers from '@napplet/nap/blossom/sdk';

/**
 * Low-level Blossom operations delegated to the current injected domain.
 * @example
 * import { blossom } from '@napplet/sdk';
 * if (window.napplet?.blossom) await blossom.servers();
 */
export const blossom: BlossomApi = {
  check: helpers.blossomCheck,
  get: helpers.blossomGet,
  checkUpload: helpers.blossomCheckUpload,
  upload: helpers.blossomUpload,
  mirror: helpers.blossomMirror,
  checkMedia: helpers.blossomCheckMedia,
  media: helpers.blossomMedia,
  list: helpers.blossomList,
  delete: helpers.blossomDelete,
  servers: helpers.blossomServers,
  addServer: helpers.blossomAddServer,
  removeServer: helpers.blossomRemoveServer,
  reorderServers: helpers.blossomReorderServers,
  parseUri: helpers.blossomParseUri,
  formatUri: helpers.blossomFormatUri,
};

export {
  blossomCheck, blossomCheck as check,
  blossomGet, blossomGet as get,
  blossomCheckUpload, blossomCheckUpload as checkUpload,
  blossomUpload, blossomUpload as upload,
  blossomMirror, blossomMirror as mirror,
  blossomCheckMedia, blossomCheckMedia as checkMedia,
  blossomMedia, blossomMedia as media,
  blossomList, blossomList as list,
  blossomDelete, blossomDelete as delete,
  blossomServers, blossomServers as servers,
  blossomAddServer, blossomAddServer as addServer,
  blossomRemoveServer, blossomRemoveServer as removeServer,
  blossomReorderServers, blossomReorderServers as reorderServers,
  blossomParseUri, blossomParseUri as parseUri,
  blossomFormatUri, blossomFormatUri as formatUri,
} from '@napplet/nap/blossom/sdk';
export type * from '@napplet/nap/blossom/types';
