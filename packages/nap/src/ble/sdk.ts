// @napplet/nap/ble/sdk -- Named helpers wrapping window.napplet.ble.

import type {
  NappletGlobal,
  Subscription,
} from '@napplet/core';
import type {
  BleAttribute,
  BleEvent,
  BleOpenRequest,
  BleOpenResult,
  BleService,
  BleWriteOptions,
} from './types.js';

function requireBle(): NonNullable<NappletGlobal['ble']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.ble) {
    throw new Error('window.napplet.ble is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.ble;
}

/** Open a runtime-owned BLE session. */
export function bleOpen(request: BleOpenRequest): Promise<BleOpenResult> {
  return requireBle().open(request);
}

/** List exposed GATT services for a session. */
export function bleServices(sessionId: string): Promise<BleService[]> {
  return requireBle().services(sessionId);
}

/** Read a characteristic or descriptor value. */
export function bleRead(sessionId: string, target: BleAttribute): Promise<number[]> {
  return requireBle().read(sessionId, target);
}

/** Write bytes to a characteristic or descriptor. */
export function bleWrite(
  sessionId: string,
  target: BleAttribute,
  data: number[],
  options?: BleWriteOptions,
): Promise<void> {
  return requireBle().write(sessionId, target, data, options);
}

/** Start notifications or indications for a characteristic. */
export function bleSubscribe(sessionId: string, target: BleAttribute): Promise<void> {
  return requireBle().subscribe(sessionId, target);
}

/** Stop notifications or indications for a characteristic. */
export function bleUnsubscribe(sessionId: string, target: BleAttribute): Promise<void> {
  return requireBle().unsubscribe(sessionId, target);
}

/** Close a BLE session. */
export function bleClose(sessionId: string, reason?: string): Promise<void> {
  return requireBle().close(sessionId, reason);
}

/** Subscribe to runtime-pushed BLE events. */
export function bleOnEvent(handler: (event: BleEvent) => void): Subscription {
  return requireBle().onEvent(handler);
}
