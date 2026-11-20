import type {
  Subscription,
  WebrtcBytes,
  WebrtcEvent,
  WebrtcOpenRequest,
  WebrtcOpenResult,
} from '@napplet/core';
import { requireDomain } from './require-napplet.js';
import type { SdkDomain } from './sdk-domain.js';

/**
 * Runtime-mediated WebRTC sessions (NAP-WEBRTC). The shell owns signaling,
 * signing/encryption, SDP, ICE, and peer-connection lifecycle; napplets exchange
 * only opaque application payloads over shell-scoped sessions.
 *
 * @example
 * ```ts
 * import { webrtc } from '@napplet/sdk';
 *
 * const { session } = await webrtc.open({ scope: { type: 'direct', pubkey } });
 * await webrtc.send(session.id, { body: 'hello' });
 * ```
 */
export const webrtc: SdkDomain<'webrtc'> = {
  /**
   * Open a runtime-owned WebRTC session.
   * @param request  Session scope and channel/protocol labels
   * @returns Promise resolving to the opened session result
   */
  open(request: WebrtcOpenRequest): Promise<WebrtcOpenResult> {
    return requireDomain('webrtc').open(request);
  },

  /**
   * Send an opaque application payload over a session.
   * @param sessionId  WebRTC session id
   * @param payload    Application payload
   */
  send(sessionId: string, payload: unknown): Promise<void> {
    return requireDomain('webrtc').send(sessionId, payload);
  },

  /**
   * Send one opaque byte sequence over a session; peers receive a `bytes` event.
   * @param sessionId  WebRTC session id
   * @param bytes      Canonical padded base64 text (RFC 4648 section 4)
   */
  sendBytes(sessionId: string, bytes: WebrtcBytes): Promise<void> {
    return requireDomain('webrtc').sendBytes(sessionId, bytes);
  },

  /**
   * Close a WebRTC session.
   * @param sessionId  WebRTC session id
   * @param reason     Optional close reason
   */
  close(sessionId: string, reason?: string): Promise<void> {
    return requireDomain('webrtc').close(sessionId, reason);
  },

  /**
   * Subscribe to runtime-pushed WebRTC events.
   * @param handler  Event handler
   * @returns Subscription handle
   */
  onEvent(handler: (event: WebrtcEvent) => void): Subscription {
    return requireDomain('webrtc').onEvent(handler);
  },
};
