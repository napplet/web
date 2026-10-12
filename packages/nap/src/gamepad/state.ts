/** Validate complete NAP-GAMEPAD snapshots before placing them in the local cache. */
import type { GamepadState } from './types.js';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function numberIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Check the schema and focus-neutrality constraints of a controller snapshot.
 * @param value Untrusted snapshot payload.
 * @returns Whether it matches NAP-GAMEPAD Schemas and Shell Behavior.
 * @example if (isGamepadState(message)) handleGamepadMessage(message);
 */
export function isGamepadState(value: unknown): value is GamepadState {
  if (!record(value) || typeof value.available !== 'boolean' || typeof value.focused !== 'boolean' || !Array.isArray(value.pads)) return false;
  if (value.available) {
    if (value.reason !== undefined) return false;
  } else if (value.focused || (value.reason !== 'blocked' && value.reason !== 'unavailable')) return false;
  return Array.from(value.pads).every((pad: unknown) => {
    if (pad === null) return true;
    if (!record(pad) || !Number.isInteger(pad.index) || (pad.index as number) < 0 || typeof pad.id !== 'string' || typeof pad.mapping !== 'string' || pad.connected !== true) return false;
    if (typeof pad.timestamp !== 'number' || !Number.isFinite(pad.timestamp) || !Array.isArray(pad.axes) || !Array.isArray(pad.buttons)) return false;
    if (!value.focused && pad.timestamp !== 0) return false;
    if (!Array.from(pad.axes).every((axis: unknown) => numberIn(axis, -1, 1) && (value.focused || axis === 0))) return false;
    return Array.from(pad.buttons).every((button: unknown) => record(button) && numberIn(button.value, 0, 1) && typeof button.pressed === 'boolean' && typeof button.touched === 'boolean' && (value.focused || (button.value === 0 && !button.pressed && !button.touched)));
  });
}

/**
 * Copy a snapshot so local readers cannot mutate cached controller values.
 * @param state Validated complete snapshot.
 * @returns An independent state and all nested pad/button arrays.
 * @example const copy = copyGamepadState(state);
 */
export function copyGamepadState(state: GamepadState): GamepadState {
  return {
    available: state.available,
    focused: state.focused,
    ...(state.reason === undefined ? {} : { reason: state.reason }),
    pads: state.pads.map((pad) => pad === null ? null : {
      index: pad.index, id: pad.id, mapping: pad.mapping, connected: pad.connected,
      timestamp: pad.timestamp, axes: [...pad.axes], buttons: pad.buttons.map(({ value, pressed, touched }) => ({ value, pressed, touched })),
    }),
  };
}
