import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let posted: Record<string, unknown>[];
beforeEach(() => {
  posted = [];
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('window', { parent: { postMessage: (msg: Record<string, unknown>) => posted.push(msg) } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

// Records follow the living NAP-SOULSEEK examples (napplet/naps#135).
const file = { fileId: 'f1', username: 'field-recorder', path: 'Recordings\\rain.txt', size: '3', locked: false };
const query = { queryId: 's1', kind: 'search', state: 'collecting', count: 0, maxResults: 500, maxPageSize: 100, timeoutMs: 30000 };
const stopped = { ...query, state: 'stopped', reason: 'cancelled', count: 1 };
const transfer = { transferId: 't1', file, state: 'queued', received: '0', maxReadBytes: 65536 };
const info = { state: 'online', canSave: true, maxQueries: 4, maxTransfers: 8, maxResults: 500, maxPageSize: 100,
  maxReadBytes: 65536, maxTextBytes: 1024, queryTimeoutMs: 30000, pollIntervalMs: 1000 };

describe('soulseek request/result contract', () => {
  const vectors = [
    ['info', [], {}, info],
    ['search', [{ text: 'field recording' }], { request: { text: 'field recording' } }, query],
    ['browse', ['field-recorder'], { username: 'field-recorder' }, { ...query, queryId: 'b1', kind: 'browse' }],
    ['results', ['s1', 0, 10], { queryId: 's1', after: 0, limit: 10 }, { query: { ...query, count: 1 }, files: [file], next: 1 }],
    ['stop', ['s1'], { queryId: 's1' }, stopped],
    ['download', ['f1'], { fileId: 'f1' }, transfer],
    ['transfers', [], {}, [transfer]],
    ['status', ['t1'], { transferId: 't1' }, { ...transfer, state: 'complete', received: '3' }],
    ['pause', ['t1'], { transferId: 't1' }, { ...transfer, state: 'paused' }],
    ['resume', ['t1'], { transferId: 't1' }, transfer],
    ['cancel', ['t1'], { transferId: 't1' }, { ...transfer, state: 'cancelled' }],
    ['read', ['t1', '0', 3], { transferId: 't1', offset: '0', length: 3 }, { offset: '0', data: 'YWJj', length: 3, eof: true }],
    ['save', ['t1'], { transferId: 't1' }, { saved: true }],
    ['release', ['query', 's1'], { kind: 'query', handle: 's1' }, { released: true }],
  ] as const;

  it('exposes exactly the fourteen operations', async () => {
    const shim = await import('./shim.js');
    const operations = vectors.map(([name]) => name);
    for (const name of operations) expect(shim).toHaveProperty(name, expect.any(Function));
    expect(Object.keys(shim).filter((key) => !['handleSoulseekMessage', 'installSoulseekShim', 'SoulseekError'].includes(key)).sort())
      .toEqual([...operations].sort());
  });

  it.each(vectors)('%s uses its canonical envelope and resolves the value', async (name, args, payload, value) => {
    const shim = await import('./shim.js');
    const call = shim[name] as (...args: unknown[]) => Promise<unknown>;
    const promise = call(...args);
    expect(posted).toEqual([{ type: `soulseek.${name}`, id: expect.any(String), ...payload }]);
    shim.handleSoulseekMessage({ type: `soulseek.${name}.result`, id: posted[0].id, value });
    await expect(promise).resolves.toEqual(value);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('omits optional results parameters instead of sending null', async () => {
    const shim = await import('./shim.js');
    void shim.results('s1');
    void shim.results('s1', 5);
    void shim.results('s1', undefined, 10);
    expect(posted[0]).toEqual({ type: 'soulseek.results', id: expect.any(String), queryId: 's1' });
    expect(posted[1]).toEqual({ type: 'soulseek.results', id: expect.any(String), queryId: 's1', after: 5 });
    expect(posted[2]).toEqual({ type: 'soulseek.results', id: expect.any(String), queryId: 's1', limit: 10 });
  });

  it('rejects a Failure as a SoulseekError carrying the specification code', async () => {
    const shim = await import('./shim.js');
    const promise = shim.read('t1', '00', 3);
    shim.handleSoulseekMessage({ type: 'soulseek.read.result', id: posted[0].id,
      error: { code: 'invalid_request', message: 'Offset is not canonical decimal text' } });
    const error = await promise.catch((caught: unknown) => caught) as InstanceType<typeof shim.SoulseekError>;
    expect(error).toBeInstanceOf(shim.SoulseekError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SoulseekError');
    expect(error.code).toBe('invalid_request');
    expect(error.message).toBe('Offset is not canonical decimal text');
  });

  it.each([
    { value: info, error: { code: 'denied', message: 'Both' } },
    {},
    { value: null },
    { error: null },
  ])('rejects a result that does not carry exactly one of value or error: %j', async (fields) => {
    const shim = await import('./shim.js');
    const promise = shim.info();
    shim.handleSoulseekMessage({ type: 'soulseek.info.result', id: posted[0].id, ...fields });
    await expect(promise).rejects.toThrow('soulseek.info.result must carry exactly one of value or error');
  });

  it.each([
    { code: 'made_up', message: 'Unknown code' },
    { code: 'denied' },
    'denied',
    { message: 'No code' },
  ])('rejects a malformed error record without inventing a code: %j', async (error) => {
    const shim = await import('./shim.js');
    const promise = shim.info();
    shim.handleSoulseekMessage({ type: 'soulseek.info.result', id: posted[0].id, error });
    const caught = await promise.catch((value: unknown) => value) as Error;
    expect(caught).not.toBeInstanceOf(shim.SoulseekError);
    expect(caught.message).toBe('soulseek.info.result returned a malformed error');
  });

  it('matches both id and result type, even for out-of-order replies', async () => {
    const shim = await import('./shim.js');
    const first = shim.transfers();
    const second = shim.status('t1');
    shim.handleSoulseekMessage({ type: 'soulseek.status.result', id: posted[0].id, value: transfer });
    shim.handleSoulseekMessage({ type: 'soulseek.transfers.result', id: 'unknown', value: [] });
    shim.handleSoulseekMessage({ type: 'soulseek.status.result', value: transfer });
    shim.handleSoulseekMessage({ type: 'soulseek.status.result', id: posted[1].id, value: transfer });
    await expect(second).resolves.toEqual(transfer);
    shim.handleSoulseekMessage({ type: 'soulseek.transfers.result', id: posted[0].id, value: [] });
    await expect(first).resolves.toEqual([]);
  });

  it('times out retained-state requests after 30 seconds with a plain Error', async () => {
    const shim = await import('./shim.js');
    const promise = shim.transfers();
    const settled = vi.fn();
    promise.catch(settled);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const error = settled.mock.calls[0][0] as Error;
    expect(error.message).toBe('soulseek.transfers timed out');
    expect(error).not.toBeInstanceOf(shim.SoulseekError);
    shim.handleSoulseekMessage({ type: 'soulseek.transfers.result', id: posted[0].id, value: [] });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['search', 'browse', 'download', 'read', 'save'] as const)('gives %s two minutes for a shell prompt', async (name) => {
    const shim = await import('./shim.js');
    const args: Record<string, unknown[]> = { search: [{ text: 'x' }], browse: ['peer'], download: ['f1'], read: ['t1', '0', 1], save: ['t1'] };
    const promise = (shim[name] as (...values: unknown[]) => Promise<unknown>)(...args[name]);
    const settled = vi.fn();
    promise.catch(settled);
    await vi.advanceTimersByTimeAsync(119_999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toHaveBeenCalledOnce();
  });

  it('releases the timer and request when the transport throws', async () => {
    const shim = await import('./shim.js');
    vi.stubGlobal('window', { parent: { postMessage: () => { throw new Error('transport closed'); } } });
    await expect(shim.info()).rejects.toThrow('transport closed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects pending requests on disposal and installs once', async () => {
    const shim = await import('./shim.js');
    const dispose = shim.installSoulseekShim();
    expect(shim.installSoulseekShim()).not.toBe(dispose);
    const promise = shim.info();
    dispose();
    dispose();
    await expect(promise).rejects.toThrow('soulseek shim disposed');
    expect(vi.getTimerCount()).toBe(0);
    shim.handleSoulseekMessage({ type: 'soulseek.info.result', id: posted[0].id, value: info });
  });
});
