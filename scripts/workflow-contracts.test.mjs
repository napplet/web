import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/publish-jsr.yml', import.meta.url), 'utf8');

test('CLI release compiles every supported standalone target', () => {
  for (const target of [
    'linux-x86_64',
    'linux-aarch64',
    'darwin-x86_64',
    'darwin-aarch64',
    'windows-x86_64',
  ]) {
    assert.match(workflow, new RegExp(`compile:${target}`));
    assert.match(workflow, new RegExp(`napplet-${target.replace('windows-x86_64', 'windows-x86_64\\.exe')}`));
  }
});

test('CLI release produces checksums and limits write permission to release job', () => {
  assert.match(workflow, /sha256sum napplet-/);
  assert.match(workflow, /SHA256SUMS/);
  assert.match(workflow, /release-cli-binaries:[\s\S]*?permissions:\s*\n\s*contents: write/);
  assert.match(workflow, /build-cli-binaries:[\s\S]*?permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(workflow, /^permissions:\s*\n\s*contents: write/m);
});

test('versioned and stable CLI releases receive the same verified assets', () => {
  assert.match(workflow, /@napplet\/cli@\$\{version\}/);
  assert.match(workflow, /gh release (?:view|create) napplet-cli/);
  assert.match(workflow, /gh release upload napplet-cli/);
});
