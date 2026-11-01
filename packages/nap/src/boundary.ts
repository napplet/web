/**
 * Napplet ⇄ shell transport: the realm's single NIP-5D `MessagePort`.
 *
 * NIP-5D Transport: the injected bootstrap creates a `MessageChannel` before
 * any napplet script runs, keeps one port private, and transfers the other to
 * the shell exactly once in `napplet.hello`. Every NAP message in both
 * directions then travels over that port, and the shell binds the napplet's
 * identity to it, so a document that later replaces this one in the same frame
 * has no channel, identity or grants.
 * https://github.com/nostr-protocol/nips/pull/2303
 *
 * The port lives only in this module's closure and is never exported. NAP shims
 * send through {@link postToShell} and receive through {@link onShellMessage};
 * outbound sends go through @napplet/core's clone-safe chokepoint
 * (napplet/web#67).
 *
 * @module
 */

import { sendPortEnvelope } from '@napplet/core';

/** The NIP-5D handoff message type. */
export const NAPPLET_HELLO = 'napplet.hello';

/** An inbound envelope from the shell. */
export type ShellMessage = { type: string; [key: string]: unknown };

interface Connection {
  /** The window the connection was made in. A realm has one; tests swap it. */
  realm: object;
  port: MessagePort;
}

let connection: Connection | null = null;
const listeners = new Set<(message: ShellMessage) => void>();

function dispatch(event: MessageEvent): void {
  const message = event.data;
  if (typeof message !== 'object' || message === null || typeof message.type !== 'string') return;
  for (const listener of listeners) listener(message as ShellMessage);
}

function ensureConnection(): Connection {
  if (connection?.realm === window) return connection;
  const channel = new MessageChannel();
  const port = channel.port1;
  port.onmessage = dispatch;
  connection = { realm: window, port };
  window.parent.postMessage({ type: NAPPLET_HELLO }, '*', [channel.port2]);
  return connection;
}

/**
 * Create the NIP-5D channel and hand its port to the shell in `napplet.hello`.
 *
 * Idempotent: the hello is sent once per realm, because a second hello tells
 * the shell this document was replaced. Runtimes call this before any napplet
 * script runs; {@link postToShell} also calls it.
 *
 * @example
 * ```ts
 * import { connectShell } from '@napplet/nap/boundary';
 * connectShell();
 * ```
 */
export function connectShell(): void {
  ensureConnection();
}

/**
 * Post a JSON envelope to the shell over the bound port. Delegates clone-safety
 * to @napplet/core's `sendPortEnvelope`.
 *
 * @param message - The envelope; must carry a `type` discriminator.
 * @example
 * ```ts
 * postToShell({ type: 'storage.get', id, key: 'theme' });
 * ```
 */
export function postToShell<T extends { type: string }>(message: T): void {
  sendPortEnvelope(ensureConnection().port, message);
}

/**
 * Receive envelopes the shell sends over the bound port. Window-level messages
 * are never delivered: NIP-5D shells send NAP messages only over the port.
 *
 * @param listener - Called with each inbound envelope that has a string `type`.
 * @returns A function that removes the listener.
 * @example
 * ```ts
 * const off = onShellMessage((message) => console.log(message.type));
 * ```
 */
export function onShellMessage(listener: (message: ShellMessage) => void): () => void {
  ensureConnection();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
