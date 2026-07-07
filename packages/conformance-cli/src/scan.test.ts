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

  it('detects direct browser network and persistence surfaces', async () => {
    const dir = await fixtureDir();
    await writeFile(
      join(dir, 'app.js'),
      [
        'await fetch("https://example.com/rom.gb");',
        'new XMLHttpRequest();',
        'new WebSocket("wss://relay.example.com");',
        'localStorage.setItem("k", "v");',
        'sessionStorage.getItem("k");',
        'indexedDB.open("napplet");',
        'document.cookie = "x=y";',
      ].join('\n'),
    );
    await writeFile(
      join(dir, 'index.html'),
      [
        '<img src="https://example.com/avatar.png">',
        '<script src="https://example.com/app.js"></script>',
        '<link rel="stylesheet" href="https://example.com/app.css">',
      ].join('\n'),
    );

    const found = await scanForbiddenGlobals(dir);
    expect(found).toEqual(expect.arrayContaining([
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'document.cookie',
      'external img src',
      'external script src',
      'external stylesheet href',
    ]));
  });

  it('returns empty for clean napplet sources', async () => {
    const dir = await fixtureDir();
    await writeFile(join(dir, 'index.html'), '<!doctype html><script type="module" src="./main.js"></script>');
    await writeFile(join(dir, 'main.js'), 'if (window.napplet?.relay) window.parent.postMessage({ type: "relay.query", id: "q", filters: [] }, "*");');
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
