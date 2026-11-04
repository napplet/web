/** NAP-NAVIGATION types, runtime installer and application helpers.
 * @see https://github.com/napplet/naps/pull/126
 * @module
 */
export { DOMAIN } from './types.js';
export type * from './types.js';
export { installNavigationShim, handleNavigationMessage } from './shim.js';
export { navigationReport, navigationGet, report, get } from './sdk.js';
