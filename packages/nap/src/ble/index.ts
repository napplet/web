/**
 * Napplet NAP ble -- Runtime-mediated Bluetooth Low Energy GATT access.
 *
 * Barrel export for NAP-BLE. The runtime owns device discovery, chooser UI,
 * permission, backend handles, GATT lifecycle, notifications, disconnects, and
 * policy. Napplets receive opaque sessions and byte arrays only.
 *
 * @module
 * @packageDocumentation
 */

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

export { DOMAIN };
export type {
  BleApi,
  BleAttribute,
  BleCharacteristic,
  BleCharacteristicProperties,
  BleCloseMessage,
  BleCloseResultMessage,
  BleClosedEvent,
  BleDeviceFilter,
  BleDeviceInfo,
  BleEvent,
  BleEventMessage,
  BleInboundMessage,
  BleManufacturerDataFilter,
  BleMessage,
  BleNapMessage,
  BleNotificationEvent,
  BleOpenMessage,
  BleOpenRequest,
  BleOpenResult,
  BleOpenResultMessage,
  BleOutboundMessage,
  BleReadMessage,
  BleReadResultMessage,
  BleService,
  BleServiceDataFilter,
  BleServicesMessage,
  BleServicesResultMessage,
  BleSession,
  BleSessionState,
  BleStateEvent,
  BleSubscribeMessage,
  BleSubscribeResultMessage,
  BleUnsubscribeMessage,
  BleUnsubscribeResultMessage,
  BleUuid,
  BleWriteMessage,
  BleWriteOptions,
  BleWriteResultMessage,
} from './types.js';
export {
  close,
  handleBleMessage,
  installBleShim,
  onEvent,
  open,
  read,
  services,
  subscribe,
  unsubscribe,
  write,
} from './shim.js';
export {
  bleClose,
  bleOnEvent,
  bleOpen,
  bleRead,
  bleServices,
  bleSubscribe,
  bleUnsubscribe,
  bleWrite,
} from './sdk.js';

registerNap(DOMAIN, async () => undefined);
