import { describe, expect, it } from 'vitest';
import { encodeBuildSignerSecret, RedactedSecret, type Clock } from '@napplet/build-tools';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import { WebSocketServer } from 'ws';
import { createNodeDiscoveryServices, createNodePairingAdapter } from './node-nostr.js';

const clock: Clock = {
  now: () => 1_700_000_000_000,
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

describe('production Node Nostr adapters', () => {
  it('locally verifies relay candidates and rejects forged signatures', () => {
    const event = finalizeEvent({ kind: 10_002, created_at: 1_700_000_000, tags: [], content: '' }, generateSecretKey());
    const discovery = createNodeDiscoveryServices();
    const forged = {
      id: event.id,
      pubkey: event.pubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags,
      content: event.content,
      sig: '0'.repeat(128),
    };

    expect(discovery.verifyEvent?.(forged)).toBe(false);
    expect(discovery.verifyEvent?.(event)).toBe(true);
  });

  it('queries with the explicit Node transport when no global WebSocket exists', async () => {
    const event = finalizeEvent({ kind: 10_002, created_at: 1_700_000_000, tags: [], content: '' }, generateSecretKey());
    const server = new WebSocketServer({ port: 0 });
    await new Promise<void>((resolve) => server.once('listening', resolve));
    server.on('connection', (socket) => socket.on('message', (raw) => {
      const request = JSON.parse(raw.toString()) as [string, string];
      if (request[0] !== 'REQ') return;
      socket.send(JSON.stringify(['EVENT', request[1], event]));
      socket.send(JSON.stringify(['EOSE', request[1]]));
    }));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('fixture websocket did not bind');
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: undefined });
    try {
      const events = await createNodeDiscoveryServices().query(
        [`ws://127.0.0.1:${address.port}`],
        { kinds: [10_002], authors: [event.pubkey], limit: 1 },
        new AbortController().signal,
      );
      expect(events).toHaveLength(1);
      expect((events[0] as { id?: string }).id).toBe(event.id);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'WebSocket', descriptor);
      else delete (globalThis as { WebSocket?: unknown }).WebSocket;
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it('decodes stored nbunksec identity without opening a relay', () => {
    const remotePubkey = 'a'.repeat(64);
    const relays = ['wss://signer.example'];
    const encoded = encodeBuildSignerSecret({
      remotePubkey,
      clientSecretKey: 'b'.repeat(64),
      relays,
      secret: 'pair-secret',
    });

    const identity = createNodePairingAdapter(clock).parseStoredSession(new RedactedSecret(encoded));
    expect(identity).toEqual({ remotePubkey, relays });
  });
});
