// @napplet/nap/serial -- Runtime-mediated serial shim.
// Correlates serial.* request/result envelopes; routes serial.event pushes to listeners.
// The shell owns device selection, permissions, port handles, streams, and policy.

import { postToShell } from '../boundary.js';
import type { Subscription } from '@napplet/core';
import type {
  SerialCloseMessage,
  SerialCloseResultMessage,
  SerialEvent,
  SerialEventMessage,
  SerialOpenMessage,
  SerialOpenRequest,
  SerialOpenResult,
  SerialOpenResultMessage,
  SerialWriteMessage,
  SerialWriteResultMessage,
} from './types.js';

/** Default timeout for serial request-response operations. */
const REQUEST_TIMEOUT_MS = 30_000;

const pendingOpen = new Map<string, {
  resolve: (result: SerialOpenResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

const pendingWrite = new Map<string, {
  resolve: () => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

const pendingClose = new Map<string, {
  resolve: () => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

const eventHandlers = new Set<(event: SerialEvent) => void>();

let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function handleOpenResult(msg: SerialOpenResultMessage): void {
  const pending = pendingOpen.get(msg.id);
  if (!pending) return;
  pendingOpen.delete(msg.id);
  clearTimeout(pending.timeout);
  if (msg.session !== undefined) {
    pending.resolve({ session: msg.session });
    return;
  }
  pending.reject(new Error(msg.error ?? 'serial open failed'));
}

function handleWriteResult(msg: SerialWriteResultMessage): void {
  const pending = pendingWrite.get(msg.id);
  if (!pending) return;
  pendingWrite.delete(msg.id);
  clearTimeout(pending.timeout);
  if (msg.error) {
    pending.reject(new Error(msg.error));
    return;
  }
  pending.resolve();
}

function handleCloseResult(msg: SerialCloseResultMessage): void {
  const pending = pendingClose.get(msg.id);
  if (!pending) return;
  pendingClose.delete(msg.id);
  clearTimeout(pending.timeout);
  if (msg.error) {
    pending.reject(new Error(msg.error));
    return;
  }
  pending.resolve();
}

function handleEvent(msg: SerialEventMessage): void {
  if (!msg.event) return;
  for (const handler of eventHandlers) handler(msg.event);
}

/**
 * Handle serial.* messages from the shell via the central message listener.
 * Covers request results and shell-pushed serial.event messages.
 *
 * @param msg  The shell envelope to route
 */
export function handleSerialMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<SerialOpenResultMessage>(msg, 'serial.open.result')) {
    handleOpenResult(msg);
  } else if (isMessageType<SerialWriteResultMessage>(msg, 'serial.write.result')) {
    handleWriteResult(msg);
  } else if (isMessageType<SerialCloseResultMessage>(msg, 'serial.close.result')) {
    handleCloseResult(msg);
  } else if (isMessageType<SerialEventMessage>(msg, 'serial.event')) {
    handleEvent(msg);
  }
}

/**
 * Ask the runtime to select and open a serial session.
 *
 * @param request  Filters, options, and optional chooser label
 * @returns Promise resolving to the runtime-assigned serial open result
 *
 * @example
 * ```ts
 * const { session } = await open({ options: { baudRate: 115200 } });
 * ```
 */
export function open(request: SerialOpenRequest): Promise<SerialOpenResult> {
  const id = crypto.randomUUID();
  return new Promise<SerialOpenResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingOpen.delete(id)) reject(new Error('serial.open timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingOpen.set(id, { resolve, reject, timeout });

    const msg: SerialOpenMessage = {
      type: 'serial.open',
      id,
      request,
    };
    postToShell(msg);
  });
}

/**
 * Write bytes to an open serial session. Uint8Array input is converted to a
 * plain byte array so the wire payload is JSON-shaped and easy to validate.
 *
 * @param sessionId  Runtime-assigned serial session id
 * @param data       Byte values to write
 * @returns Promise resolving after the runtime acknowledges the write
 */
export function write(sessionId: string, data: Uint8Array | number[]): Promise<void> {
  const id = crypto.randomUUID();
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingWrite.delete(id)) reject(new Error('serial.write timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingWrite.set(id, { resolve, reject, timeout });

    const msg: SerialWriteMessage = {
      type: 'serial.write',
      id,
      sessionId,
      data: Array.from(data),
    };
    postToShell(msg);
  });
}

/**
 * Close an open serial session.
 *
 * @param sessionId  Runtime-assigned serial session id
 * @param reason     Optional reason for the close request
 * @returns Promise resolving after the runtime acknowledges the close
 */
export function close(sessionId: string, reason?: string): Promise<void> {
  const id = crypto.randomUUID();
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingClose.delete(id)) reject(new Error('serial.close timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingClose.set(id, { resolve, reject, timeout });

    const msg: SerialCloseMessage = {
      type: 'serial.close',
      id,
      sessionId,
      ...(reason === undefined ? {} : { reason }),
    };
    postToShell(msg);
  });
}

/**
 * Register for shell-pushed serial events.
 *
 * @param handler  Called with each serial event
 * @returns A Subscription with `close()` to stop listening
 */
export function onEvent(handler: (event: SerialEvent) => void): Subscription {
  eventHandlers.add(handler);
  return {
    close(): void {
      eventHandlers.delete(handler);
    },
  };
}

/**
 * Install the serial shim. Registration-only -- serial sessions are opened on demand.
 *
 * @returns cleanup function that clears pending requests and event handlers
 */
export function installSerialShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }
  installed = true;
  return () => {
    for (const pending of pendingOpen.values()) clearTimeout(pending.timeout);
    for (const pending of pendingWrite.values()) clearTimeout(pending.timeout);
    for (const pending of pendingClose.values()) clearTimeout(pending.timeout);
    pendingOpen.clear();
    pendingWrite.clear();
    pendingClose.clear();
    eventHandlers.clear();
    installed = false;
  };
}
