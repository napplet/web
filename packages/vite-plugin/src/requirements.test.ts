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

describe('NAP-TORRENT requirement inference', () => {
  it.each([
    "import { torrent } from '@napplet/sdk/torrent';",
    "import { torrentAdd } from '@napplet/nap/torrent';",
    "import { torrentAdd } from '@napplet/nap/torrent/sdk';",
    'window.napplet.torrent.search({ text: "archive" });',
  ])('infers torrent from %s', (source) => {
    expect(inferRequirementsFromSource(source, '/src/main.ts')).toEqual(['torrent']);
  });
  it('does not infer availability from type-only imports', () => {
    expect(inferRequirementsFromSource("import type { TorrentApi } from '@napplet/sdk/torrent';", '/src/main.ts')).toEqual([]);
  });
});
