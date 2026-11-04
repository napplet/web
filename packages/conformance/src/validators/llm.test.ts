import { describe, expect, it } from 'vitest';
import { ENVELOPE_SPECS, knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';
import { REFERENCE_LLM_CONNECTION } from '../shell/reference-llm.js';

const text = (value: string) => ({ type: 'text', text: value });
const image = { type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgo=' };
const request = { handle: 'h1', messages: [{ role: 'user', content: [text('Return a JSON object with a greeting.')] }], format: 'json' };
const weather = { name: 'get_weather', description: 'Look up current weather', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } };
const call = { type: 'toolCall', toolCallId: 'call_1', name: 'get_weather', arguments: { city: 'Berlin' } };
const ask = { role: 'user', content: [text('What is the weather in Berlin?')] };
const answer = { role: 'toolResult', toolCallId: 'call_1', toolName: 'get_weather', content: [text('18°C and clear')] };
const requests: Record<string, Record<string, unknown>> = {
  select: { requirements: { json: true } }, describe: { handle: 'h1' }, generate: { request }, cancel: { requestId: 'g2' },
};

// Living NAP-LLM Wire Protocol and Schemas (napplet/naps#134, head of branch nap-llm).
describe('NAP-LLM envelopes', () => {
  it('registers four requests, four results, and the unsolicited delta', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('llm.')).sort()).toEqual([
      ...Object.keys(requests).flatMap((action) => [`llm.${action}`, `llm.${action}.result`]), 'llm.delta',
    ].sort());
    expect(ENVELOPE_SPECS['llm.delta']).toEqual({ dir: 'in', fields: { requestId: 'string', sequence: 'number', event: 'string', block: 'string', blockIndex: 'number' } });
  });
  it.each(Object.entries(requests))('accepts %s with correlation and rejects the napplet emitting its result', (action, payload) => {
    expect(validateEnvelope({ type: `llm.${action}`, id: 'req', ...payload })).toMatchObject({ ok: true, errors: [] });
    expect(validateEnvelope({ type: `llm.${action}`, ...payload }).errors)
      .toContainEqual(expect.objectContaining({ code: 'missing-field', field: 'id' }));
    expect(validateEnvelope({ type: `llm.${action}`, id: '', ...payload }).errors)
      .toContainEqual(expect.objectContaining({ code: 'wrong-type', field: 'id' }));
    expect(ENVELOPE_SPECS[`llm.${action}.result`].dir).toBe('in');
    expect(validateEnvelope({ type: `llm.${action}.result`, id: 'req' }).errors[0].code).toBe('inbound-type-emitted');
  });
  it('rejects the napplet emitting a delta', () => {
    expect(validateEnvelope({ type: 'llm.delta', requestId: 'g1', sequence: 0, event: 'start', block: 'text', blockIndex: 0 }).errors[0].code).toBe('inbound-type-emitted');
  });
  it.each([
    ['select', {}],
    ['select', { requirements: {} }],
    ['select', { requirements: { model: 'exact-model', images: true, json: false } }],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'system', content: [text('Be terse.')] }, { role: 'user', content: [image, text('Describe this.')] }] } }],
    ['generate', { request: { ...request, format: 'text' } }],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'assistant', content: [text('')] }] } }],
    ['select', { requirements: { tools: true } }],
    ['generate', { request: { ...request, maxTokens: 128, temperature: 0.7 } }],
    ['generate', { request: { ...request, temperature: 0 } }],
    ['generate', { request: { handle: 'h1', messages: [ask], tools: [weather], toolChoice: 'auto' } }],
    ['generate', { request: { handle: 'h1', messages: [ask], tools: [weather], toolChoice: { type: 'tool', name: 'get_weather' } } }],
    ['generate', { request: { handle: 'h1', messages: [ask], tools: [{ name: 'no_params' }], toolChoice: 'required' } }],
    ['generate', { request: { handle: 'h1', messages: [ask], tools: [] } }],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [{ type: 'thinking', text: 'Look it up.' }, call] }, answer], tools: [weather] } }],
    // Historical calls and results may be supplied without current tools.
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }, { ...answer, isError: true }] } }],
    // Parallel calls, each answered once, in any order.
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call, { ...call, toolCallId: 'call_2', arguments: { city: 'Paris' } }] },
      { ...answer, toolCallId: 'call_2' }, answer] } }],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }, { ...answer, content: [image] }] } }],
  ])('accepts optional and boundary %s parameters %j', (action, payload) => {
    expect(validateEnvelope({ type: `llm.${action}`, id: 'r', ...payload })).toMatchObject({ ok: true, errors: [] });
  });
  it.each([
    ['select', { requirements: null }, 'wrong-type'],
    ['select', { requirements: { model: '' } }, 'wrong-type'],
    ['select', { requirements: { json: 'yes' } }, 'wrong-type'],
    ['select', { requirements: { images: null } }, 'wrong-type'],
    ['select', { requirements: { provider: 'x' } }, 'wrong-type'],
    ['select', { requirements: {}, handle: 'h1' }, 'forbidden-field'],
    ['describe', { handle: '' }, 'wrong-type'],
    ['describe', {}, 'missing-field'],
    ['generate', { request: { ...request, handle: '' } }, 'wrong-type'],
    ['generate', { request: { ...request, messages: [] } }, 'wrong-type'],
    ['generate', { request: { ...request, format: 'xml' } }, 'wrong-type'],
    ['generate', { request: { ...request, format: null } }, 'wrong-type'],
    ['generate', { request: { ...request, temperature: '0.2' } }, 'wrong-type'],
    ['generate', { request: { ...request, temperature: null } }, 'wrong-type'],
    ['generate', { request: { ...request, maxTokens: 0 } }, 'wrong-type'],
    ['generate', { request: { ...request, maxTokens: 1.5 } }, 'wrong-type'],
    ['generate', { request: { ...request, samplingParams: { topP: 0.9 } } }, 'wrong-type'],
    ['select', { requirements: { tools: 'yes' } }, 'wrong-type'],
    ['generate', { request: { ...request, tools: [weather, weather] } }, 'wrong-type'],
    ['generate', { request: { ...request, tools: [{ ...weather, name: 'get weather' }] } }, 'wrong-type'],
    ['generate', { request: { ...request, tools: [{ ...weather, name: 'x'.repeat(65) }] } }, 'wrong-type'],
    ['generate', { request: { ...request, tools: [{ ...weather, parameters: { type: 'array' } }] } }, 'wrong-type'],
    ['generate', { request: { ...request, tools: [{ ...weather, strict: true }] } }, 'wrong-type'],
    ['generate', { request: { ...request, toolChoice: 'auto' } }, 'wrong-type'],
    ['generate', { request: { ...request, tools: [], toolChoice: 'none' } }, 'wrong-type'],
    ['generate', { request: { ...request, tools: [weather], toolChoice: { type: 'tool', name: 'other' } } }, 'wrong-type'],
    ['generate', { request: { ...request, tools: [weather], toolChoice: 'any' } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [call] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'thinking', text: 'x' }] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [{ ...call, arguments: '{"city":"Berlin"}' }] }, answer] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ ...ask, isError: false }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ ...ask, toolCallId: 'call_1' }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }, { ...answer, content: [call] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }, { ...answer, toolName: undefined }] } }, 'wrong-type'],
    // LLM-C12: a parallel turn whose next request omits one result.
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call, { ...call, toolCallId: 'call_2' }] }, answer] } }, 'wrong-type'],
    // LLM-C21: misplaced, duplicate, orphaned, and name-mismatched results.
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }, ask, answer] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }, answer, answer] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [ask, answer] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }, { ...answer, toolName: 'other' }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [ask, { role: 'assistant', content: [call] }, answer, { role: 'assistant', content: [call] }, answer] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'tool', content: [text('x')] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'toolResult', content: [text('x')] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'audio', data: 'AAAA' }] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/gif', data: 'AAAA' }] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/png', data: 'data:image/png;base64,AAAA' }] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/png', data: 'AAA' }] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/png', data: 'AA AA' }] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/png', data: '' }] }] } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'user', content: [{ type: 'text', text: 'x', extra: 1 }] }] } }, 'wrong-type'],
    ['generate', { request, stream: true }, 'forbidden-field'],
    ['cancel', { requestId: '' }, 'wrong-type'],
    ['cancel', { requestId: 'g1', handle: 'h1' }, 'forbidden-field'],
  ])('rejects malformed %s request %j', (action, payload, code) => {
    const verdict = validateEnvelope({ type: `llm.${action}`, id: 'r', ...payload });
    expect(verdict.ok).toBe(false);
    expect(verdict.errors.map((error) => error.code)).toContain(code);
  });
});

describe('reference LLM shell', () => {
  const endpoint = { id: 'first', catalogId: 'first', domains: ['llm'] };
  const other = { id: 'second', catalogId: 'second', domains: ['llm'] };
  type Shell = ReturnType<typeof createReferenceShell>;
  type Reply = Record<string, unknown> & { type: string; id?: string; error?: { code: string; message: string } };
  let sequence = 0;
  const send = (shell: Shell, action: string, payload = {}, from = endpoint, id = `${action}-${++sequence}`): Reply[] =>
    shell.handleFrom(from, { type: `llm.${action}`, id, ...payload }) as Reply[];
  const call = (shell: Shell, action: string, payload = {}, from = endpoint): Reply => {
    const id = `${action}-${++sequence}`;
    const replies = send(shell, action, payload, from, id);
    // Optional deltas precede exactly one terminal result.
    expect(replies.slice(0, -1).every((reply) => reply.type === 'llm.delta' && reply.requestId === id)).toBe(true);
    expect(replies.at(-1)).toMatchObject({ type: `llm.${action}.result`, id });
    return replies.at(-1)!;
  };
  const value = (shell: Shell, action: string, field: string, payload = {}, from = endpoint) => {
    const reply = call(shell, action, payload, from);
    expect(reply.error).toBeUndefined();
    return reply[field];
  };
  const code = (shell: Shell, action: string, payload = {}, from = endpoint) => {
    const reply = call(shell, action, payload, from);
    expect(Object.keys(reply).sort()).toEqual(['error', 'id', 'type']);
    expect(reply.error?.message).toEqual(expect.any(String));
    return reply.error?.code;
  };
  const prompt = (handle: unknown, textValue: string, format?: string) => ({
    request: { handle, messages: [{ role: 'user', content: [text(textValue)] }], ...(format ? { format } : {}) },
  });

  it('offers one connection, honours exact model requirements, and scopes handles to the endpoint', () => {
    const shell = createReferenceShell();
    const model = value(shell, 'select', 'model', { requirements: { json: true, images: true } }) as { handle: string };
    expect(model).toEqual({ handle: expect.any(String), ...REFERENCE_LLM_CONNECTION });
    expect(value(shell, 'select', 'model', {})).toMatchObject({ model: 'reference-model' });
    expect(code(shell, 'select', { requirements: { model: 'other-model' } })).toBe('unsupported');
    expect(value(shell, 'describe', 'model', { handle: model.handle })).toEqual(model);
    expect(code(shell, 'describe', { handle: 'unknown' })).toBe('selection-expired');
    expect(code(shell, 'describe', { handle: model.handle }, other)).toBe('selection-expired');
    expect(code(shell, 'generate', prompt(model.handle, 'hi'), other)).toBe('selection-expired');
  });

  it('streams a block lifecycle before the authoritative result and echoes JSON or text output', () => {
    const shell = createReferenceShell();
    const { handle } = value(shell, 'select', 'model') as { handle: string };
    const replies = send(shell, 'generate', prompt(handle, 'Return a greeting.', 'json'), endpoint, 'g1');
    expect(replies).toHaveLength(4);
    expect(replies.slice(0, 3)).toEqual([
      { type: 'llm.delta', requestId: 'g1', sequence: 0, event: 'start', block: 'text', blockIndex: 0 },
      { type: 'llm.delta', requestId: 'g1', sequence: 1, event: 'delta', block: 'text', blockIndex: 0, text: expect.any(String) },
      { type: 'llm.delta', requestId: 'g1', sequence: 2, event: 'end', block: 'text', blockIndex: 0 },
    ]);
    expect(replies[3]).toMatchObject({ type: 'llm.generate.result', id: 'g1', result: { finish: 'stop', usage: { inputTokens: expect.any(Number), outputTokens: expect.any(Number) } } });
    const result = replies[3].result as { content: Array<{ type: string; text: string }> };
    expect(result.content).toHaveLength(1);
    expect(JSON.parse(result.content[0].text)).toEqual({ echo: 'Return a greeting.' });
    expect(result.content[0].text).toBe(replies[1].text);
    const plain = send(shell, 'generate', prompt(handle, 'Say hello.'), endpoint, 'g2');
    expect(plain.at(-1)).toMatchObject({ result: { content: [text('Echo: Say hello.')], finish: 'stop' } });
    const thinking = send(shell, 'generate', prompt(handle, '[[think]] Say hi.'), endpoint, 'g3');
    expect(thinking.at(-1)).toMatchObject({ result: { content: [{ type: 'thinking', text: expect.any(String) }, { type: 'text' }], finish: 'stop' } });
    expect(thinking.filter((reply) => reply.type === 'llm.delta').map((reply) => [reply.blockIndex, reply.block, reply.event])).toEqual([
      [0, 'thinking', 'start'], [0, 'thinking', 'delta'], [0, 'thinking', 'end'], [1, 'text', 'start'], [1, 'text', 'delta'], [1, 'text', 'end'],
    ]);
  });

  it('returns tool calls only when asked, as toolUse, and echoes results with the specified error prefix', () => {
    const shell = createReferenceShell();
    const { handle } = value(shell, 'select', 'model') as { handle: string };
    const ask = { role: 'user', content: [text('What is the weather in Berlin?')] };
    expect(value(shell, 'generate', 'result', { request: { handle, messages: [ask], tools: [weather] } })).toMatchObject({ content: [{ type: 'text' }], finish: 'stop' });
    expect(value(shell, 'generate', 'result', { request: { handle, messages: [{ role: 'user', content: [text('[[tool]]')] }], tools: [weather], toolChoice: 'none' } }))
      .toMatchObject({ content: [{ type: 'text' }], finish: 'stop' });
    const replies = send(shell, 'generate', { request: { handle, messages: [ask], tools: [weather], toolChoice: { type: 'tool', name: 'get_weather' } } }, endpoint, 'g1');
    const result = replies.at(-1)?.result as { content: Array<Record<string, unknown>>; finish: string };
    expect(result.finish).toBe('toolUse');
    expect(result.content).toEqual([{ type: 'toolCall', toolCallId: expect.any(String), name: 'get_weather', arguments: {} }]);
    const [start, fragment] = replies;
    expect(start).toMatchObject({ event: 'start', block: 'toolCall', blockIndex: 0, toolCallId: result.content[0].toolCallId, name: 'get_weather' });
    expect(JSON.parse(String(fragment.text))).toEqual(result.content[0].arguments);
    const history = [ask, { role: 'assistant', content: result.content },
      { role: 'toolResult', toolCallId: result.content[0].toolCallId, toolName: 'get_weather', isError: true, content: [text('offline')] }];
    expect(value(shell, 'generate', 'result', { request: { handle, messages: history } }))
      .toMatchObject({ content: [text('Echo: Tool results: get_weather: Tool execution failed.offline')], finish: 'stop' });
  });

  it('models declined consent and provider refusal without provider submission', () => {
    const shell = createReferenceShell();
    const { handle } = value(shell, 'select', 'model') as { handle: string };
    expect(code(shell, 'generate', prompt(handle, 'Send this [[decline]]'))).toBe('user-cancelled');
    expect(value(shell, 'generate', 'result', prompt(handle, '[[refuse]] this'))).toEqual({ content: [], finish: 'refusal' });
  });

  it('keeps a stalled generation active, rejects its duplicate id, and settles it through cancel', () => {
    const shell = createReferenceShell();
    const { handle } = value(shell, 'select', 'model') as { handle: string };
    expect(send(shell, 'generate', prompt(handle, 'wait [[stall]]'), endpoint, 'g1')).toEqual([]);
    expect(send(shell, 'generate', prompt(handle, 'again'), endpoint, 'g1')).toEqual([
      { type: 'llm.generate.result', id: 'g1', error: { code: 'invalid-request', message: expect.any(String) } },
    ]);
    expect(value(shell, 'cancel', 'cancelled', { requestId: 'g1' }, other)).toBe(false);
    expect(send(shell, 'cancel', { requestId: 'g1' }, endpoint, 'c1')).toEqual([
      { type: 'llm.generate.result', id: 'g1', error: { code: 'cancelled', message: expect.any(String) } },
      { type: 'llm.cancel.result', id: 'c1', cancelled: true },
    ]);
    expect(value(shell, 'cancel', 'cancelled', { requestId: 'g1' })).toBe(false);
    expect(value(shell, 'cancel', 'cancelled', { requestId: 'never' })).toBe(false);
    expect(send(shell, 'generate', prompt(handle, 'fresh'), endpoint, 'g1')).toHaveLength(4);
    shell.reset();
    expect(code(shell, 'describe', { handle })).toBe('selection-expired');
  });

  it('answers a malformed but correlated request with invalid-request, without starting a generation', () => {
    const shell = createReferenceShell();
    const { handle } = value(shell, 'select', 'model') as { handle: string };
    const malformed = shell.handleFrom(endpoint, { type: 'llm.generate', id: 'bad', request: { handle, messages: [] } });
    expect(malformed).toEqual([{ type: 'llm.generate.result', id: 'bad', error: { code: 'invalid-request', message: expect.any(String) } }]);
    expect(shell.handleFrom(endpoint, { type: 'llm.select', id: 's9', requirements: null })).toEqual([
      { type: 'llm.select.result', id: 's9', error: { code: 'invalid-request', message: expect.any(String) } },
    ]);
    expect(shell.handleFrom(endpoint, { type: 'llm.cancel', id: 'c9', requestId: 'g1', handle })).toEqual([
      { type: 'llm.cancel.result', id: 'c9', error: { code: 'invalid-request', message: expect.any(String) } },
    ]);
    // A cross-field rule (LLM-C20: explicit toolChoice without tools) is malformed input too.
    expect(shell.handleFrom(endpoint, { type: 'llm.generate', id: 'bad', request: { handle, messages: [{ role: 'user', content: [text('x')] }], toolChoice: 'auto' } })).toEqual([
      { type: 'llm.generate.result', id: 'bad', error: { code: 'invalid-request', message: expect.stringContaining('toolChoice') } },
    ]);
    // The rejected id never became active, so it is free for a well-formed request.
    expect(send(shell, 'generate', prompt(handle, 'fresh'), endpoint, 'bad').at(-1)).toMatchObject({ type: 'llm.generate.result', id: 'bad', result: expect.any(Object) });
  });

  it('discards uncorrelated requests, napplet-emitted results, and ungranted domains', () => {
    const shell = createReferenceShell();
    expect(shell.handleFrom(endpoint, { type: 'llm.generate', request: { handle: 'h1', messages: [] } })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'llm.generate', id: '', request: { handle: 'h1', messages: [] } })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'llm.select.result', id: 'bad', model: {} })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'llm.delta', requestId: 'g1', sequence: 0, event: 'start', block: 'text', blockIndex: 0 })).toEqual([]);
    expect(shell.handleFrom({ ...endpoint, domains: ['relay'] }, { type: 'llm.select', id: 'ungranted' })).toEqual([]);
    expect(shell.handleFrom({ ...endpoint, domains: ['relay'] }, { type: 'llm.select', id: 'ungranted', requirements: null })).toEqual([]);
  });
});
