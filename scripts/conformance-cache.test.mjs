import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const turbo = createRequire(import.meta.url).resolve('turbo/bin/turbo');

test('NAP-only source edits invalidate the conformance unit-test cache', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'napplet-conformance-cache-'));
  try {
    for (const path of [
      'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'turbo.json', '.gitignore',
      'packages/core', 'packages/nap', 'packages/conformance',
    ]) {
      await cp(join(root, path), join(fixture, path), {
        recursive: true,
        filter: (source) => !['node_modules', 'dist', '.turbo', 'coverage'].includes(basename(source)),
      });
    }
    execFileSync('git', ['init', '--quiet'], { cwd: fixture });
    execFileSync('git', ['add', '.'], { cwd: fixture });

    const taskHash = () => {
      const output = execFileSync(process.execPath, [
        turbo, 'run', 'test:unit', '--filter=@napplet/conformance', '--dry=json', '--no-daemon',
      ], {
        cwd: fixture,
        encoding: 'utf8',
        env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const task = JSON.parse(output).tasks.find((entry) => entry.taskId === '@napplet/conformance#test:unit');
      assert.ok(task, 'Turbo must schedule conformance unit tests');
      return task.hash;
    };

    const source = join(fixture, 'packages/nap/src/storage/types.ts');
    const original = await readFile(source, 'utf8');
    const before = taskHash();
    await writeFile(source, `${original}\n// Cache invalidation probe.\n`);
    assert.notEqual(taskHash(), before, 'NAP source changes must invalidate conformance tests');
    await writeFile(source, original);
    assert.equal(taskHash(), before, 'Restoring the source must restore the task hash');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
