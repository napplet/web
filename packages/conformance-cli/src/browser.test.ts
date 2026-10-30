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

  it('round-trips the transfer-only TORRENT binding in a real opaque iframe', async () => {
    const result = await boot(`<!doctype html><script>
      (async () => {
        const torrent = window.napplet.torrent;
        if (!torrent) return;
        for (const method of ['search', 'fromEvent', 'toMagnet', 'publish', 'comment']) {
          if (method in torrent) throw new Error('Retired operation exposed: ' + method);
        }
        const capabilities = await torrent.capabilities();
        if (!Array.isArray(capabilities.formats) || !Array.isArray(capabilities.retentions)) throw new Error('Missing capabilities');
        await torrent.pickFiles();
        const ack = await torrent.add({ jobId: 'browser-job', source: {
          sourceType: 'infohash', hashes: { v1: '0eb2d544ef0c9ae3c0fbba90a71cd742a44aa81d' }
        } });
        if (!ack.ok) throw new Error('Reference job rejected');
        const status = await torrent.status(ack.jobId);
        await torrent.jobs();
        await torrent.files(ack.jobId);
        await torrent.selectFiles(ack.jobId, {});
        await torrent.pause(ack.jobId);
        await torrent.resume(ack.jobId);
        await torrent.metadata(ack.jobId);
        const pendingRead = torrent.read({ jobId: ack.jobId, fileIndex: 0, offset: 0, length: 4 });
        if (typeof pendingRead.requestId !== 'string') throw new Error('Missing local cancellation handle');
        await torrent.cancel(pendingRead.requestId);
        await pendingRead;
        await torrent.exportMetainfo(ack.jobId);
        await torrent.saveFile(ack.jobId, 0);
        await torrent.openFile(ack.jobId, 0);
        const updated = await torrent.update({ jobId: ack.jobId, expectedRevision: status.settings.revision,
          patch: { uploadLimitBytesPerSecond: 1024 } });
        if (!updated.ok || updated.settings.uploadLimitBytesPerSecond !== 1024) throw new Error('Settings update failed');
        await torrent.remove(ack.jobId);
      })().catch(error => { setTimeout(() => { throw error; }); });
    </script>`, { settleMs: 500 });
    expect(result.installedGlobal).toBe(true);
    expect(result.bootError).toBeNull();
    expect(result.degraded?.bootError).toBeNull();
    const operations = result.emitted.map((record) => (record.envelope as { type: string }).type);
    for (const action of ['capabilities', 'pickFiles', 'add', 'status', 'jobs', 'files', 'selectFiles', 'pause', 'resume',
      'metadata', 'read', 'cancel', 'exportMetainfo', 'saveFile', 'openFile', 'update', 'remove']) {
      expect(operations).toContain('torrent.' + action);
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
