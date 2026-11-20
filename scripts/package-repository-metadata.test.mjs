import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const packagesDir = new URL('../packages/', import.meta.url);
const REPOSITORY_URL = 'git+https://github.com/napplet/web.git';

test('every workspace package points npm at the public repository and its own directory', () => {
  const names = readdirSync(packagesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  assert.ok(names.length > 0);
  for (const name of names) {
    const manifest = JSON.parse(readFileSync(new URL(`${name}/package.json`, packagesDir), 'utf8'));
    assert.deepEqual(
      manifest.repository,
      { type: 'git', url: REPOSITORY_URL, directory: `packages/${name}` },
      `${manifest.name} repository metadata`,
    );
  }
});
