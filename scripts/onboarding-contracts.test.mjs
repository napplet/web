import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const funnels = [
  'README.md',
  'apps/docs/guide/getting-started.md',
  'packages/cli/README.md',
  'apps/docs/packages/cli.md',
];

test('primary onboarding docs use the same ordered CLI workflow', async () => {
  const commands = [
    'napplet create',
    'napplet init',
    'napplet skills install',
    'pnpm verify',
    'napplet deploy --dry-run',
    'napplet deploy',
  ];
  for (const file of funnels) {
    const source = await readFile(path.join(root, file), 'utf8');
    let offset = -1;
    for (const command of commands) {
      const next = source.indexOf(command, offset + 1);
      assert.notEqual(next, -1, `${file} is missing ${command}`);
      assert.ok(next > offset, `${file} places ${command} out of order`);
      offset = next;
    }
  }
});

test('live guidance has no retired metadata flags or primary package bypass', async () => {
  const roots = ['README.md', 'apps/docs', 'packages/skills', 'packages/boilerplate/README.md', 'packages/cli/README.md'];
  const files = [];
  for (const entry of roots) {
    const absolute = path.join(root, entry);
    if (entry.endsWith('.md')) {
      files.push(absolute);
      continue;
    }
    for (const child of await readdir(absolute, { recursive: true })) {
      if (child.endsWith('.md')) files.push(path.join(absolute, child));
    }
  }

  for (const file of files) {
    const relative = path.relative(root, file);
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /--package-name|--napplet-type/, relative);
    if (relative !== 'apps/docs/packages/boilerplate.md') {
      assert.doesNotMatch(source, /npx @napplet\/boilerplate/, relative);
    }
    assert.doesNotMatch(source, /npx @napplet\/skills/, relative);
  }
});

test('shipped build skills preserve CLI metadata ownership', async () => {
  for (const file of [
    'packages/skills/skills/build-napplet/SKILL.md',
    'packages/skills/skills/make-napplet/SKILL.md',
  ]) {
    const source = await readFile(path.join(root, file), 'utf8');
    assert.match(source, /napplet create/);
    assert.match(source, /napplet init/);
    assert.match(source, /\.napplet\/config\.json|CLI-owned deployment metadata/);
  }
});

test('onboarding surfaces use the hosted installers', async () => {
  for (const file of [
    'README.md',
    'apps/docs/guide/getting-started.md',
    'packages/cli/README.md',
    'apps/docs/packages/cli.md',
    'packages/cli/src/mod.ts',
    'apps/web/src/sections/GetStarted.svelte',
  ]) {
    const source = await readFile(path.join(root, file), 'utf8');
    assert.match(source, /https:\/\/napplet\.run\/install\.sh/, file);
    assert.doesNotMatch(source, /raw\.githubusercontent\.com.*install-napplet-cli/, file);
  }

  for (const file of [
    'README.md',
    'apps/docs/guide/getting-started.md',
    'packages/cli/README.md',
    'apps/docs/packages/cli.md',
  ]) {
    const source = await readFile(path.join(root, file), 'utf8');
    assert.match(source, /https:\/\/napplet\.run\/install\.ps1/, file);
  }
});

test('SPA keeps the alpha gate and presents one installer command', async () => {
  const source = await readFile(path.join(root, 'apps/web/src/sections/GetStarted.svelte'), 'utf8');
  for (const text of [
    'Install napplet in one command',
    'curl -fsSL https://napplet.run/install.sh | sh',
    'napplet guide',
    'acceptedAlpha',
    'alpha-gate',
    'class:locked',
    'Before you install',
  ]) {
    assert.match(source, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.equal(source.match(/const cmd =/g)?.length, 1);
  assert.doesNotMatch(source, /command-row|napplet create my-napplet|npx @napplet\/boilerplate/);
});
