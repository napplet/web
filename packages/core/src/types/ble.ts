import type { Subscription } from './nostr.js';

/** BLE UUID input accepted by NAP-BLE requests. */
export type BleUuid = string | number;

/** BLE session lifecycle state. */
export type BleSessionState = 'opening' | 'open' | 'closed';

/** Web-Bluetooth-shaped device selection request. */
export interface BleOpenRequest {
  filters?: BleDeviceFilter[];
  exclusionFilters?: BleDeviceFilter[];
  acceptAllDevices?: boolean;
  optionalServices?: BleUuid[];
  label?: string;
}

/** Device filter for runtime-owned chooser/permission flows. */
export interface BleDeviceFilter {
  services?: BleUuid[];
  name?: string;
  namePrefix?: string;
  manufacturerData?: BleManufacturerDataFilter[];
  serviceData?: BleServiceDataFilter[];
}

/** Manufacturer data filter. Byte arrays are integer arrays in the range 0..255. */
export interface BleManufacturerDataFilter {
  companyIdentifier: number;
  dataPrefix?: number[];
  mask?: number[];
}

/** Service data filter. Byte arrays are integer arrays in the range 0..255. */
export interface BleServiceDataFilter {
  service: BleUuid;
  dataPrefix?: number[];
  mask?: number[];
}

/** Result of opening a BLE session. */
export interface BleOpenResult {
  session: BleSession;
}

/** Runtime-scoped BLE session. */
export interface BleSession {
  id: string;
  state: BleSessionState;
  device: BleDeviceInfo;
}

/** Redacted runtime-scoped device identity. */
export interface BleDeviceInfo {
  id: string;
  name?: string;
  services?: string[];
}

/** Exposed GATT service. */
export interface BleService {
  uuid: string;
  characteristics: BleCharacteristic[];
}

/** Exposed GATT characteristic. */
export interface BleCharacteristic {
  uuid: string;
  properties: BleCharacteristicProperties;
}

/** Characteristic capabilities the runtime exposes. */
export interface BleCharacteristicProperties {
  read?: boolean;
  write?: boolean;
  writeWithoutResponse?: boolean;
  notify?: boolean;
  indicate?: boolean;
}

/** Characteristic or descriptor target. */
export interface BleAttribute {
  service: BleUuid;
  characteristic: BleUuid;
  descriptor?: BleUuid;
}

/** Write mode preference. */
export interface BleWriteOptions {
  response?: 'with-response' | 'without-response' | 'auto';
}

/** BLE runtime-pushed event. */
export type BleEvent = BleStateEvent | BleNotificationEvent | BleClosedEvent;

/** Session state update. */
export interface BleStateEvent {
  type: 'state';
  sessionId: string;
  state: BleSessionState;
}

/** Characteristic notification/indication payload. */
export interface BleNotificationEvent {
  type: 'notification';
  sessionId: string;
  target: BleAttribute;
  data: number[];
}

/** Session closed update. */
export interface BleClosedEvent {
  type: 'closed';
  sessionId: string;
  reason?: string;
}

/** Runtime API mounted at `window.napplet.ble`. */
export interface BleApi {
  open(request: BleOpenRequest): Promise<BleOpenResult>;
  services(sessionId: string): Promise<BleService[]>;
  read(sessionId: string, target: BleAttribute): Promise<number[]>;
  write(sessionId: string, target: BleAttribute, data: number[], options?: BleWriteOptions): Promise<void>;
  subscribe(sessionId: string, target: BleAttribute): Promise<void>;
  unsubscribe(sessionId: string, target: BleAttribute): Promise<void>;
  close(sessionId: string, reason?: string): Promise<void>;
  onEvent(handler: (event: BleEvent) => void): Subscription;
}
