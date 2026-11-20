import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';

let shell: FakeShell;
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `relay-test-${++uuidCounter}`,
    },
  });

  shell = installFakeShell();

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  vi.unstubAllGlobals();
});

function lastPosted(type: string): any {
  for (let i = shell.sent.length - 1; i >= 0; i--) {
    if (shell.sent[i]?.type === type) return shell.sent[i];
  }
  throw new Error(`no posted message of type ${type}`);
}

function emitFromParent(data: unknown): void {
  shell.deliver(data);
}

describe('@napplet/nap/relay shim', () => {
  it('resolves relay.query results without events to an empty array', async () => {
    const { query } = await import('./shim.js');

    const promise = query({ kinds: [1] });
    const sent = lastPosted('relay.query');
    expect(sent).toEqual({
      type: 'relay.query',
      id: 'relay-test-1',
      filters: [{ kinds: [1] }],
    });

    emitFromParent({
      type: 'relay.query.result',
      id: sent.id,
    });

    await expect(promise).resolves.toEqual([]);
  });

  const EVENT = {
    id: 'e1', pubkey: 'p1', created_at: 1, kind: 0, tags: [], content: '{}', sig: 's1',
  };

  // NAP-RESOURCE §Sidecar Pre-Resolution (imported by NAP-RELAY) + web projection §Resource binding:
  // sidecar blobs are base64 ResourceBytes, hydrated before the handler runs; an invalid encoding
  // reaches neither the cache nor the napplet's success callback.
  it('hydrates valid sidecar resources and drops invalid ones before onEvent', async () => {
    const { subscribe } = await import('./shim.js');
    const { bytes } = await import('../resource/shim.js');
    const onEvent = vi.fn();

    subscribe({ kinds: [0] }, onEvent, () => undefined);
    const sent = lastPosted('relay.subscribe');
    emitFromParent({
      type: 'relay.event',
      subId: sent.subId,
      result: {
        event: EVENT,
        sidecar: {
          relayHints: ['wss://relay.example.com'],
          resources: [
            { url: 'https://example.com/avatar.png', blob: 'AAEC/w==', mime: 'image/png' },
            { url: 'https://example.com/banner.png', blob: 'AAEC/w', mime: 'image/png' },
          ],
        },
      },
    });

    expect(onEvent).toHaveBeenCalledTimes(1);
    const [result] = onEvent.mock.calls[0];
    expect(result.sidecar.relayHints).toEqual(['wss://relay.example.com']);
    expect(result.sidecar.resources).toEqual([
      { url: 'https://example.com/avatar.png', blob: 'AAEC/w==', mime: 'image/png' },
    ]);

    const avatar = await bytes('https://example.com/avatar.png');
    expect(avatar.type).toBe('image/png');
    expect([...new Uint8Array(await avatar.arrayBuffer())]).toEqual([0x00, 0x01, 0x02, 0xff]);
    expect(shell.sent.some((posted) => posted?.type === 'resource.bytes')).toBe(false);
  });

  it('removes sidecar.resources from query results when no entry decodes', async () => {
    const { query } = await import('./shim.js');

    const promise = query({ kinds: [0] });
    const sent = lastPosted('relay.query');
    emitFromParent({
      type: 'relay.query.result',
      id: sent.id,
      events: [{ event: EVENT, sidecar: { resources: [{ url: 'https://example.com/a.png', blob: new Blob(['a']), mime: 'image/png' }] } }],
    });

    const [result] = await promise;
    expect(result.sidecar).toEqual({});
  });
});
