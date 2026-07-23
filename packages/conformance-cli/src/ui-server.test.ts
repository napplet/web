import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startUiServer, type UiServer } from './ui-server.js';

let server: UiServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

async function makeDirs(): Promise<{ app: string; nap: string }> {
  const app = await mkdtemp(join(tmpdir(), 'napplet-ui-app-'));
  await writeFile(join(app, 'index.html'), '<!doctype html><title>conformance app</title>');
  await mkdir(join(app, 'assets'));
  await writeFile(join(app, 'assets', 'x.js'), 'export const a = 1;');
  const nap = await mkdtemp(join(tmpdir(), 'napplet-ui-nap-'));
  await writeFile(join(nap, 'index.html'), '<!doctype html><title>napplet fixture</title>');
  return { app, nap };
}

describe('startUiServer', () => {
  it('serves the app at /, the napplet under /__napplet__/, with CORS + a live appUrl', async () => {
    const { app, nap } = await makeDirs();
    server = await startUiServer({ appDir: app, nappletDir: nap });

    expect(server.appUrl).toContain('live=1');
    expect(server.appUrl).toContain(encodeURIComponent('/__napplet__/'));

    const appRes = await fetch(`${server.origin}/`);
    expect(appRes.headers.get('access-control-allow-origin')).toBe('*');
    expect(await appRes.text()).toContain('<title>conformance app</title>');

    const napRes = await fetch(`${server.origin}/__napplet__/`);
    expect(await napRes.text()).toContain('<title>napplet fixture</title>');

    const asset = await fetch(`${server.origin}/assets/x.js`);
    expect(asset.headers.get('content-type')).toContain('javascript');
  });

  it('falls back to the app index for unknown app routes (SPA)', async () => {
    const { app, nap } = await makeDirs();
    server = await startUiServer({ appDir: app, nappletDir: nap });
    const res = await fetch(`${server.origin}/some/spa/route`);
    expect(await res.text()).toContain('<title>conformance app</title>');
  });

  it('pushes a rerun SSE event when the napplet changes', async () => {
    const { app, nap } = await makeDirs();
    server = await startUiServer({ appDir: app, nappletDir: nap, debounceMs: 20 });

    const res = await fetch(`${server.origin}/__conformance__/events`, { headers: { accept: 'text/event-stream' } });
    const reader = res.body!.getReader();

    // Subscribe, then change the napplet.
    await new Promise((r) => setTimeout(r, 50));
    await writeFile(join(nap, 'index.html'), '<!doctype html><title>changed fixture</title>');

    const sawRerun = await Promise.race([
      (async () => {
        const decoder = new TextDecoder();
        let buf = '';
        while (!buf.includes('event: rerun')) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value);
        }
        return buf.includes('event: rerun');
      })(),
      new Promise<boolean>((r) => setTimeout(() => r(false), 5000)),
    ]);

    await reader.cancel();
    expect(sawRerun).toBe(true);
  });

  it('notify() broadcasts a rerun to subscribers', async () => {
    const { app, nap } = await makeDirs();
    server = await startUiServer({ appDir: app, nappletDir: nap });
    const res = await fetch(`${server.origin}/__conformance__/events`, { headers: { accept: 'text/event-stream' } });
    const reader = res.body!.getReader();
    await new Promise((r) => setTimeout(r, 30));
    server.notify();
    const decoder = new TextDecoder();
    let buf = '';
    const ok = await Promise.race([
      (async () => {
        while (!buf.includes('event: rerun')) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value);
        }
        return true;
      })(),
      new Promise<boolean>((r) => setTimeout(() => r(false), 3000)),
    ]);
    await reader.cancel();
    expect(ok).toBe(true);
  });
});
