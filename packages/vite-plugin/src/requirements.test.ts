import { describe, expect, it } from 'vitest';
import { inferRequirementsFromSource } from './requirements.js';

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
