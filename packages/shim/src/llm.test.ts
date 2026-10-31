import { describe, expect, it, vi } from 'vitest';
import { installNappletRuntimePrelude } from './prelude.js';
import { llm, isLlmFailure } from '@napplet/sdk/llm';

function deliver(data: unknown, source: MessageEventSource | null = window.parent): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

const model = { handle: 'h1', name: 'My connection', model: 'chosen-model', route: 'Local shell → inference provider', images: false, json: true };
const request = { handle: 'h1', messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'Say hello.' }] }] };

describe('runtime-injected LLM', () => {
  it('exposes only granted domains and routes trusted results and deltas through the SDK', async () => {
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    try {
      const installed = installNappletRuntimePrelude({ domains: ['llm'] });
      expect(Object.keys(installed)).toEqual(['llm']);
      expect(post).not.toHaveBeenCalled();
      expect(Object.keys(installed.llm!).sort()).toEqual(['cancel', 'describe', 'generate', 'select']);
      const selected = llm.select({ json: true });
      const selectRequest = post.mock.calls[0][0];
      expect(selectRequest).toEqual({ type: 'llm.select', id: expect.any(String), requirements: { json: true } });
      expect(post.mock.calls[0][1]).toBe('*');
      deliver({ type: 'llm.select.result', id: selectRequest.id, model: { ...model, handle: 'forged' } }, {} as MessageEventSource);
      deliver({ type: 'llm.select.result', id: selectRequest.id, model });
      await expect(selected).resolves.toEqual(model);

      const deltas: string[] = [];
      const pending = llm.generate(request, { onDelta: (delta) => deltas.push(delta.text) });
      const generateRequest = post.mock.calls[1][0];
      expect(generateRequest).toEqual({ type: 'llm.generate', id: pending.requestId, request });
      deliver({ type: 'llm.delta', requestId: pending.requestId, sequence: 0, text: 'Hel' });
      deliver({ type: 'llm.delta', requestId: pending.requestId, sequence: 1, text: 'lo' });
      deliver({ type: 'llm.generate.result', id: pending.requestId, result: { text: 'Hello', finish: 'stop' } });
      await expect(pending).resolves.toEqual({ text: 'Hello', finish: 'stop' });
      expect(deltas).toEqual(['Hel', 'lo']);

      const described = llm.describe('stale');
      const describeRequest = post.mock.calls[2][0];
      deliver({ type: 'llm.describe.result', id: describeRequest.id, error: { code: 'selection-expired', message: 'Select a model again.' } });
      const failure = await described.catch((error: unknown) => error);
      expect(isLlmFailure(failure)).toBe(true);
      expect((failure as { code: string }).code).toBe('selection-expired');

      installNappletRuntimePrelude({ domains: [] });
      expect(() => llm.cancel('g1')).toThrow('llm');
    } finally { post.mockRestore(); }
  });
});
