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
  WebrtcMessage,
  WebrtcOpenMessage,
  WebrtcOpenResultMessage,
  WebrtcSendMessage,
  WebrtcSendResultMessage,
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
  close,
  onEvent,
} from './shim.js';
export {
  webrtcOpen,
  webrtcSend,
  webrtcClose,
  webrtcOnEvent,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

registerNap(DOMAIN, async () => undefined);
