/**
 * Napplet NAP webrtc sdk entrypoint.
 *
 * @module
 */

// @napplet/nap/webrtc/sdk -- Named helpers wrapping window.napplet.webrtc.

import type { NappletGlobal, Subscription } from '@napplet/core';
import type {
  WebrtcBytes,
  WebrtcEvent,
  WebrtcOpenRequest,
  WebrtcOpenResult,
} from './types.js';

function requireWebrtc(): NonNullable<NappletGlobal['webrtc']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.webrtc) {
    throw new Error('window.napplet.webrtc is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.webrtc;
}

/** Open a runtime-owned WebRTC session. */
export function webrtcOpen(request: WebrtcOpenRequest): Promise<WebrtcOpenResult> {
  return requireWebrtc().open(request);
}

/** Send an opaque application payload over a session. */
export function webrtcSend(sessionId: string, payload: unknown): Promise<void> {
  return requireWebrtc().send(sessionId, payload);
}

/**
 * Send one opaque byte sequence (canonical padded base64) over a session.
 *
 * @param sessionId  WebRTC session id
 * @param bytes      Canonical padded base64 text
 * @returns Promise resolving when the runtime accepts the send
 *
 * @example
 * ```ts
 * import { webrtcSendBytes } from '@napplet/nap/webrtc';
 *
 * await webrtcSendBytes(session.id, 'AAEC/w==');
 * ```
 */
export function webrtcSendBytes(sessionId: string, bytes: WebrtcBytes): Promise<void> {
  return requireWebrtc().sendBytes(sessionId, bytes);
}

/** Close a WebRTC session. */
export function webrtcClose(sessionId: string, reason?: string): Promise<void> {
  return requireWebrtc().close(sessionId, reason);
}

/** Subscribe to runtime-pushed WebRTC events. */
export function webrtcOnEvent(handler: (event: WebrtcEvent) => void): Subscription {
  return requireWebrtc().onEvent(handler);
}
