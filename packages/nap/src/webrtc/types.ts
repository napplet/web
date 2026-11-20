/**
 * Napplet NAP webrtc types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/webrtc -- Runtime-mediated WebRTC message types.
 *
 * NAP-WEBRTC lets napplets request runtime-owned WebRTC data sessions while the
 * runtime owns signaling transport, signing/encryption, SDP, ICE, and
 * RTCPeerConnection lifecycle.
 */

import type {
  NappletMessage,
  WebrtcBytes,
  WebrtcEvent,
  WebrtcOpenRequest,
  WebrtcOpenResult,
} from '@napplet/core';

/** The NAP domain name for WebRTC messages. */
export const DOMAIN = 'webrtc' as const;

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
} from '@napplet/core';

/** Base interface for all WebRTC NAP messages. */
export interface WebrtcMessage extends NappletMessage {
  type: `webrtc.${string}`;
}

/** Request a runtime-owned WebRTC session. */
export interface WebrtcOpenMessage extends WebrtcMessage {
  type: 'webrtc.open';
  id: string;
  request: WebrtcOpenRequest;
}

/** Result of `webrtc.open`. */
export interface WebrtcOpenResultMessage extends WebrtcMessage {
  type: 'webrtc.open.result';
  id: string;
  session?: WebrtcOpenResult['session'];
  error?: string;
}

/** Send an opaque application payload over a session. */
export interface WebrtcSendMessage extends WebrtcMessage {
  type: 'webrtc.send';
  id: string;
  sessionId: string;
  payload: unknown;
}

/** Result of `webrtc.send`. */
export interface WebrtcSendResultMessage extends WebrtcMessage {
  type: 'webrtc.send.result';
  id: string;
  error?: string;
}

/**
 * Send one opaque byte sequence over a session. `bytes` is canonical padded
 * base64 text; the shell delivers the decoded bytes as one binary payload.
 *
 * @example
 * ```ts
 * const msg: WebrtcSendBytesMessage = {
 *   type: 'webrtc.sendBytes',
 *   id: 's2',
 *   sessionId: 'sess-2',
 *   bytes: 'AAEC/w==',
 * };
 * ```
 */
export interface WebrtcSendBytesMessage extends WebrtcMessage {
  type: 'webrtc.sendBytes';
  id: string;
  sessionId: string;
  bytes: WebrtcBytes;
}

/** Result of `webrtc.sendBytes`. `error` is `unsupported` when the shell lacks byte payloads. */
export interface WebrtcSendBytesResultMessage extends WebrtcMessage {
  type: 'webrtc.sendBytes.result';
  id: string;
  error?: string;
}

/** Close a WebRTC session. */
export interface WebrtcCloseMessage extends WebrtcMessage {
  type: 'webrtc.close';
  id: string;
  sessionId: string;
  reason?: string;
}

/** Result of `webrtc.close`. */
export interface WebrtcCloseResultMessage extends WebrtcMessage {
  type: 'webrtc.close.result';
  id: string;
  error?: string;
}

/** Runtime-pushed WebRTC event. */
export interface WebrtcEventMessage extends WebrtcMessage {
  type: 'webrtc.event';
  event: WebrtcEvent;
}

/** Napplet -> runtime WebRTC messages. */
export type WebrtcOutboundMessage =
  | WebrtcOpenMessage
  | WebrtcSendMessage
  | WebrtcSendBytesMessage
  | WebrtcCloseMessage;

/** Runtime -> napplet WebRTC messages. */
export type WebrtcInboundMessage =
  | WebrtcOpenResultMessage
  | WebrtcSendResultMessage
  | WebrtcSendBytesResultMessage
  | WebrtcCloseResultMessage
  | WebrtcEventMessage;

/** All WebRTC NAP message types. */
export type WebrtcNapMessage = WebrtcOutboundMessage | WebrtcInboundMessage;
