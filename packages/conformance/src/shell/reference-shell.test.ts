import { describe, it, expect } from 'vitest';
import {
  createReferenceShell,
  attachReferenceShell,
  REFERENCE_PUBKEY,
  type ReferenceEndpoint,
  type MessageWindowLike,
} from './reference-shell.js';
import { REFERENCE_HANDLER } from './reference-responses.js';

const authenticatedSource: ReferenceEndpoint = { id: 'authenticated-source-endpoint', catalogId: 'authenticated-source' };

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

  it('advertises the reference intent handler through canonical conventions', () => {
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
              id: REFERENCE_HANDLER,
              contracts: [{ convention: 'napplet:note/open', params: ['event'] }],
              actions: ['open'],
              conventions: ['napplet:note/open'],
              isDefault: true,
            },
          ],
          hasDefault: true,
        },
      },
    ]);
  });

  it('retains target delivery independently after immediate acceptance', () => {
    const shell = createReferenceShell();
    const sourceAtAcceptance: ReferenceEndpoint = { id: 'source-endpoint', catalogId: 'source-at-acceptance' };

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
          handler: REFERENCE_HANDLER,
        },
      },
    ]);
    expect(shell.takeDeliveries(REFERENCE_HANDLER)).toEqual([{
      type: 'intent.deliver',
      delivery: { sender: 'source-at-acceptance', archetype: 'note', action: 'open', convention: 'napplet:note/open', payload: { event: 'abc123' } },
    }]);
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

  it('rejects inconsistent or non-stable normalized intent identities', () => {
    const shell = createReferenceShell();
    for (const request of [
      { archetype: 'note', action: 'edit', convention: 'napplet:note/open' },
      { archetype: 'viewer', action: 'open', convention: 'napplet:note/open' },
      { archetype: 'note', action: 'open', convention: 'napplet:note/open?event=abc' },
      { archetype: 'note', action: 'open', convention: 'napplet:note/open#hint' },
    ]) {
      expect(shell.handleFrom(authenticatedSource, { type: 'intent.invoke', id: 'conflict', request })).toEqual([]);
      expect(shell.records.at(-1)?.verdict.ok).toBe(false);
    }
    expect(shell.takeDeliveries(REFERENCE_HANDLER)).toEqual([]);
  });

  it('does not fall back from explicit unknown handlers to the default', () => {
    const shell = createReferenceShell();
    expect(shell.handle({ type: 'intent.invoke', id: 'explicit', request: { archetype: 'note', action: 'open', convention: 'napplet:note/open', handler: 'unknown' } })).toEqual([{ type: 'intent.invoke.result', id: 'explicit', result: { ok: false, error: 'no handler' } }]);
    expect(shell.takeDeliveries(REFERENCE_HANDLER)).toEqual([]);
  });

  it('delivers optional environment exactly once and leaves other domains usable', () => {
    const shell = createReferenceShell();
    const endpoint = { id: 'instance-1', catalogId: 'catalog-source', domains: ['shell', 'identity'] };
    expect(shell.handleFrom(endpoint, { type: 'identity.getPublicKey', id: 'before-ready' })).toHaveLength(1);
    expect(shell.handleFrom(endpoint, { type: 'shell.ready' })).toEqual([{ type: 'shell.init', capabilities: { domains: ['shell', 'identity'] }, services: [] }]);
    expect(shell.handleFrom(endpoint, { type: 'shell.ready' })).toEqual([]);
    expect(shell.handleFrom({ ...endpoint, id: 'instance-2' }, { type: 'shell.ready' })).toHaveLength(1);
    expect(shell.handleFrom({ ...endpoint, domains: ['identity'] }, { type: 'shell.ready' })).toEqual([]);
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
        sender: 'authenticated-source-endpoint',
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

  it('accepts per-resource server hints for resource.bytesMany', async () => {
    const shell = createReferenceShell();
    const [response] = shell.handle({
      type: 'resource.bytesMany',
      id: 'R',
      requests: [{
        url: 'data:text/plain;base64,aGk=',
        servers: ['https://cdn.example'],
      }],
    }) as Array<{ type: string; id: string; items: Array<{ url: string; blob: Blob; mime: string }> }>;

    expect(response.type).toBe('resource.bytesMany.result');
    expect(response.id).toBe('R');
    expect(response.items[0].url).toBe('data:text/plain;base64,aGk=');
    expect(response.items[0].mime).toBe('text/plain');
    expect(await response.items[0].blob.text()).toBe('hi');
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
