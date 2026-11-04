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

  it('enforces maturity before classic and module scripts over the napplet.hello port', async () => {
    const result = await boot(`<!doctype html><html><head><script>
      if (Object.keys(window.napplet).join(',') !== 'storage') throw new Error('Unexpected exposed domains');
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
    expect(result.transportViolations).toEqual([]);
    expect(result.emitted.map(record => (record.envelope as { type: string }).type)).toEqual(['storage.get']);
    expect(result.emitted.every(record => record.verdict.ok)).toBe(true);
  });

  it('revokes a napplet that bypasses the port with a window-level message', async () => {
    const result = await boot(`<!doctype html><script>
      window.parent.postMessage({ type: 'llm.select', id: 'bypass' }, '*');
    </script>`, { domains: ['storage', 'llm'], maturity: {}, runDegraded: false, settleMs: 300 });
    expect(result.transportViolations.map(v => v.kind)).toEqual(['window-message']);
    expect(result.emitted).toEqual([]);
  });

  it('revokes a napplet that navigates its own frame', async () => {
    const result = await boot(`<!doctype html><script>
      window.napplet.storage.getItem('theme');
      setTimeout(() => location.reload(), 50);
    </script>`, { domains: ['storage'], runDegraded: false, settleMs: 600 });
    // The reloaded document re-runs the bootstrap, so its hello may beat the second load event.
    expect(result.transportViolations.map(v => v.kind)).toEqual([expect.stringMatching(/^second-(load|hello)$/)]);
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
        const pending = llm.generate({ handle: model.handle, format: 'json', messages: [{ role: 'user', content: [{ type: 'text', text: 'Return a greeting.' }] }] }, { onDelta: (delta) => deltas.push(delta) });
        if (typeof pending.requestId !== 'string') throw new Error('Missing request id');
        const generation = await pending;
        const output = generation.content.filter((part) => part.type === 'text').map((part) => part.text).join('');
        if (generation.finish !== 'stop' || JSON.parse(output).echo !== 'Return a greeting.') throw new Error('Unexpected generation');
        if (deltas.map((delta) => delta.event).join() !== 'start,delta,end' || deltas[1].text !== output) throw new Error('Unexpected deltas');
        const tools = [{ name: 'get_weather', parameters: { type: 'object', properties: { city: { type: 'string' } } } }];
        const called = await llm.generate({ handle: model.handle, tools, toolChoice: 'required', messages: [{ role: 'user', content: [{ type: 'text', text: 'Weather?' }] }] });
        const call = called.content[0];
        if (called.finish !== 'toolUse' || call.type !== 'toolCall' || call.name !== 'get_weather') throw new Error('Unexpected tool call');
        const answered = await llm.generate({ handle: model.handle, tools, messages: [{ role: 'user', content: [{ type: 'text', text: 'Weather?' }] },
          { role: 'assistant', content: called.content }, { role: 'toolResult', toolCallId: call.toolCallId, toolName: call.name, content: [{ type: 'text', text: 'clear' }] }] });
        if (answered.finish !== 'stop' || answered.content[0].text !== 'Echo: Tool results: get_weather: clear') throw new Error('Unexpected tool continuation');
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

  it('round-trips navigation against the host-bound manifest in an opaque iframe', async () => {
    const result = await boot(`<!doctype html><script>
      if (window.napplet.navigation) (async () => {
        const navigation = window.napplet.navigation;
        const initial = await navigation.get();
        if (!initial.ok || initial.view.status !== 'unreported') throw new Error('Bad initial view');
        const accepted = await navigation.report({ revision: 1, location: {
          convention: 'napplet:profile/open', payload: { pubkey: 'b'.repeat(64) }, title: 'Bob'
        } });
        if (!accepted.ok || accepted.view.entries.length !== 1) throw new Error('Own contract rejected');
        const rejected = await navigation.report({ revision: 2, location: {
          convention: 'napplet:note/open', payload: { event: 'foreign' }
        } });
        if (rejected.ok || rejected.error.code !== 'unsupported' || rejected.view.status !== 'uncertain') throw new Error('Foreign contract accepted');
        const current = await navigation.get();
        if (!current.ok || current.view.reportRevision !== 1 || current.view.entries[0].location.title !== 'Bob') throw new Error('History changed on rejection');
      })();
    </script>`, {
      // Already verified fixture metadata; signature/hash verification belongs to the host loader.
      verifiedManifest: { kind: 35129, id: 'a'.repeat(64), pubkey: 'b'.repeat(64), tags: [
        ['d', 'profile-fixture'], ['z', 'profile'], ['i', 'napplet:profile/open', 'pubkey'],
      ] },
    });
    expect(result.bootError).toBeNull();
    expect(result.degraded?.bootError).toBeNull();
    expect(result.degraded?.emitted).toEqual([]);
    expect(result.emitted.map(({ envelope }) => (envelope as { type: string }).type).filter((type) => type.startsWith('navigation.'))).toEqual([
      'navigation.get', 'navigation.report', 'navigation.report', 'navigation.get',
    ]);
    expect(result.emitted.every(({ verdict }) => verdict.ok)).toBe(true);
  });

  it('reports installation failure instead of inferring success from iframe load', async () => {
    const result = await boot('<!doctype html><p>Subject</p>', { runtimePreludeSource: 'throw new Error("fixture injection failed");', runDegraded: false });
    expect(result.installedGlobal).toBe(false);
    expect(result.bootError).toContain('fixture injection failed');
  });
});
