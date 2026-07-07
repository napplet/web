/**
 * Napplet NAP keys -- Keys NAP module.
 *
 * Exports typed message definitions for the keys domain, shim installer,
 * SDK helpers, and registers the 'keys' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { KeysForwardMessage, KeysNapMessage, Action } from '@napplet/nap/keys';
 * import { DOMAIN, installKeysShim, keysRegisterAction } from '@napplet/nap/keys';
 * ```
 *
 * @module
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  Action,
  RegisterResult,
  KeyBinding,
  KeysMessage,
  KeysForwardMessage,
  KeysRegisterActionMessage,
  KeysRegisterActionResultMessage,
  KeysUnregisterActionMessage,
  KeysBindingsMessage,
  KeysActionMessage,
  KeysRequestMessage,
  KeysResultMessage,
  KeysNapMessage,
} from './types.js';

export {
  installKeysShim,
  handleKeysMessage,
  registerAction,
  unregisterAction,
  onAction,
} from './shim.js';

export {
  keysRegisterAction,
  keysUnregisterAction,
  keysOnAction,
  keysRegister,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the keys domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'keys'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
