/**
 * Napplet NAP webrtc shim entrypoint.
 *
 * @module
 */

// @napplet/nap/webrtc -- Runtime-mediated WebRTC shim.
// Correlates webrtc.* request/result envelopes and routes webrtc.event pushes.

import { postToShell } from '../boundary.js';
import type { Subscription } from '@napplet/core';
import type {
  WebrtcEvent,
  WebrtcInboundMessage,
  WebrtcNapMessage,
  WebrtcOpenRequest,
  WebrtcOpenResult,
  WebrtcOutboundMessage,
} from './types.js';

const REQUEST_TIMEOUT_MS = 30_000;

type Pending<T> = {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  resultType: WebrtcInboundMessage['type'];
  project: (msg: WebrtcInboundMessage) => T;
};

const pending = new Map<string, Pending<unknown>>();
const eventHandlers = new Set<(event: WebrtcEvent) => void>();
let installed = false;

const WEBRTC_MESSAGE_TYPES = new Set<string>([
  'webrtc.open',
  'webrtc.open.result',
  'webrtc.send',
  'webrtc.send.result',
  'webrtc.close',
  'webrtc.close.result',
  'webrtc.event',
]);

function isWebrtcNapMessage(msg: { type: string }): msg is WebrtcNapMessage {
  return WEBRTC_MESSAGE_TYPES.has(msg.type);
}

function request<T>(
  msg: WebrtcOutboundMessage,
  resultType: WebrtcInboundMessage['type'],
  project: (msg: WebrtcInboundMessage) => T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.delete(msg.id)) reject(new Error(`${msg.type} timed out`));
    }, REQUEST_TIMEOUT_MS);

    pending.set(msg.id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
      resultType,
      project: project as (msg: WebrtcInboundMessage) => unknown,
    });

    postToShell(msg);
  });
}

function rejectResult(msg: WebrtcInboundMessage, fallback: string): never {
  if ('error' in msg && msg.error) throw new Error(msg.error);
  throw new Error(fallback);
}

function handleEvent(event: WebrtcEvent): void {
  for (const handler of eventHandlers) handler(event);
}

/**
 * Handle webrtc.* result and event messages from the shell.
 *
 * @param msg  The shell envelope to route
 */
export function handleWebrtcMessage(msg: { type: string; [key: string]: unknown }): void {
  if (!isWebrtcNapMessage(msg)) return;

  if (msg.type === 'webrtc.event') {
    handleEvent(msg.event);
    return;
  }

  if (!('id' in msg) || typeof msg.id !== 'string') return;
  const entry = pending.get(msg.id);
  if (!entry || msg.type !== entry.resultType) return;

  pending.delete(msg.id);
  clearTimeout(entry.timeout);
  try {
    entry.resolve(entry.project(msg));
  } catch (error) {
    entry.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Open a runtime-owned WebRTC session.
 *
 * @param openRequest  Session scope and channel/protocol labels
 * @returns Promise resolving to the opened session result
 */
export function open(openRequest: WebrtcOpenRequest): Promise<WebrtcOpenResult> {
  return request(
    { type: 'webrtc.open', id: crypto.randomUUID(), request: openRequest },
    'webrtc.open.result',
    (msg) => {
      if (msg.type === 'webrtc.open.result' && msg.session) return { session: msg.session };
      rejectResult(msg, 'webrtc open failed');
    },
  );
}

/**
 * Send an opaque application payload over a WebRTC session.
 *
 * @param sessionId  WebRTC session id
 * @param payload    Application payload
 * @returns Promise resolving when the runtime accepts the send
 */
export function send(sessionId: string, payload: unknown): Promise<void> {
  return request(
    { type: 'webrtc.send', id: crypto.randomUUID(), sessionId, payload },
    'webrtc.send.result',
    (msg) => {
      if (msg.type === 'webrtc.send.result' && !msg.error) return undefined;
      rejectResult(msg, 'webrtc send failed');
    },
  );
}

/**
 * Close a WebRTC session.
 *
 * @param sessionId  WebRTC session id
 * @param reason     Optional close reason
 * @returns Promise resolving when the session is closed
 */
export function close(sessionId: string, reason?: string): Promise<void> {
  return request(
    { type: 'webrtc.close', id: crypto.randomUUID(), sessionId, ...(reason ? { reason } : {}) },
    'webrtc.close.result',
    (msg) => {
      if (msg.type === 'webrtc.close.result' && !msg.error) return undefined;
      rejectResult(msg, 'webrtc close failed');
    },
  );
}

/**
 * Subscribe to runtime-pushed WebRTC events.
 *
 * @param handler  Event handler
 * @returns Subscription handle
 */
export function onEvent(handler: (event: WebrtcEvent) => void): Subscription {
  eventHandlers.add(handler);
  return {
    close() {
      eventHandlers.delete(handler);
    },
  };
}

/**
 * Install the WebRTC shim. Registration-only -- sessions are opened on demand.
 *
 * @returns cleanup function that clears pending requests and event handlers
 */
export function installWebrtcShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  return () => {
    for (const entry of pending.values()) clearTimeout(entry.timeout);
    pending.clear();
    eventHandlers.clear();
    installed = false;
  };
}
