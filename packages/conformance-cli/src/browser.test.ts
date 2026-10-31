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

  it('enforces maturity before classic and module scripts and blocks direct-message bypass', async () => {
    const result = await boot(`<!doctype html><html><head><script>
      if (Object.keys(window.napplet).join(',') !== 'storage') throw new Error('Unexpected exposed domains');
      window.addEventListener('message', event => {
        if (event.data?.type === 'llm.select.result') throw new Error('Excluded domain answered direct message');
      });
      window.parent.postMessage({ type: 'llm.select', id: 'bypass' }, '*');
      window.napplet.storage.getItem('theme').then(value => {
        if (value !== null) throw new Error('Allowed storage failed');
      });
    </script><script type="module">
      if (window.napplet.llm || typeof window.napplet.storage?.getItem !== 'function') throw new Error('Module exposure mismatch');
    </script></head></html>`, {
      domains: ['storage', 'llm'], maturity: {}, runDegraded: false, settleMs: 300,
    });
    expect(result.bootError).toBeNull();
    expect(result.installedGlobal).toBe(true);
    expect(result.emitted.map(record => (record.envelope as { type: string }).type)).toContain('llm.select');
    expect(result.emitted.every(record => record.verdict.ok)).toBe(true);
  });

  it('admits one named exploratory domain before code runs', async () => {
    const result = await boot(`<!doctype html><script>
      if (Object.keys(window.napplet).join(',') !== 'llm') throw new Error('Unexpected domain selection');
      window.napplet.llm.select().then(model => {
        if (model.model !== 'reference-model') throw new Error('Opted-in host unavailable');
        return window.napplet.llm.describe(model.handle);
      });
    </script>`, { domains: ['llm', 'ble'], maturity: { optIn: ['llm'] }, runDegraded: false, settleMs: 300 });
    expect(result.bootError).toBeNull();
    expect(result.emitted.some(record => (record.envelope as { type: string }).type === 'llm.describe')).toBe(true);
  });

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

  it('round-trips the LLM binding in a real opaque iframe', async () => {
    const result = await boot(`<!doctype html><script>
      (async () => {
        const llm = window.napplet.llm;
        if (!llm) return;
        for (const method of ['configure', 'callTool', 'onDelta']) {
          if (method in llm) throw new Error('Undefined operation exposed: ' + method);
        }
        const model = await llm.select({ json: true });
        if (model.model !== 'reference-model' || !model.json) throw new Error('Unexpected selection');
        const described = await llm.describe(model.handle);
        if (described.handle !== model.handle) throw new Error('Describe changed the handle');
        const deltas = [];
        const pending = llm.generate({ handle: model.handle, format: 'json', messages: [{ role: 'user', content: [{ type: 'text', text: 'Return a greeting.' }] }] }, { onDelta: (delta) => deltas.push(delta.text) });
        if (typeof pending.requestId !== 'string') throw new Error('Missing request id');
        const generation = await pending;
        if (generation.finish !== 'stop' || JSON.parse(generation.text).echo !== 'Return a greeting.') throw new Error('Unexpected generation');
        if (deltas.length !== 1 || !generation.text.startsWith(deltas[0])) throw new Error('Unexpected deltas');
        if (await llm.cancel(pending.requestId) !== false) throw new Error('Terminal generation should not cancel');
        const controller = new AbortController();
        const stalled = llm.generate({ handle: model.handle, messages: [{ role: 'user', content: [{ type: 'text', text: 'wait [[stall]]' }] }] }, { signal: controller.signal });
        controller.abort();
        await stalled.then(() => { throw new Error('stalled generation should be cancelled'); }, (error) => {
          if (error.code !== 'cancelled') throw error;
        });
        await llm.describe('unknown').then(() => { throw new Error('unknown handle should expire'); }, (error) => {
          if (error.code !== 'selection-expired') throw error;
        });
      })().catch(error => { setTimeout(() => { throw error; }); });
    </script>`, { settleMs: 500 });
    expect(result.installedGlobal).toBe(true);
    expect(result.bootError).toBeNull();
    expect(result.degraded?.bootError).toBeNull();
    const operations = result.emitted.map((record) => (record.envelope as { type: string }).type);
    for (const action of ['select', 'describe', 'generate', 'cancel']) {
      expect(operations).toContain('llm.' + action);
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
