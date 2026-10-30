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
