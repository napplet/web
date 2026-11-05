import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assembleSite, assertNip05 } from './assemble-site.mjs';
import { assertAgentReadable } from './lib/agent-readable-site.mjs';
import { markdownPathFor, servedPathFor } from './lib/agent-markdown.mjs';

const NAPSHOT_PUBKEY = '94b92a261c88f6b14098e6ec15c93bed544380883745f9a030b27d4a5c554f81';
const NAPSHOT_RELAYS = ['wss://relay.napplet.soy/', 'wss://relay.primal.net/'];
const NIP05 = JSON.stringify({ names: { napshot: NAPSHOT_PUBKEY }, relays: { [NAPSHOT_PUBKEY]: NAPSHOT_RELAYS } });

/** A built page as the Astro and VitePress layouts emit it: title plus its Markdown alternate link. */
function page(text, file) {
  const href = markdownPathFor(servedPathFor(file));
  return `<html><head><title>${text}</title><link rel="alternate" type="text/markdown" href="${href}"></head><body><main><p>${text}</p></main></body></html>`;
}

const SKILL = '---\nname: napplet-demo\ndescription: Use for the demo.\n---\n\n# Demo\n';
const DOCS_LLMS = '# napplet docs\n\n> Docs.\n\n## Guide\n\n- [Guide](https://napplet.run/docs/guide/index.md)\n';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'napplet-site-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = {
    'apps/web/dist/index.html': page('showcase', 'index.html'),
    'apps/web/dist/explainer/index.html': page('explainer', 'explainer/index.html'),
    'apps/web/dist/protocol/index.html': page('protocol directory', 'protocol/index.html'),
    'apps/web/dist/protocol/contribute/index.html': page('contribution guide', 'protocol/contribute/index.html'),
    'apps/web/dist/protocol/nap-shell/index.html': page('shell detail', 'protocol/nap-shell/index.html'),
    'apps/web/dist/og.png': 'image',
    'apps/web/dist/robots.txt': 'robots',
    'apps/web/dist/sitemap-index.xml': 'sitemap index',
    'apps/web/dist/sitemap-0.xml': 'sitemap',
    'apps/web/dist/install.sh': 'shell installer',
    'apps/web/dist/install.ps1': 'powershell installer',
    'apps/web/public/install.sh': 'shell installer',
    'apps/web/public/install.ps1': 'powershell installer',
    'apps/web/dist/.well-known/nostr.json': NIP05,
    'apps/web/public/.well-known/nostr.json': NIP05,
    'apps/docs/.vitepress/dist/index.html': page('docs', 'docs/index.html'),
    'apps/docs/.vitepress/dist/guide/index.html': page('guide', 'docs/guide/index.html'),
    'apps/docs/.vitepress/dist/index.md': '# docs\n',
    'apps/docs/.vitepress/dist/guide/index.md': '# guide\n',
    'apps/docs/.vitepress/dist/llms.txt': DOCS_LLMS,
    'apps/docs/.vitepress/dist/llms-full.txt': '# napplet docs\n\n> Docs.\n\n# guide\n',
    'skills/napplet-demo/SKILL.md': SKILL,
    'apps/conformance/dist/index.html': '<script src="/conformance/assets/app.js"></script>',
    'apps/conformance/dist/assets/app.js': 'conformance',
    'site/stale.txt': 'stale previous build',
  };
  for (const [file, contents] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), contents);
  }
  return root;
}

test('assembles real directory routes, nested assets and exact installers, removing stale output', async (t) => {
  const root = await fixture(t);
  const output = await assembleSite(root);
  for (const [file, expected] of Object.entries({
    'index.html': page('showcase', 'index.html'), 'explainer/index.html': page('explainer', 'explainer/index.html'),
    'protocol/index.html': page('protocol directory', 'protocol/index.html'), 'protocol/nap-shell/index.html': page('shell detail', 'protocol/nap-shell/index.html'),
    'docs/index.html': page('docs', 'docs/index.html'), 'docs/guide/index.html': page('guide', 'docs/guide/index.html'),
    'conformance/assets/app.js': 'conformance',
    'install.sh': 'shell installer', 'install.ps1': 'powershell installer',
    '.well-known/nostr.json': NIP05,
  })) assert.equal(await readFile(path.join(output, file), 'utf8'), expected);
  await assert.rejects(readFile(path.join(output, 'stale.txt')), { code: 'ENOENT' });
});

test('missing required pages or social image fails before touching prior output', async (t) => {
  for (const missing of ['explainer/index.html', 'protocol/index.html', 'protocol/contribute/index.html', 'og.png', '.well-known/nostr.json']) {
    const root = await fixture(t);
    await rm(path.join(root, 'apps/web/dist', missing));
    await assert.rejects(assembleSite(root), { code: 'ENOENT' });
    assert.equal(await readFile(path.join(root, 'site/stale.txt'), 'utf8'), 'stale previous build');
  }
});

test('rejects an installer mismatch and conformance built at the root', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'apps/web/dist/install.sh'), 'outdated installer');
  await assert.rejects(assembleSite(root), /differs from its public source/);
  await writeFile(path.join(root, 'apps/web/dist/install.sh'), 'shell installer');
  await writeFile(path.join(root, 'apps/conformance/dist/index.html'), '<script src="/assets/app.js"></script>');
  await assert.rejects(assembleSite(root), /Build conformance with/);
});

test('rejects a stale or malformed NIP-05 document', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'apps/web/dist/.well-known/nostr.json'), '{"names":{}}');
  await assert.rejects(assembleSite(root), /differs from its public source/);
  for (const bad of ['{"names":{}}', '{"names":{"Napshot":"' + 'a'.repeat(64) + '"}}', '{"names":{"napshot":"npub1abc"}}', 'not json']) {
    await writeFile(path.join(root, 'apps/web/dist/.well-known/nostr.json'), bad);
    await writeFile(path.join(root, 'apps/web/public/.well-known/nostr.json'), bad);
    await assert.rejects(assembleSite(root));
  }
});

test('the published NIP-05 document maps napshot to its key and NIP-65 relay hints', async () => {
  const text = await readFile(new URL('../apps/web/public/.well-known/nostr.json', import.meta.url), 'utf8');
  assertNip05(text);
  const document = JSON.parse(text);
  assert.equal(document.names.napshot, NAPSHOT_PUBKEY);
  assert.deepEqual(document.relays?.[document.names.napshot], NAPSHOT_RELAYS);
});

test('writes Markdown copies, root llms.txt and the Agent Skills index', async (t) => {
  const root = await fixture(t);
  const output = await assembleSite(root);
  assert.equal(await readFile(path.join(output, 'explainer/index.md'), 'utf8'), '# explainer\n\nexplainer\n');
  assert.equal(await readFile(path.join(output, 'protocol/nap-shell/index.md'), 'utf8'), '# shell detail\n\nshell detail\n');
  const llms = await readFile(path.join(output, 'llms.txt'), 'utf8');
  assert.match(llms, /^# napplet\n\n> /);
  assert.match(llms, /- \[showcase\]\(https:\/\/napplet\.run\/index\.md\)/);
  assert.match(llms, /## Docs: Guide\n\n- \[Guide\]\(https:\/\/napplet\.run\/docs\/guide\/index\.md\)/);
  assert.match(llms, /## NAP directory\n\n- \[shell detail\]\(https:\/\/napplet\.run\/protocol\/nap-shell\/index\.md\)/);
  assert.match(await readFile(path.join(output, 'llms-full.txt'), 'utf8'), /# guide/);
  const index = JSON.parse(await readFile(path.join(output, '.well-known/agent-skills/index.json'), 'utf8'));
  assert.deepEqual(index.skills.map((skill) => [skill.name, skill.type, skill.url]), [['napplet-demo', 'skill-md', '/.well-known/agent-skills/napplet-demo/SKILL.md']]);
  assert.equal(await readFile(path.join(output, '.well-known/agent-skills/napplet-demo/SKILL.md'), 'utf8'), SKILL);
});

test('fails when a page lacks its Markdown alternate or copy, or docs agent output is missing', async (t) => {
  let root = await fixture(t);
  await writeFile(path.join(root, 'apps/web/dist/explainer/index.html'), '<title>explainer</title><main>x</main>');
  await assert.rejects(assembleSite(root), /explainer\/index\.html must carry <link rel="alternate"/);
  root = await fixture(t);
  await rm(path.join(root, 'apps/docs/.vitepress/dist/guide/index.md'));
  await assert.rejects(assembleSite(root), /Markdown copy for docs\/guide\/index\.html is missing/);
  for (const missing of ['llms.txt', 'llms-full.txt', 'index.md']) {
    root = await fixture(t);
    await rm(path.join(root, 'apps/docs/.vitepress/dist', missing));
    await assert.rejects(assembleSite(root), { code: 'ENOENT' });
    assert.equal(await readFile(path.join(root, 'site/stale.txt'), 'utf8'), 'stale previous build');
  }
  root = await fixture(t);
  await writeFile(path.join(root, 'apps/docs/.vitepress/dist/llms.txt'), `${DOCS_LLMS}- [Gone](https://napplet.run/docs/gone.md)\n`);
  await assert.rejects(assembleSite(root), /llms\.txt link https:\/\/napplet\.run\/docs\/gone\.md is missing/);
});

test('fails when a served skill no longer matches its digest', async (t) => {
  const output = await assembleSite(await fixture(t));
  await writeFile(path.join(output, '.well-known/agent-skills/napplet-demo/SKILL.md'), `${SKILL}tampered\n`);
  await assert.rejects(assertAgentReadable(output), /napplet-demo digest does not match/);
});
