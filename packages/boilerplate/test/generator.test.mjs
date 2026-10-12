import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { zipSync } from 'fflate';

import { generate, parseArgs, renderSuccess, resolveConfig, runCli, templateArchiveUrl } from '../dist/index.js';

test('runCli returns the maintained binary exit statuses without terminating its importer', async () => {
  assert.equal(await runCli(['--help']), 0);

  const errors = [];
  const originalError = console.error;
  console.error = (value) => errors.push(String(value));
  try {
    assert.equal(await runCli(['--variant', 'unsupported', '--yes']), 1);
  } finally {
    console.error = originalError;
  }

  assert.match(errors.join('\n'), /^@napplet\/boilerplate: Unsupported variant/);
});

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
  assert.match(output, /npx skills add napplet\/napplet/);
  assert.match(output, /pnpm verify/);
  assert.match(output, /napplet deploy --dry-run/);
});

test('hosted template creation downloads archives without Git and rejects traversal', async () => {
  assert.equal(templateArchiveUrl('https://github.com/napplet/boilerplate.git'), 'https://api.github.com/repos/napplet/boilerplate/zipball');
  assert.equal(templateArchiveUrl('https://github.com/napplet/boilerplate/tree/test/ref'), 'https://api.github.com/repos/napplet/boilerplate/zipball/test/ref');
  const root = await mkdtemp(path.join(os.tmpdir(), 'napplet-archive-test-'));
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(zipSync({ 'template/package.json': new TextEncoder().encode('{"name":"template"}') }));
    await generate({ targetDir: path.join(root, 'created'), template: 'https://example.org/template.zip', packageName: 'created', variant: 'basic', force: false });
    assert.equal(JSON.parse(await readFile(path.join(root, 'created', 'package.json'), 'utf8')).name, 'created');
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(url);
      return urls.length === 1 ? new Response(null, { status: 403 }) : new Response(zipSync({ 'template/package.json': new TextEncoder().encode('{"name":"template"}') }));
    };
    await generate({ targetDir: path.join(root, 'fallback'), template: 'https://github.com/napplet/boilerplate/tree/test/ref', packageName: 'fallback', variant: 'basic', force: false });
    assert.deepEqual(urls, ['https://api.github.com/repos/napplet/boilerplate/zipball/test/ref', 'https://codeload.github.com/napplet/boilerplate/zip/test/ref']);
    globalThis.fetch = async () => new Response(zipSync({ '../escaped.txt': new TextEncoder().encode('escape') }));
    await assert.rejects(generate({ targetDir: path.join(root, 'invalid'), template: 'https://example.org/template.zip', packageName: 'invalid', variant: 'basic', force: false }), /Unsafe template archive/);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});
