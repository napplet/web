/** NAP-GAMEPAD fire-and-forget envelopes; canonical source: https://github.com/napplet/naps/pull/108. */
import type { GamepadState, NappletMessage } from '@napplet/core';

export const DOMAIN = 'gamepad' as const;
export type { Gamepad, GamepadApi, GamepadButton, GamepadSlot, GamepadState, GamepadUnavailableReason } from '@napplet/core';

export interface GamepadSubscribeMessage extends NappletMessage {
  type: 'gamepad.subscribe';
}
export interface GamepadUnsubscribeMessage extends NappletMessage {
  type: 'gamepad.unsubscribe';
}
export interface GamepadStateMessage extends NappletMessage, GamepadState {
  type: 'gamepad.state';
}
export type GamepadRequestMessage = GamepadSubscribeMessage | GamepadUnsubscribeMessage;
export type GamepadNapMessage = GamepadRequestMessage | GamepadStateMessage;
