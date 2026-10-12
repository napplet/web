/** NAP-GAMEPAD package entrypoint. Canonical proposal: https://github.com/napplet/naps/pull/108. */
import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';
export { DOMAIN } from './types.js';
export type * from './types.js';
export { gamepad, getGamepads, onChange, installGamepadShim, handleGamepadMessage } from './shim.js';
export { gamepadGetGamepads, gamepadAvailable, gamepadFocused, gamepadOnChange } from './sdk.js';
export { createGamepadStateTools, isGamepadState, copyGamepadState } from './state.js';

registerNap(DOMAIN, () => { /* The runtime supplies the domain handler. */ });
