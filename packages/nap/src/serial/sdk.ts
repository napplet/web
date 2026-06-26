/**
 * @napplet/nap/serial -- SDK helpers wrapping window.napplet.serial.
 *
 * These convenience functions delegate to `window.napplet.serial.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, Subscription } from '@napplet/core';
import type { SerialEvent, SerialOpenRequest, SerialOpenResult } from './types.js';

function requireSerial(): NonNullable<NappletGlobal['serial']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.serial) {
    throw new Error('window.napplet.serial is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.serial;
}

/**
 * Ask the runtime to select and open a serial session.
 *
 * @param request  Filters, options, and optional chooser label
 * @returns Promise resolving to the runtime-assigned serial open result
 */
export function serialOpen(request: SerialOpenRequest): Promise<SerialOpenResult> {
  return requireSerial().open(request);
}

/**
 * Write bytes to an open serial session.
 *
 * @param sessionId  Runtime-assigned serial session id
 * @param data       Byte values to write
 * @returns Promise resolving after the runtime acknowledges the write
 */
export function serialWrite(sessionId: string, data: Uint8Array | number[]): Promise<void> {
  return requireSerial().write(sessionId, data);
}

/**
 * Close an open serial session.
 *
 * @param sessionId  Runtime-assigned serial session id
 * @param reason     Optional reason for the close request
 * @returns Promise resolving after the runtime acknowledges the close
 */
export function serialClose(sessionId: string, reason?: string): Promise<void> {
  return requireSerial().close(sessionId, reason);
}

/**
 * Register for shell-pushed serial events.
 *
 * @param handler  Called with each serial event
 * @returns A Subscription with `close()` to stop listening
 */
export function serialOnEvent(handler: (event: SerialEvent) => void): Subscription {
  return requireSerial().onEvent(handler);
}
