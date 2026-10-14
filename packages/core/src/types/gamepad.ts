/** Controller snapshots from the living NAP-GAMEPAD proposal: https://github.com/napplet/naps/pull/108. */
import type { Subscription } from './nostr.js';

/** One controller button, with device-reported press and touch state. */
export interface GamepadButton {
  value: number;
  pressed: boolean;
  touched: boolean;
}

/** A connected controller; its index is stable for the connection's lifetime. */
export interface Gamepad {
  index: number;
  id: string;
  mapping: string;
  connected: boolean;
  timestamp: number;
  axes: number[];
  buttons: GamepadButton[];
}

/** An empty slot remains null, preserving the runtime's complete slot list. */
export type GamepadSlot = Gamepad | null;
export type GamepadUnavailableReason = 'blocked' | 'unavailable';

/** Complete view of controllers for one napplet, with focus-scoped values. */
export interface GamepadState {
  available: boolean;
  reason?: GamepadUnavailableReason;
  focused: boolean;
  pads: GamepadSlot[];
}

/** The optional, runtime-injected controller domain. Reads never wait for a request. */
export interface GamepadApi {
  readonly available: boolean;
  readonly focused: boolean;
  getGamepads(): GamepadSlot[];
  onChange(handler: (state: GamepadState) => void): Subscription;
}
