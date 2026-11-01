import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assembleSite, assertNip05 } from './assemble-site.mjs';

const NAPSHOT_PUBKEY = '94b92a261c88f6b14098e6ec15c93bed544380883745f9a030b27d4a5c554f81';
const NAPSHOT_RELAYS = ['wss://relay.napplet.soy/', 'wss://relay.primal.net/'];
const NIP05 = JSON.stringify({ names: { napshot: NAPSHOT_PUBKEY }, relays: { [NAPSHOT_PUBKEY]: NAPSHOT_RELAYS } });

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'napplet-site-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = {
    'apps/web/dist/index.html': 'showcase',
    'apps/web/dist/explainer/index.html': 'explainer',
    'apps/web/dist/protocol/index.html': 'protocol directory',
    'apps/web/dist/protocol/contribute/index.html': 'contribution guide',
    'apps/web/dist/protocol/nap-shell/index.html': 'shell detail',
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
    'apps/docs/.vitepress/dist/index.html': 'docs',
    'apps/docs/.vitepress/dist/guide/index.html': 'guide',
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
    'index.html': 'showcase', 'explainer/index.html': 'explainer',
    'protocol/index.html': 'protocol directory', 'protocol/nap-shell/index.html': 'shell detail',
    'docs/index.html': 'docs', 'docs/guide/index.html': 'guide',
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
