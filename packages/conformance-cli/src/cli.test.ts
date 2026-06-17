import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveNappletDir } from './resolve-napplet.js';

async function projectDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'napplet-cli-'));
}

describe('resolveNappletDir', () => {
  it('prefers dist/index.html over a sibling source index.html (--ui on a Vite project root)', async () => {
    // A Vite project root has BOTH a source index.html (the entry, referencing
    // /src/*.ts that cannot run in the srcdoc sandbox) and the built
    // dist/index.html. Conformance must test the built artifact. Regression for
    // the live-UI false NON-CONFORMANT (napplet/web#53 follow-up).
    const root = await projectDir();
    await writeFile(join(root, 'index.html'), '<!doctype html><script type="module" src="/src/main.ts"></script>');
    await mkdir(join(root, 'dist'), { recursive: true });
    await writeFile(join(root, 'dist', 'index.html'), '<!doctype html><meta name="napplet-type" content="x"><script type="module">/*built*/</script>');

    const resolved = await resolveNappletDir(root);
    expect(resolved.dir).toBe(join(root, 'dist'));
    expect(resolved.indexHtml).toBe(join(root, 'dist', 'index.html'));
  });

  it('resolves a plain built directory that has only index.html', async () => {
    const built = await projectDir();
    await writeFile(join(built, 'index.html'), '<!doctype html><script type="module">/*built*/</script>');

    const resolved = await resolveNappletDir(built);
    expect(resolved.dir).toBe(built);
    expect(resolved.indexHtml).toBe(join(built, 'index.html'));
  });

  it('throws when no index.html exists in the dir or its dist/', async () => {
    const empty = await projectDir();
    await expect(resolveNappletDir(empty)).rejects.toThrow('Build the napplet first');
  });
});
