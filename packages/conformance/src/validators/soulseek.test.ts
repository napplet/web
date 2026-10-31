import { describe, expect, it } from 'vitest';
import { ENVELOPE_SPECS, knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';
import { REFERENCE_SOULSEEK_PEER } from '../shell/reference-soulseek.js';

const requests: Record<string, Record<string, unknown>> = {
  info: {}, search: { request: { text: 'field recording' } }, browse: { username: 'field-recorder' },
  results: { queryId: 's1', after: 0, limit: 10 }, stop: { queryId: 's1' }, download: { fileId: 'f1' }, transfers: {},
  status: { transferId: 't1' }, pause: { transferId: 't1' }, resume: { transferId: 't1' }, cancel: { transferId: 't1' },
  read: { transferId: 't1', offset: '0', length: 3 }, save: { transferId: 't1' }, release: { kind: 'query', handle: 's1' },
};

// Living NAP-SOULSEEK Wire Protocol and Schemas (napplet/naps#135).
describe('NAP-SOULSEEK envelopes', () => {
  it('registers fourteen requests, fourteen results, and no unsolicited messages', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('soulseek.')).sort()).toEqual(
      Object.keys(requests).flatMap((action) => [`soulseek.${action}`, `soulseek.${action}.result`]).sort(),
    );
  });
  it.each(Object.entries(requests))('accepts %s with correlation and rejects the napplet emitting its result', (action, payload) => {
    expect(validateEnvelope({ type: `soulseek.${action}`, id: 'req', ...payload })).toMatchObject({ ok: true, errors: [] });
    expect(validateEnvelope({ type: `soulseek.${action}`, ...payload }).errors)
      .toContainEqual(expect.objectContaining({ code: 'missing-field', field: 'id' }));
    expect(ENVELOPE_SPECS[`soulseek.${action}.result`].dir).toBe('in');
    expect(validateEnvelope({ type: `soulseek.${action}.result`, id: 'req', value: {} }).errors[0].code).toBe('inbound-type-emitted');
  });
  it.each([
    ['results', { queryId: 's1' }], ['results', { queryId: 's1', limit: 1 }], ['results', { queryId: 's1', after: 0 }],
    ['search', { request: { text: 'rain', username: 'peer' } }], ['read', { transferId: 't1', offset: '18446744073709551615', length: 1 }],
    ['release', { kind: 'transfer', handle: 't1' }],
  ])('accepts optional and boundary %s parameters', (action, payload) => {
    expect(validateEnvelope({ type: `soulseek.${action}`, id: 'r', ...payload }).ok).toBe(true);
  });
  it.each([
    ['info', { extra: true }, 'forbidden-field'],
    ['search', { request: { text: '   ' } }, 'wrong-type'],
    ['search', { request: { text: '' } }, 'wrong-type'],
    ['search', { request: { text: 'rain', username: null } }, 'wrong-type'],
    ['search', { request: { text: 'rain', peer: 'x' } }, 'wrong-type'],
    ['search', { request: { text: 'rain\u0000' } }, 'wrong-type'],
    ['browse', { username: '\uD800' }, 'wrong-type'],
    ['browse', { username: '' }, 'wrong-type'],
    ['browse', { username: 'peer', after: 0 }, 'forbidden-field'],
    ['results', { queryId: 's1', after: -1 }, 'wrong-type'],
    ['results', { queryId: 's1', after: 1.5 }, 'wrong-type'],
    ['results', { queryId: 's1', limit: 0 }, 'wrong-type'],
    ['results', { queryId: 's1', after: null }, 'wrong-type'],
    ['results', { queryId: '' }, 'wrong-type'],
    ['read', { transferId: 't1', offset: '00', length: 3 }, 'wrong-type'],
    ['read', { transferId: 't1', offset: 0, length: 3 }, 'wrong-type'],
    ['read', { transferId: 't1', offset: '18446744073709551616', length: 3 }, 'wrong-type'],
    ['read', { transferId: 't1', offset: '0', length: 0 }, 'wrong-type'],
    ['read', { transferId: 't1', offset: '0', length: '3' }, 'wrong-type'],
    ['read', { transferId: 't1', offset: '0' }, 'missing-field'],
    ['release', { kind: 'file', handle: 'f1' }, 'wrong-type'],
    ['release', { kind: 'query' }, 'missing-field'],
    ['download', { fileId: 'f1', transferId: 't1' }, 'forbidden-field'],
  ])('rejects malformed %s request %j', (action, payload, code) => {
    const verdict = validateEnvelope({ type: `soulseek.${action}`, id: 'r', ...payload });
    expect(verdict.ok).toBe(false);
    expect(verdict.errors.map((error) => error.code)).toContain(code);
  });
});

describe('reference Soulseek shell', () => {
  const endpoint = { id: 'first', catalogId: 'first', domains: ['soulseek'] };
  const other = { id: 'second', catalogId: 'second', domains: ['soulseek'] };
  type Shell = ReturnType<typeof createReferenceShell>;
  type Reply = { type: string; id: string; value?: any; error?: { code: string; message: string } };
  let sequence = 0;
  const call = (shell: Shell, action: string, payload = {}, from = endpoint): Reply => {
    const id = `${action}-${++sequence}`;
    const replies = shell.handleFrom(from, { type: `soulseek.${action}`, id, ...payload }) as Reply[];
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ type: `soulseek.${action}.result`, id });
    expect(replies[0].value === undefined).not.toBe(replies[0].error === undefined);
    return replies[0];
  };
  const value = (shell: Shell, action: string, payload = {}, from = endpoint) => {
    const reply = call(shell, action, payload, from);
    expect(reply.error).toBeUndefined();
    return reply.value;
  };
  const code = (shell: Shell, action: string, payload = {}, from = endpoint) => {
    const reply = call(shell, action, payload, from);
    expect(reply.value).toBeUndefined();
    expect(reply.error?.message).toEqual(expect.any(String));
    return reply.error?.code;
  };

  it('reports an online mock account with honest limits and no save support', () => {
    expect(value(createReferenceShell(), 'info')).toEqual({
      state: 'online', canSave: false, maxQueries: 4, maxTransfers: 8, maxResults: 500, maxPageSize: 100,
      maxReadBytes: 65536, maxTextBytes: 1024, queryTimeoutMs: 30000, pollIntervalMs: 1000,
    });
  });

  it('admits a search as collecting, then pages immutable results in arrival order', () => {
    const shell = createReferenceShell();
    const admitted = value(shell, 'search', { request: { text: 'recordings' } });
    expect(admitted).toEqual({ queryId: expect.any(String), kind: 'search', state: 'collecting', count: 0,
      maxResults: 500, maxPageSize: 100, timeoutMs: 30000 });
    const first = value(shell, 'results', { queryId: admitted.queryId, limit: 1 });
    expect(first.query).toEqual({ ...admitted, state: 'complete', reason: 'deadline', count: 2 });
    expect(first.files).toEqual([{ fileId: expect.any(String), username: REFERENCE_SOULSEEK_PEER,
      path: 'Recordings\\rain.txt', size: '3', locked: false, extension: 'txt' }]);
    expect(first.next).toBe(1);
    const second = value(shell, 'results', { queryId: admitted.queryId, after: 1 });
    expect(second.files.map((file: { path: string }) => file.path)).toEqual(['Recordings\\wind.txt']);
    expect(second.next).toBe(2);
    expect(value(shell, 'results', { queryId: admitted.queryId, after: 2 })).toEqual({ query: first.query, files: [], next: 2 });
    expect(code(shell, 'results', { queryId: admitted.queryId, after: 3 })).toBe('invalid_request');
    expect(code(shell, 'results', { queryId: admitted.queryId, limit: 101 })).toBe('invalid_request');
    expect(code(shell, 'results', { queryId: 'unknown' })).toBe('not_found');
    expect(value(shell, 'search', { request: { text: 'nothing matches' } }).state).toBe('collecting');
    expect(value(shell, 'search', { request: { text: 'rain', username: 'someone-else' } }).state).toBe('collecting');
  });

  it('browses the canned peer to peer_complete and fails unknown peers in the retained snapshot', () => {
    const shell = createReferenceShell();
    const listing = value(shell, 'browse', { username: REFERENCE_SOULSEEK_PEER });
    expect(listing).toMatchObject({ kind: 'browse', state: 'collecting', count: 0 });
    const page = value(shell, 'results', { queryId: listing.queryId });
    expect(page.query).toMatchObject({ state: 'complete', reason: 'peer_complete', count: 3 });
    expect(page.files.map((file: { locked: boolean }) => file.locked)).toEqual([false, false, true]);
    const missing = value(shell, 'browse', { username: 'nobody' });
    const failed = value(shell, 'results', { queryId: missing.queryId });
    expect(failed.query).toMatchObject({ state: 'failed', count: 0, error: { code: 'peer_unavailable', message: expect.any(String) } });
    expect(failed.query).not.toHaveProperty('reason');
    expect(failed.files).toEqual([]);
  });

  it('stops a collecting query without appending late replies and leaves terminal queries unchanged', () => {
    const shell = createReferenceShell();
    const admitted = value(shell, 'search', { request: { text: 'rain' } });
    const stopped = value(shell, 'stop', { queryId: admitted.queryId });
    expect(stopped).toEqual({ ...admitted, state: 'stopped', reason: 'cancelled', count: 0 });
    expect(value(shell, 'results', { queryId: admitted.queryId })).toEqual({ query: stopped, files: [], next: 0 });
    expect(value(shell, 'stop', { queryId: admitted.queryId })).toEqual(stopped);
    const settled = value(shell, 'search', { request: { text: 'rain' } });
    value(shell, 'results', { queryId: settled.queryId });
    expect(value(shell, 'stop', { queryId: settled.queryId })).toMatchObject({ state: 'complete', reason: 'deadline', count: 1 });
  });

  it('enforces the captured query and transfer limits with limit_exceeded', () => {
    const shell = createReferenceShell();
    for (let index = 0; index < 4; index += 1) value(shell, 'search', { request: { text: 'rain' } });
    expect(code(shell, 'search', { request: { text: 'rain' } })).toBe('limit_exceeded');
    expect(code(shell, 'browse', { username: REFERENCE_SOULSEEK_PEER })).toBe('limit_exceeded');
  });

  it('serializes downloads per file handle and walks the transfer state table', () => {
    const shell = createReferenceShell();
    const admitted = value(shell, 'search', { request: { text: 'wind' } });
    const [file] = value(shell, 'results', { queryId: admitted.queryId }).files;
    const transfer = value(shell, 'download', { fileId: file.fileId });
    expect(transfer).toEqual({ transferId: expect.any(String), file, state: 'queued', maxReadBytes: 65536, received: '0' });
    expect(value(shell, 'download', { fileId: file.fileId })).toEqual(transfer);
    expect(code(shell, 'download', { fileId: 'unknown' })).toBe('not_found');
    expect(value(shell, 'pause', { transferId: transfer.transferId }).state).toBe('paused');
    expect(value(shell, 'pause', { transferId: transfer.transferId }).state).toBe('paused');
    expect(value(shell, 'resume', { transferId: transfer.transferId }).state).toBe('queued');
    expect(value(shell, 'resume', { transferId: transfer.transferId }).state).toBe('queued');
    expect(code(shell, 'read', { transferId: transfer.transferId, offset: '0', length: 1 })).toBe('invalid_state');
    const cancelled = value(shell, 'cancel', { transferId: transfer.transferId });
    expect(cancelled).toMatchObject({ state: 'cancelled', received: '0' });
    expect(value(shell, 'cancel', { transferId: transfer.transferId })).toEqual(cancelled);
    expect(code(shell, 'pause', { transferId: transfer.transferId })).toBe('invalid_state');
    expect(code(shell, 'resume', { transferId: transfer.transferId })).toBe('invalid_state');
    expect(value(shell, 'transfers')).toEqual([cancelled]);
    expect(value(shell, 'download', { fileId: file.fileId })).toEqual(cancelled);
    expect(value(shell, 'release', { kind: 'transfer', handle: transfer.transferId })).toEqual({ released: true });
    expect(value(shell, 'release', { kind: 'transfer', handle: transfer.transferId })).toEqual({ released: false });
    expect(value(shell, 'download', { fileId: file.fileId }).transferId).not.toBe(transfer.transferId);
  });

  it('completes an observed transfer, serves bounded base64 reads, and refuses save honestly', () => {
    const shell = createReferenceShell();
    const admitted = value(shell, 'search', { request: { text: 'rain' } });
    const [file] = value(shell, 'results', { queryId: admitted.queryId }).files;
    const { transferId } = value(shell, 'download', { fileId: file.fileId });
    const complete = value(shell, 'status', { transferId });
    expect(complete).toMatchObject({ state: 'complete', received: '3', file });
    expect(value(shell, 'read', { transferId, offset: '0', length: 3 })).toEqual({ offset: '0', data: 'YWJj', length: 3, eof: true });
    expect(value(shell, 'read', { transferId, offset: '1', length: 1 })).toEqual({ offset: '1', data: 'Yg==', length: 1, eof: false });
    expect(value(shell, 'read', { transferId, offset: '3', length: 65536 })).toEqual({ offset: '3', data: '', length: 0, eof: true });
    expect(code(shell, 'read', { transferId, offset: '4', length: 1 })).toBe('invalid_request');
    expect(code(shell, 'read', { transferId, offset: '0', length: 65537 })).toBe('invalid_request');
    expect(code(shell, 'save', { transferId })).toBe('unsupported');
    expect(code(shell, 'save', { transferId: 'unknown' })).toBe('not_found');
    expect(value(shell, 'cancel', { transferId })).toEqual(complete);
  });

  it('fails a locked file transfer with peer_denied in the retained snapshot', () => {
    const shell = createReferenceShell();
    const listing = value(shell, 'browse', { username: REFERENCE_SOULSEEK_PEER });
    const locked = value(shell, 'results', { queryId: listing.queryId }).files.find((file: { locked: boolean }) => file.locked);
    const { transferId } = value(shell, 'download', { fileId: locked.fileId });
    const failed = value(shell, 'transfers')[0];
    expect(failed).toMatchObject({ transferId, state: 'failed', received: '0', error: { code: 'peer_denied' } });
    expect(code(shell, 'read', { transferId, offset: '0', length: 1 })).toBe('invalid_state');
  });

  it('keeps accepted transfers usable after releasing their query and invalidates the file handles', () => {
    const shell = createReferenceShell();
    const admitted = value(shell, 'search', { request: { text: 'rain' } });
    const [file] = value(shell, 'results', { queryId: admitted.queryId }).files;
    const { transferId } = value(shell, 'download', { fileId: file.fileId });
    expect(value(shell, 'release', { kind: 'query', handle: admitted.queryId })).toEqual({ released: true });
    expect(code(shell, 'results', { queryId: admitted.queryId })).toBe('not_found');
    expect(code(shell, 'download', { fileId: file.fileId })).toBe('not_found');
    expect(value(shell, 'status', { transferId }).file).toEqual(file);
    expect(value(shell, 'release', { kind: 'query', handle: admitted.queryId })).toEqual({ released: false });
  });

  it('scopes handles to the authenticated endpoint and replays repeated request ids', () => {
    const shell = createReferenceShell();
    const admitted = value(shell, 'search', { request: { text: 'rain' } });
    const [file] = value(shell, 'results', { queryId: admitted.queryId }).files;
    const { transferId } = value(shell, 'download', { fileId: file.fileId });
    expect(code(shell, 'results', { queryId: admitted.queryId }, other)).toBe('not_found');
    expect(code(shell, 'stop', { queryId: admitted.queryId }, other)).toBe('not_found');
    expect(code(shell, 'download', { fileId: file.fileId }, other)).toBe('not_found');
    for (const action of ['status', 'pause', 'resume', 'cancel', 'save']) {
      expect(code(shell, action, { transferId }, other)).toBe('not_found');
    }
    expect(code(shell, 'read', { transferId, offset: '0', length: 1 }, other)).toBe('not_found');
    expect(value(shell, 'transfers', {}, other)).toEqual([]);
    expect(value(shell, 'release', { kind: 'transfer', handle: transferId }, other)).toEqual({ released: false });
    expect(value(shell, 'status', { transferId }).state).toBe('complete');
    const repeated = { type: 'soulseek.download', id: 'dup', fileId: file.fileId };
    const first = shell.handleFrom(endpoint, repeated);
    expect(shell.handleFrom(endpoint, { ...repeated, fileId: 'tampered' })).toEqual(first);
    expect(shell.handleFrom(other, repeated)).toEqual([{ type: 'soulseek.download.result', id: 'dup',
      error: { code: 'not_found', message: expect.any(String) } }]);
    shell.reset();
    expect(value(shell, 'transfers')).toEqual([]);
    expect(code(shell, 'status', { transferId })).toBe('not_found');
  });

  it('discards envelopes the validator rejects and results sent by napplets', () => {
    const shell = createReferenceShell();
    expect(shell.handleFrom(endpoint, { type: 'soulseek.read', id: 'bad', transferId: 't', offset: '00', length: 1 })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'soulseek.info.result', id: 'bad', value: {} })).toEqual([]);
    expect(shell.handleFrom({ ...endpoint, domains: ['relay'] }, { type: 'soulseek.info', id: 'ungranted' })).toEqual([]);
  });
});
