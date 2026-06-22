/** Serial session state for runtime-mediated serial access (NAP-SERIAL). */
export type SerialState = 'opening' | 'open' | 'closed';

/** Filter hint for the runtime-owned serial chooser. */
export interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceClassId?: string | number;
}

/** Runtime-owned serial open options. */
export interface SerialOpenOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

/** A napplet request to select and open a serial session. */
export interface SerialOpenRequest {
  filters?: SerialPortFilter[];
  options: SerialOpenOptions;
  label?: string;
}

/** Redacted serial device metadata returned by the runtime. */
export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceClassId?: string | number;
  displayName?: string;
}

/** Runtime-assigned serial session handle. */
export interface SerialSession {
  id: string;
  state: SerialState;
  info?: SerialPortInfo;
}

/** Result of opening a serial session. */
export interface SerialOpenResult {
  session: SerialSession;
}

/** Shell-pushed serial state, data, and close events. */
export type SerialEvent =
  | { type: 'state'; sessionId: string; state: SerialState }
  | { type: 'data'; sessionId: string; data: number[] }
  | { type: 'closed'; sessionId: string; reason?: string };
