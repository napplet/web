import { describe, expect, it } from 'vitest';
import { knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';

const sha256 = 'a'.repeat(64);
const server = 'https://cdn.example.com';
const requests: Record<string, Record<string, unknown>> = {
  check: { request: { server, sha256 } },
  get: { request: { server, sha256, range: 'bytes=0-2' } },
  checkUpload: { request: { server, sha256, size: 3, type: 'text/plain' } },
  upload: { request: { server, data: new Blob(['abc']) } },
  mirror: { request: { server, url: `https://other.example.com/${sha256}` } },
  checkMedia: { request: { server, sha256, size: 3, type: 'image/png' } },
  media: { request: { server, data: new ArrayBuffer(3) } },
  list: { request: { server, pubkey: 'b'.repeat(64), limit: 10 } },
  delete: { request: { server, sha256 } },
  servers: {},
  addServer: { request: { server, position: 0 } },
  removeServer: { server },
  reorderServers: { servers: [server] },
};

describe('NAP-BLOSSOM published wire surface', () => {
  it('recognizes all 13 request/result pairs, without inventing wire URI helpers', () => {
    expect(knownEnvelopeTypes().filter(type => type.startsWith('blossom.')).sort()).toEqual(
      Object.keys(requests).flatMap(action => [`blossom.${action}`, `blossom.${action}.result`]).sort(),
    );
    for (const [action, fields] of Object.entries(requests)) {
      expect(validateEnvelope({ type: `blossom.${action}`, id: action, ...fields }).ok, action).toBe(true);
      expect(validateEnvelope({ type: `blossom.${action}`, ...fields }).ok, `${action} id`).toBe(false);
      expect(validateEnvelope({ type: `blossom.${action}.result`, id: action, result: {} }).errors[0].code).toBe('inbound-type-emitted');
    }
    expect(validateEnvelope({ type: 'blossom.parseUri', id: 'x', uri: 'blossom:invalid' }).ok).toBe(false);
    expect(validateEnvelope({ type: 'blossom.formatUri', id: 'x', uri: {} }).ok).toBe(false);
  });

  it.each([
    ['get', { server, sha256: 'A'.repeat(64) }, 'request.sha256'],
    ['checkUpload', { server, sha256, type: 'text/plain' }, 'request.size'],
    ['upload', { server, data: 'YWJj' }, 'request.data'],
    ['media', { server, data: [1, 2, 3] }, 'request.data'],
    ['upload', { server, data: { [Symbol.toStringTag]: 'ArrayBuffer' } }, 'request.data'],
    ['get', { server, sha256, auth: 'token' }, 'request.auth'],
    ['list', { server, pubkey: 'b'.repeat(64), limit: -1 }, 'request.limit'],
    ['addServer', { server, position: 1.5 }, 'request.position'],
  ])('rejects invalid %s request fields', (action, request, field) => {
    expect(validateEnvelope({ type: `blossom.${action}`, id: 'test', request }).errors).toContainEqual(expect.objectContaining({ field }));
  });

  it('does not constrain extension fields that the operation does not define', () => {
    expect(validateEnvelope({ type: 'blossom.addServer', id: 'future', request: { server, range: 42, auth: 'future-extension' } }).ok).toBe(true);
  });

  it('requires string server entries while leaving empty-list rejection to shell results', () => {
    expect(validateEnvelope({ type: 'blossom.reorderServers', id: 'test', servers: [42] }).ok).toBe(false);
    expect(validateEnvelope({ type: 'blossom.reorderServers', id: 'test', servers: [] }).ok).toBe(true);
  });

  it('returns correlated typed failures without pretending network or server-list operations succeeded', () => {
    const shell = createReferenceShell();
    for (const [action, fields] of Object.entries(requests)) {
      const [response] = shell.handle({ type: `blossom.${action}`, id: action, ...fields }) as Array<{ type: string; id: string; result: Record<string, unknown> }>;
      expect(response.type).toBe(`blossom.${action}.result`);
      expect(response.id).toBe(action);
      expect(response.result.ok).toBe(false);
      expect(response.result.error).toEqual(expect.any(String));
      expect(response.result).not.toHaveProperty('blob');
      expect(response.result).not.toHaveProperty('descriptor');
      expect(response.result).not.toHaveProperty('eventId');
    }
    expect(shell.handle({ type: 'blossom.check', id: 'check', request: { server, sha256 } })).toEqual([
      { type: 'blossom.check.result', id: 'check', result: { ok: false, status: 0, error: 'unsupported', headers: {} } },
    ]);
    expect(shell.handle({ type: 'blossom.list', id: 'list', request: { server, pubkey: sha256 } })).toEqual([
      { type: 'blossom.list.result', id: 'list', result: { ok: false, status: 0, error: 'unsupported', blobs: [] } },
    ]);
    expect(shell.handle({ type: 'blossom.get', id: 'auth', request: { server, sha256, auth: 'required' } })).toEqual([
      { type: 'blossom.get.result', id: 'auth', result: { ok: false, status: 0, error: 'not-signed-in' } },
    ]);
    expect(shell.handleFrom({ id: 'unavailable', catalogId: 'app', domains: [] }, { type: 'blossom.servers', id: 'hidden' })).toEqual([]);
  });
});
