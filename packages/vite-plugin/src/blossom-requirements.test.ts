import { describe, expect, it } from 'vitest';
import { inferRequirementsFromSource } from './requirements.js';

describe('BLOSSOM requirement inference', () => {
  it.each([
    "import { blossom } from '@napplet/sdk/blossom';",
    "import { blossomGet } from '@napplet/nap/blossom';",
    "import { get } from '@napplet/nap/blossom/sdk';",
    'window.napplet.blossom.servers();',
  ])('recognizes %s', (source) => {
    expect(inferRequirementsFromSource(source, '/src/main.ts')).toEqual(['blossom']);
  });

  it('does not infer a runtime requirement from Blossom types', () => {
    expect(inferRequirementsFromSource(
      "import type { BlossomUri } from '@napplet/nap/blossom/types';", '/src/main.ts',
    )).toEqual([]);
  });
});
