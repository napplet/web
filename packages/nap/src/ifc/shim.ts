/**
 * @napplet/nap/ifc -- deprecated compatibility shim for NAP-INC.
 *
 * @deprecated Use `@napplet/nap/inc/shim`.
 */

export {
  installIncShim as installIfcShim,
  handleIncEvent as handleIfcEvent,
  emit,
  on,
} from '../inc/shim.js';

