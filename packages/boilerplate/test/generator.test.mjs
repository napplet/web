import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { generate, parseArgs, renderSuccess, resolveConfig } from '../dist/index.js';

test('accepts only project-location and scaffold options', () => {
  assert.deepEqual(parseArgs(['my-app', '--template', './template', '--force']), {
    target: 'my-app',
    variant: 'basic',
    template: './template',
    yes: false,
    force: true,
    help: false,
  });

  for (const removed of ['--package-name', '--napplet-type', '--title']) {
    assert.throws(() => parseArgs([removed, 'value']), /Unknown option/);
  }
});

test('derives package name from target without deployment metadata', async () => {
  const options = parseArgs(['My Project', '--template', './template', '--yes']);
  const config = await resolveConfig(options);
  assert.equal(config.packageName, 'my-project');
  assert.equal('title' in config, false);
  assert.equal('nappletType' in config, false);
});

test('only updates package.json when materializing a local template', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'napplet-generator-test-'));
  try {
    const template = path.join(root, 'template');
    const targetDir = path.join(root, 'generated-app');
    await mkdir(template, { recursive: true });
    await writeFile(path.join(template, 'package.json'), '{"name":"my-napplet","private":true}\n');
    await writeFile(path.join(template, 'vite.config.ts'), "nappletType: 'my-napplet'\n");
    await writeFile(path.join(template, 'index.html'), '<title>My Napplet</title>\n');
    await writeFile(path.join(template, 'README.md'), '# my-napplet\n');

    await generate({
      targetDir,
      variant: 'basic',
      template,
      packageName: 'generated-app',
      force: false,
    });

    assert.deepEqual(JSON.parse(await readFile(path.join(targetDir, 'package.json'), 'utf8')), {
      name: 'generated-app',
      private: true,
    });
    assert.equal(await readFile(path.join(targetDir, 'vite.config.ts'), 'utf8'), "nappletType: 'my-napplet'\n");
    assert.equal(await readFile(path.join(targetDir, 'index.html'), 'utf8'), '<title>My Napplet</title>\n');
    assert.equal(await readFile(path.join(targetDir, 'README.md'), 'utf8'), '# my-napplet\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('completion output routes through init, skills, verify, and dry-run deploy', () => {
  const output = renderSuccess({
    targetDir: path.resolve('my-app'),
    variant: 'basic',
    template: 'https://github.com/napplet/boilerplate.git',
    packageName: 'my-app',
    force: false,
  });
  assert.match(output, /napplet init/);
  assert.match(output, /napplet skills install --to codex/);
  assert.match(output, /pnpm verify/);
  assert.match(output, /napplet deploy --dry-run/);
});
