import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let posted: Record<string, unknown>[];
beforeEach(() => {
  posted = [];
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('window', { parent: { postMessage: (msg: Record<string, unknown>) => posted.push(msg) } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const hashes = { v1: 'a'.repeat(40) };
const settings = { revision: 0, downloadLimitBytesPerSecond: 0, uploadLimitBytesPerSecond: 0,
  seedAfterComplete: false, trackers: [], webSeeds: [], endpointsRedacted: false };
const status = { ok: true, jobId: 'job', state: 'paused', mode: 'download', transport: 'auto', hashes,
  downloadedBytes: 0, uploadedBytes: 0, downloadRate: 0, uploadRate: 0, ratio: 0,
  peers: { peers: 0, seeds: 0, leeches: 0 }, settings, retention: 'session' };
const readRequest = { jobId: 'job', fileIndex: 0, offset: 0, length: 5 };
const readResult = { ok: true, offset: 0, dataBase64: 'aGVsbG8=', byteLength: 5, totalBytes: 5, eof: true };

describe('torrent request/result contract', () => {
  const vectors = [
    ['capabilities', [], {}, 'capabilities', { transports: ['bittorrent'], modes: ['download'], formats: ['v1'],
      createFormats: [], retentions: ['session'], mutableSettings: [], maxReadBytes: 1048576, maxReadWaitMs: 30000,
      maxPendingReads: 1, maxMetainfoBytes: 1048576, canSaveFiles: false, canOpenFiles: false }],
    ['pickFiles', [], {}, 'result', { ok: false, error: 'file-pick-cancelled' }],
    ['add', [{ source: { sourceType: 'infohash', hashes } }],
      { request: { source: { sourceType: 'infohash', hashes } } }, 'ack', { ok: true, jobId: 'job', state: 'metadata' }],
    ['status', ['job'], { jobId: 'job' }, 'status', status],
    ['jobs', [], {}, 'jobs', []],
    ['files', ['job'], { jobId: 'job' }, 'files', []],
    ['selectFiles', ['job', { indexes: [0], priority: -1 }], { jobId: 'job', selection: { indexes: [0], priority: -1 } }, 'status', status],
    ['pause', ['job'], { jobId: 'job' }, 'status', status],
    ['resume', ['job'], { jobId: 'job' }, 'status', status],
    ['remove', ['job', { deleteData: false }], { jobId: 'job', options: { deleteData: false } }, 'result', { ok: true, jobId: 'job', deletedData: false }],
    ['metadata', ['job'], { jobId: 'job' }, 'result', { ok: false, error: 'metadata-unavailable' }],
    ['read', [readRequest], { request: readRequest }, 'result', readResult],
    ['exportMetainfo', ['job'], { jobId: 'job' }, 'result', { ok: false, error: 'metadata-unavailable' }],
    ['saveFile', ['job', 0], { jobId: 'job', fileIndex: 0 }, 'result', { ok: true, jobId: 'job', fileIndex: 0, outcome: 'saved' }],
    ['openFile', ['job', 0], { jobId: 'job', fileIndex: 0 }, 'result', { ok: true, jobId: 'job', fileIndex: 0, outcome: 'accepted' }],
    ['cancel', ['read-id'], { requestId: 'read-id' }, 'result', { ok: true, cancelled: false }],
    ['update', [{ jobId: 'job', expectedRevision: 0, patch: { trackers: [] } }],
      { request: { jobId: 'job', expectedRevision: 0, patch: { trackers: [] } } }, 'result',
      { ok: false, error: 'revision-conflict', settings }],
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

it('retired discovery and signing methods are absent', async () => {
  const shim = await import('./shim.js');
  for (const name of ['fromEvent', 'toMagnet', 'search', 'publish', 'comment']) expect(shim).not.toHaveProperty(name);
});

it.each(['read', 'exportMetainfo', 'saveFile'] as const)('%s exposes a request id and discards bytes after cancellation', async (method) => {
  const shim = await import('./shim.js');
  const target = method === 'read' ? shim.read(readRequest)
    : method === 'saveFile' ? shim.saveFile('job', 0) : shim.exportMetainfo('job');
  expect(target.requestId).toBe(posted[0].id);
  const cancelled = shim.cancel(target.requestId);
  expect(posted[1]).toEqual({ type: 'torrent.cancel', id: expect.any(String), requestId: target.requestId });
  shim.handleTorrentMessage({ type: 'torrent.cancel.result', id: posted[1].id, result: { ok: true, cancelled: true } });
  await expect(cancelled).resolves.toEqual({ ok: true, cancelled: true });
  shim.handleTorrentMessage({ type: `torrent.${method}.result`, id: target.requestId, result: readResult });
  await expect(target).resolves.toEqual({ ok: false, error: 'cancelled' });
  expect(vi.getTimerCount()).toBe(0);
});

it('preserves a target terminal result when cancellation loses', async () => {
  const shim = await import('./shim.js');
  const target = shim.read(readRequest);
  const cancelled = shim.cancel(target.requestId);
  shim.handleTorrentMessage({ type: 'torrent.read.result', id: target.requestId, result: readResult });
  shim.handleTorrentMessage({ type: 'torrent.cancel.result', id: posted[1].id, result: { ok: true, cancelled: false } });
  await expect(target).resolves.toEqual(readResult);
  await expect(cancelled).resolves.toEqual({ ok: true, cancelled: false });
});

it('does not retire a target when cancellation is refused', async () => {
  const shim = await import('./shim.js');
  const target = shim.read(readRequest);
  const cancelled = shim.cancel(target.requestId);
  shim.handleTorrentMessage({ type: 'torrent.cancel.result', id: posted[1].id, result: { ok: false, error: 'policy-denied' } });
  shim.handleTorrentMessage({ type: 'torrent.read.result', id: target.requestId, result: readResult });
  await expect(cancelled).resolves.toEqual({ ok: false, error: 'policy-denied' });
  await expect(target).resolves.toEqual(readResult);
});

it('permits the full advertised read wait before its transport timeout', async () => {
  const shim = await import('./shim.js');
  const target = shim.read({ ...readRequest, waitMs: 30000 });
  await vi.advanceTimersByTimeAsync(30000);
  shim.handleTorrentMessage({ type: 'torrent.read.result', id: target.requestId, result: { ok: false, error: 'timeout' } });
  await expect(target).resolves.toEqual({ ok: false, error: 'timeout' });
});

it.each([
  { ok: false, error: 'revision-conflict' },
  { ok: false, error: 'revision-conflict', settings: null },
  { ok: false, error: 'revision-conflict', settings: { ...settings, revision: -1 } },
  { ok: true },
  { ok: true, settings: { ...settings, seedAfterComplete: 'false' } },
  { ok: true, settings: { ...settings, trackers: [42] } },
  { ok: true, settings, error: 'revision-conflict' },
  { ok: false, error: 'custom-runtime-error', settings },
])('rejects malformed settings response %j', async (result) => {
  const shim = await import('./shim.js');
  const updated = shim.update({ jobId: 'job', expectedRevision: 0, patch: { trackers: [] } });
  shim.handleTorrentMessage({ type: 'torrent.update.result', id: posted[0].id, result });
  await expect(updated).rejects.toThrow('torrent.update returned an invalid settings result');
});

it('preserves custom machine-readable update errors', async () => {
  const shim = await import('./shim.js');
  const updated = shim.update({ jobId: 'job', expectedRevision: 0, patch: { trackers: [] } });
  const result = { ok: false, error: 'custom-runtime-error', reason: 'Runtime policy detail' };
  shim.handleTorrentMessage({ type: 'torrent.update.result', id: posted[0].id, result });
  await expect(updated).resolves.toEqual(result);
});
