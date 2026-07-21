/**
 * Napplet NAP serial domain entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/serial -- Runtime-mediated serial device access module (NAP-SERIAL).
 *
 * A napplet asks the shell to select and open a user-approved serial session,
 * writes byte arrays to that session, and receives shell-pushed state/data/close
 * events. The shell owns device selection, permissions, raw port handles,
 * streams, OS paths, read loops, and lifecycle policy.
 *
 * Exports typed message definitions for the serial domain, shim installer,
 * SDK helpers, and registers the `serial` domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import { serialOpen, serialWrite, serialOnEvent } from '@napplet/nap/serial';
 *
 * const { session } = await serialOpen({ options: { baudRate: 115200 } });
 * await serialWrite(session.id, [112, 105, 110, 103, 10]);
 * const sub = serialOnEvent((event) => console.log(event));
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  SerialState,
  SerialPortFilter,
  SerialOpenOptions,
  SerialOpenRequest,
  SerialPortInfo,
  SerialSession,
  SerialOpenResult,
  SerialEvent,
  SerialMessage,
  SerialOpenMessage,
  SerialOpenResultMessage,
  SerialWriteMessage,
  SerialWriteResultMessage,
  SerialCloseMessage,
  SerialCloseResultMessage,
  SerialEventMessage,
  SerialOutboundMessage,
  SerialInboundMessage,
  SerialNapMessage,
} from './types.js';

export {
  installSerialShim,
  handleSerialMessage,
  open,
  write,
  close,
  onEvent,
} from './shim.js';

export {
  serialOpen,
  serialWrite,
  serialClose,
  serialOnEvent,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the serial domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'serial'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
