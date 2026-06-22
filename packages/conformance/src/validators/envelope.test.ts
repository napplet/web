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
      resource: { type: 'resource.bytes', id: 'a', url: 'https://x/y' },
      cvm: { type: 'cvm.discover', id: 'a' },
      outbox: { type: 'outbox.close', id: 'a', subId: 's' },
      upload: { type: 'upload.status', id: 'a', uploadId: 'u' },
      intent: { type: 'intent.handlers', id: 'a' },
      link: { type: 'link.open', id: 'a', url: 'https://example.com/post/123' },
    };
    for (const [domain, msg] of Object.entries(samples)) {
      const v = validateEnvelope(msg);
      expect(v.ok, `${domain}: ${JSON.stringify(v.errors)}`).toBe(true);
    }
  });
});

describe('validateEnvelope — NAP-SHELL foundational domain', () => {
  it('accepts shell.ready as a bare outbound liveness ping', () => {
    const v = validateEnvelope({ type: 'shell.ready' });
    expect(v.ok).toBe(true);
    expect(v.domain).toBe('shell');
    expect(v.direction).toBe('out');
  });

  it('recognizes shell.init as inbound (not an unknown domain)', () => {
    const v = validateEnvelope({
      type: 'shell.init',
      capabilities: { domains: [], protocols: {} },
      services: [],
    });
    expect(v.ok).toBe(false);
    expect(v.domain).toBe('shell');
    expect(v.direction).toBe('in');
    expect(v.errors[0].code).toBe('inbound-type-emitted');
  });
});

describe('ENVELOPE_SPECS invariants', () => {
  it('has 126 discriminants split 62 outbound / 64 inbound', () => {
    const all = knownEnvelopeTypes();
    expect(all).toHaveLength(126);
    const out = all.filter((t) => ENVELOPE_SPECS[t].dir === 'out');
    const inbound = all.filter((t) => ENVELOPE_SPECS[t].dir === 'in');
    expect(out).toHaveLength(62);
    expect(inbound).toHaveLength(64);
  });

  it('only outbound specs declare required fields', () => {
    for (const [type, spec] of Object.entries(ENVELOPE_SPECS)) {
      if (spec.dir === 'in') {
        expect(spec.fields, `${type} is inbound and should not declare fields`).toBeUndefined();
      }
    }
  });
});
