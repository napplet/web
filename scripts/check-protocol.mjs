import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Window } from 'happy-dom';

// Check the complete assembled artifact, not a sample of generated routes.
const root = path.resolve(import.meta.dirname, '..');
const site = path.resolve(process.argv[2] ?? path.join(root, 'site'));
const data = JSON.parse(await readFile(path.join(root, 'apps/web/src/data/protocol.json'), 'utf8'));
const { DOMParser } = new Window({ settings: { disableJavaScriptEvaluation: true, disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
const documentAt = async route => new DOMParser().parseFromString(await readFile(path.join(site, route, 'index.html'), 'utf8'), 'text/html');
const directory = await documentAt('protocol');
assert.equal(directory.querySelectorAll('[data-nap-row]').length, data.entries.length);
assert.equal((await documentAt('')).querySelector('a.protocol-layer[href="/protocol/"]')?.textContent.includes('NAPs'), true);
const sitemap = await readFile(path.join(site, 'sitemap-0.xml'), 'utf8');
for (const entry of data.entries) {
  const route = `protocol/${entry.slug}`;
  const document = await documentAt(route);
  assert.equal(document.querySelectorAll('h1').length, 1, route);
  assert.ok(document.querySelector('h1').textContent.includes(entry.title), route);
  const links = [...document.querySelectorAll('a')].map(link => link.getAttribute('href'));
  assert.ok(links.includes(entry.discussionUrl ?? entry.sourceUrl), `${route}: source destination`);
  assert.ok(directory.querySelector(`a[href="/${route}/"]`), `${route}: directory link`);
  assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'), `https://napplet.run/${route}/`);
  assert.ok(sitemap.includes(`https://napplet.run/${route}/`), `${route}: sitemap`);
  assert.ok(document.body.textContent.includes('non-normative'), `${route}: authority notice`);
  const specification = document.querySelector('.spec-body');
  assert.ok(specification?.textContent.length > entry.description.length, `${route}: full document rendered`);
  assert.ok(links.includes(entry.documentUrl), `${route}: pinned document source`);
  const outline = [...document.querySelectorAll('.spec-contents a')];
  assert.ok(outline.length > 0, `${route}: contents navigation`);
  for (const link of outline) assert.ok(document.getElementById(link.hash.slice(1)), `${route}: heading ${link.hash}`);
  for (const code of entry.markdown.matchAll(/^```[^\n]*\n([^]*?)^```/gm)) {
    assert.ok([...specification.querySelectorAll('pre')].some(pre => pre.textContent.trim() === code[1].trim()), `${route}: complete code example`);
  }
}
const contribution = await documentAt('protocol/contribute');
assert.ok(contribution.querySelector(`a[href="${data.contribution.templateUrl}"]`));
for (const heading of data.contribution.templateSections) assert.ok(contribution.body.textContent.includes(heading));
console.log(`Verified protocol table, ${data.entries.length} detail pages, source destinations, canonicals, sitemap and contribution guide.`);
