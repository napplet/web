import { describe, it, expect } from 'vitest';
import { validateEnvelope, ENVELOPE_SPECS, knownEnvelopeTypes } from './envelope.js';

describe('validateEnvelope — structural guards', () => {
  it('rejects non-objects', () => {
    for (const v of [null, undefined, 42, 'x', [], true]) {
      const verdict = validateEnvelope(v as unknown);
      expect(verdict.ok).toBe(false);
    }
    expect(validateEnvelope(null).errors[0].code).toBe('not-an-object');
    expect(validateEnvelope([]).errors[0].code).toBe('not-an-object');
  });

  it('rejects a missing or non-string type', () => {
    expect(validateEnvelope({}).errors[0].code).toBe('missing-type');
    expect(validateEnvelope({ type: 5 }).errors[0].code).toBe('missing-type');
  });

  it('rejects a type without domain.action form', () => {
    expect(validateEnvelope({ type: 'relay' }).errors[0].code).toBe('malformed-type');
    expect(validateEnvelope({ type: '.action' }).errors[0].code).toBe('malformed-type');
  });

  it('rejects an unknown domain', () => {
    const v = validateEnvelope({ type: 'bogus.thing' });
    expect(v.ok).toBe(false);
    expect(v.errors[0].code).toBe('unknown-domain');
  });

  it('rejects an unknown action within a known domain', () => {
    const v = validateEnvelope({ type: 'relay.teleport', id: 'x' });
    expect(v.ok).toBe(false);
    expect(v.errors[0].code).toBe('unknown-type');
  });
});

describe('validateEnvelope — direction enforcement', () => {
  it('rejects a napplet emitting a shell→napplet (inbound) type', () => {
    const v = validateEnvelope({ type: 'relay.event', subId: 's', event: {} });
    expect(v.ok).toBe(false);
    expect(v.direction).toBe('in');
    expect(v.errors[0].code).toBe('inbound-type-emitted');
  });
});

describe('validateEnvelope — outbound field checks', () => {
  it('accepts a well-formed relay.subscribe', () => {
    const v = validateEnvelope({ type: 'relay.subscribe', id: 'a', subId: 'b', filters: [{ kinds: [1] }] });
    expect(v.ok).toBe(true);
    expect(v.direction).toBe('out');
    expect(v.errors).toHaveLength(0);
  });

  it('flags missing required fields', () => {
    const v = validateEnvelope({ type: 'relay.subscribe', id: 'a' });
    expect(v.ok).toBe(false);
    const missing = v.errors.filter((e) => e.code === 'missing-field').map((e) => e.field).sort();
    expect(missing).toEqual(['filters', 'subId']);
  });

  it('flags wrong field kinds', () => {
    const v = validateEnvelope({ type: 'relay.subscribe', id: 'a', subId: 'b', filters: { not: 'an array' } });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.code === 'wrong-type' && e.field === 'filters')).toBe(true);
  });

  it('accepts a fire-and-forget inc.emit with only a topic', () => {
    const v = validateEnvelope({ type: 'inc.emit', topic: 'room' });
    expect(v.ok).toBe(true);
  });

  it('treats `present` fields as required-but-untyped (outbox.query filters union)', () => {
    expect(validateEnvelope({ type: 'outbox.query', id: 'a', filters: { kinds: [1] } }).ok).toBe(true);
    expect(validateEnvelope({ type: 'outbox.query', id: 'a', filters: [{ kinds: [1] }] }).ok).toBe(true);
    expect(validateEnvelope({ type: 'outbox.query', id: 'a' }).ok).toBe(false);
  });

  it('requires resource.bytesMany to carry a URL array', () => {
    expect(validateEnvelope({ type: 'resource.bytesMany', id: 'a', urls: ['https://x/y'] }).ok).toBe(true);
    expect(validateEnvelope({ type: 'resource.bytesMany', id: 'a' }).errors[0].code).toBe('missing-field');
    expect(validateEnvelope({ type: 'resource.bytesMany', id: 'a', urls: 'https://x/y' }).errors[0].code).toBe('wrong-type');
  });

  it('validates a representative outbound message from every NAP that has one', () => {
    // One concrete happy-path per outbound-bearing domain.
    const samples: Record<string, unknown> = {
      relay: { type: 'relay.query', id: 'a', filters: [] },
      identity: { type: 'identity.getPublicKey', id: 'a' },
      storage: { type: 'storage.get', id: 'a', key: 'k' },
      inc: { type: 'inc.subscribe', id: 'a', topic: 't' },
      theme: { type: 'theme.get', id: 'a' },
      keys: { type: 'keys.unregisterAction', actionId: 'x' },
      media: { type: 'media.session.destroy', sessionId: 's' },
      notify: { type: 'notify.badge', count: 3 },
      config: { type: 'config.get', id: 'a' },
      resource: { type: 'resource.bytesMany', id: 'a', urls: ['https://x/y'] },
      cvm: { type: 'cvm.discover', id: 'a' },
      outbox: { type: 'outbox.close', id: 'a', subId: 's' },
      upload: { type: 'upload.status', id: 'a', uploadId: 'u' },
      intent: { type: 'intent.handlers', id: 'a' },
      ble: { type: 'ble.read', id: 'a', sessionId: 's', target: { service: 'battery_service', characteristic: 'battery_level' } },
      webrtc: {
        type: 'webrtc.open',
        id: 'a',
        request: { scope: { type: 'direct', pubkey: 'abc123' } },
      },
      link: { type: 'link.open', id: 'a', url: 'https://example.com/post/123' },
      lists: {
        type: 'lists.add',
        id: 'a',
        list: { type: 'mute-list' },
        items: [{ itemType: 'pubkey', value: 'abc123' }],
      },
      common: { type: 'common.react', id: 'a', targetEventId: 'e'.repeat(64), reaction: '+' },
      serial: { type: 'serial.write', id: 'a', sessionId: 's', data: [1, 2, 3] },
    };
    for (const [domain, msg] of Object.entries(samples)) {
      const v = validateEnvelope(msg);
      expect(v.ok, `${domain}: ${JSON.stringify(v.errors)}`).toBe(true);
    }
  });
});

describe('validateEnvelope — no generic shell domain', () => {
  it('rejects removed generic shell messages as an unknown domain', () => {
    const removedReady = ['shell', 'ready'].join('.');
    const removedInit = ['shell', 'init'].join('.');
    expect(validateEnvelope({ type: removedReady }).errors[0].code).toBe('unknown-domain');
    expect(validateEnvelope({ type: removedInit }).errors[0].code).toBe('unknown-domain');
  });
});

describe('ENVELOPE_SPECS invariants', () => {
  it('has 191 discriminants split 92 outbound / 99 inbound', () => {
    const all = knownEnvelopeTypes();
    expect(all).toHaveLength(191);
    const out = all.filter((t) => ENVELOPE_SPECS[t].dir === 'out');
    const inbound = all.filter((t) => ENVELOPE_SPECS[t].dir === 'in');
    expect(out).toHaveLength(92);
    expect(inbound).toHaveLength(99);
  });

  it('only outbound specs declare required fields', () => {
    for (const [type, spec] of Object.entries(ENVELOPE_SPECS)) {
      if (spec.dir === 'in') {
        expect(spec.fields, `${type} is inbound and should not declare fields`).toBeUndefined();
      }
    }
  });
});
