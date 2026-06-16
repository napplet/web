import { describe, it, expect } from 'vitest';
import {
  createReferenceShell,
  attachReferenceShell,
  REFERENCE_PUBKEY,
  type MessageWindowLike,
} from './reference-shell.js';

describe('createReferenceShell — handshake', () => {
  it('answers shell.ready with shell.init carrying default (all-NAP) capabilities', () => {
    const shell = createReferenceShell();
    const out = shell.handle({ type: 'shell.ready' }) as Array<{ type: string; capabilities: { naps: string[] } }>;
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('shell.init');
    expect(out[0].capabilities.naps).toContain('relay');
    expect(out[0].capabilities.naps).toContain('storage');
    // The handshake is not a NAP envelope; it must not be recorded.
    expect(shell.records).toHaveLength(0);
  });

  it('advertises empty capabilities when configured (drives supports()=false)', () => {
    const shell = createReferenceShell({ capabilities: { naps: [], sandbox: [] } });
    const out = shell.handle({ type: 'shell.ready' }) as Array<{ capabilities: { naps: string[] } }>;
    expect(out[0].capabilities.naps).toEqual([]);
  });
});

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
    shell.handle({ type: 'relay.subscribe', id: '1' }); // missing subId + filters
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
    const nappletWindow = {}; // stand-in for iframe.contentWindow

    const shell = createReferenceShell();
    const detach = attachReferenceShell(shell, { host, target, expectedSource: nappletWindow });
    expect(typeof listener).toBe('function');

    // Event from the wrong source is ignored.
    listener!({ source: {}, data: { type: 'storage.get', id: '1', key: 'k' } } as unknown as MessageEvent);
    expect(posted).toHaveLength(0);

    // Event from the expected source is handled.
    listener!({ source: nappletWindow, data: { type: 'storage.get', id: '1', key: 'k' } } as unknown as MessageEvent);
    expect(posted).toEqual([{ type: 'storage.get.result', id: '1', value: null }]);

    detach();
    expect(listener).toBeUndefined();
  });
});
