import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let posted: Record<string, unknown>[];
beforeEach(() => {
  posted = [];
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('window', { parent: { postMessage: (msg: Record<string, unknown>) => posted.push(msg) } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const descriptor = { infoHash: 'a'.repeat(40), files: [], trackers: [], tags: [], references: [] };
const event = { id: 'b'.repeat(64), pubkey: 'c'.repeat(64), created_at: 1, kind: 2003, tags: [['x', descriptor.infoHash]], content: '', sig: 'd'.repeat(128) };
const status = { ok: true, jobId: 'job', state: 'paused', mode: 'download', transport: 'auto', infoHash: descriptor.infoHash,
  downloadedBytes: 0, uploadedBytes: 0, totalBytes: 42, progress: 0, downloadRate: 0, uploadRate: 0, ratio: 0,
  peers: { peers: 0, seeds: 0, leeches: 0 } };

describe('torrent request/result contract', () => {
  const vectors = [
    ['capabilities', [], {}, 'capabilities', { transports: ['bittorrent'], modes: ['download'] }],
    ['fromEvent', [event], { event }, 'result', { ok: true, descriptor }],
    ['toMagnet', [descriptor], { descriptor }, 'result', { ok: true, magnet: `magnet:?xt=urn:btih:${descriptor.infoHash}` }],
    ['search', [{ text: 'archive' }], { query: { text: 'archive' } }, 'results', [{ descriptor, result: { event } }]],
    ['publish', [{ descriptor, publish: false }], { request: { descriptor, publish: false } }, 'result', { ok: true, event }],
    ['comment', [{ torrentEventId: event.id, torrentAuthor: event.pubkey, content: 'Thanks' }],
      { request: { torrentEventId: event.id, torrentAuthor: event.pubkey, content: 'Thanks' } }, 'result', { ok: false, error: 'user-denied' }],
    ['pickFiles', [], {}, 'result', { ok: false, error: 'file-pick-cancelled' }],
    ['add', [{ source: { sourceType: 'infohash', infoHash: descriptor.infoHash } }],
      { request: { source: { sourceType: 'infohash', infoHash: descriptor.infoHash } } }, 'ack', { ok: true, jobId: 'job', state: 'metadata' }],
    ['status', ['job'], { jobId: 'job' }, 'status', status],
    ['jobs', [], {}, 'jobs', []],
    ['files', ['job'], { jobId: 'job' }, 'files', []],
    ['selectFiles', ['job', { indexes: [0], priority: -1 }], { jobId: 'job', selection: { indexes: [0], priority: -1 } }, 'status', status],
    ['pause', ['job'], { jobId: 'job' }, 'status', status],
    ['resume', ['job'], { jobId: 'job' }, 'status', status],
    ['remove', ['job', { deleteData: false }], { jobId: 'job', options: { deleteData: false } }, 'result', { ok: true, jobId: 'job', deletedData: false }],
  ] as const;
  it.each(vectors)('%s uses its canonical envelope', async (name, args, payload, field, value) => {
    const shim = await import('./shim.js');
    const call = shim[name] as (...args: unknown[]) => Promise<unknown>;
    const promise = call(...args);
    expect(posted).toEqual([{ type: `torrent.${name}`, id: expect.any(String), ...payload }]);
    shim.handleTorrentMessage({ type: `torrent.${name}.result`, id: posted[0].id, [field]: value });
    await expect(promise).resolves.toEqual(value);
  });
  it('matches both request id and operation, even for out-of-order replies', async () => {
    const shim = await import('./shim.js');
    const first = shim.jobs();
    const second = shim.files('job');
    shim.handleTorrentMessage({ type: 'torrent.files.result', id: posted[0].id, files: [] });
    shim.handleTorrentMessage({ type: 'torrent.jobs.result', id: 'unknown', jobs: [] });
    shim.handleTorrentMessage({ type: 'torrent.files.result', id: posted[1].id, files: [] });
    await expect(second).resolves.toEqual([]);
    shim.handleTorrentMessage({ type: 'torrent.jobs.result', id: posted[0].id, jobs: [] });
    await expect(first).resolves.toEqual([]);
  });
  it('rejects transport errors and missing fields without losing typed refusals', async () => {
    const shim = await import('./shim.js');
    const denied = shim.jobs();
    shim.handleTorrentMessage({ type: 'torrent.jobs.result', id: posted[0].id, error: 'policy-denied' });
    await expect(denied).rejects.toThrow('policy-denied');
    const missing = shim.jobs();
    shim.handleTorrentMessage({ type: 'torrent.jobs.result', id: posted[1].id });
    await expect(missing).rejects.toThrow('no jobs');
  });
  it('times out requests and ignores late replies', async () => {
    const shim = await import('./shim.js');
    const promise = shim.jobs();
    const rejected = expect(promise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
    shim.handleTorrentMessage({ type: 'torrent.jobs.result', id: posted[0].id, jobs: [] });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('routes job pushes independently, and close removes only its listener', async () => {
    const shim = await import('./shim.js');
    const state = vi.fn(); const progress = vi.fn(); const error = vi.fn();
    const sub = shim.onState(state);
    shim.onProgress(progress); shim.onError(error);
    shim.handleTorrentMessage({ type: 'torrent.state', jobId: 'job', state: 'paused', status });
    shim.handleTorrentMessage({ type: 'torrent.progress', jobId: 'job', status });
    shim.handleTorrentMessage({ type: 'torrent.error', jobId: 'other', error: 'no-peers', reason: 'Offline' });
    expect(state).toHaveBeenCalledWith({ jobId: 'job', state: 'paused', status });
    expect(progress).toHaveBeenCalledWith({ jobId: 'job', status });
    expect(error).toHaveBeenCalledWith({ jobId: 'other', error: 'no-peers', reason: 'Offline' });
    sub.close(); sub.close();
    shim.handleTorrentMessage({ type: 'torrent.state', jobId: 'job', state: 'complete' });
    expect(state).toHaveBeenCalledTimes(1);
    expect(posted).toEqual([]);
  });
  it('cleans pending requests and listeners on disposal', async () => {
    const shim = await import('./shim.js');
    const dispose = shim.installTorrentShim();
    const listener = vi.fn(); shim.onError(listener);
    const promise = shim.jobs();
    dispose();
    await expect(promise).rejects.toThrow('disposed');
    shim.handleTorrentMessage({ type: 'torrent.error', jobId: 'job', error: 'no-peers' });
    expect(listener).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it('preserves optional picker and job filters without inserting defaults', async () => {
  const shim = await import('./shim.js');
  const picker = shim.pickFiles({ multiple: false, suggestedName: 'archive' });
  const jobs = shim.jobs({ states: ['paused'], modes: ['seed'] });
  expect(posted[0]).toMatchObject({ options: { multiple: false, suggestedName: 'archive' } });
  expect(posted[1]).toMatchObject({ filter: { states: ['paused'], modes: ['seed'] } });
  shim.handleTorrentMessage({ type: 'torrent.pickFiles.result', id: posted[0].id, result: { ok: false } });
  shim.handleTorrentMessage({ type: 'torrent.jobs.result', id: posted[1].id, jobs: [] });
  await Promise.all([picker, jobs]);
});

it('releases timer and request when the transport throws', async () => {
  const shim = await import('./shim.js');
  vi.stubGlobal('window', { parent: { postMessage: () => { throw new Error('transport closed'); } } });
  await expect(shim.jobs()).rejects.toThrow('transport closed');
  expect(vi.getTimerCount()).toBe(0);
});

it('keeps separate subscriptions when a callback is registered twice', async () => {
  const shim = await import('./shim.js');
  const handler = vi.fn(); const first = shim.onError(handler); shim.onError(handler);
  first.close();
  shim.handleTorrentMessage({ type: 'torrent.error', jobId: 'job', error: 'no-peers' });
  expect(handler).toHaveBeenCalledOnce();
});

it.each(['state', 'progress', 'error'] as const)('%s isolates listener errors and defers reporting', async (kind) => {
  const shim = await import('./shim.js');
  const subscribe = { state: shim.onState, progress: shim.onProgress, error: shim.onError }[kind];
  const reported: (() => void)[] = [];
  vi.stubGlobal('queueMicrotask', (callback: () => void) => reported.push(callback));
  const failure = new Error('listener failed');
  const later = vi.fn();
  subscribe(() => { throw failure; });
  subscribe(later);
  expect(() => shim.handleTorrentMessage({ type: `torrent.${kind}`, jobId: 'job', state: 'paused', status, error: 'no-peers' }))
    .not.toThrow();
  expect(later).toHaveBeenCalledOnce();
  expect(reported).toHaveLength(1);
  expect(reported[0]).toThrow(failure);
});

it.each(['state', 'progress', 'error'] as const)('%s snapshots listeners and skips subscriptions closed during dispatch', async (kind) => {
  const shim = await import('./shim.js');
  const subscribe = { state: shim.onState, progress: shim.onProgress, error: shim.onError }[kind];
  const added = vi.fn();
  const closed = vi.fn();
  const first = subscribe(() => { subscribe(added); second.close(); });
  const second = subscribe(closed);
  const message = { type: `torrent.${kind}`, jobId: 'job', state: 'paused', status, error: 'no-peers' };
  shim.handleTorrentMessage(message);
  expect(added).not.toHaveBeenCalled();
  expect(closed).not.toHaveBeenCalled();
  first.close();
  shim.handleTorrentMessage(message);
  expect(added).toHaveBeenCalledOnce();
  expect(closed).not.toHaveBeenCalled();
});
