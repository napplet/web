import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkSite } from './check-site.mjs';

const page = (extra = '') => `<!doctype html><html lang="en"><head><title>Napplet page</title><meta name="description" content="A page about napplet archetypes."><link rel="canonical" href="https://archetypes.example/x/"><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script></head><body><nav></nav><main><h1>Title</h1><label for="q">Search</label><input id="q">${extra}</main></body></html>`;

function site(files) {
  const dist = mkdtempSync(join(tmpdir(), 'arch-check-'));
  const base = {
    'index.html': page('<a href="/archetypes/note/">note</a>'), 'index.md': '#', '404.html': page(), 'llms.txt': '#', 'llms-full.txt': '#',
    'archetypes.json': '{}', 'relays.json': '{}', 'robots.txt': 'Sitemap: https://archetypes.example/sitemap-index.xml', 'sitemap-index.xml': '',
    'favicon.svg': '', 'sitemap-0.xml': '<loc>a</loc><loc>b</loc>', 'archetypes/note/index.html': page('<link rel="alternate" type="text/markdown" href="/archetypes/note.md">'),
    'archetypes/note.md': '#', 'archetypes/note/index.md': '#',
  };
  for (const [path, body] of Object.entries({ ...base, ...files })) {
    if (body === null) continue;
    mkdirSync(dirname(join(dist, path)), { recursive: true });
    writeFileSync(join(dist, path), body);
  }
  return dist;
}

describe('checkSite', () => {
  it('passes a complete site', () => {
    expect(checkSite(site({}))).toEqual({ pages: 3, problems: [] });
  });

  it('reports missing files, broken links, bad JSON-LD, unlabelled inputs and missing twins', () => {
    const { problems } = checkSite(site({
      'llms.txt': null,
      'archetypes/note.md': null,
      'index.html': page('<a href="/nowhere/">x</a><input id="orphan"><h1>Two</h1><script type="application/ld+json">{bad</script>'),
    }));
    expect(problems).toEqual(expect.arrayContaining([
      'missing llms.txt',
      'index.html: broken link /nowhere/',
      'index.html: input #orphan has no label',
      'index.html: has 2 h1 elements',
      'index.html: invalid JSON-LD',
      'archetypes/note/index.html: markdown twin /archetypes/note.md missing',
      'archetypes/note.md missing',
    ]));
    expect(checkSite(site({ 'archetypes/note/index.md': null })).problems).toContain('archetypes/note/index.md missing');
  });
});
