/** Application-side GAMEPAD helpers; the runtime injects the domain. */
import type { GamepadSlot, GamepadState, NappletGlobal, Subscription } from '@napplet/core';

function requireGamepad(): NonNullable<NappletGlobal['gamepad']> {
  const napplet = (window as Window & { napplet?: NappletGlobal }).napplet;
  if (!napplet?.gamepad) throw new Error('window.napplet.gamepad is unavailable -- runtime did not inject this domain');
  return napplet.gamepad;
}

/**
 * Read the runtime's latest controller slots without a wire request.
 * @returns Complete cached slots.
 * @example const pads = gamepadGetGamepads();
 */
export function gamepadGetGamepads(): GamepadSlot[] { return requireGamepad().getGamepads(); }

/**
 * Read whether the runtime can access controllers.
 * @returns Cached availability; true before the first state.
 * @example if (gamepadAvailable()) renderControllers();
 */
export function gamepadAvailable(): boolean { return requireGamepad().available; }

/**
 * Read whether this napplet currently receives live controller values.
 * @returns Cached input focus; false before the first state.
 * @example if (gamepadFocused()) updatePlayers();
 */
export function gamepadFocused(): boolean { return requireGamepad().focused; }

/**
 * Observe shell-provided controller snapshots.
 * @param handler Receives complete focused or neutral snapshots.
 * @returns Subscription with close() to stop local delivery.
 * @example const sub = gamepadOnChange((state) => render(state));
 */
export function gamepadOnChange(handler: (state: GamepadState) => void): Subscription { return requireGamepad().onChange(handler); }
