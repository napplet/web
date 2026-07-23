import { describe, it, expect } from 'vitest';
import {
  createReferenceShell,
  attachReferenceShell,
  REFERENCE_PUBKEY,
  type ReferenceEndpoint,
  type MessageWindowLike,
} from './reference-shell.js';

const authenticatedSource: ReferenceEndpoint = { dTag: 'authenticated-source' };

describe('createReferenceShell — record + respond', () => {
  it('records each inbound envelope with a verdict and timestamp', () => {
    let t = 1000;
    const shell = createReferenceShell({ now: () => (t += 5) });
    shell.handle({ type: 'storage.get', id: '1', key: 'k' });
    shell.handle({ type: 'relay.subscribe', id: '2', subId: 's', filters: [] });
    expect(shell.records).toHaveLength(2);
    expect(shell.records[0].verdict.ok).toBe(true);
    expect(shell.records[0].timestamp).toBe(1005);
    expect(shell.records[1].timestamp).toBe(1010);
  });

  it('records a malformed envelope with a failing verdict', () => {
    const shell = createReferenceShell();
    shell.handle({ type: 'relay.subscribe', id: '1' });
    expect(shell.records[0].verdict.ok).toBe(false);
  });

  it('produces correlated, spec-valid responses', () => {
    const shell = createReferenceShell();
    expect(shell.handle({ type: 'storage.get', id: 'X', key: 'k' })).toEqual([
      { type: 'storage.get.result', id: 'X', value: null },
    ]);
    expect(shell.handle({ type: 'identity.getPublicKey', id: 'Y' })).toEqual([
      { type: 'identity.getPublicKey.result', id: 'Y', pubkey: REFERENCE_PUBKEY },
    ]);
    expect(shell.handle({ type: 'relay.subscribe', id: 'Z', subId: 'sub', filters: [] })).toEqual([
      { type: 'relay.eose', subId: 'sub' },
    ]);
  });

  it('advertises the reference intent handler through queryless contracts', () => {
    const shell = createReferenceShell();

    expect(shell.handle({ type: 'intent.available', id: 'intent-1', archetype: 'note' })).toEqual([
      {
        type: 'intent.available.result',
        id: 'intent-1',
        availability: {
          archetype: 'note',
          available: true,
          candidates: [
            {
              dTag: 'reference-handler',
              actions: ['open'],
              conventions: ['napplet:note/open'],
              contracts: [{ convention: 'napplet:note/open', eventKinds: [1, 30023] }],
              isDefault: true,
            },
          ],
          hasDefault: true,
        },
      },
    ]);
  });

  it('accepts a normalized invoke before delivering the endpoint-attested target payload', () => {
    const shell = createReferenceShell();
    const sourceAtAcceptance: ReferenceEndpoint = { dTag: 'source-at-acceptance' };

    expect(shell.handleFrom(sourceAtAcceptance, {
      type: 'intent.invoke',
      id: 'intent-1',
      request: {
        archetype: 'note',
        action: 'open',
        convention: 'napplet:note/open',
        payload: { event: 'abc123' },
      },
    })).toEqual([
      {
        type: 'intent.invoke.result',
        id: 'intent-1',
        result: {
          ok: true,
          archetype: 'note',
          action: 'open',
          convention: 'napplet:note/open',
          handler: 'reference-handler',
        },
      },
    ]);

    sourceAtAcceptance.dTag = 'source-after-acceptance';

    expect(shell.takeDeliveries('reference-handler')).toEqual([
      {
        type: 'intent.deliver',
        delivery: {
          sender: 'source-at-acceptance',
          archetype: 'note',
          action: 'open',
          convention: 'napplet:note/open',
          payload: { event: 'abc123' },
        },
      },
    ]);
    expect(shell.takeDeliveries('reference-handler')).toEqual([]);
  });

  it('records forged intent sender data as invalid and does not deliver it', () => {
    const shell = createReferenceShell();

    expect(shell.handleFrom(authenticatedSource, {
      type: 'intent.invoke',
      id: 'intent-forged-sender',
      request: {
        archetype: 'note',
        action: 'open',
        convention: 'napplet:note/open',
        sender: 'forged-source',
      },
    })).toEqual([]);
    expect(shell.records.at(-1)?.verdict.ok).toBe(false);
    expect(shell.takeDeliveries('reference-handler')).toEqual([]);
  });

  it('rejects normalized intent conflicts before handler resolution or target delivery', () => {
    const shell = createReferenceShell();

    expect(shell.handleFrom(authenticatedSource, {
      type: 'intent.invoke',
      id: 'intent-conflict',
      request: {
        archetype: 'note',
        action: 'edit',
        convention: 'napplet:note/open?event=abc123',
      },
    })).toEqual([]);
    expect(shell.records.at(-1)?.verdict.ok).toBe(false);
    expect(shell.takeDeliveries('reference-handler')).toEqual([]);
  });

  it('routes INC only to the exact stable subscriber and derives sender from its endpoint', () => {
    const shell = createReferenceShell();

    expect(shell.handleFrom(authenticatedSource, {
      type: 'inc.emit',
      topic: 'napplet:note/open',
      payload: { event: 'abc123' },
    })).toEqual([]);
    expect(shell.takeDeliveries('reference-subscriber')).toEqual([
      {
        type: 'inc.event',
        topic: 'napplet:note/open',
        sender: 'authenticated-source',
        payload: { event: 'abc123' },
      },
    ]);

    shell.handleFrom(authenticatedSource, {
      type: 'inc.emit',
      topic: 'napplet:note/open?event=abc123',
      payload: { event: 'abc123' },
    });
    expect(shell.takeDeliveries('reference-subscriber')).toEqual([]);

    shell.handleFrom(authenticatedSource, {
      type: 'inc.emit',
      topic: 'napplet:note/open',
      sender: 'forged-source',
    });
    expect(shell.takeDeliveries('reference-subscriber')).toEqual([]);
  });

  it('decodes data URLs for resource.bytes responses without fetch', async () => {
    const shell = createReferenceShell();
    const [response] = shell.handle({
      type: 'resource.bytes',
      id: 'R',
      url: 'data:text/plain;base64,aGk=',
    }) as Array<{ type: string; id: string; blob: Blob; mime: string }>;

    expect(response.type).toBe('resource.bytes.result');
    expect(response.id).toBe('R');
    expect(response.mime).toBe('text/plain');
    expect(await response.blob.text()).toBe('hi');
  });

  it('returns no response for fire-and-forget and unknown messages', () => {
    const shell = createReferenceShell();
    expect(shell.handle({ type: 'inc.emit', topic: 't' })).toEqual([]);
    expect(shell.handle({ type: 'something.unknown' })).toEqual([]);
    expect(shell.handle(42)).toEqual([]);
  });

  it('reset() clears records', () => {
    const shell = createReferenceShell();
    shell.handle({ type: 'storage.keys', id: '1' });
    expect(shell.records).toHaveLength(1);
    shell.reset();
    expect(shell.records).toHaveLength(0);
  });
});

describe('attachReferenceShell', () => {
  it('wires message events to responses and honors the source guard', () => {
    let listener: ((e: MessageEvent) => void) | undefined;
    const host: MessageWindowLike = {
      addEventListener: (_t, l) => {
        listener = l;
      },
      removeEventListener: () => {
        listener = undefined;
      },
    };
    const posted: unknown[] = [];
    const target = { postMessage: (m: unknown) => posted.push(m) };
    const nappletWindow = {};

    const shell = createReferenceShell();
    const detach = attachReferenceShell(shell, { host, target, expectedSource: nappletWindow });
    expect(typeof listener).toBe('function');

    listener!({ source: {}, data: { type: 'storage.get', id: '1', key: 'k' } } as unknown as MessageEvent);
    expect(posted).toHaveLength(0);

    listener!({ source: nappletWindow, data: { type: 'storage.get', id: '1', key: 'k' } } as unknown as MessageEvent);
    expect(posted).toEqual([{ type: 'storage.get.result', id: '1', value: null }]);

    detach();
    expect(listener).toBeUndefined();
  });
});
