import { describe, expect, it } from 'vitest';
import { inferRequirementsFromSource } from './requirements.js';

describe('NAP-LLM requirement inference', () => {
  it.each([
    "import { llm } from '@napplet/sdk/llm';",
    "import { llmGenerate } from '@napplet/nap/llm';",
    "import { llmSelect } from '@napplet/nap/llm/sdk';",
    'window.napplet.llm.select({ json: true });',
  ])('infers llm from %s', (source) => {
    expect(inferRequirementsFromSource(source, '/src/main.ts')).toEqual(['llm']);
  });
  it('does not infer availability from type-only imports', () => {
    expect(inferRequirementsFromSource("import type { LlmApi } from '@napplet/sdk/llm';", '/src/main.ts')).toEqual([]);
  });
});
