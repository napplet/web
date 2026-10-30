import { describe, expect, it } from 'vitest';
import { knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';

const hash = 'a'.repeat(64);
const publish = { type: 'mesh.publish', id: 'p1', event: { kind: 20666, content: 'ding', tags: [['t', 'doorbell']] } };
const subscribe = { type: 'mesh.subscribe', id: 's1', subId: 'room', filters: [{ kinds: [9], '#h': ['kitchen'] }] };

describe('NAP-MESH Wire Protocol and Error Handling', () => {
  it('recognizes the twelve published message types', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('mesh.')).sort()).toEqual([
      'mesh.blobs', 'mesh.blobs.result', 'mesh.close', 'mesh.closed', 'mesh.eose', 'mesh.event',
      'mesh.info', 'mesh.info.result', 'mesh.publish', 'mesh.publish.result', 'mesh.subscribe', 'mesh.subscribe.result',
    ]);
    for (const message of [{ type: 'mesh.info', id: 'i1' }, publish, subscribe, { ...subscribe, filters: {} }, { type: 'mesh.blobs', id: 'b1', hashes: [hash] }, { type: 'mesh.close', subId: 'room' }]) {
      expect(validateEnvelope(message).ok).toBe(true);
    }
    expect(validateEnvelope({ type: 'mesh.close', id: 'invented', subId: 'room' }).errors).toContainEqual(expect.objectContaining({ code: 'forbidden-field', field: 'id' }));
    expect(validateEnvelope({ type: 'mesh.subscribe', filters: [] }).ok).toBe(false);
    expect(validateEnvelope({ type: 'mesh.eose', subId: 'room', ttl: 0 }).errors[0].code).toBe('inbound-type-emitted');
  });

  it('accepts whole hop budgets including zero and 255 without imposing a user cap', () => {
    for (const request of [publish, subscribe]) {
      for (const ttl of [0, 10, 255]) expect(validateEnvelope({ ...request, ttl }).ok).toBe(true);
      for (const ttl of [-1, 256, 1.5, '1', null, NaN, Infinity]) expect(validateEnvelope({ ...request, ttl }).ok).toBe(false);
    }
  });

  it('rejects invalid hash lists whole and accepts hexadecimal input case', () => {
    for (const hashes of [[], [hash.toUpperCase()], Array(64).fill(hash)]) expect(validateEnvelope({ type: 'mesh.blobs', id: 'b1', hashes }).ok).toBe(true);
    for (const hashes of [undefined, ['bad'], [3], Array(1), Array(65).fill(hash)]) expect(validateEnvelope({ type: 'mesh.blobs', id: 'b1', hashes }).ok).toBe(false);
    expect(validateEnvelope({ ...subscribe, filters: 'bad' }).ok).toBe(false);
    expect(validateEnvelope({ ...subscribe, filters: [null] }).ok).toBe(false);
    expect(validateEnvelope({ ...subscribe, filters: Array(1) }).ok).toBe(false);
  });

  it('correlates malformed and ungranted requests without opening refused subscriptions', () => {
    const shell = createReferenceShell();
    for (const request of [{ ...publish, ttl: -1 }, { ...subscribe, ttl: 256 }, { type: 'mesh.blobs', id: 'b1', hashes: Array(65).fill(hash) }]) {
      const response = shell.handle(request);
      expect(response).toEqual([expect.objectContaining({ type: `${request.type}.result`, id: request.id, error: expect.any(String) })]);
      if (request.type === 'mesh.publish') expect(response[0]).toMatchObject({ ok: false });
    }
    const endpoint = { id: 'denied', catalogId: 'denied', domains: [] };
    for (const request of [{ type: 'mesh.info', id: 'i1' }, publish, subscribe, { type: 'mesh.blobs', id: 'b1', hashes: [hash] }]) {
      expect(shell.handleFrom(endpoint, request)).toEqual([{
        type: `${request.type}.result`, id: request.id,
        ...(request.type === 'mesh.publish' ? { ok: false } : {}), error: 'mesh not granted',
      }]);
    }
    expect(shell.handle({ type: 'mesh.subscribe', subId: 'room', filters: [] })).toEqual([]);
    expect(shell.handle({ type: 'mesh.unknown', id: 'x' })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'mesh.close', subId: 'room' })).toEqual([]);
  });

  it('uses an offline, non-signing reference fixture and reports local backlog completion', () => {
    const shell = createReferenceShell();
    expect(shell.handle({ type: 'mesh.info', id: 'i1' })).toEqual([{ type: 'mesh.info.result', id: 'i1', online: false, peers: 0, limits: { publishTtl: 0, subscribeTtl: 0 } }]);
    expect(shell.handle({ type: 'mesh.blobs', id: 'b1', hashes: [hash.toUpperCase()] })).toEqual([{ type: 'mesh.blobs.result', id: 'b1', peers: 0, blobs: { [hash]: 0 } }]);
    expect(shell.handle(publish)).toEqual([{ type: 'mesh.publish.result', id: 'p1', ok: false, error: 'reference shell has no mesh signer or event store' }]);
    expect(shell.handle({ ...subscribe, ttl: 10 })).toEqual([{ type: 'mesh.eose', subId: 'room', ttl: 0 }, { type: 'mesh.closed', subId: 'room', reason: 'reference shell complete' }]);
    expect(shell.handle({ type: 'mesh.close', subId: 'room' })).toEqual([]);
  });
});
