import { describe, expect, it } from 'vitest';
import { ENVELOPE_SPECS, knownEnvelopeTypes, validateEnvelope } from './envelope.js';
import { createReferenceShell } from '../shell/reference-shell.js';
import { REFERENCE_LLM_CONNECTION } from '../shell/reference-llm.js';

const text = (value: string) => ({ type: 'text', text: value });
const image = { type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgo=' };
const request = { handle: 'h1', messages: [{ role: 'user', content: [text('Return a JSON object with a greeting.')] }], format: 'json' };
const requests: Record<string, Record<string, unknown>> = {
  select: { requirements: { json: true } }, describe: { handle: 'h1' }, generate: { request }, cancel: { requestId: 'g2' },
};

// Living NAP-LLM Wire Protocol and Schemas (napplet/naps#134).
describe('NAP-LLM envelopes', () => {
  it('registers four requests, four results, and the unsolicited delta', () => {
    expect(knownEnvelopeTypes().filter((type) => type.startsWith('llm.')).sort()).toEqual([
      ...Object.keys(requests).flatMap((action) => [`llm.${action}`, `llm.${action}.result`]), 'llm.delta',
    ].sort());
    expect(ENVELOPE_SPECS['llm.delta']).toEqual({ dir: 'in', fields: { requestId: 'string', sequence: 'number', text: 'string' } });
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
    expect(validateEnvelope({ type: 'llm.delta', requestId: 'g1', sequence: 0, text: 'x' }).errors[0].code).toBe('inbound-type-emitted');
  });
  it.each([
    ['select', {}],
    ['select', { requirements: {} }],
    ['select', { requirements: { model: 'exact-model', images: true, json: false } }],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'system', content: [text('Be terse.')] }, { role: 'user', content: [image, text('Describe this.')] }] } }],
    ['generate', { request: { ...request, format: 'text' } }],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'assistant', content: [text('')] }] } }],
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
    ['generate', { request: { ...request, temperature: 0.2 } }, 'wrong-type'],
    ['generate', { request: { handle: 'h1', messages: [{ role: 'tool', content: [text('x')] }] } }, 'wrong-type'],
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
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ type: `llm.${action}.result`, id });
    return replies[0];
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

  it('streams one delta before the authoritative result and echoes JSON or text output', () => {
    const shell = createReferenceShell();
    const { handle } = value(shell, 'select', 'model') as { handle: string };
    const replies = send(shell, 'generate', prompt(handle, 'Return a greeting.', 'json'), endpoint, 'g1');
    expect(replies).toHaveLength(2);
    expect(replies[0]).toEqual({ type: 'llm.delta', requestId: 'g1', sequence: 0, text: expect.any(String) });
    expect(replies[1]).toMatchObject({ type: 'llm.generate.result', id: 'g1', result: { finish: 'stop', usage: { inputTokens: expect.any(Number), outputTokens: expect.any(Number) } } });
    const result = (replies[1].result as { text: string });
    expect(JSON.parse(result.text)).toEqual({ echo: 'Return a greeting.' });
    expect(result.text.startsWith(String(replies[0].text))).toBe(true);
    const plain = send(shell, 'generate', prompt(handle, 'Say hello.'), endpoint, 'g2');
    expect(plain[1]).toMatchObject({ result: { text: 'Echo: Say hello.', finish: 'stop' } });
  });

  it('models declined consent and provider refusal without provider submission', () => {
    const shell = createReferenceShell();
    const { handle } = value(shell, 'select', 'model') as { handle: string };
    expect(code(shell, 'generate', prompt(handle, 'Send this [[decline]]'))).toBe('user-cancelled');
    expect(value(shell, 'generate', 'result', prompt(handle, '[[refuse]] this'))).toEqual({ text: '', finish: 'refusal' });
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
    expect(send(shell, 'generate', prompt(handle, 'fresh'), endpoint, 'g1')).toHaveLength(2);
    shell.reset();
    expect(code(shell, 'describe', { handle })).toBe('selection-expired');
  });

  it('discards envelopes the validator rejects, napplet-emitted results, and ungranted domains', () => {
    const shell = createReferenceShell();
    expect(shell.handleFrom(endpoint, { type: 'llm.generate', id: 'bad', request: { handle: 'h1', messages: [] } })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'llm.select.result', id: 'bad', model: {} })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'llm.delta', requestId: 'g1', sequence: 0, text: 'x' })).toEqual([]);
    expect(shell.handleFrom({ ...endpoint, domains: ['relay'] }, { type: 'llm.select', id: 'ungranted' })).toEqual([]);
  });
});
