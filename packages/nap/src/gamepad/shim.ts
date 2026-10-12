/** Cached NAP-GAMEPAD binding. The runtime owns controller access and focus. */
import type { GamepadApi, GamepadSlot, GamepadState, Subscription } from '@napplet/core';
import { postToShell } from '../boundary.js';
import { copyGamepadState, isGamepadState } from './state.js';

let state: GamepadState = { available: true, focused: false, pads: [] };
let installed = false;
let subscribed = false;
const handlers = new Set<{ handler: (state: GamepadState) => void }>();

function subscribe(): void {
  if (subscribed) return;
  subscribed = true;
  try { postToShell({ type: 'gamepad.subscribe' }); }
  catch (error) { subscribed = false; throw error; }
}

/**
 * Read the latest complete slot list synchronously.
 * @returns Cached slots; empty before the first snapshot.
 * @example const pads = getGamepads();
 */
export function getGamepads(): GamepadSlot[] {
  subscribe();
  return copyGamepadState(state).pads;
}

/**
 * Observe each incoming complete state.
 * @param handler Receives an independent snapshot for each shell update.
 * @returns An idempotent local subscription handle.
 * @example const sub = onChange((state) => render(state));
 */
export function onChange(handler: (state: GamepadState) => void): Subscription {
  const entry = { handler };
  handlers.add(entry);
  try { subscribe(); }
  catch (error) { handlers.delete(entry); throw error; }
  return { close: () => { handlers.delete(entry); } };
}

/** Optional runtime domain; availability and focus are snapshot-backed getters. */
export const gamepad: GamepadApi = {
  get available() { subscribe(); return state.available; },
  get focused() { subscribe(); return state.focused; },
  getGamepads,
  onChange,
};

/**
 * Accept shell state through the central parent-source-checked message router.
 * @param message Incoming envelope.
 * @returns Nothing; malformed or unrecognized envelopes are ignored.
 * @example handleGamepadMessage({ type: 'gamepad.state', available: true, focused: false, pads: [] });
 */
export function handleGamepadMessage(message: { type: string; [key: string]: unknown }): void {
  if (!subscribed || message.type !== 'gamepad.state' || 'id' in message || !isGamepadState(message)) return;
  state = copyGamepadState(message);
  const snapshot = copyGamepadState(state);
  const recipients = [...handlers];
  for (const entry of recipients) {
    if (!handlers.has(entry)) continue;
    // A throwing listener must not starve later listeners of state (including neutral snapshots).
    try { entry.handler(copyGamepadState(snapshot)); }
    catch (error) { queueMicrotask(() => { throw error; }); }
  }
}

/**
 * Install the domain; the binding subscribes on first use, so unused installs send nothing.
 * @returns Idempotent cleanup that unsubscribes (if subscribed) and clears the cached state.
 * @example const cleanup = installGamepadShim();
 */
export function installGamepadShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    try { if (subscribed) postToShell({ type: 'gamepad.unsubscribe' }); }
    finally {
      subscribed = false;
      installed = false;
      handlers.clear();
      state = { available: true, focused: false, pads: [] };
    }
  };
}
