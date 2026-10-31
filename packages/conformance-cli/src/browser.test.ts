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

  it('round-trips the SOULSEEK binding in a real opaque iframe', async () => {
    const result = await boot(`<!doctype html><script>
      (async () => {
        const soulseek = window.napplet.soulseek;
        if (!soulseek) return;
        for (const method of ['onState', 'onProgress', 'login', 'chat']) {
          if (method in soulseek) throw new Error('Undefined operation exposed: ' + method);
        }
        const info = await soulseek.info();
        if (info.state !== 'online' || typeof info.maxPageSize !== 'number') throw new Error('Missing info');
        const query = await soulseek.search({ text: 'rain' });
        if (query.state !== 'collecting') throw new Error('Search was not admitted');
        const page = await soulseek.results(query.queryId, 0, 10);
        if (page.query.count !== 1 || page.files[0].size !== '3') throw new Error('Unexpected page');
        const transfer = await soulseek.download(page.files[0].fileId);
        await soulseek.pause(transfer.transferId);
        await soulseek.resume(transfer.transferId);
        const complete = await soulseek.status(transfer.transferId);
        if (complete.state !== 'complete' || complete.received !== '3') throw new Error('Transfer did not complete');
        const chunk = await soulseek.read(transfer.transferId, '0', 3);
        if (chunk.data !== 'YWJj' || !chunk.eof) throw new Error('Unexpected chunk');
        await soulseek.transfers();
        await soulseek.save(transfer.transferId).then(() => { throw new Error('save should be unsupported'); }, (error) => {
          if (error.code !== 'unsupported') throw error;
        });
        await soulseek.cancel(transfer.transferId);
        await soulseek.stop(query.queryId);
        await soulseek.browse('reference-peer');
        await soulseek.release('transfer', transfer.transferId);
        await soulseek.release('query', query.queryId);
      })().catch(error => { setTimeout(() => { throw error; }); });
    </script>`, { settleMs: 500 });
    expect(result.installedGlobal).toBe(true);
    expect(result.bootError).toBeNull();
    expect(result.degraded?.bootError).toBeNull();
    const operations = result.emitted.map((record) => (record.envelope as { type: string }).type);
    for (const action of ['info', 'search', 'results', 'download', 'pause', 'resume', 'status', 'read', 'transfers',
      'save', 'cancel', 'stop', 'browse', 'release']) {
      expect(operations).toContain('soulseek.' + action);
    }
    expect(result.emitted.every((record) => record.verdict.ok)).toBe(true);
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
