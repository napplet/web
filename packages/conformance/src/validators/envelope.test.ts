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
    const v = validateEnvelope({ type: 'relay.event', subId: 's', result: { event: {} } });
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

  it('accepts a fire-and-forget inc.emit with only a topic and rejects caller sender data', () => {
    const v = validateEnvelope({ type: 'inc.emit', topic: 'room' });
    expect(v.ok).toBe(true);

    const forged = validateEnvelope({ type: 'inc.emit', topic: 'room', sender: 'forged-source' });
    expect(forged.ok).toBe(false);
    expect(forged.errors).toContainEqual(expect.objectContaining({
      code: 'forbidden-field',
      field: 'sender',
      message: expect.stringContaining('runtime-derived'),
    }));
  });

  it('accepts the merged intent request while leaving convention and payload values opaque', () => {
    const v = validateEnvelope({
      type: 'intent.invoke',
      id: 'intent-1',
      request: {
        archetype: 'note',
        action: 'open',
        convention: 'napplet:note/open',
        payload: { nested: ['opaque', { values: true }] },
      },
    });
    expect(v.ok).toBe(true);

    const malformed = validateEnvelope({ type: 'intent.invoke', id: 'intent-2', request: [] });
    expect(malformed.ok).toBe(false);
    expect(malformed.errors).toContainEqual(expect.objectContaining({
      code: 'wrong-type',
      field: 'request',
    }));
  });

  it('requires archetype, type-checks optional fields, and rejects invented sender data', () => {
    const base = {
      type: 'intent.invoke',
      id: 'intent-3',
      request: { archetype: 'note' },
    };
    const invalidRequests = [
      {},
      { ...base.request, action: 1 },
      { ...base.request, convention: false },
      { ...base.request, sender: 'forged-source' },
    ];

    for (const request of invalidRequests) {
      expect(validateEnvelope({ ...base, request }).ok).toBe(false);
    }
  });

  it('type-checks optional handler selection, behavior hints, and the 35129 recommendation', () => {
    const pubkey = 'a'.repeat(64);
    const base = { type: 'intent.invoke', id: 'intent-4', request: { archetype: 'note', action: 'open', convention: 'napplet:note/open' } };
    const request = (extra: Record<string, unknown>) => validateEnvelope({ ...base, request: { ...base.request, ...extra } });

    expect(request({ handler: 'choose', behavior: { focus: true, reuse: false } }).ok).toBe(true);
    expect(request({ handlerHint: { address: `35129:${pubkey}:Profile:Viewer` } }).ok).toBe(true);
    expect(request({ handlerHint: { address: `35129:${pubkey}:viewer`, relays: ['wss://relay.example'] } }).ok).toBe(true);

    const invalid: Array<[Record<string, unknown>, string]> = [
      [{ handler: 1 }, 'request.handler'],
      [{ behavior: 'focus' }, 'request.behavior'],
      [{ handlerHint: 'naddr1...' }, 'request.handlerHint'],
      [{ handlerHint: {} }, 'request.handlerHint.address'],
      [{ handlerHint: { address: `30023:${pubkey}:article` } }, 'request.handlerHint.address'],
      [{ handlerHint: { address: `35129:${pubkey.toUpperCase()}:viewer` } }, 'request.handlerHint.address'],
      [{ handlerHint: { address: `35129:${pubkey}:` } }, 'request.handlerHint.address'],
      [{ handlerHint: { address: `35129:${pubkey}:viewer`, relays: 'wss://relay.example' } }, 'request.handlerHint.relays'],
    ];
    for (const [extra, field] of invalid) {
      const verdict = request(extra);
      expect(verdict.ok).toBe(false);
      expect(verdict.errors).toContainEqual(expect.objectContaining({ field }));
    }
  });

  it('requires runtime-attested sender on inbound INC events', () => {
    const missingSender = validateEnvelope({ type: 'inc.event', topic: 'room' });
    expect(missingSender.errors).toContainEqual(expect.objectContaining({
      code: 'missing-field',
      field: 'sender',
    }));
  });

  it('declares the required NAP-INTENT invoke result carrier fields', () => {
    expect(ENVELOPE_SPECS['intent.invoke.result']).toEqual({
      dir: 'in',
      fields: { id: 'string', result: 'object' },
    });
  });

  // NAP-INTENT (napplet/naps master @ 377bf939) §Wire Protocol.
  it('declares the required NAP-INTENT availability and handlers result fields', () => {
    expect(ENVELOPE_SPECS['intent.available.result']).toEqual({
      dir: 'in',
      fields: { id: 'string', availability: 'object' },
    });
    expect(ENVELOPE_SPECS['intent.handlers.result']).toEqual({
      dir: 'in',
      fields: { id: 'string', handlers: 'array' },
    });
    const missing = validateEnvelope({ type: 'intent.handlers.result', id: 'h1', error: 'policy denied' });
    expect(missing.errors).toContainEqual(expect.objectContaining({ code: 'missing-field', field: 'handlers' }));
  });

  // NAP-UPLOAD (napplet/naps#33 @ f5cc981e) wire table.
  it('declares the required NAP-UPLOAD info and status result fields', () => {
    expect(ENVELOPE_SPECS['upload.info.result']).toEqual({
      dir: 'in',
      fields: { id: 'string', info: 'object' },
    });
    expect(ENVELOPE_SPECS['upload.status.result']).toEqual({
      dir: 'in',
      fields: { id: 'string', status: 'object' },
    });
    const missingInfo = validateEnvelope({ type: 'upload.info.result', id: 'i1', error: 'policy denied' });
    expect(missingInfo.errors).toContainEqual(expect.objectContaining({ code: 'missing-field', field: 'info' }));
    const missingStatus = validateEnvelope({ type: 'upload.status.result', id: 's1', error: 'policy denied' });
    expect(missingStatus.errors).toContainEqual(expect.objectContaining({ code: 'missing-field', field: 'status' }));
  });

  // NAP-CVM (napplet/naps#31 @ 28cf1bdb) §Error Handling: success payload fields
  // are omitted on a shell error, so `servers` is not a required carrier field.
  it('requires only id on cvm.discover.result', () => {
    expect(ENVELOPE_SPECS['cvm.discover.result']).toEqual({ dir: 'in', fields: { id: 'string' } });
    const failure = validateEnvelope({ type: 'cvm.discover.result', id: 'd1', error: 'policy denied' });
    expect(failure.errors.map((e) => e.code)).toEqual(['inbound-type-emitted']);
  });

  it('treats `present` fields as required-but-untyped (outbox.query filters union)', () => {
    expect(validateEnvelope({ type: 'outbox.query', id: 'a', filters: { kinds: [1] } }).ok).toBe(true);
    expect(validateEnvelope({ type: 'outbox.query', id: 'a', filters: [{ kinds: [1] }] }).ok).toBe(true);
    expect(validateEnvelope({ type: 'outbox.query', id: 'a' }).ok).toBe(false);
  });

  // NAP-RESOURCE (napplet/naps#80 @ ae5b9c64) §Wire Protocol: resource.bytesMany carries `id`, `urls`.
  it('validates resource.bytesMany urls', () => {
    expect(validateEnvelope({ type: 'resource.bytes', id: 'single', url: 'blossom:abc.bin' }).ok).toBe(true);
    expect(validateEnvelope({
      type: 'resource.bytesMany',
      id: 'a',
      urls: ['https://x/y', 'blossom:abc.bin?xs=cdn.example'],
    }).ok).toBe(true);
    expect(validateEnvelope({ type: 'resource.bytesMany', id: 'a' }).errors[0].code).toBe('missing-field');
    expect(validateEnvelope({ type: 'resource.bytesMany', id: 'a', urls: 'https://x/y' }).errors[0].code).toBe('wrong-type');
    expect(validateEnvelope({ type: 'resource.bytesMany', id: 'a', urls: [] }).errors[0].code).toBe('invalid-resource-request');
    expect(validateEnvelope({ type: 'resource.bytesMany', id: 'a', urls: ['https://x/y', 1] }).errors[0]).toMatchObject({
      code: 'wrong-type',
      field: 'urls[1]',
    });
  });

  it('rejects the retired per-resource requests shape', () => {
    const legacy = validateEnvelope({ type: 'resource.bytesMany', id: 'a', requests: [{ url: 'https://x/y' }] });
    expect(legacy.ok).toBe(false);
    expect(legacy.errors[0]).toMatchObject({ code: 'missing-field', field: 'urls' });
    expect(validateEnvelope({ type: 'resource.bytesMany', id: 'a', urls: [{ url: 'https://x/y' }] }).errors[0].code).toBe('wrong-type');
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
      cvm: { type: 'cvm.registry.call', id: 'a', selector: { family: 'relatr' }, tool: 'search_profiles' },
      outbox: { type: 'outbox.close', id: 'a', subId: 's' },
      upload: { type: 'upload.status', id: 'a', uploadId: 'u' },
      intent: { type: 'intent.handlers', id: 'a' },
      ble: { type: 'ble.read', id: 'a', sessionId: 's', target: { service: 'battery_service', characteristic: 'battery_level' } },
      webrtc: {
        type: 'webrtc.open',
        id: 'a',
        request: { scope: { type: 'direct', pubkey: 'abc125' } },
      },
      link: { type: 'link.open', id: 'a', url: 'https://example.com/post/125' },
      count: { type: 'count.query', id: 'a', filters: [{ kinds: [7], '#e': ['event-id'] }] },
      lists: {
        type: 'lists.add',
        id: 'a',
        list: { type: 'mute-list' },
        items: [{ itemType: 'pubkey', value: 'abc125' }],
      },
      common: { type: 'common.react', id: 'a', targetEventId: 'e'.repeat(64), reaction: '+' },
      serial: { type: 'serial.write', id: 'a', sessionId: 's', data: [1, 2, 3] },
      // `recursive` is a top-level field on fs.remove, never nested in options
      fs: { type: 'fs.remove', id: 'a', path: '/shared/projects', recursive: true },
    };
    for (const [domain, msg] of Object.entries(samples)) {
      const v = validateEnvelope(msg);
      expect(v.ok, `${domain}: ${JSON.stringify(v.errors)}`).toBe(true);
    }
  });
});

describe('validateEnvelope — optional shell domain', () => {
  it('accepts readiness and rejects init emitted by a napplet', () => {
    const removedReady = ['shell', 'ready'].join('.');
    const removedInit = ['shell', 'init'].join('.');
    expect(validateEnvelope({ type: removedReady }).ok).toBe(true);
    expect(validateEnvelope({ type: removedInit }).errors[0].code).toBe('inbound-type-emitted');
  });
});

describe('validateEnvelope — webrtc byte payloads', () => {
  // NAP-WEBRTC (napplet/naps#59 @ fb4dd6f0) §Wire Protocol.
  it('accepts webrtc.sendBytes with base64 bytes and requires the bytes field', () => {
    expect(validateEnvelope({ type: 'webrtc.sendBytes', id: 's2', sessionId: 'sess-2', bytes: 'AAEC/w==' }).ok).toBe(true);
    expect(validateEnvelope({ type: 'webrtc.sendBytes', id: 's2', sessionId: 'sess-2' }).ok).toBe(false);
    expect(validateEnvelope({ type: 'webrtc.sendBytes.result', id: 's2' }).errors[0].code).toBe('inbound-type-emitted');
  });
});

describe('validateEnvelope — media retirement', () => {
  it('treats media.session.ended as shell -> napplet only', () => {
    expect(ENVELOPE_SPECS['media.session.ended']).toEqual({
      dir: 'in',
      fields: { sessionId: 'string', reason: 'string' },
    });
    const v = validateEnvelope({ type: 'media.session.ended', sessionId: 's1', reason: 'destroyed' });
    expect(v.errors[0].code).toBe('inbound-type-emitted');
  });
});

describe('ENVELOPE_SPECS invariants', () => {
  it('has 352 discriminants split 169 outbound / 183 inbound', () => {
    const all = knownEnvelopeTypes();
    expect(all).toHaveLength(352);
    const out = all.filter((t) => ENVELOPE_SPECS[t].dir === 'out');
    const inbound = all.filter((t) => ENVELOPE_SPECS[t].dir === 'in');
    expect(out).toHaveLength(169);
    expect(inbound).toHaveLength(183);
  });

  it('declares canonical inbound INC carrier fields', () => {
    expect(ENVELOPE_SPECS['inc.event']).toEqual({
      dir: 'in',
      fields: { topic: 'string', sender: 'string' },
    });
    expect(ENVELOPE_SPECS['inc.channel.opened']).toEqual({
      dir: 'in',
      fields: { channelId: 'string', peer: 'string' },
    });
  });
});

// NAP-CVM #31, API Surface / Wire Protocol: registry requests carry a selector object.
describe('CVM registry selector envelopes', () => {
  const schemaHash = '088b807239ac8fc469b9228025cb93269cfc3e40c7522141014ac66e348a138f';
  it.each(['has', 'describe', 'call'])('accepts canonical %s selectors', (action) => {
    for (const selector of [{ family: 'relatr' }, { schemaHash }, { family: 'another-label', schemaHash }]) {
      expect(validateEnvelope({
        type: `cvm.registry.${action}`, id: 'probe', selector,
        ...(action === 'call' ? { tool: 'search_profiles' } : {}),
      }).ok).toBe(true);
    }
  });
  it.each(['has', 'describe', 'call'])('rejects obsolete %s family carriers and non-object selectors', (action) => {
    const message = { type: `cvm.registry.${action}`, id: 'probe', family: 'relatr', tool: 'search_profiles' };
    expect(validateEnvelope(message).errors).toContainEqual(expect.objectContaining({ code: 'missing-field', field: 'selector' }));
    for (const selector of ['relatr', null, []]) {
      expect(validateEnvelope({ ...message, selector }).errors).toContainEqual(expect.objectContaining({ code: 'wrong-type', field: 'selector' }));
    }
  });
});
