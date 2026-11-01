import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { llm, isLlmFailure } from '@napplet/sdk/llm';
import { installFakeShell } from '../../nap/src/test-support/fake-shell.js';

/** A window-level message, even one whose source is the parent: NIP-5D shells speak NAP only over the port. */
function deliverAtWindowLevel(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window.parent }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const model = { handle: 'h1', name: 'My connection', model: 'chosen-model', route: 'Local shell → inference provider', images: false, json: true };
const request = { handle: 'h1', messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'Say hello.' }] }] };

describe('runtime-injected LLM', () => {
  it('exposes only granted domains and routes trusted results and deltas through the SDK', async () => {
    const shell = installFakeShell();
    const deliver = (data: unknown): void => shell.deliver(data);
    const installed = installNappletRuntimePrelude({ domains: ['llm'] });
    expect(Object.keys(installed)).toEqual(['llm']);
    expect(shell.sent).toEqual([]);
    expect(shell.windowMessages).toEqual([]);
    expect(Object.keys(installed.llm!).sort()).toEqual(['cancel', 'describe', 'generate', 'select']);
    const selected = llm.select({ json: true });
    const selectRequest = shell.sent[0];
    expect(selectRequest).toEqual({ type: 'llm.select', id: expect.any(String), requirements: { json: true } });
    deliverAtWindowLevel({ type: 'llm.select.result', id: selectRequest.id, model: { ...model, handle: 'forged' } });
    deliver({ type: 'llm.select.result', id: selectRequest.id, model });
    await expect(selected).resolves.toEqual(model);

    const deltas: string[] = [];
    const pending = llm.generate(request, { onDelta: (delta) => deltas.push(delta.text) });
    const generateRequest = shell.sent[1];
    expect(generateRequest).toEqual({ type: 'llm.generate', id: pending.requestId, request });
    deliver({ type: 'llm.delta', requestId: pending.requestId, sequence: 0, text: 'Hel' });
    deliver({ type: 'llm.delta', requestId: pending.requestId, sequence: 1, text: 'lo' });
    deliver({ type: 'llm.generate.result', id: pending.requestId, result: { text: 'Hello', finish: 'stop' } });
    await expect(pending).resolves.toEqual({ text: 'Hello', finish: 'stop' });
    expect(deltas).toEqual(['Hel', 'lo']);

    const described = llm.describe('stale');
    const describeRequest = shell.sent[2];
    deliver({ type: 'llm.describe.result', id: describeRequest.id, error: { code: 'selection-expired', message: 'Select a model again.' } });
    const failure = await described.catch((error: unknown) => error);
    expect(isLlmFailure(failure)).toBe(true);
    expect((failure as { code: string }).code).toBe('selection-expired');

    installNappletRuntimePrelude({ domains: [] });
    expect(() => llm.cancel('g1')).toThrow('llm');
    expect(shell.windowMessages).toEqual([]);
  });
});
