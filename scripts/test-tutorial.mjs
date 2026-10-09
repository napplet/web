#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

import { caretRangeIncludesVersion } from './tutorial-package-versions.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tutorialPath = join(root, 'apps/docs/guide/build-note-drafts-napplet.md');
const tempRoot = await mkdtemp(join(tmpdir(), 'napplet-tutorial-'));

const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'index.html',
  'src/main.ts',
  'src/styles.css',
  '.napplet/config.json',
  'kehto.dev.json',
];

function run(command, args, cwd = tempRoot) {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: '1',
    },
  });
}

function extractTutorialFiles(markdown) {
  const files = new Map();
  const chunks = new Map();
  const pattern = /<!-- tutorial-(file|chunk): ([^>]+) -->\s*```[^\n]*\n([\s\S]*?)\n```/g;
  for (const match of markdown.matchAll(pattern)) {
    const kind = match[1];
    const file = match[2].trim();
    const body = `${match[3]}\n`;

    if (kind === 'file') {
      files.set(file, body);
      continue;
    }

    const parts = chunks.get(file) ?? [];
    parts.push(body);
    chunks.set(file, parts);
  }

  for (const [file, parts] of chunks) {
    files.set(file, parts.join('\n'));
  }

  return files;
}

async function writeTutorialProject(files) {
  for (const file of requiredFiles) {
    const body = files.get(file);
    if (body === undefined) {
      throw new Error(`Missing tutorial source block for ${file}`);
    }
    const target = join(tempRoot, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  }
}

async function linkDependency(name, target) {
  const linkPath = join(tempRoot, 'node_modules', ...name.split('/'));
  await mkdir(dirname(linkPath), { recursive: true });
  await symlink(target, linkPath, 'dir');
}

async function linkLocalNodeModules() {
  await linkDependency('@napplet/sdk', join(root, 'packages/sdk'));
  await linkDependency('@napplet/vite-plugin', join(root, 'packages/vite-plugin'));
  await linkDependency('@napplet/core', join(root, 'packages/core'));
  await linkDependency('@napplet/nap', join(root, 'packages/nap'));
  await linkDependency('vite', join(root, 'node_modules/vite'));
  await linkDependency('typescript', join(root, 'node_modules/typescript'));
}

async function assertPackageVersions(packageJson) {
  const workspacePackages = {
    '@napplet/sdk': 'packages/sdk/package.json',
    '@napplet/vite-plugin': 'packages/vite-plugin/package.json',
    '@napplet/conformance-cli': 'packages/conformance-cli/package.json',
  };

  for (const [name, packagePath] of Object.entries(workspacePackages)) {
    const workspacePackage = JSON.parse(await readFile(join(root, packagePath), 'utf8'));
    const declared =
      packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name] ?? '';
    if (!caretRangeIncludesVersion(declared, workspacePackage.version)) {
      throw new Error(
        `Tutorial ${name} range is ${declared || '(missing)'}; ` +
          `expected it to include workspace version ${workspacePackage.version}`,
      );
    }
  }
}

function assertMainSource(mainSource) {
  const forbiddenPatterns = [
    [/\bshell\.supports\b/, 'shell.supports is not part of the documented protocol surface'],
    [/\bwindow\.nostr\b/, 'window.nostr bypasses the napplet runtime'],
    [/\blocalStorage\b/, 'localStorage bypasses shell-scoped storage'],
    [/\bfetch\s*\(/, 'fetch is outside this tutorial app boundary'],
    [/\bWebSocket\b/, 'direct relay sockets bypass shell outbox policy'],
  ];

  for (const [pattern, message] of forbiddenPatterns) {
    if (pattern.test(mainSource)) {
      throw new Error(`Tutorial source contains forbidden surface: ${message}`);
    }
  }
}

async function assertOutput() {
  const dist = join(tempRoot, 'dist');
  const htmlPath = join(dist, 'index.html');
  const html = await readFile(htmlPath, 'utf8');
  const files = await readdir(dist);

  // Tutorial regression assertions, not runtime requirements. Publishing mappings:
  // https://github.com/nostr-protocol/nips/pull/2303 (HTML Metadata for Publishing).
  const manifest = JSON.parse(await readFile(join(dist, '.nip5a-manifest.json'), 'utf8'));
  const window = new Window();
  try {
    const document = new window.DOMParser().parseFromString(html, 'text/html');
    const head = document.head;
    const metadata = (name) => [...head.querySelectorAll(`meta[name="${name}"]`)]
      .map((element) => element.getAttribute('content'));
    assert.equal(manifest.kind, 35129);
    assert.deepEqual(metadata('napplet-id'), ['notedrafts']);
    assert.deepEqual(manifest.tags.filter(([name]) => name === 'd'), [['d', 'notedrafts']]);
    assert.deepEqual([...head.querySelectorAll('title')].map((element) => element.textContent),
      manifest.tags.filter(([name]) => name === 'title').map(([, value]) => value));
    assert.deepEqual(metadata('description'), [manifest.content]);
    assert.deepEqual(metadata('napplet-requires').flatMap((value) => value.split(/[\t\n\f\r ]+/).filter(Boolean)).sort(),
      manifest.tags.filter(([name]) => name === 'R').map(([, value]) => value).sort());
    assert.deepEqual(manifest.tags.filter(([name]) => name === 'x'),
      [['x', createHash('sha256').update(html).digest('hex')]]);
  } finally {
    await window.happyDOM.close();
  }
  if (/<script[^>]+src=/.test(html) || /<link[^>]+rel="stylesheet"/.test(html)) {
    throw new Error('Built HTML still references local external JS/CSS assets');
  }
  if (!files.includes('index.html')) {
    throw new Error('Build did not produce dist/index.html');
  }
}

try {
  const markdown = await readFile(tutorialPath, 'utf8');
  const files = extractTutorialFiles(markdown);
  await writeTutorialProject(files);
  assertMainSource(files.get('src/main.ts'));
  await linkLocalNodeModules();

  const packageJson = JSON.parse(files.get('package.json'));
  await assertPackageVersions(packageJson);

  const tsc = join(root, 'node_modules/typescript/bin/tsc');
  const vite = join(root, 'node_modules/vite/bin/vite.js');
  const conformance = join(root, 'packages/conformance-cli/dist/cli.js');

  for (const required of [tsc, vite, conformance]) {
    if (!existsSync(required)) {
      throw new Error(`Required test executable missing: ${required}. Run pnpm build first.`);
    }
  }

  run(process.execPath, [tsc, '--project', 'tsconfig.json', '--noEmit']);
  run(process.execPath, [vite, 'build']);
  await assertOutput();
  run(process.execPath, [conformance, './dist']);
} finally {
  if (process.env.NAPPLET_TUTORIAL_KEEP_TEMP === '1') {
    console.error(`Preserved tutorial test project at ${tempRoot}`);
  } else {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
