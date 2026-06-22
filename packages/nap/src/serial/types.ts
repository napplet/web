/**
 * @napplet/nap/serial -- Runtime-mediated serial access message types for the JSON envelope wire protocol.
 *
 * NAP-SERIAL lets a napplet communicate with user-approved serial devices
 * without receiving raw browser SerialPort objects, native handles, stream
 * objects, or OS device paths. The runtime owns device selection, permission
 * prompts, port lifecycle, reads, write ordering, and policy.
 *
 * Defines the message types exchanged between napplet and shell:
 * - Napplet -> Shell: open, write, close
 * - Shell -> Napplet: open.result, write.result, close.result, event
 *
 * All types form a discriminated union on the `type` field.
 */

import type {
  NappletMessage,
  SerialEvent,
  SerialOpenRequest,
  SerialOpenResult,
  SerialPortFilter,
  SerialOpenOptions,
  SerialPortInfo,
  SerialSession,
  SerialState,
} from '@napplet/core';

/** The NAP domain name for serial messages. */
export const DOMAIN = 'serial' as const;

export type {
  SerialEvent,
  SerialOpenRequest,
  SerialOpenResult,
  SerialPortFilter,
  SerialOpenOptions,
  SerialPortInfo,
  SerialSession,
  SerialState,
};

/**
 * Base interface for all serial NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface SerialMessage extends NappletMessage {
  /** Message type in "serial.<action>" format. */
  type: `serial.${string}`;
}

/** Ask the runtime to select and open a serial port. */
export interface SerialOpenMessage extends SerialMessage {
  type: 'serial.open';
  /** Correlation ID for this request. */
  id: string;
  /** Open filters, options, and optional UI label. */
  request: SerialOpenRequest;
}

/** Result of a `serial.open` request. */
export interface SerialOpenResultMessage extends SerialMessage {
  type: 'serial.open.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The opened session. Absent when `error` is present. */
  session?: SerialOpenResult['session'];
  /** Error reason when the runtime could not open a session. */
  error?: string;
}

/** Write bytes to an open serial session. */
export interface SerialWriteMessage extends SerialMessage {
  type: 'serial.write';
  /** Correlation ID for this request. */
  id: string;
  /** Runtime-assigned session id. */
  sessionId: string;
  /** Byte values in the range 0..255. */
  data: number[];
}

/** Result of a `serial.write` request. */
export interface SerialWriteResultMessage extends SerialMessage {
  type: 'serial.write.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Error reason when the runtime could not write the bytes. */
  error?: string;
}

/** Close an open serial session. */
export interface SerialCloseMessage extends SerialMessage {
  type: 'serial.close';
  /** Correlation ID for this request. */
  id: string;
  /** Runtime-assigned session id. */
  sessionId: string;
  /** Optional close reason supplied by the napplet. */
  reason?: string;
}

/** Result of a `serial.close` request. */
export interface SerialCloseResultMessage extends SerialMessage {
  type: 'serial.close.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Error reason when the runtime could not close the session. */
  error?: string;
}

/** Shell-pushed serial event. Carries no correlation id. */
export interface SerialEventMessage extends SerialMessage {
  type: 'serial.event';
  /** State, data, or closed event. */
  event: SerialEvent;
}

/** Napplet -> Shell serial messages. */
export type SerialOutboundMessage =
  | SerialOpenMessage
  | SerialWriteMessage
  | SerialCloseMessage;

/** Shell -> Napplet serial messages. */
export type SerialInboundMessage =
  | SerialOpenResultMessage
  | SerialWriteResultMessage
  | SerialCloseResultMessage
  | SerialEventMessage;

/** All serial NAP message types (discriminated union on `type` field). */
export type SerialNapMessage = SerialOutboundMessage | SerialInboundMessage;
