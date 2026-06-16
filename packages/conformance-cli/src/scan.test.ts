import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanForbiddenGlobals } from './scan.js';

async function fixtureDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'napplet-scan-'));
}

describe('scanForbiddenGlobals', () => {
  it('detects window.nostr / globalThis.nostr in served sources', async () => {
    const dir = await fixtureDir();
    await writeFile(join(dir, 'app.js'), 'async function f(){ return await window.nostr.getPublicKey(); }');
    await writeFile(join(dir, 'other.mjs'), 'const k = globalThis.nostr;');
    const found = await scanForbiddenGlobals(dir);
    expect(found).toContain('window.nostr');
    expect(found).toContain('globalThis.nostr');
  });

  it('returns empty for clean napplet sources', async () => {
    const dir = await fixtureDir();
    await writeFile(join(dir, 'index.html'), '<!doctype html><script type="module" src="./main.js"></script>');
    await writeFile(join(dir, 'main.js'), 'window.parent.postMessage({ type: "shell.ready" }, "*");');
    expect(await scanForbiddenGlobals(dir)).toEqual([]);
  });

  it('ignores node_modules and non-source files', async () => {
    const dir = await fixtureDir();
    await mkdir(join(dir, 'node_modules'));
    await writeFile(join(dir, 'node_modules', 'dep.js'), 'window.nostr.signEvent()');
    await writeFile(join(dir, 'notes.txt'), 'window.nostr is forbidden'); // .txt not scanned
    expect(await scanForbiddenGlobals(dir)).toEqual([]);
  });

  it('returns empty for a non-existent directory', async () => {
    expect(await scanForbiddenGlobals(join(tmpdir(), 'does-not-exist-napplet-xyz'))).toEqual([]);
  });
});
