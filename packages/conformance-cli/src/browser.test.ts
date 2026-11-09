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
