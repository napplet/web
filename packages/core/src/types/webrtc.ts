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

/** Request to open a runtime-owned WebRTC session. */
export interface WebrtcOpenRequest {
  scope: WebrtcScope;
  channel?: string;
  protocol?: string;
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
}

/** Runtime-pushed WebRTC session event. */
export type WebrtcEvent =
  | WebrtcStateEvent
  | WebrtcPeerEvent
  | WebrtcMessageEvent
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
  close(sessionId: string, reason?: string): Promise<void>;
  onEvent(handler: (event: WebrtcEvent) => void): Subscription;
}
