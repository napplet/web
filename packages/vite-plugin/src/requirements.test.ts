import { describe, expect, it } from 'vitest';
import { inferRequirementsFromSource } from './requirements.js';

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
