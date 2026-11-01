import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildSkillsDiscovery, docsPageMarkdown, htmlPageMarkdown, markdownPathFor, parseLlmsSections, readAlternateHref,
  renderLlmsTxt, servedPathFor, sha256Digest, skillFrontmatter, tarGz,
} from './lib/agent-markdown.mjs';
import { acceptsMarkdown, decorateResponse, markdownTarget, rewriteRequest } from '../edge/markdown-negotiation.mjs';

test('maps served paths and built files to Markdown copies', () => {
  assert.equal(markdownPathFor('/'), '/index.md');
  assert.equal(markdownPathFor('/explainer/'), '/explainer/index.md');
  assert.equal(markdownPathFor('/docs/guide/getting-started.html'), '/docs/guide/getting-started.md');
  assert.equal(markdownPathFor('/explainer'), '/explainer/index.md');
  assert.equal(servedPathFor('index.html'), '/');
  assert.equal(servedPathFor('protocol/nap-shell/index.html'), '/protocol/nap-shell/');
  assert.equal(servedPathFor('docs/spec.html'), '/docs/spec.html');
  assert.equal(readAlternateHref('<link rel="canonical" href="/"><link rel="alternate" type="text/markdown" href="/index.md">'), '/index.md');
  assert.equal(readAlternateHref('<link rel="alternate" type="application/rss+xml" href="/feed">'), null);
});

test('converts the main content of an HTML page, dropping chrome and making links absolute', () => {
  const html = `<html><head><title>Explainer</title></head><body>
    <header><nav><a href="/">Home</a></nav></header>
    <main><h2>Apps that<br>travel.</h2><p>Read <a href="../docs/">the docs</a>.</p>
      <img src="/a.png" alt=""><img src="shot.webp" alt="Screenshot"><button>Play</button>
      <script>alert(1)</script><div aria-hidden="true">decor</div><pre><code>npx napplet</code></pre></main>
    <footer>Footer</footer></body></html>`;
  const markdown = htmlPageMarkdown(html, '/explainer/');
  assert.match(markdown, /^# Explainer\n/);
  assert.match(markdown, /^## Apps that travel\.$/m);
  assert.match(markdown, /\[the docs\]\(https:\/\/napplet\.run\/docs\/\)/);
  assert.match(markdown, /!\[Screenshot\]\(https:\/\/napplet\.run\/explainer\/shot\.webp\)/);
  assert.match(markdown, /```\nnpx napplet\n```/);
  for (const dropped of ['Home', 'Footer', 'Play', 'alert', 'decor', 'a.png']) assert.doesNotMatch(markdown, new RegExp(dropped));
});

test('turns VitePress source into standalone Markdown', () => {
  const source = [
    '---', 'title: Guide', '---', '# Guide', '', '::: warning ALPHA', 'Expect drift.', ':::', '',
    'See [concepts](./concepts), [spec](/spec), [packages](/packages/), [core](../packages/core.md#api) and [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303).',
    '', '```md', '::: tip', 'inside a fence', '```', '',
  ].join('\n');
  const markdown = docsPageMarkdown({ relativePath: 'guide/index.md', source });
  assert.doesNotMatch(markdown, /^title:/m);
  assert.match(markdown, /^> \*\*ALPHA\*\*\n>\n> Expect drift\.$/m);
  assert.match(markdown, /\(https:\/\/napplet\.run\/docs\/guide\/concepts\.md\)/);
  assert.match(markdown, /\(https:\/\/napplet\.run\/docs\/spec\.md\)/);
  assert.match(markdown, /\(https:\/\/napplet\.run\/docs\/packages\/index\.md\)/);
  assert.match(markdown, /\(https:\/\/napplet\.run\/docs\/packages\/core\.md#api\)/);
  assert.match(markdown, /\(https:\/\/github\.com\/nostr-protocol\/nips\/pull\/2303\)/);
  assert.match(markdown, /```md\n::: tip\ninside a fence\n```/);
  const home = docsPageMarkdown({
    relativePath: 'index.md', source: '---\nlayout: home\n---\n',
    frontmatter: { layout: 'home', hero: { name: 'napplet', text: 'Composable', tagline: 'Small apps.', actions: [{ text: 'Start', link: '/guide/' }] }, features: [{ title: 'Sandboxed', details: 'allow-scripts only.' }] },
  });
  assert.equal(home, '# napplet: Composable\n\nSmall apps.\n\n- [Start](https://napplet.run/docs/guide/index.md)\n\n## Sandboxed\n\nallow-scripts only.\n');
});

test('renders and re-parses llms.txt sections', () => {
  const text = renderLlmsTxt({
    title: 'napplet', summary: 'Apps that travel.', notes: 'Notes.',
    sections: [{ name: 'Docs', links: [{ title: 'Intro', url: 'https://napplet.run/docs/index.md', description: 'Start here' }] }, { name: 'Empty', links: [] }],
  });
  assert.equal(text, '# napplet\n\n> Apps that travel.\n\nNotes.\n\n## Docs\n\n- [Intro](https://napplet.run/docs/index.md): Start here\n');
  assert.deepEqual(parseLlmsSections(text), [{ name: 'Docs', links: [{ title: 'Intro', url: 'https://napplet.run/docs/index.md', description: 'Start here' }] }]);
});

test('builds an Agent Skills index with single files, reproducible archives and exact digests', async (t) => {
  const skillMd = (name) => Buffer.from(`---\nname: ${name}\ndescription: "Use for ${name}."\n---\n\n# ${name}\n`);
  const skills = [
    { dir: 'solo', files: [{ path: 'SKILL.md', bytes: skillMd('solo') }] },
    { dir: 'bundle', files: [{ path: 'references/map.md', bytes: Buffer.from('# Map\n') }, { path: 'SKILL.md', bytes: skillMd('bundle') }] },
  ];
  const { index, artifacts } = buildSkillsDiscovery(skills);
  assert.equal(index.$schema, 'https://schemas.agentskills.io/discovery/0.2.0/schema.json');
  assert.deepEqual(index.skills.map(({ name, type, url, description }) => ({ name, type, url, description })), [
    { name: 'bundle', type: 'archive', url: '/.well-known/agent-skills/bundle.tar.gz', description: 'Use for bundle.' },
    { name: 'solo', type: 'skill-md', url: '/.well-known/agent-skills/solo/SKILL.md', description: 'Use for solo.' },
  ]);
  for (const [i, artifact] of artifacts.entries()) assert.equal(index.skills[i].digest, sha256Digest(artifact.bytes));
  assert.match(index.skills[0].digest, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(buildSkillsDiscovery(skills).artifacts[0].bytes, artifacts[0].bytes, 'archives are byte-for-byte reproducible');

  const dir = await mkdtemp(path.join(os.tmpdir(), 'napplet-skill-tar-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const archive = path.join(dir, 'bundle.tar.gz');
  await writeFile(archive, artifacts[0].bytes);
  assert.deepEqual(execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n').sort(), ['SKILL.md', 'references/map.md']);
  execFileSync('tar', ['-xzf', archive, '-C', dir]);
  assert.equal(await readFile(path.join(dir, 'references/map.md'), 'utf8'), '# Map\n');

  assert.throws(() => buildSkillsDiscovery([{ dir: 'other', files: [{ path: 'SKILL.md', bytes: skillMd('solo') }] }]), /invalid name/);
  assert.throws(() => tarGz([{ path: '../escape', bytes: Buffer.from('x') }]), /Unsafe archive path/);
  assert.deepEqual(skillFrontmatter("---\nname: a\ndescription: 'b: c'\n---\n"), { name: 'a', description: 'b: c' });
});

test('edge negotiation rewrites Markdown requests and decorates responses', async () => {
  assert.equal(acceptsMarkdown('text/markdown'), true);
  assert.equal(acceptsMarkdown('text/html, text/markdown;q=0.5'), true);
  assert.equal(acceptsMarkdown('text/markdown;q=0'), false);
  assert.equal(acceptsMarkdown('text/html,*/*'), false);
  assert.equal(markdownTarget('/conformance/'), null);
  assert.equal(markdownTarget('/.well-known/acme-challenge/x'), null);
  assert.equal(markdownTarget('/og.png'), null);
  assert.equal(markdownTarget('/docs/spec.html'), '/docs/spec.md');

  const md = (url, method = 'GET') => new Request(url, { method, headers: { accept: 'text/markdown, text/html;q=0.8' } });
  assert.equal(rewriteRequest(md('https://napplet.run/')).url, 'https://napplet.run/index.md');
  assert.equal(rewriteRequest(md('https://napplet.run/docs/guide/getting-started.html?x=1', 'HEAD')).url, 'https://napplet.run/docs/guide/getting-started.md?x=1');
  const html = new Request('https://napplet.run/explainer/', { headers: { accept: 'text/html' } });
  assert.equal(rewriteRequest(html), html);
  const post = new Request('https://napplet.run/', { method: 'POST', headers: { accept: 'text/markdown' } });
  assert.equal(rewriteRequest(post), post);

  const copy = decorateResponse(md('https://napplet.run/explainer/'), new Response('# Explainer', { headers: { 'content-type': 'application/octet-stream', vary: 'Accept-Encoding' } }));
  assert.equal(copy.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(copy.headers.get('vary'), 'Accept-Encoding, Accept');
  assert.equal(await copy.text(), '# Explainer');
  const direct = decorateResponse(new Request('https://napplet.run/index.md'), new Response('# Home'));
  assert.equal(direct.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(direct.headers.get('link'), null);

  const page = decorateResponse(html, new Response('<p>', { headers: { 'content-type': 'text/html' } }));
  assert.equal(page.headers.get('vary'), 'Accept');
  assert.equal(page.headers.get('link'), '</explainer/index.md>; rel="alternate"; type="text/markdown"');
  const image = new Response('png', { headers: { 'content-type': 'image/png' } });
  assert.equal(decorateResponse(new Request('https://napplet.run/og.png'), image), image);
  const missing = decorateResponse(md('https://napplet.run/nope/'), new Response('gone', { status: 404, headers: { 'content-type': 'text/plain' } }));
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('content-type'), 'text/plain');
});
