import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startScreenshotPreview } from './screenshot-preview.js';

it('previews the selected artifact, contains asset access, and closes both servers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'napplet-preview-test-'));
  let preview: Awaited<ReturnType<typeof startScreenshotPreview>> | undefined;
  try {
    const build = join(root, 'dist');
    await mkdir(build);
    await writeFile(join(build, 'index.html'), '<title>Selected build</title>');
    await writeFile(join(build, 'asset.txt'), 'local asset');
    await writeFile(join(root, 'secret.txt'), 'outside build');
    await symlink(join(root, 'secret.txt'), join(build, 'escape.txt'));
    preview = await startScreenshotPreview(join(build, 'index.html'));
    const shell = await fetch(preview.url);
    expect(await shell.text()).toContain('napplet-frame');
    const config = await (await fetch(new URL('/__kehto/config.json', preview.url))).json();
    const target = config.target.url;
    expect(target).toMatch(/^http:\/\/127\.0\.0\.1:/);
    expect(await (await fetch(target)).text()).toBe('<title>Selected build</title>');
    expect(await (await fetch(new URL('/asset.txt', target))).text()).toBe('local asset');
    expect((await fetch(new URL('/escape.txt', target))).status).toBe(403);
    expect((await fetch(new URL('/missing', target))).status).toBe(404);
    await preview.close();
    await expect(fetch(preview.url)).rejects.toThrow();
    await expect(fetch(target)).rejects.toThrow();
    preview = undefined;
  } finally {
    await preview?.close();
    await rm(root, { recursive: true, force: true });
  }
});
