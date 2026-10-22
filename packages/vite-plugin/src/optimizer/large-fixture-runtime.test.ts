import * as crypto from 'crypto';
import * as vm from 'node:vm';
import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderOptimizedHtml, type RetainedAsset, type RetainedBuild } from './pipeline.js';
import type { ResourceTableEntry } from './loader.js';

interface ResourceRequest {
  url: string;
}

interface ResourceItem {
  url: string;
  ok: boolean;
  blob?: Blob;
}

interface PrivateLoader {
  resolve(source: string): Promise<Blob>;
  resolveMany(sources: string[]): Promise<Blob[]>;
  cancel(): void;
  retry(): Promise<void>;
}

interface ResourceDomain {
  bytes(uri: string, options?: { signal?: AbortSignal }): Promise<Blob>;
  bytesMany(urls: string[], options?: { signal?: AbortSignal }): Promise<ResourceItem[]>;
}

interface ScenarioWindow extends Window {
  napplet?: {
    resource: ResourceDomain;
  };
  __nappletPrivateResourceLoader?: PrivateLoader;
  __applicationPromise?: Promise<number[]>;
  __applicationOrder?: number[];
}

interface ArtifactFixture {
  html: string;
  entries: ResourceTableEntry[];
  values: Uint8Array[];
}

interface BrowserHarness {
  window: ScenarioWindow;
  context: vm.Context;
  loader: PrivateLoader;
  applicationSource: string;
  flushFrames(): void;
  close(): Promise<void>;
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void; reject(reason: unknown): void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function digest(value: Uint8Array): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function buildArtifact(sources: string[]): ArtifactFixture {
  const values = sources.map((_source, index) => new Uint8Array(Buffer.alloc(4, 49 + index)));
  const assets: RetainedAsset[] = sources.map((source, index) => ({
    source,
    reference: source,
    bytes: values[index]!,
    mime: 'application/octet-stream',
  }));
  const calls = sources.map((source) => `fetch(__nappletAssetUrl(${JSON.stringify(source)}))`).join(',');
  const application = `window.__applicationPromise = Promise.all([${calls}]).then(async (responses) => {
    window.__applicationOrder = await Promise.all(responses.map(async (response) => new Uint8Array(await response.arrayBuffer())[0]));
    document.open();
    document.write('<main id="application-ready">Application ready</main>');
    document.close();
    return window.__applicationOrder;
  });`;
  const build: RetainedBuild = {
    html: `<html><head><meta charset="utf-8"></head><body data-fixture="loader"><script type="module">${application}</script></body></html>`,
    assets,
    artifacts: [{ path: 'assets/application.js', kind: 'javascript', content: application }],
    targetBytes: 1,
  };
  const entries = assets.map((asset) => ({
    source: asset.source,
    uri: `blossom:${digest(asset.bytes)}.bin`,
    sha256: digest(asset.bytes),
    bytes: asset.bytes.byteLength,
    mime: asset.mime,
  }));
  return { html: renderOptimizedHtml({ build, selected: assets, entries }).html, entries, values };
}

function executableScripts(html: string): Array<{ attributes: string; source: string }> {
  return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match) => ({ attributes: match[1] ?? '', source: match[2] ?? '' }));
}

function createHarness(
  fixture: ArtifactFixture,
  resource: ResourceDomain,
  digestOverride?: (algorithm: string, value: ArrayBuffer) => Promise<ArrayBuffer>,
): BrowserHarness {
  const browser = new Window({ settings: { enableJavaScriptEvaluation: false } }) as ScenarioWindow;
  browser.document.write(fixture.html);
  browser.napplet = { resource };
  const frames: Array<(timestamp: number) => void> = [];
  const scripts = executableScripts(fixture.html);
  const loaderSource = scripts.find((script) => script.source.includes('window.__nappletPrivateResourceLoader ='))?.source;
  const applicationSource = scripts.find((script) => /type=["']module["']/.test(script.attributes) && script.source.includes('__nappletPrivateResourceLoader.response'))?.source;
  if (!loaderSource || !applicationSource) throw new Error('generated artifact is missing loader or application code');
  if (applicationSource.includes('fetch(')) throw new Error(`generated application retained a fetch call: ${applicationSource}`);
  const subtle = {
    digest: digestOverride ?? (async (algorithm: string, value: ArrayBuffer) => crypto.webcrypto.subtle.digest(algorithm, value)),
  };
  const context = vm.createContext({
    window: browser,
    document: browser.document,
    crypto: { subtle },
    Blob,
    Response,
    URL,
    Uint8Array,
    AbortController,
    DOMException,
    requestAnimationFrame: (callback: (timestamp: number) => void) => {
      frames.push(callback);
      return frames.length;
    },
  });
  vm.runInContext(loaderSource, context);
  if (!browser.__nappletPrivateResourceLoader) throw new Error('generated loader did not install');
  return {
    window: browser,
    context,
    loader: browser.__nappletPrivateResourceLoader,
    applicationSource,
    flushFrames(): void {
      while (frames.length > 0) frames.shift()!(16);
    },
    close: () => browser.happyDOM.close(),
  };
}

async function flushUntil(predicate: () => boolean): Promise<void> {
  const deadline = performance.now() + 5_000;
  while (performance.now() < deadline) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  expect(predicate()).toBe(true);
}

async function expectPending<T>(promise: Promise<T>): Promise<void> {
  let settled = false;
  void promise.then(
    () => { settled = true; },
    () => { settled = true; },
  );
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
  expect(settled).toBe(false);
}

function press(
  window: ScenarioWindow,
  target: unknown,
  key: 'Enter' | ' ',
): void {
  const button = target as { dispatchEvent(event: unknown): boolean; click(): void };
  button.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
  button.dispatchEvent(new window.KeyboardEvent('keyup', { key, bubbles: true }));
  button.click();
}

describe('generated packaged-loader browser runtime', () => {
  it('keeps eager calls concurrent beyond 30 seconds, gates counts on digest, and hands off atomically after retry', async () => {
    const unsafeSource = 'assets/<img src=x>.bin';
    const fixture = buildArtifact(['assets/a.bin', unsafeSource, 'assets/c.bin']);
    const requests: Array<{ uri: string; signal: AbortSignal }> = [];
    const first = fixture.entries.map(() => deferred<Blob>());
    const retried = deferred<Blob>();
    const digestGate = deferred<void>();
    let unsafeAttempts = 0;
    const harness = createHarness(
      fixture,
      {
        bytes: (uri, options) => {
          requests.push({ uri, signal: options!.signal! });
          const index = fixture.entries.findIndex((entry) => entry.uri === uri);
          if (index === 1) {
            unsafeAttempts += 1;
            return unsafeAttempts === 1 ? first[1]!.promise : retried.promise;
          }
          return first[index]!.promise;
        },
        bytesMany: async () => { throw new Error('application must use concurrent single-resource calls'); },
      },
      async (algorithm, value) => {
        if (new Uint8Array(value)[0] === fixture.values[0]![0]) await digestGate.promise;
        return crypto.webcrypto.subtle.digest(algorithm, value);
      },
    );
    try {
      const document = harness.window.document;
      expect(document.getElementById('napplet-loader')).not.toBeNull();
      expect(document.getElementById('napplet-loader')!.getAttribute('aria-busy')).toBe('false');
      expect(document.getElementById('napplet-loader-progress')!.hasAttribute('hidden')).toBe(true);
      harness.flushFrames();

      vm.runInContext(harness.applicationSource, harness.context);
      const application = harness.window.__applicationPromise!;
      expect(requests).toHaveLength(3);
      expect(requests.map(({ uri }) => uri)).toEqual(fixture.entries.map(({ uri }) => uri));
      expect(requests.every(({ signal }) => signal instanceof AbortSignal)).toBe(true);
      harness.flushFrames();
      expect(document.getElementById('napplet-loader-status')!.textContent).toBe('Loading resources 0 of 3.');
      expect(document.getElementById('napplet-loader-progress')!.hasAttribute('value')).toBe(false);

      vi.useFakeTimers();
      await vi.advanceTimersByTimeAsync(30_001);
      await expectPending(application);
      expect(document.getElementById('napplet-loader')!.getAttribute('aria-busy')).toBe('true');
      vi.useRealTimers();

      first[0]!.resolve(new Blob([fixture.values[0]!]));
      await flushUntil(() => document.getElementById('napplet-loader-status')!.textContent === 'Loading resources 0 of 3.');
      digestGate.resolve();
      await flushUntil(() => document.getElementById('napplet-loader-status')!.textContent === 'Loading resources 1 of 3.');
      expect(document.getElementById('napplet-loader-title')!.textContent).toBe('Loading packaged resources');

      first[1]!.reject(new Error('expected first-attempt failure'));
      await flushUntil(() => document.getElementById('napplet-loader')!.getAttribute('data-state') === 'error');
      expect(document.getElementById('napplet-loader-resource')!.textContent).toBe(`Resource ${unsafeSource} could not be loaded safely. Retry only this resource.`);
      expect(document.querySelector('#napplet-loader-resource img')).toBeNull();
      expect(document.activeElement).toBe(document.getElementById('napplet-loader-retry'));
      expect([...document.querySelectorAll('#napplet-loader button')].filter((button) => !button.hasAttribute('hidden'))).toHaveLength(1);
      expect(document.getElementById('application-ready')).toBeNull();
      await expectPending(application);

      const retry = document.getElementById('napplet-loader-retry')!;
      expect(retry.tagName).toBe('BUTTON');
      press(harness.window, retry, 'Enter');
      await flushUntil(() => requests.length === 4);
      expect(requests[3]!.uri).toBe(fixture.entries[1]!.uri);
      first[2]!.resolve(new Blob([fixture.values[2]!]));
      retried.resolve(new Blob([fixture.values[1]!]));
      await expect(application).resolves.toEqual([49, 50, 51]);
      expect(harness.window.__applicationOrder).toEqual([49, 50, 51]);
      expect(document.getElementById('napplet-loader')).toBeNull();
      expect(document.getElementById('application-ready')?.textContent).toBe('Application ready');
    } finally {
      vi.useRealTimers();
      await harness.close();
    }
  });

  it('retains successful mixed bulk rows and retries only the failed source in original order', async () => {
    const fixture = buildArtifact(['assets/a.bin', 'assets/b.bin', 'assets/c.bin']);
    const calls: string[][] = [];
    const digestCounts = new Map<number, number>();
    let attempt = 0;
    const harness = createHarness(
      fixture,
      {
        bytes: async () => { throw new Error('bulk scenario must not decompose into bytes calls'); },
        bytesMany: async (urls) => {
          calls.push(urls);
          attempt += 1;
          if (attempt === 1) {
            return [
              { url: urls[0]!, ok: true, blob: new Blob([fixture.values[0]!]) },
              { url: urls[1]!, ok: false },
              { url: urls[2]!, ok: true, blob: new Blob([fixture.values[2]!]) },
            ];
          }
          return [{ url: urls[0]!, ok: true, blob: new Blob([fixture.values[1]!]) }];
        },
      },
      async (algorithm, value) => {
        const key = new Uint8Array(value)[0]!;
        digestCounts.set(key, (digestCounts.get(key) ?? 0) + 1);
        return crypto.webcrypto.subtle.digest(algorithm, value);
      },
    );
    try {
      harness.flushFrames();
      const result = harness.loader.resolveMany(fixture.entries.map(({ source }) => source));
      harness.flushFrames();
      await flushUntil(() => harness.window.document.getElementById('napplet-loader')!.getAttribute('data-state') === 'error');
      await expectPending(result);
      expect(harness.window.document.getElementById('napplet-loader-status')!.textContent).toBe('A packaged resource could not be loaded safely.');
      expect(harness.window.document.getElementById('napplet-loader-resource')!.textContent).toBe('Resource assets/b.bin could not be loaded safely. Retry only this resource.');
      expect(digestCounts).toEqual(new Map([[49, 1], [51, 1]]));

      const retry = harness.window.document.getElementById('napplet-loader-retry')!;
      press(harness.window, retry, ' ');
      await expect(result).resolves.toEqual([
        expect.objectContaining({ size: 4 }),
        expect.objectContaining({ size: 4 }),
        expect.objectContaining({ size: 4 }),
      ]);
      expect(calls).toEqual([
        fixture.entries.map(({ uri }) => uri),
        [fixture.entries[1]!.uri],
      ]);
      expect(digestCounts).toEqual(new Map([[49, 1], [51, 1], [50, 1]]));
      expect(harness.window.document.getElementById('napplet-loader')!.getAttribute('data-state')).toBe('success');
    } finally {
      await harness.close();
    }
  });

  it('uses native keyboard controls to cancel and recover the original promise', async () => {
    const fixture = buildArtifact(['assets/a.bin']);
    const signals: AbortSignal[] = [];
    let attempt = 0;
    const harness = createHarness(fixture, {
      bytes: (_uri, options) => {
        attempt += 1;
        signals.push(options!.signal!);
        if (attempt === 2) return Promise.resolve(new Blob([fixture.values[0]!]));
        return new Promise<Blob>((_resolve, reject) => {
          options!.signal!.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')));
        });
      },
      bytesMany: async () => { throw new Error('cancel scenario must use bytes'); },
    });
    try {
      harness.flushFrames();
      const original = harness.loader.resolve(fixture.entries[0]!.source);
      harness.flushFrames();
      const cancel = harness.window.document.getElementById('napplet-loader-cancel')!;
      expect(cancel.tagName).toBe('BUTTON');
      press(harness.window, cancel, 'Enter');
      await flushUntil(() => signals[0]?.aborted === true);
      expect(harness.window.document.getElementById('napplet-loader')!.getAttribute('data-state')).toBe('cancelled');
      expect(harness.window.document.activeElement).toBe(harness.window.document.getElementById('napplet-loader-retry'));
      await expectPending(original);

      press(harness.window, harness.window.document.getElementById('napplet-loader-retry')!, ' ');
      await expect(original).resolves.toBeInstanceOf(Blob);
      expect(signals).toHaveLength(2);
      expect(signals[0]).not.toBe(signals[1]);
      expect(harness.window.document.getElementById('napplet-loader')!.getAttribute('data-state')).toBe('success');
    } finally {
      await harness.close();
    }
  });
});
