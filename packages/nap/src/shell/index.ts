/** @napplet/nap/shell — optional environment and readiness; see the living NAP-SHELL. */
export * from './types.js';
export { installShellShim, handleShellMessage, ready, onReady, supports, shell } from './shim.js';
export { shellReady, shellOnReady, shellSupports } from './sdk.js';
