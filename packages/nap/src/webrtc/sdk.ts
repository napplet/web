// @napplet/nap/webrtc/sdk -- Named helpers wrapping window.napplet.webrtc.

import type { NappletGlobal, Subscription } from '@napplet/core';
import type {
  WebrtcEvent,
  WebrtcOpenRequest,
  WebrtcOpenResult,
} from './types.js';

function requireWebrtc(): NappletGlobal['webrtc'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.webrtc) {
    throw new Error('window.napplet.webrtc not installed -- import @napplet/shim first');
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

/** Close a WebRTC session. */
export function webrtcClose(sessionId: string, reason?: string): Promise<void> {
  return requireWebrtc().close(sessionId, reason);
}

/** Subscribe to runtime-pushed WebRTC events. */
export function webrtcOnEvent(handler: (event: WebrtcEvent) => void): Subscription {
  return requireWebrtc().onEvent(handler);
}
