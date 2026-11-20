import type { Subscription } from './nostr.js';

/** Runtime-owned WebRTC session scope. */
export type WebrtcScope = WebrtcDirectScope | WebrtcRoomScope;

/** Direct peer session target. */
export interface WebrtcDirectScope {
  type: 'direct';
  pubkey: string;
}

/** Room session target. */
export interface WebrtcRoomScope {
  type: 'room';
  room: string;
  peers?: string[];
}

/**
 * Opaque bytes on the JSON wire: RFC 4648 section 4 canonical padded base64
 * text (standard alphabet, required `=` padding, zero pad bits, no whitespace,
 * no data-URL prefix). Empty bytes encode as `""`.
 */
export type WebrtcBytes = string;

/** Request to open a runtime-owned WebRTC session. */
export interface WebrtcOpenRequest {
  scope: WebrtcScope;
  channel?: string;
  protocol?: string;
  /** Requested ordering. Omitted means ordered; `false` permits out-of-order delivery. */
  ordered?: boolean;
  /** Requested retransmission bound. Omitted means reliable; `0` means never retransmit. */
  maxRetransmits?: number;
}

/** Result of opening a WebRTC session. */
export interface WebrtcOpenResult {
  session: WebrtcSession;
}

/** WebRTC session lifecycle state. */
export type WebrtcState = 'connecting' | 'open' | 'closed';

/** Runtime-scoped WebRTC session. */
export interface WebrtcSession {
  id: string;
  scope: WebrtcScope;
  channel: string;
  protocol?: string;
  state: WebrtcState;
  /** Established ordering. Absent means `true`. */
  ordered?: boolean;
  /** Established retransmission bound. Absent means reliable delivery. */
  maxRetransmits?: number;
  /** Largest single payload the shell accepts: decoded bytes for `sendBytes`, serialized bytes for `send`. */
  maxPayloadBytes?: number;
}

/** Runtime-pushed WebRTC session event. */
export type WebrtcEvent =
  | WebrtcStateEvent
  | WebrtcPeerEvent
  | WebrtcMessageEvent
  | WebrtcBytesEvent
  | WebrtcStatsEvent
  | WebrtcClosedEvent;

/** Session state update. */
export interface WebrtcStateEvent {
  type: 'state';
  sessionId: string;
  state: WebrtcState;
}

/** Peer membership update. */
export interface WebrtcPeerEvent {
  type: 'peer';
  sessionId: string;
  pubkey: string;
  state: 'joined' | 'left';
}

/** Opaque application payload received from a peer. */
export interface WebrtcMessageEvent {
  type: 'message';
  sessionId: string;
  from: string;
  payload: unknown;
}

/** Opaque byte payload received from a peer; sent by that peer with `sendBytes`. */
export interface WebrtcBytesEvent {
  type: 'bytes';
  sessionId: string;
  /** Public key the shell authenticated for the peer during signaling. */
  from: string;
  bytes: WebrtcBytes;
}

/** Advisory per-peer network stats, pushed at most once per second per peer. */
export interface WebrtcStatsEvent {
  type: 'stats';
  sessionId: string;
  /** Peer the values describe. Omitted for a `direct` session. */
  pubkey?: string;
  /** Current round-trip time estimate in milliseconds. */
  rttMs?: number;
  /** Fraction of payloads lost over the last reporting interval, `0` to `1`. */
  lossRatio?: number;
}

/** Session closed update. */
export interface WebrtcClosedEvent {
  type: 'closed';
  sessionId: string;
  reason?: string;
}

/** Runtime API mounted at `window.napplet.webrtc`. */
export interface WebrtcApi {
  open(request: WebrtcOpenRequest): Promise<WebrtcOpenResult>;
  send(sessionId: string, payload: unknown): Promise<void>;
  /**
   * Send one opaque byte sequence; peers receive it as a `bytes` event.
   * Rejects with `unsupported` when the shell lacks byte payloads.
   */
  sendBytes(sessionId: string, bytes: WebrtcBytes): Promise<void>;
  close(sessionId: string, reason?: string): Promise<void>;
  onEvent(handler: (event: WebrtcEvent) => void): Subscription;
}
