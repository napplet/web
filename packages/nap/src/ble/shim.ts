/**
 * Napplet NAP ble shim entrypoint.
 *
 * @module
 */

// @napplet/nap/ble -- Runtime-mediated BLE/GATT shim.
// Correlates ble.* request/result envelopes and routes ble.event pushes.

import { postToShell } from '../boundary.js';
import type { Subscription } from '@napplet/core';
import type {
  BleAttribute,
  BleEvent,
  BleInboundMessage,
  BleNapMessage,
  BleOpenRequest,
  BleOpenResult,
  BleOutboundMessage,
  BleService,
  BleWriteOptions,
} from './types.js';

/** Default timeout for BLE request-response operations. */
const REQUEST_TIMEOUT_MS = 30_000;

type Pending<T> = {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  resultType: BleInboundMessage['type'];
  project: (msg: BleInboundMessage) => T;
};

const pending = new Map<string, Pending<unknown>>();
const eventHandlers = new Set<(event: BleEvent) => void>();
let installed = false;

const BLE_MESSAGE_TYPES = new Set<string>([
  'ble.open',
  'ble.open.result',
  'ble.services',
  'ble.services.result',
  'ble.read',
  'ble.read.result',
  'ble.write',
  'ble.write.result',
  'ble.subscribe',
  'ble.subscribe.result',
  'ble.unsubscribe',
  'ble.unsubscribe.result',
  'ble.close',
  'ble.close.result',
  'ble.event',
]);

function isBleNapMessage(msg: { type: string }): msg is BleNapMessage {
  return BLE_MESSAGE_TYPES.has(msg.type);
}

function request<T>(
  msg: BleOutboundMessage,
  resultType: BleInboundMessage['type'],
  project: (msg: BleInboundMessage) => T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(msg.id)) reject(new Error(`${msg.type} timed out`));
    }, REQUEST_TIMEOUT_MS);

    pending.set(msg.id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
      resultType,
      project: project as (msg: BleInboundMessage) => unknown,
    });

    postToShell(msg);
  });
}

function rejectResult(msg: BleInboundMessage, fallback: string): never {
  if ('error' in msg && msg.error) throw new Error(msg.error);
  throw new Error(fallback);
}

function handleEvent(event: BleEvent): void {
  for (const handler of eventHandlers) handler(event);
}

/**
 * Handle ble.* result and event messages from the shell via the central listener.
 *
 * @param msg  The shell envelope to route
 */
export function handleBleMessage(msg: { type: string; [key: string]: unknown }): void {
  if (!isBleNapMessage(msg)) return;

  if (msg.type === 'ble.event') {
    handleEvent(msg.event);
    return;
  }

  if (!('id' in msg) || typeof msg.id !== 'string') return;
  const entry = pending.get(msg.id);
  if (!entry || msg.type !== entry.resultType) return;

  pending.delete(msg.id);
  clearTimeout(entry.timeout);
  try {
    entry.resolve(entry.project(msg));
  } catch (error) {
    entry.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Open a runtime-owned BLE session.
 *
 * @param openRequest  Device selection and optional service request
 * @returns Promise resolving to the opened session result
 */
export function open(openRequest: BleOpenRequest): Promise<BleOpenResult> {
  return request(
    { type: 'ble.open', id: crypto.randomUUID(), request: openRequest },
    'ble.open.result',
    (msg) => {
      if (msg.type === 'ble.open.result' && msg.session) return { session: msg.session };
      rejectResult(msg, 'ble open failed');
    },
  );
}

/**
 * List exposed GATT services for a session.
 *
 * @param sessionId  BLE session id
 * @returns Promise resolving to exposed services
 */
export function services(sessionId: string): Promise<BleService[]> {
  return request(
    { type: 'ble.services', id: crypto.randomUUID(), sessionId },
    'ble.services.result',
    (msg) => {
      if (msg.type === 'ble.services.result' && msg.services !== undefined) return msg.services;
      rejectResult(msg, 'ble services unavailable');
    },
  );
}

/**
 * Read a characteristic or descriptor value.
 *
 * @param sessionId  BLE session id
 * @param target     GATT attribute target
 * @returns Promise resolving to bytes
 */
export function read(sessionId: string, target: BleAttribute): Promise<number[]> {
  return request(
    { type: 'ble.read', id: crypto.randomUUID(), sessionId, target },
    'ble.read.result',
    (msg) => {
      if (msg.type === 'ble.read.result' && msg.data !== undefined) return msg.data;
      rejectResult(msg, 'ble read failed');
    },
  );
}

/**
 * Write bytes to a characteristic or descriptor.
 *
 * @param sessionId  BLE session id
 * @param target     GATT attribute target
 * @param data       Byte array
 * @param options    Write mode preference
 * @returns Promise resolving when the write completes
 */
export function write(
  sessionId: string,
  target: BleAttribute,
  data: number[],
  options?: BleWriteOptions,
): Promise<void> {
  return request(
    { type: 'ble.write', id: crypto.randomUUID(), sessionId, target, data, ...(options ? { options } : {}) },
    'ble.write.result',
    (msg) => {
      if (msg.type === 'ble.write.result' && !msg.error) return undefined;
      rejectResult(msg, 'ble write failed');
    },
  );
}

/**
 * Start notifications or indications for a characteristic.
 *
 * @param sessionId  BLE session id
 * @param target     Characteristic target
 * @returns Promise resolving when subscription starts
 */
export function subscribe(sessionId: string, target: BleAttribute): Promise<void> {
  return request(
    { type: 'ble.subscribe', id: crypto.randomUUID(), sessionId, target },
    'ble.subscribe.result',
    (msg) => {
      if (msg.type === 'ble.subscribe.result' && !msg.error) return undefined;
      rejectResult(msg, 'ble subscribe failed');
    },
  );
}

/**
 * Stop notifications or indications for a characteristic.
 *
 * @param sessionId  BLE session id
 * @param target     Characteristic target
 * @returns Promise resolving when subscription stops
 */
export function unsubscribe(sessionId: string, target: BleAttribute): Promise<void> {
  return request(
    { type: 'ble.unsubscribe', id: crypto.randomUUID(), sessionId, target },
    'ble.unsubscribe.result',
    (msg) => {
      if (msg.type === 'ble.unsubscribe.result' && !msg.error) return undefined;
      rejectResult(msg, 'ble unsubscribe failed');
    },
  );
}

/**
 * Close a BLE session.
 *
 * @param sessionId  BLE session id
 * @param reason     Optional close reason
 * @returns Promise resolving when the session is closed
 */
export function close(sessionId: string, reason?: string): Promise<void> {
  return request(
    { type: 'ble.close', id: crypto.randomUUID(), sessionId, ...(reason ? { reason } : {}) },
    'ble.close.result',
    (msg) => {
      if (msg.type === 'ble.close.result' && !msg.error) return undefined;
      rejectResult(msg, 'ble close failed');
    },
  );
}

/**
 * Subscribe to runtime-pushed BLE events.
 *
 * @param handler  Event handler
 * @returns Subscription handle
 */
export function onEvent(handler: (event: BleEvent) => void): Subscription {
  eventHandlers.add(handler);
  return {
    close() {
      eventHandlers.delete(handler);
    },
  };
}

/**
 * Install the BLE shim. Registration-only -- sessions are opened on demand.
 *
 * @returns cleanup function that clears pending requests and event handlers
 */
export function installBleShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  return () => {
    for (const entry of pending.values()) clearTimeout(entry.timeout);
    pending.clear();
    eventHandlers.clear();
    installed = false;
  };
}
