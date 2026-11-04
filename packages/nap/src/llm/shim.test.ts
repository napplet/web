import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell } from '../test-support/fake-shell.js';
import type { LlmGenerationRequest } from './types.js';

let posted: Array<Record<string, unknown>>;
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  posted = installFakeShell().sent;
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

// Records follow the living NAP-LLM examples (napplet/naps#134, head of branch nap-llm).
const model = { handle: 'h1', name: 'My connection', model: 'chosen-model', route: 'Local shell → inference provider', images: false, json: true, tools: true, toolChoiceModes: ['auto', 'none', 'required', 'tool'] };
const request: LlmGenerationRequest = { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'text', text: 'Return a JSON object with a greeting.' }] }], format: 'json', maxTokens: 128, temperature: 0.7 };
const generation = { content: [{ type: 'text', text: '{"greeting":"Hello"}' }], finish: 'stop', usage: { inputTokens: 12, outputTokens: 7 } };
const text = (sequence: number, fragment: string) => ({ sequence, event: 'delta', block: 'text', blockIndex: 0, text: fragment });

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
    const start = { sequence: 0, event: 'start', block: 'text', blockIndex: 0 };
    const end = { sequence: 3, event: 'end', block: 'text', blockIndex: 0 };
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, ...start });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, ...text(1, '{"greeting":') });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, ...text(2, '"Hello"}') });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: other.requestId, ...start });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: 'unknown', ...start });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, id: 'forbidden', ...end });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, ...end });
    expect(deltas).toEqual([
      { requestId: pending.requestId, ...start },
      { requestId: pending.requestId, ...text(1, '{"greeting":') },
      { requestId: pending.requestId, ...text(2, '"Hello"}') },
      { requestId: pending.requestId, ...end },
    ]);
    shim.handleLlmMessage({ type: 'llm.generate.result', id: pending.requestId, result: generation });
    await expect(pending).resolves.toEqual(generation);
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, ...text(4, 'after terminal') });
    expect(deltas).toHaveLength(4);
    shim.handleLlmMessage({ type: 'llm.generate.result', id: other.requestId, result: generation });
    await other;
  });

  it('carries the tool call id and name on a toolCall start and resolves the toolUse result', async () => {
    const shim = await import('./shim.js');
    const deltas: unknown[] = [];
    const tools = [{ name: 'get_weather', description: 'Look up current weather', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } }];
    const toolRequest: LlmGenerationRequest = { handle: 'h1', messages: request.messages, tools, toolChoice: 'auto' };
    const pending = shim.generate(toolRequest, { onDelta: (delta) => deltas.push(delta) });
    expect(posted[0]).toEqual({ type: 'llm.generate', id: pending.requestId, request: toolRequest });
    const requestId = pending.requestId;
    const lifecycle = [
      { requestId, sequence: 0, event: 'start', block: 'toolCall', blockIndex: 0, toolCallId: 'call_1', name: 'get_weather' },
      { requestId, sequence: 1, event: 'delta', block: 'toolCall', blockIndex: 0, text: '{"city":"Berlin"}' },
      { requestId, sequence: 2, event: 'end', block: 'toolCall', blockIndex: 0 },
    ];
    for (const delta of lifecycle) shim.handleLlmMessage({ type: 'llm.delta', ...delta });
    expect(deltas).toEqual(lifecycle);
    const result = { content: [{ type: 'toolCall', toolCallId: 'call_1', name: 'get_weather', arguments: { city: 'Berlin' } }], finish: 'toolUse', usage: { inputTokens: 31, outputTokens: 12, cacheReadTokens: 0, reasoningTokens: 3 } };
    shim.handleLlmMessage({ type: 'llm.generate.result', id: requestId, result });
    await expect(pending).resolves.toEqual(result);
  });

  it.each([
    ['text on a start', { event: 'start', block: 'text', blockIndex: 0, text: 'x' }],
    ['missing delta text', { event: 'delta', block: 'text', blockIndex: 0 }],
    ['unknown event', { event: 'chunk', block: 'text', blockIndex: 0, text: 'x' }],
    ['unknown block', { event: 'start', block: 'image', blockIndex: 0 }],
    ['negative block index', { event: 'start', block: 'text', blockIndex: -1 }],
    ['fractional sequence', { event: 'start', block: 'text', blockIndex: 0, sequence: 0.5 }],
    ['toolCall start without id', { event: 'start', block: 'toolCall', blockIndex: 0, name: 'get_weather' }],
    ['call id outside a toolCall start', { event: 'end', block: 'toolCall', blockIndex: 0, toolCallId: 'call_1' }],
    ['legacy text-only delta', { text: 'Hel' }],
  ])('drops a delta that does not match the Delta schema: %s', async (_label, fields) => {
    const shim = await import('./shim.js');
    const deltas: unknown[] = [];
    const pending = shim.generate(request, { onDelta: (delta) => deltas.push(delta) });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, sequence: 0, ...fields });
    expect(deltas).toEqual([]);
    shim.handleLlmMessage({ type: 'llm.generate.result', id: pending.requestId, result: generation });
    await pending;
  });

  it('stops provisional delivery after a sequence gap but still resolves the terminal result', async () => {
    const shim = await import('./shim.js');
    const deltas: number[] = [];
    const pending = shim.generate(request, { onDelta: (delta) => deltas.push(delta.sequence) });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, ...text(0, 'a') });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, ...text(2, 'c') });
    shim.handleLlmMessage({ type: 'llm.delta', requestId: pending.requestId, ...text(3, 'd') });
    expect(deltas).toEqual([0]);
    const complete = { content: [{ type: 'text', text: 'abcd' }], finish: 'stop' };
    shim.handleLlmMessage({ type: 'llm.generate.result', id: pending.requestId, result: complete });
    await expect(pending).resolves.toEqual(complete);
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
    // A fresh realm whose NIP-5D port refuses to send.
    installFakeShell();
    vi.stubGlobal('MessageChannel', class {
      port1 = { onmessage: null, start() {}, close() {}, postMessage() { throw new Error('transport closed'); } };
      port2 = {};
    });
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
