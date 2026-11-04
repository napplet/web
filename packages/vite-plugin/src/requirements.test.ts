import { describe, expect, it } from 'vitest';
import { inferRequirementsFromSource } from './requirements.js';

describe('navigation requirement inference', () => {
  it.each([
    "import { navigation } from '@napplet/sdk/navigation';",
    "import { report } from '@napplet/nap/navigation';",
    "import { get } from '@napplet/nap/navigation/sdk';",
    'window.napplet.navigation.get();',
  ])('recognizes a static navigation use: %s', (source) => {
    expect(inferRequirementsFromSource(source, '/src/main.ts')).toEqual(['navigation']);
  });

  it('preserves type-only and root-package import behavior', () => {
    expect(inferRequirementsFromSource("import type { NavigationReport } from '@napplet/nap/navigation/types';", '/src/main.ts')).toEqual([]);
    expect(inferRequirementsFromSource("import { navigation } from '@napplet/sdk';", '/src/main.ts')).toEqual([]);
  });
});

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
