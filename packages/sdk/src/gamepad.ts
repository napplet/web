/** Application-side cached controller input. Guard optional domain presence before use. */
import type { GamepadApi, GamepadSlot, GamepadState, Subscription } from '@napplet/core';
import { requireDomain } from './require-napplet.js';

/**
 * Controller snapshots delivered by the runtime to this napplet.
 * @example
 * import { gamepad } from '@napplet/sdk/gamepad';
 * const pads = gamepad.getGamepads();
 */
export const gamepad: GamepadApi = {
  get available(): boolean { return requireDomain('gamepad').available; },
  get focused(): boolean { return requireDomain('gamepad').focused; },
  /**
   * Read the complete cached slot list synchronously.
   * @returns Latest controller slots.
   * @example const pads = gamepad.getGamepads();
   */
  getGamepads(): GamepadSlot[] { return requireDomain('gamepad').getGamepads(); },
  /**
   * Observe complete snapshots, including neutral focus-loss states.
   * @param handler Receives each state update.
   * @returns Local subscription handle.
   * @example const sub = gamepad.onChange((state) => render(state));
   */
  onChange(handler: (state: GamepadState) => void): Subscription { return requireDomain('gamepad').onChange(handler); },
};

export type { Gamepad, GamepadApi, GamepadButton, GamepadSlot, GamepadState, GamepadUnavailableReason } from '@napplet/core';
export { gamepadGetGamepads, gamepadAvailable, gamepadFocused, gamepadOnChange } from '@napplet/nap/gamepad/sdk';
