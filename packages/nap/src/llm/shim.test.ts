import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmGenerationRequest } from './types.js';

let posted: Record<string, unknown>[];
beforeEach(() => {
  posted = [];
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('window', { parent: { postMessage: (msg: Record<string, unknown>) => posted.push(msg) } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

// Records follow the living NAP-LLM examples (napplet/naps#134).
const model = { handle: 'h1', name: 'My connection', model: 'chosen-model', route: 'Local shell → inference provider', images: false, json: true };
const request: LlmGenerationRequest = { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'text', text: 'Return a JSON object with a greeting.' }] }], format: 'json' };
const generation = { text: '{"greeting":"Hello"}', finish: 'stop', usage: { inputTokens: 12, outputTokens: 7 } };

describe('llm request/result contract', () => {
  it('exposes exactly the four operations plus the binding helpers', async () => {
    const shim = await import('./shim.js');
    expect(Object.keys(shim).sort()).toEqual(['LlmError', 'cancel', 'describe', 'generate', 'handleLlmMessage', 'installLlmShim', 'select']);
  });

  it.each([
    ['select', [{ json: true }], { requirements: { json: true } }, 'model', model],
    ['describe', ['h1'], { handle: 'h1' }, 'model', model],
    ['generate', [request], { request }, 'result', generation],
    ['cancel', ['g2'], { requestId: 'g2' }, 'cancelled', true],
  ] as const)('%s uses its canonical envelope and resolves its success field', async (name, args, payload, field, value) => {
    const shim = await import('./shim.js');
    const call = shim[name] as (...args: unknown[]) => Promise<unknown>;
    const promise = call(...args);
    expect(posted).toEqual([{ type: `llm.${name}`, id: expect.any(String), ...payload }]);
    shim.handleLlmMessage({ type: `llm.${name}.result`, id: posted[0].id, [field]: value });
    await expect(promise).resolves.toEqual(value);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('omits requirements instead of sending null and exposes the generation id', async () => {
    const shim = await import('./shim.js');
    void shim.select();
    expect(posted[0]).toEqual({ type: 'llm.select', id: expect.any(String) });
    const pending = shim.generate(request);
    expect(pending.requestId).toBe(posted[1].id);
    expect(typeof pending.then).toBe('function');
    shim.handleLlmMessage({ type: 'llm.generate.result', id: pending.requestId, result: generation });
    await expect(pending).resolves.toEqual(generation);
  });

  it('delivers ordered deltas to the requesting generation only, then the authoritative result', async () => {
    const shim = await import('./shim.js');
    const deltas: unknown[] = [];
    const pending = shim.generate(request, { onDelta: (delta) => deltas.push(delta) });
    const other = shim.generate(request);
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, sequence: 0, text: '{"greeting":' });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, sequence: 1, text: '"Hello"}' });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: other.requestId, sequence: 0, text: 'ignored by the first' });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: 'unknown', sequence: 0, text: 'dropped' });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, id: 'forbidden', sequence: 2, text: 'dropped' });
    expect(deltas).toEqual([
      { requestId: pending.requestId, sequence: 0, text: '{"greeting":' },
      { requestId: pending.requestId, sequence: 1, text: '"Hello"}' },
    ]);
    shim.handleLlmMessage({ type: 'llm.generate.result', id: pending.requestId, result: generation });
    await expect(pending).resolves.toEqual(generation);
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, sequence: 2, text: 'after terminal' });
    expect(deltas).toHaveLength(2);
    shim.handleLlmMessage({ type: 'llm.generate.result', id: other.requestId, result: generation });
    await other;
  });

  it('stops provisional delivery after a sequence gap but still resolves the terminal result', async () => {
    const shim = await import('./shim.js');
    const deltas: number[] = [];
    const pending = shim.generate(request, { onDelta: (delta) => deltas.push(delta.sequence) });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, sequence: 0, text: 'a' });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, sequence: 2, text: 'c' });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, sequence: 3, text: 'd' });
    expect(deltas).toEqual([0]);
    shim.handleLlmMessage({ type: 'llm.generate.result', id: pending.requestId, result: { text: 'abcd', finish: 'stop' } });
    await expect(pending).resolves.toEqual({ text: 'abcd', finish: 'stop' });
  });

  it('maps an abort signal to llm.cancel and settles the generation through its own result', async () => {
    const shim = await import('./shim.js');
    const controller = new AbortController();
    const pending = shim.generate(request, { signal: controller.signal });
    controller.abort();
    expect(posted[1]).toEqual({ type: 'llm.cancel', id: expect.any(String), requestId: pending.requestId });
    const settled = vi.fn();
    pending.catch(settled);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    shim.handleLlmMessage({ type: 'llm.generate.result', id: pending.requestId, error: { code: 'cancelled', message: 'Generation cancelled; provider charges may still apply.' } });
    shim.handleLlmMessage({ type: 'llm.cancel.result', id: posted[1].id, cancelled: true });
    const error = await pending.catch((caught: unknown) => caught) as InstanceType<typeof shim.LlmError>;
    expect(error).toBeInstanceOf(shim.LlmError);
    expect(error.code).toBe('cancelled');
    expect(vi.getTimerCount()).toBe(0);
    const already = new AbortController();
    already.abort();
    const second = shim.generate(request, { signal: already.signal });
    expect(posted.at(-1)).toEqual({ type: 'llm.cancel', id: expect.any(String), requestId: second.requestId });
    shim.handleLlmMessage({ type: 'llm.generate.result', id: second.requestId, result: generation });
    await expect(second).resolves.toEqual(generation);
  });

  it('rejects a Failure as an LlmError carrying the specification code, including unknown codes', async () => {
    const shim = await import('./shim.js');
    const promise = shim.describe('stale');
    shim.handleLlmMessage({ type: 'llm.describe.result', id: posted[0].id, error: { code: 'selection-expired', message: 'Select a model again.' } });
    const error = await promise.catch((caught: unknown) => caught) as InstanceType<typeof shim.LlmError>;
    expect(error).toBeInstanceOf(shim.LlmError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('LlmError');
    expect(error.code).toBe('selection-expired');
    expect(error.message).toBe('Select a model again.');
    const future = shim.describe('h1');
    shim.handleLlmMessage({ type: 'llm.describe.result', id: posted[1].id, error: { code: 'future-code', message: 'Still a failure' } });
    const unknown = await future.catch((caught: unknown) => caught) as InstanceType<typeof shim.LlmError>;
    expect(unknown).toBeInstanceOf(shim.LlmError);
    expect(unknown.code).toBe('future-code');
  });

  it.each([
    { model, error: { code: 'unsupported', message: 'Both' } },
    {},
    { model: null },
    { error: null },
  ])('rejects a result that does not carry exactly one of model or error: %j', async (fields) => {
    const shim = await import('./shim.js');
    const promise = shim.select();
    shim.handleLlmMessage({ type: 'llm.select.result', id: posted[0].id, ...fields });
    await expect(promise).rejects.toThrow('llm.select.result must carry exactly one of model or error');
  });

  it.each([{ code: '' , message: 'Empty code' }, { code: 'unsupported' }, 'unsupported', { message: 'No code' }])(
    'rejects a malformed error record without inventing a code: %j', async (error) => {
      const shim = await import('./shim.js');
      const promise = shim.select();
      shim.handleLlmMessage({ type: 'llm.select.result', id: posted[0].id, error });
      const caught = await promise.catch((value: unknown) => value) as Error;
      expect(caught).not.toBeInstanceOf(shim.LlmError);
      expect(caught.message).toBe('llm.select.result returned a malformed error');
    });

  it('matches both id and result type, even for out-of-order replies', async () => {
    const shim = await import('./shim.js');
    const first = shim.describe('h1');
    const second = shim.cancel('g9');
    shim.handleLlmMessage({ type: 'llm.cancel.result', id: posted[0].id, cancelled: false });
    shim.handleLlmMessage({ type: 'llm.describe.result', id: 'unknown', model });
    shim.handleLlmMessage({ type: 'llm.describe.result', model });
    shim.handleLlmMessage({ type: 'llm.cancel.result', id: posted[1].id, cancelled: false });
    await expect(second).resolves.toBe(false);
    shim.handleLlmMessage({ type: 'llm.describe.result', id: posted[0].id, model });
    await expect(first).resolves.toEqual(model);
  });

  it('times out retained-state requests after 30 seconds, select after two minutes, and generate after 30 minutes', async () => {
    const shim = await import('./shim.js');
    const settled = { describe: vi.fn(), select: vi.fn(), generate: vi.fn() };
    shim.describe('h1').catch(settled.describe);
    shim.select().catch(settled.select);
    shim.generate(request).catch(settled.generate);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(settled.describe).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled.describe.mock.calls[0][0]).toEqual(expect.objectContaining({ message: 'llm.describe timed out' }));
    expect(settled.describe.mock.calls[0][0]).not.toBeInstanceOf(shim.LlmError);
    await vi.advanceTimersByTimeAsync(120_000 - 30_000);
    expect(settled.select).toHaveBeenCalledOnce();
    expect(settled.generate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_800_000 - 120_000);
    expect(settled.generate.mock.calls[0][0]).toEqual(expect.objectContaining({ message: 'llm.generate timed out' }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases the timer and request when the transport throws', async () => {
    const shim = await import('./shim.js');
    vi.stubGlobal('window', { parent: { postMessage: () => { throw new Error('transport closed'); } } });
    await expect(shim.select()).rejects.toThrow('transport closed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects pending requests on disposal and installs once', async () => {
    const shim = await import('./shim.js');
    const dispose = shim.installLlmShim();
    expect(shim.installLlmShim()).not.toBe(dispose);
    const promise = shim.describe('h1');
    dispose();
    dispose();
    await expect(promise).rejects.toThrow('llm shim disposed');
    expect(vi.getTimerCount()).toBe(0);
    shim.handleLlmMessage({ type: 'llm.describe.result', id: posted[0].id, model });
  });
});
