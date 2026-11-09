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

describe('NAP-SOULSEEK requirement inference', () => {
  it.each([
    "import { soulseek } from '@napplet/sdk/soulseek';",
    "import { soulseekSearch } from '@napplet/nap/soulseek';",
    "import { soulseekSearch } from '@napplet/nap/soulseek/sdk';",
    'window.napplet.soulseek.search({ text: "field recording" });',
  ])('infers soulseek from %s', (source) => {
    expect(inferRequirementsFromSource(source, '/src/main.ts')).toEqual(['soulseek']);
  });
  it('does not infer availability from type-only imports', () => {
    expect(inferRequirementsFromSource("import type { SoulseekApi } from '@napplet/sdk/soulseek';", '/src/main.ts')).toEqual([]);
  });
});
