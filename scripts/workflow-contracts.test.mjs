import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/publish-jsr.yml', import.meta.url), 'utf8');
const standaloneWorkflow = await readFile(new URL('../.github/workflows/standalone-cli.yml', import.meta.url), 'utf8');
const cliConfig = JSON.parse(await readFile(new URL('../packages/cli/deno.json', import.meta.url), 'utf8'));

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
    assert.match(standaloneWorkflow, new RegExp(`target: ${target}`));
    const command = cliConfig.tasks[`compile:${target}`];
    assert.match(command, /--engine quickjs(?: |$)/);
    assert.match(command, /--exclude-unused-npm(?: |$)/);
    assert.doesNotMatch(command, /--(?:bundle|minify)(?: |$)/);
    assert.match(command, /src\/standalone\.ts$/);
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


test('release and native smoke jobs use the tested QuickJS compiler and shared tasks', () => {
  const buildJob = workflow.split('\n  build-cli-binaries:\n')[1]?.split('\n  release-cli-binaries:')[0];
  assert.ok(buildJob);
  for (const job of [buildJob, standaloneWorkflow]) {
    assert.match(job, /uses: denoland\/setup-deno@v2\s+with:\s+deno-version: v2\.9\.5/);
  }
  assert.match(buildJob, /deno task --config packages\/cli\/deno\.json \$\{\{ matrix\.task \}\}/);
  assert.match(standaloneWorkflow, /deno task --cwd packages\/cli compile:\$\{\{ matrix\.target \}\}/);
  assert.match(standaloneWorkflow, /NAPPLET_TEST_BINARY: packages\/cli\/dist\/\$\{\{ matrix\.asset \}\}/);
  assert.match(standaloneWorkflow, /standalone_integration_test\.ts/);
  assert.match(standaloneWorkflow, /'\.github\/workflows\/publish-jsr\.yml'/);
});

test('a failed binary matrix blocks release uploads independently of JSR publication', () => {
  const releaseJob = workflow.split('\n  release-cli-binaries:\n')[1];
  assert.ok(releaseJob);
  assert.match(releaseJob, /if: always\(\) && needs\.build-cli-binaries\.result == 'success' &&/);
  assert.match(releaseJob, /needs: \[publish-jsr, build-cli-binaries\]/);
  assert.doesNotMatch(releaseJob, /needs\.publish-jsr\.result == 'success'/);
});


test('site validation and deployment use the release compiler version', async () => {
  const pinnedVersion = standaloneWorkflow.match(/deno-version: (\S+)/)?.[1];
  assert.ok(pinnedVersion);
  for (const name of ['ci', 'conformance', 'link-check', 'deploy-site']) {
    const content = await readFile(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8');
    const configuredVersion = content.match(/uses: denoland\/setup-deno@v2\s+with:\s+deno-version: (\S+)/)?.[1];
    assert.equal(configuredVersion, pinnedVersion, `${name} must use the release compiler`);
  }
});
