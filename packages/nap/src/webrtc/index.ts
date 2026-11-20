/**
 * Napplet NAP webrtc domain entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/webrtc -- Runtime-mediated WebRTC sessions.
 *
 * Barrel export for NAP-WEBRTC. The runtime owns signaling transport,
 * signing/encryption, SDP, ICE, and RTCPeerConnection lifecycle; napplets see
 * only shell-scoped sessions and opaque application payloads.
 */

export { DOMAIN } from './types.js';
export type {
  WebrtcApi,
  WebrtcBytes,
  WebrtcBytesEvent,
  WebrtcClosedEvent,
  WebrtcDirectScope,
  WebrtcEvent,
  WebrtcMessageEvent,
  WebrtcOpenRequest,
  WebrtcOpenResult,
  WebrtcPeerEvent,
  WebrtcRoomScope,
  WebrtcScope,
  WebrtcSession,
  WebrtcState,
  WebrtcStateEvent,
  WebrtcStatsEvent,
  WebrtcMessage,
  WebrtcOpenMessage,
  WebrtcOpenResultMessage,
  WebrtcSendMessage,
  WebrtcSendResultMessage,
  WebrtcSendBytesMessage,
  WebrtcSendBytesResultMessage,
  WebrtcCloseMessage,
  WebrtcCloseResultMessage,
  WebrtcEventMessage,
  WebrtcOutboundMessage,
  WebrtcInboundMessage,
  WebrtcNapMessage,
} from './types.js';
export {
  installWebrtcShim,
  handleWebrtcMessage,
  open,
  send,
  sendBytes,
  close,
  onEvent,
} from './shim.js';
export {
  webrtcOpen,
  webrtcSend,
  webrtcSendBytes,
  webrtcClose,
  webrtcOnEvent,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

registerNap(DOMAIN, async () => undefined);
