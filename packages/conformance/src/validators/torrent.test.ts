import { describe, expect, it } from 'vitest';
import { ENVELOPE_SPECS, knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';

const infoHash = '0123456789abcdef0123456789abcdef01234567';
const descriptor = { infoHash, files: [], trackers: [], tags: [], references: [] };
const event = { id: 'a'.repeat(64), pubkey: 'b'.repeat(64), sig: 'c'.repeat(128), created_at: 1, kind: 2003,
  content: 'Public dataset', tags: [['x', infoHash], ['title', 'Dataset'], ['file', 'data.txt', '42'],
    ['tracker', 'wss://tracker.example'], ['t', 'data'], ['i', 'imdb:tt1']] };
const requests: Record<string, Record<string, unknown>> = {
  capabilities: {}, fromEvent: { event }, toMagnet: { descriptor }, search: { query: {} },
  publish: { request: { descriptor } },
  comment: { request: { torrentEventId: event.id, torrentAuthor: event.pubkey, content: 'Thanks' } },
  pickFiles: {}, add: { request: { source: { sourceType: 'infohash', infoHash } } },
  status: { jobId: 'job' }, jobs: {}, files: { jobId: 'job' },
  selectFiles: { jobId: 'job', selection: { indexes: [0], priority: -1 } },
  pause: { jobId: 'job' }, resume: { jobId: 'job' }, remove: { jobId: 'job' },
};

// NAP-TORRENT PR #72, Wire Protocol and Schemas; no engine/network policy is asserted here.
describe('NAP-TORRENT envelopes', () => {
  it('registers exactly the 15 requests, 15 results and three job pushes', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('torrent.')).sort()).toEqual([
      ...Object.keys(requests).flatMap((action) => [`torrent.${action}`, `torrent.${action}.result`]),
      'torrent.state', 'torrent.progress', 'torrent.error',
    ].sort());
  });
  it.each(Object.entries(requests))('accepts %s and requires its correlation id', (action, payload) => {
    expect(validateEnvelope({ type: `torrent.${action}`, id: 'req', ...payload }).ok).toBe(true);
    expect(validateEnvelope({ type: `torrent.${action}`, ...payload }).errors)
      .toContainEqual(expect.objectContaining({ code: 'missing-field', field: 'id' }));
    expect(ENVELOPE_SPECS[`torrent.${action}.result`].dir).toBe('in');
  });
  it.each(['state', 'progress', 'error'])('rejects napplet-emitted %s pushes', (action) => {
    expect(validateEnvelope({ type: `torrent.${action}`, jobId: 'job' }).errors[0].code).toBe('inbound-type-emitted');
  });
  it.each([
    ['search', { query: { limit: -1 } }], ['search', { query: { authors: [2] } }],
    ['add', { request: {} }], ['add', { request: { source: { sourceType: 'invented' } } }],
    ['add', { request: { source: { sourceType: 'infohash', infoHash }, options: { mode: 'invalid' } } }],
    ['add', { request: { source: { sourceType: 'infohash', infoHash }, options: { startPaused: 'yes' } } }],
    ['toMagnet', { descriptor: { ...descriptor, trackers: [42] } }],
    ['publish', { request: { descriptor, publish: 'false' } }],
    ['comment', { request: { torrentEventId: event.id, torrentAuthor: event.pubkey } }],
    ['pickFiles', { options: { multiple: 'true' } }], ['jobs', { filter: { states: ['unknown'] } }],
    ['selectFiles', { jobId: 'job', selection: { indexes: [-1] } }],
    ['remove', { jobId: 'job', options: { deleteData: 'true' } }],
  ])('rejects malformed %s payload', (action, payload) => {
    expect(validateEnvelope({ type: `torrent.${action}`, id: 'req', ...payload }).ok).toBe(false);
  });
  it('allows runtime-defined transports and reference prefixes', () => {
    expect(validateEnvelope({ type: 'torrent.add', id: 'r', request: {
      source: { sourceType: 'nip35', descriptor: { ...descriptor, references: [{ prefix: 'custom', value: 'x' }] } },
      options: { transport: 'custom-runtime', mode: 'download-and-seed' },
    } }).ok).toBe(true);
  });
});

describe('torrent reference shell', () => {
  const endpoint = { id: 'first', catalogId: 'first', domains: ['torrent'] };
  const other = { id: 'second', catalogId: 'second', domains: ['torrent'] };
  const call = (shell: ReturnType<typeof createReferenceShell>, action: string, payload = {}) =>
    shell.handleFrom(endpoint, { type: `torrent.${action}`, id: 'req', ...payload }) as Record<string, any>[];

  it('converts NIP-35 tags and rejects invalid events and hashes', () => {
    const shell = createReferenceShell();
    expect(call(shell, 'fromEvent', { event })[0]).toMatchObject({ type: 'torrent.fromEvent.result', id: 'req', result: {
      ok: true, descriptor: { infoHash, title: 'Dataset', description: 'Public dataset', files: [{ path: 'data.txt', size: 42 }],
        trackers: ['wss://tracker.example'], tags: ['data'], references: [{ prefix: 'imdb', value: 'tt1' }], result: { event } },
    } });
    expect(call(shell, 'fromEvent', { event: { ...event, kind: 1 } })[0].result.ok).toBe(false);
    expect(call(shell, 'fromEvent', { event: { ...event, id: undefined } })[0].result.ok).toBe(false);
    expect(call(shell, 'fromEvent', { event: { ...event, tags: [['x', 'bad']] } })[0].result.ok).toBe(false);
    expect(call(shell, 'toMagnet', { descriptor })[0].result.magnet).toBe(`magnet:?xt=urn:btih:${infoHash}`);
  });

  it('never answers napplet-emitted result or push envelopes', () => {
    const shell = createReferenceShell();
    for (const action of [...Object.keys(requests).map((action) => action + '.result'), 'state', 'progress', 'error']) {
      expect(shell.handleFrom(endpoint, { type: `torrent.${action}`, id: 'r', jobId: 'job',
        state: 'metadata', status: {}, error: 'no-peers' })).toEqual([]);
    }
  });

  it('answers all operations, scopes jobs by authenticated endpoint, and clears them on reset', () => {
    const shell = createReferenceShell();
    expect(call(shell, 'capabilities')[0].capabilities).toMatchObject({ transports: ['reference'], modes: ['download'] });
    for (const action of ['publish', 'comment', 'pickFiles']) {
      expect(call(shell, action, requests[action])[0].result).toMatchObject({ ok: false, error: 'unsupported' });
    }
    expect(call(shell, 'search', { query: {} })[0].results).toEqual([]);
    const added = call(shell, 'add', { request: { ...requests.add.request as object, jobId: 'job' } });
    expect(added[0].ack).toEqual({ ok: true, jobId: 'job', state: 'metadata' });
    expect(added[1]).toMatchObject({ type: 'torrent.state', jobId: 'job', state: 'metadata' });
    expect(call(shell, 'status', { jobId: 'job' })[0].status.infoHash).toBe(infoHash);
    expect(call(shell, 'files', { jobId: 'job' })[0].files).toEqual([]);
    expect(call(shell, 'selectFiles', { jobId: 'job', selection: {} })[0].status.jobId).toBe('job');
    expect(call(shell, 'pause', { jobId: 'job' })[0].status.state).toBe('paused');
    expect(call(shell, 'jobs', { filter: { states: ['metadata'] } })[0].jobs).toEqual([]);
    expect(call(shell, 'resume', { jobId: 'job' })[0].status.state).toBe('metadata');
    for (const action of ['status', 'files', 'pause', 'resume', 'selectFiles']) {
      const result = shell.handleFrom(other, { type: `torrent.${action}`, id: 'x', jobId: 'job', selection: {} });
      expect(result).toEqual([{ type: `torrent.${action}.result`, id: 'x', error: 'job-not-found' }]);
    }
    expect(shell.handleFrom(other, { type: 'torrent.jobs', id: 'x' })).toEqual([{ type: 'torrent.jobs.result', id: 'x', jobs: [] }]);
    expect(call(shell, 'remove', { jobId: 'job', options: { deleteData: true } })[0].result)
      .toEqual({ ok: true, jobId: 'job', deletedData: false });
    call(shell, 'add', requests.add);
    shell.reset();
    expect(call(shell, 'jobs')[0].jobs).toEqual([]);
    expect(shell.handleFrom({ ...endpoint, domains: [] }, { type: 'torrent.capabilities', id: 'x' })).toEqual([]);
  });
});
