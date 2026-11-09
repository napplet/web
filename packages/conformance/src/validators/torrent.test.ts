import { describe, expect, it } from 'vitest';
import { ENVELOPE_SPECS, knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';

const v1 = '0123456789abcdef0123456789abcdef01234567';
const v2 = 'a'.repeat(64);
const source = { sourceType: 'infohash', hashes: { v1 } };
const requests: Record<string, Record<string, unknown>> = {
  capabilities: {}, pickFiles: {}, add: { request: { source } }, status: { jobId: 'job' }, jobs: {},
  files: { jobId: 'job' }, selectFiles: { jobId: 'job', selection: { indexes: [0], priority: -1 } },
  pause: { jobId: 'job' }, resume: { jobId: 'job' }, remove: { jobId: 'job' }, metadata: { jobId: 'job' },
  read: { request: { jobId: 'job', fileIndex: 0, offset: 0, length: 5 } }, exportMetainfo: { jobId: 'job' },
  saveFile: { jobId: 'job', fileIndex: 0 }, openFile: { jobId: 'job', fileIndex: 0 }, cancel: { requestId: 'read-1' },
  update: { request: { jobId: 'job', expectedRevision: 0, patch: { uploadLimitBytesPerSecond: 50 } } },
};
const removed = ['fromEvent', 'toMagnet', 'search', 'publish', 'comment'];

// Living NAP-TORRENT Wire Protocol, Schemas, Content access and Live settings.
describe('transfer-only NAP-TORRENT envelopes', () => {
  it('registers 17 requests, 17 results and three pushes', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('torrent.')).sort()).toEqual([
      ...Object.keys(requests).flatMap((action) => [`torrent.${action}`, `torrent.${action}.result`]),
      'torrent.state', 'torrent.progress', 'torrent.error',
    ].sort());
  });
  it.each(Object.entries(requests))('accepts %s with correlation', (action, payload) => {
    expect(validateEnvelope({ type: `torrent.${action}`, id: 'req', ...payload }).ok).toBe(true);
    expect(validateEnvelope({ type: `torrent.${action}`, ...payload }).errors)
      .toContainEqual(expect.objectContaining({ code: 'missing-field', field: 'id' }));
    expect(ENVELOPE_SPECS[`torrent.${action}.result`].dir).toBe('in');
  });
  it.each(removed)('retires %s requests and results', (action) => {
    for (const type of [`torrent.${action}`, `torrent.${action}.result`]) {
      expect(validateEnvelope({ type, id: 'old' }).errors[0].code).toBe('unknown-type');
    }
  });
  it.each([
    { sourceType: 'magnet', magnet: 'magnet:?xt=urn:btih:' + v1 },
    { sourceType: 'infohash', hashes: { v2 } }, { sourceType: 'infohash', hashes: { v1, v2 } },
    { sourceType: 'metainfo', metainfo: new Uint8Array([1]) },
    { sourceType: 'runtime-file-set', runtimeFileSetId: 'opaque' },
  ])('accepts generic selected source %o', (candidate) => {
    expect(validateEnvelope({ type: 'torrent.add', id: 'r', request: { source: candidate } }).ok).toBe(true);
  });
  it.each([
    { sourceType: 'nip35', event: {} }, { sourceType: 'infohash', infoHash: v1 },
    { sourceType: 'infohash', hashes: {} }, { sourceType: 'infohash', hashes: { v2: 'a'.repeat(40) } },
    { sourceType: 'infohash', hashes: { v1: v1.toUpperCase() } },
    { sourceType: 'infohash', hashes: { v1 }, magnet: 'extra' },
    { sourceType: 'magnet' }, { sourceType: 'metainfo' }, { sourceType: 'runtime-file-set' },
  ])('rejects invalid or ambiguous source %o', (candidate) => {
    expect(validateEnvelope({ type: 'torrent.add', id: 'r', request: { source: candidate } }).ok).toBe(false);
  });
  it.each([
    ['add', { request: { source, options: { retention: 'forever' } } }],
    ['add', { request: { source, options: { createFormat: 'v1' } } }],
    ['add', { request: { source, options: { mode: 'download', seedAfterComplete: true } } }],
    ['read', { request: { jobId: 'j', fileIndex: -1, offset: 0, length: 1 } }],
    ['read', { request: { jobId: 'j', fileIndex: 0, offset: 0, length: 0 } }],
    ['read', { request: { jobId: 'j', fileIndex: 0, offset: 0, length: 1048577 } }],
    ['read', { request: { jobId: 'j', fileIndex: 0, offset: Number.MAX_SAFE_INTEGER, length: 1 } }],
    ['read', { request: { jobId: 'j', fileIndex: 0, offset: 0, length: 1, waitMs: 30001 } }],
    ['saveFile', { jobId: 'j', fileIndex: -1 }], ['openFile', { jobId: 'j', fileIndex: 0.5 }],
    ['update', { request: { jobId: 'j', expectedRevision: -1, patch: { seedAfterComplete: false } } }],
    ['update', { request: { jobId: 'j', expectedRevision: 0, patch: {} } }],
    ['update', { request: { jobId: 'j', expectedRevision: 0, patch: { trackers: [1] } } }],
  ])('rejects malformed %s request', (action, payload) => {
    expect(validateEnvelope({ type: `torrent.${action}`, id: 'r', ...payload }).ok).toBe(false);
  });
});

describe('transfer-only reference jobs', () => {
  const endpoint = { id: 'first', catalogId: 'first', domains: ['torrent'] };
  const other = { id: 'second', catalogId: 'second', domains: ['torrent'] };
  const call = (shell: ReturnType<typeof createReferenceShell>, action: string, payload = {}) =>
    shell.handleFrom(endpoint, { type: `torrent.${action}`, id: action, ...payload }) as Record<string, any>[];
  const add = (shell: ReturnType<typeof createReferenceShell>, options = {}) =>
    call(shell, 'add', { request: { source, jobId: 'job', options } });

  it('advertises limits and rejects unsupported content and persistence honestly', () => {
    const shell = createReferenceShell();
    expect(call(shell, 'capabilities')[0].capabilities).toMatchObject({
      transports: ['reference'], modes: ['download', 'download-and-seed'], formats: [], createFormats: [],
      retentions: ['session'], maxReadBytes: 1048576, maxReadWaitMs: 30000, maxPendingReads: 1,
      maxMetainfoBytes: 1048576, canSaveFiles: false, canOpenFiles: false,
    });
    expect(add(shell, { retention: 'persistent' })[0].ack).toMatchObject({ ok: false, error: 'unsupported' });
    expect(call(shell, 'pickFiles')[0].result).toMatchObject({ ok: false, error: 'unsupported' });
    expect(add(shell)[0].ack).toEqual({ ok: true, jobId: 'job', state: 'metadata' });
    for (const action of ['metadata', 'exportMetainfo']) {
      expect(call(shell, action, { jobId: 'job' })[0].result).toEqual({ ok: false, error: 'metadata-unavailable' });
    }
    expect(call(shell, 'read', { request: { jobId: 'job', fileIndex: 0, offset: 0, length: 5 } })[0].result)
      .toEqual({ ok: false, error: 'metadata-unavailable' });
    for (const action of ['saveFile', 'openFile']) {
      expect(call(shell, action, { jobId: 'job', fileIndex: 0 })[0].result).toEqual({ ok: false, error: 'unsupported' });
    }
    expect(call(shell, 'cancel', { requestId: 'read' })[0].result).toEqual({ ok: true, cancelled: false });
    expect(call(shell, 'cancel', { requestId: 'status' })[0].result).toEqual({ ok: true, cancelled: false });
  });

  it('preserves full magnet identities and refuses malformed or conflicting claims', () => {
    const shell = createReferenceShell();
    const magnet = `magnet:?xt=urn:btih:${v1}&xt=urn:btmh:1220${v2}`;
    const accepted = call(shell, 'add', { request: { source: { sourceType: 'magnet', magnet }, jobId: 'hybrid' } });
    expect(accepted[0].ack.ok).toBe(true);
    expect(call(shell, 'status', { jobId: 'hybrid' })[0].status.hashes).toEqual({ v1, v2 });
    expect(call(shell, 'metadata', { jobId: 'hybrid' })[0].result).toEqual({ ok: false, error: 'metadata-unavailable' });
    for (const invalid of [
      'magnet:?xt=urn:btmh:1220' + 'a'.repeat(40),
      `magnet:?xt=urn:btih:${v1}&xt=urn:btih:${'b'.repeat(40)}`,
      'https://example.com/?xt=urn:btih:' + v1,
    ]) {
      expect(call(shell, 'add', { request: { source: { sourceType: 'magnet', magnet: invalid } } })[0].ack)
        .toEqual({ ok: false, error: 'invalid-magnet' });
    }
    call(shell, 'add', { request: { source: { sourceType: 'magnet', magnet: 'magnet:?xt=urn:btih:' + 'A'.repeat(32) }, jobId: 'base32' } });
    expect(call(shell, 'status', { jobId: 'base32' })[0].status.hashes).toEqual({ v1: '0'.repeat(40) });
  });

  it('omits unknown totals/progress and never recycles or mutates a colliding job id', () => {
    const shell = createReferenceShell();
    add(shell);
    const status = call(shell, 'status', { jobId: 'job' })[0].status;
    expect(status.hashes).toEqual({ v1 });
    expect(status).not.toHaveProperty('infoHash');
    expect(status).not.toHaveProperty('totalBytes');
    expect(status).not.toHaveProperty('progress');
    expect(status).toMatchObject({ retention: 'session', settings: { revision: 0, seedAfterComplete: false } });
    expect(add(shell, { startPaused: true })[0].ack).toEqual({ ok: false, error: 'job-conflict' });
    expect(call(shell, 'status', { jobId: 'job' })[0].status.state).toBe('metadata');
    call(shell, 'remove', { jobId: 'job' });
    expect(add(shell)[0].ack).toEqual({ ok: false, error: 'job-conflict' });
  });

  it('updates all settings atomically with revisions, replacement arrays, no-op stability and mode changes', () => {
    const shell = createReferenceShell();
    add(shell, { trackers: ['https://old.example/announce'], storage: 'persistent' });
    const update = (expectedRevision: number, patch: object) => call(shell, 'update', {
      request: { jobId: 'job', expectedRevision, patch },
    })[0].result;
    expect(update(0, { trackers: [], uploadLimitBytesPerSecond: 50 })).toMatchObject({ ok: true,
      settings: { revision: 1, trackers: [], uploadLimitBytesPerSecond: 50 } });
    expect(update(0, { downloadLimitBytesPerSecond: 30 })).toMatchObject({ ok: false, error: 'revision-conflict', settings: { revision: 1 } });
    expect(update(1, { uploadLimitBytesPerSecond: 50 }).settings.revision).toBe(1);
    expect(update(1, { uploadLimitBytesPerSecond: 70, invented: true })).toEqual({ ok: false, error: 'unsupported-setting' });
    expect(call(shell, 'status', { jobId: 'job' })[0].status.settings.uploadLimitBytesPerSecond).toBe(50);
    call(shell, 'pause', { jobId: 'job' });
    expect(update(1, { seedAfterComplete: true })).toMatchObject({ ok: true, settings: { revision: 2, seedAfterComplete: true } });
    const paused = call(shell, 'status', { jobId: 'job' })[0].status;
    expect(paused.mode).toBe('download-and-seed');
    expect(paused.state).toBe('paused');
    expect(call(shell, 'resume', { jobId: 'job' })[0].status.state).toBe('metadata');
    call(shell, 'remove', { jobId: 'job' });
    expect(update(2, { seedAfterComplete: false })).toEqual({ ok: false, error: 'job-not-found' });
  });

  it('scopes every job operation to the authenticated endpoint and resets session records', () => {
    const shell = createReferenceShell();
    add(shell);
    for (const action of ['status', 'files', 'pause', 'resume', 'selectFiles', 'metadata', 'read', 'exportMetainfo', 'saveFile', 'openFile', 'update']) {
      const responses = shell.handleFrom(other, { type: `torrent.${action}`, id: action, ...requests[action] }) as Record<string, any>[];
      expect(responses[0]).toMatchObject(['status', 'files', 'pause', 'resume', 'selectFiles'].includes(action)
        ? { error: 'job-not-found' } : { result: { ok: false, error: 'job-not-found' } });
    }
    expect(shell.handleFrom(other, { type: 'torrent.jobs', id: 'j' })).toEqual([{ type: 'torrent.jobs.result', id: 'j', jobs: [] }]);
    for (const action of [...Object.keys(requests).map((action) => action + '.result'), 'state', 'progress', 'error', ...removed]) {
      expect(shell.handleFrom(endpoint, { type: `torrent.${action}`, id: 'r', jobId: 'job', state: 'metadata', status: {} })).toEqual([]);
    }
    shell.reset();
    expect(call(shell, 'jobs')[0].jobs).toEqual([]);
  });
});
