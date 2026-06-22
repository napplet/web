/**
 * @napplet/nap/ble -- Runtime-mediated BLE/GATT message types.
 *
 * NAP-BLE lets napplets work with user-approved BLE devices through opaque
 * runtime sessions. The runtime owns chooser UI, permission, backend handles,
 * GATT lifecycle, notification wiring, and policy.
 */

import type {
  BleAttribute,
  BleEvent,
  BleOpenRequest,
  BleOpenResult,
  BleService,
  BleWriteOptions,
  NappletMessage,
} from '@napplet/core';

/** The NAP domain name for BLE messages. */
export const DOMAIN = 'ble' as const;

export type {
  BleApi,
  BleAttribute,
  BleCharacteristic,
  BleCharacteristicProperties,
  BleClosedEvent,
  BleDeviceFilter,
  BleDeviceInfo,
  BleEvent,
  BleManufacturerDataFilter,
  BleNotificationEvent,
  BleOpenRequest,
  BleOpenResult,
  BleService,
  BleServiceDataFilter,
  BleSession,
  BleSessionState,
  BleStateEvent,
  BleUuid,
  BleWriteOptions,
} from '@napplet/core';

/** Base interface for all BLE NAP messages. */
export interface BleMessage extends NappletMessage {
  type: `ble.${string}`;
}

/** Request a runtime-owned BLE session. */
export interface BleOpenMessage extends BleMessage {
  type: 'ble.open';
  id: string;
  request: BleOpenRequest;
}

/** Result of `ble.open`. */
export interface BleOpenResultMessage extends BleMessage {
  type: 'ble.open.result';
  id: string;
  session?: BleOpenResult['session'];
  error?: string;
}

/** List exposed GATT services for a session. */
export interface BleServicesMessage extends BleMessage {
  type: 'ble.services';
  id: string;
  sessionId: string;
}

/** Result of `ble.services`. */
export interface BleServicesResultMessage extends BleMessage {
  type: 'ble.services.result';
  id: string;
  services?: BleService[];
  error?: string;
}

/** Read a characteristic or descriptor value. */
export interface BleReadMessage extends BleMessage {
  type: 'ble.read';
  id: string;
  sessionId: string;
  target: BleAttribute;
}

/** Result of `ble.read`. */
export interface BleReadResultMessage extends BleMessage {
  type: 'ble.read.result';
  id: string;
  data?: number[];
  error?: string;
}

/** Write bytes to a characteristic or descriptor. */
export interface BleWriteMessage extends BleMessage {
  type: 'ble.write';
  id: string;
  sessionId: string;
  target: BleAttribute;
  data: number[];
  options?: BleWriteOptions;
}

/** Result of `ble.write`. */
export interface BleWriteResultMessage extends BleMessage {
  type: 'ble.write.result';
  id: string;
  error?: string;
}

/** Start notifications or indications for a characteristic. */
export interface BleSubscribeMessage extends BleMessage {
  type: 'ble.subscribe';
  id: string;
  sessionId: string;
  target: BleAttribute;
}

/** Result of `ble.subscribe`. */
export interface BleSubscribeResultMessage extends BleMessage {
  type: 'ble.subscribe.result';
  id: string;
  error?: string;
}

/** Stop notifications or indications for a characteristic. */
export interface BleUnsubscribeMessage extends BleMessage {
  type: 'ble.unsubscribe';
  id: string;
  sessionId: string;
  target: BleAttribute;
}

/** Result of `ble.unsubscribe`. */
export interface BleUnsubscribeResultMessage extends BleMessage {
  type: 'ble.unsubscribe.result';
  id: string;
  error?: string;
}

/** Close a BLE session. */
export interface BleCloseMessage extends BleMessage {
  type: 'ble.close';
  id: string;
  sessionId: string;
  reason?: string;
}

/** Result of `ble.close`. */
export interface BleCloseResultMessage extends BleMessage {
  type: 'ble.close.result';
  id: string;
  error?: string;
}

/** Runtime-pushed BLE event. */
export interface BleEventMessage extends BleMessage {
  type: 'ble.event';
  event: BleEvent;
}

/** Napplet -> runtime BLE messages. */
export type BleOutboundMessage =
  | BleOpenMessage
  | BleServicesMessage
  | BleReadMessage
  | BleWriteMessage
  | BleSubscribeMessage
  | BleUnsubscribeMessage
  | BleCloseMessage;

/** Runtime -> napplet BLE messages. */
export type BleInboundMessage =
  | BleOpenResultMessage
  | BleServicesResultMessage
  | BleReadResultMessage
  | BleWriteResultMessage
  | BleSubscribeResultMessage
  | BleUnsubscribeResultMessage
  | BleCloseResultMessage
  | BleEventMessage;

/** All BLE NAP message types. */
export type BleNapMessage = BleOutboundMessage | BleInboundMessage;
