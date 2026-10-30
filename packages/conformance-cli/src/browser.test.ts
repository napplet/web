import { readFile } from 'node:fs/promises';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startHarnessServer, type BootConfig } from './server.js';
import type { BootCollection } from '@napplet/conformance';

describe('real opaque-origin reference runtime', () => {
  let browser: Browser;
  let hostBundle: string;
  let runtimePreludeSource: string;
  beforeAll(async () => {
    hostBundle = await readFile(new URL('../dist/host-bundle.global.js', import.meta.url), 'utf8');
    runtimePreludeSource = await readFile(new URL('../../shim/dist/prelude.global.js', import.meta.url), 'utf8');
    browser = await chromium.launch({ args: ['--no-sandbox'] });
  });
  afterAll(async () => { await browser?.close(); });

  async function boot(html: string, overrides: Partial<BootConfig> = {}): Promise<BootCollection> {
    const server = await startHarnessServer({ nappletDir: null, hostBundle, bootConfig: { url: 'about:blank', html, runtimePreludeSource, readyTimeoutMs: 5000, settleMs: 100, runDegraded: true, ...overrides } });
    const page = await browser.newPage();
    try {
      await page.goto(server.hostUrl);
      await page.waitForFunction(() => window.__conformanceBoot__ !== undefined || window.__conformanceError__ !== undefined);
      expect(await page.evaluate(() => window.__conformanceError__)).toBeUndefined();
      return await page.evaluate(() => window.__conformanceBoot__!);
    } finally {
      await page.close();
      await server.close();
    }
  }

  it('installs callable INC/INTENT/THEME before subject code and routes real messages', async () => {
    const result = await boot(`<!doctype html><script>
      if (window.napplet.inc) {
        if (typeof window.napplet.intent.onDelivery !== 'function' || typeof window.napplet.theme.onChanged !== 'function') throw new Error('Missing bindings');
        window.napplet.inc.on('fixture', () => {});
        window.napplet.theme.get().then(theme => { if (!theme) throw new Error('Missing theme'); });
      }
      if (window.origin !== 'null') throw new Error('Expected opaque origin');
    </script>`);
    expect(result.installedGlobal).toBe(true);
    expect(result.bootError).toBeNull();
    expect(result.degraded?.bootError).toBeNull();
    expect(result.emitted.some((record) => (record.envelope as { type: string }).type === 'inc.subscribe')).toBe(true);
    expect(result.emitted.some((record) => (record.envelope as { type: string }).type === 'theme.get')).toBe(true);
    expect(result.emitted.every((record) => record.verdict.ok)).toBe(true);
    expect(result.emitted.some((record) => (record.envelope as { type: string }).type.startsWith('__nappletConformance'))).toBe(false);
  });

  it('round-trips Blossom binary requests from an opaque iframe and survives domain absence', async () => {
    const result = await boot(`<!doctype html><script>
      if (window.origin !== 'null') throw new Error('Expected opaque origin');
      if (window.napplet.blossom) {
        (async () => {
          const blossom = window.napplet.blossom;
          const sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
          const uri = blossom.formatUri({ sha256, extension: '.bin', servers: [], authors: [] });
          if (blossom.parseUri(uri).sha256 !== sha256) throw new Error('URI helper failed');
          for (const data of [new Blob(['abc']), new Uint8Array([0, 128, 255]).buffer]) {
            const response = await blossom.upload({ server: 'https://cdn.example.com', data });
            if (response.ok || response.error !== 'unsupported') throw new Error('Expected typed failure');
          }
          const response = await blossom.servers();
          if (response.error !== 'server-list-unavailable') throw new Error('Expected unavailable server list');
        })();
      }
    </script>`, { settleMs: 300 });
    expect(result.installedGlobal).toBe(true);
    expect(result.bootError).toBeNull();
    expect(result.degraded?.bootError).toBeNull();
    const types = result.emitted.map(record => (record.envelope as { type: string }).type);
    expect(types.filter(type => type.startsWith('blossom.'))).toEqual([
      'blossom.upload', 'blossom.upload', 'blossom.servers',
    ]);
    expect(result.emitted.every(record => record.verdict.ok)).toBe(true);
    expect(result.degraded?.emitted).toEqual([]);
  });

  it('distinguishes a subject failure from successful namespace installation', async () => {
    const result = await boot('<!doctype html><script>throw new Error("subject failed");</script>');
    expect(result.installedGlobal).toBe(true);
    expect(result.bootError).toContain('subject failed');
    expect(result.degraded?.bootError).toContain('subject failed');
  });

  it('reports installation failure instead of inferring success from iframe load', async () => {
    const result = await boot('<!doctype html><p>Subject</p>', { runtimePreludeSource: 'throw new Error("fixture injection failed");', runDegraded: false });
    expect(result.installedGlobal).toBe(false);
    expect(result.bootError).toContain('fixture injection failed');
  });
});
