/**
 * Napplet NAP link shim entrypoint.
 *
 * @module
 */

// @napplet/nap/link -- Shell-mediated link opening shim.
// Correlates link.open request/result envelopes. The shell owns navigation.

import { postToShell } from '../boundary.js';
import type { LinkOpenOptions, LinkOpenResult } from '@napplet/core';
import type { LinkOpenMessage, LinkOpenResultMessage } from './types.js';

/** Default timeout for link.open request-responses (30s; aligns with other NAPs). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Pending link.open requests: correlation id -> resolver record. */
const pendingOpen = new Map<string, {
  resolve: (result: LinkOpenResult) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

/** Guard against double-install. */
let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function handleOpenResult(msg: LinkOpenResultMessage): void {
  const p = pendingOpen.get(msg.id);
  if (!p) return;
  pendingOpen.delete(msg.id);
  clearTimeout(p.timeout);
  if (msg.status === 'opened' || msg.status === 'denied') {
    p.resolve({ status: msg.status });
    return;
  }
  p.reject(new Error(msg.error ?? 'link open failed'));
}

/**
 * Handle link.* messages from the shell via the central message listener.
 */
export function handleLinkMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<LinkOpenResultMessage>(msg, 'link.open.result')) {
    handleOpenResult(msg);
  }
}

/**
 * Request that the shell open an external URL for the user. The shell validates
 * the URL, applies policy, chooses the browser context, and replies with
 * `status: "opened"` or `status: "denied"`.
 *
 * @param url      Absolute URL to open.
 * @param options  Optional prompt/display hints.
 * @returns Promise resolving to the shell's open/deny status.
 *
 * @example
 * ```ts
 * const result = await open('https://example.com/post/123', { label: 'Read post' });
 * if (result.status === 'denied') showInlineFallback();
 * ```
 */
export function open(url: string, options?: LinkOpenOptions): Promise<LinkOpenResult> {
  const id = crypto.randomUUID();
  return new Promise<LinkOpenResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingOpen.delete(id)) reject(new Error('link.open timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingOpen.set(id, { resolve, reject, timeout });

    const msg: LinkOpenMessage = {
      type: 'link.open',
      id,
      url,
      ...(options ? { options } : {}),
    };
    postToShell(msg);
  });
}

/**
 * Install the link shim. Registration-only -- links are opened on demand, not
 * at install time.
 *
 * @returns cleanup function that rejects pending requests and clears state.
 */
export function installLinkShim(): () => void {
  if (installed) {
    return () => undefined; // already installed: no-op cleanup
  }
  installed = true;
  return () => {
    for (const p of pendingOpen.values()) {
      clearTimeout(p.timeout);
      p.reject(new Error('link shim uninstalled'));
    }
    pendingOpen.clear();
    installed = false;
  };
}
