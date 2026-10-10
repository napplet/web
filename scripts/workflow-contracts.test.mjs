import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/publish-jsr.yml', import.meta.url), 'utf8');

test('JSR publication runs on every main push and supports manual recovery', () => {
  const triggers = workflow.split('\non:\n')[1]?.split('\nconcurrency:')[0];
  assert.ok(triggers, 'workflow must declare its triggers');
  assert.match(triggers, /push:\s*\n\s*branches: \[main\]/);
  assert.match(triggers, /workflow_dispatch:/);
  assert.doesNotMatch(triggers, /paths(?:-ignore)?:/);
  const publishJob = workflow.split('\n  publish-jsr:\n')[1]?.split('\n  build-cli-binaries:')[0];
  assert.ok(publishJob, 'JSR publication job must exist');
  assert.doesNotMatch(publishJob, /^\s*if:/m, 'package versions, not workflow conditions, determine publication');
  assert.doesNotMatch(workflow, /head_commit|Version Packages/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(publishJob, /--workspace-concurrency=1/);
});

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

test('JSR publish includes workspace packages and excludes npm-only tools and retired skills', () => {
  assert.match(workflow, /Publish to JSR \(topologically ordered\)[\s\S]*?--filter='\.\/packages\/\*'/);
  assert.match(workflow, /--filter='!@napplet\/boilerplate'/);
  assert.match(workflow, /--filter='!@napplet\/conformance-cli'/);
  assert.doesNotMatch(workflow, /packages\/skills|@napplet\/skills/);
});
