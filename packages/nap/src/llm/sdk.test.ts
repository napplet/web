import { describe, expect, it } from 'vitest';
import { llmText, llmToolCalls } from './sdk.js';
import type { LlmGeneration } from './types.js';

// Generation records follow the living NAP-LLM schema (napplet/naps#134, head of branch nap-llm).
const call = { type: 'toolCall', toolCallId: 'call_1', name: 'get_weather', arguments: { city: 'Berlin' } } as const;

describe('llm generation helpers', () => {
  it('concatenates text parts in order and skips thinking and tool calls', () => {
    const generation: LlmGeneration = {
      content: [{ type: 'thinking', text: 'plan' }, { type: 'text', text: '{"greeting":' }, call, { type: 'text', text: '"Hello"}' }],
      finish: 'stop',
    };
    expect(llmText(generation)).toBe('{"greeting":"Hello"}');
    expect(llmText({ content: [], finish: 'refusal' })).toBe('');
  });

  it('returns tool calls only from an authoritative toolUse result', () => {
    expect(llmToolCalls({ content: [{ type: 'text', text: 'Checking.' }, call], finish: 'toolUse' })).toEqual([call]);
    // Truncated or refused turns carry no executable calls, even if a runtime sent some.
    expect(llmToolCalls({ content: [call], finish: 'length' })).toEqual([]);
    expect(llmToolCalls({ content: [call], finish: 'stop' })).toEqual([]);
  });
});
