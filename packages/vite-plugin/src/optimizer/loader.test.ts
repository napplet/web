import * as crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  ResourceRuntime,
  renderResourceLoader,
  type ResourceRuntimeOptions,
  type ResourceTableEntry,
} from './loader.js';

interface ResourceBytesItem {
  url: string;
  ok: boolean;
  blob?: Blob;
}

interface LoaderState {
  phase: 'initial' | 'active' | 'success' | 'error' | 'cancelled';
  active: boolean;
  cohortClosed: boolean;
  completed: number;
  total: number;
  source?: string;
}

type FrameCallback = (timestamp: number) => void;

interface ExtendedRuntimeOptions extends Omit<ResourceRuntimeOptions, 'timeoutMs'> {
  onState?: (state: LoaderState) => void;
  scheduleFrame?: (callback: FrameCallback) => number;
}

interface ExtendedRuntime extends ResourceRuntime {
  cancel(): void;
  retry(): Promise<void>;
}

interface LoaderScreenModule {
  applyLoaderScreenState(document: FakeDocument, state: LoaderState): void;
  renderLoaderScreenMarkup(): string;
  renderLoaderScreenStyle(): string;
  sanitizeResourceLabel(source: string): string;
}

class FakeElement {
  hidden = false;
  textContent = '';
  focused = false;
  readonly attributes = new Map<string, string>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  focus(): void {
    this.focused = true;
  }
}

class FakeDocument {
  readonly elements = new Map<string, FakeElement>();

  getElementById(id: string): FakeElement {
    let element = this.elements.get(id);
    if (!element) {
      element = new FakeElement();
      this.elements.set(id, element);
    }
    return element;
  }
}

function bytes(length: number, value = 65): Uint8Array {
  return new Uint8Array(Buffer.alloc(length, value));
}

function entry(source: string, value: Uint8Array): ResourceTableEntry {
  const sha256 = crypto.createHash('sha256').update(value).digest('hex');
  return { source, uri: `blossom:${sha256}.bin`, sha256, bytes: value.byteLength, mime: 'application/octet-stream' };
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

function fakeWindow(overrides: Partial<{
  bytes: (uri: string, options?: { signal?: AbortSignal }) => Promise<Blob>;
  bytesMany: (urls: string[], options?: { signal?: AbortSignal }) => Promise<ResourceBytesItem[]>;
}> = {}) {
  return {
    napplet: {
      resource: {
        bytes: overrides.bytes ?? (async () => new Blob([])),
        bytesMany: overrides.bytesMany ?? (async () => []),
      },
    },
  };
}

function runtime(options: ExtendedRuntimeOptions): ExtendedRuntime {
  return new ResourceRuntime(options as ResourceRuntimeOptions) as ExtendedRuntime;
}

async function screenModule(): Promise<LoaderScreenModule> {
  const path = './loader-screen.js';
  return import(/* @vite-ignore */ path) as Promise<LoaderScreenModule>;
}

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

async function expectPending<T>(promise: Promise<T>): Promise<void> {
  let settled = false;
  void promise.then(
    () => { settled = true; },
    () => { settled = true; },
  );
  await flushPromises();
  expect(settled).toBe(false);
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const channels = hex.match(/[a-f\d]{2}/gi)!.map((value) => Number.parseInt(value, 16) / 255);
    const [red, green, blue] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
  };
  const left = luminance(foreground);
  const right = luminance(background);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

describe('packaged loader screen', () => {
  it('renders a self-contained initial state without a numeric or active claim', async () => {
    const { renderLoaderScreenMarkup } = await screenModule();
    const markup = renderLoaderScreenMarkup();

    expect(markup).toContain('aria-busy="false"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).toContain('Preparing packaged application');
    expect(markup).toMatch(/<progress[^>]*hidden[^>]*><\/progress>/);
    expect(markup).not.toMatch(/\d+\s+of\s+\d+/i);
    expect(markup.match(/<progress\b/g)).toHaveLength(1);
  });

  it('projects active, partial, success, failure, and cancelled states accessibly', async () => {
    const { applyLoaderScreenState } = await screenModule();
    const document = new FakeDocument();

    applyLoaderScreenState(document, { phase: 'active', active: true, cohortClosed: true, completed: 2, total: 5 });
    expect(document.getElementById('napplet-loader').attributes.get('aria-busy')).toBe('true');
    expect(document.getElementById('napplet-loader-progress-panel').hidden).toBe(false);
    expect(document.getElementById('napplet-loader-progress').hidden).toBe(false);
    expect(document.getElementById('napplet-loader-progress').attributes.has('value')).toBe(false);
    expect(document.getElementById('napplet-loader-title').textContent).toBe('Loading packaged resources');
    expect(document.getElementById('napplet-loader-status').textContent).toBe('Loading resources 2 of 5.');

    applyLoaderScreenState(document, { phase: 'active', active: true, cohortClosed: true, completed: 3, total: 10 });
    expect(document.getElementById('napplet-loader-title').textContent).toBe('Loading resources 3 of 10');
    expect(document.getElementById('napplet-loader-status').textContent).toBe('3 of 10 resources ready.');

    applyLoaderScreenState(document, { phase: 'success', active: false, cohortClosed: true, completed: 3, total: 3 });
    expect(document.getElementById('napplet-loader').attributes.get('aria-busy')).toBe('false');
    expect(document.getElementById('napplet-loader-progress').hidden).toBe(true);
    expect(document.getElementById('napplet-loader-status').textContent).toBe('Resources ready. Opening application…');

    applyLoaderScreenState(document, { phase: 'error', active: false, cohortClosed: true, completed: 1, total: 3, source: 'assets/fail.bin' });
    expect(document.getElementById('napplet-loader-status').textContent).toBe('A packaged resource could not be loaded safely.');
    expect(document.getElementById('napplet-loader-resource-panel').hidden).toBe(false);
    expect(document.getElementById('napplet-loader-resource').textContent).toBe('Resource assets/fail.bin could not be loaded safely. Retry only this resource.');
    expect(document.getElementById('napplet-loader-retry').hidden).toBe(false);
    expect(document.getElementById('napplet-loader-cancel').hidden).toBe(true);
    expect(document.getElementById('napplet-loader-retry').focused).toBe(true);

    applyLoaderScreenState(document, { phase: 'cancelled', active: false, cohortClosed: true, completed: 1, total: 3, source: 'assets/fail.bin' });
    expect(document.getElementById('napplet-loader-status').textContent).toBe('Loading cancelled.');
    expect(document.getElementById('napplet-loader-retry').focused).toBe(true);
  });

  it('uses safe resource text, native controls, high-contrast themes, and reduced-motion styling', async () => {
    const { applyLoaderScreenState, renderLoaderScreenMarkup, renderLoaderScreenStyle, sanitizeResourceLabel } = await screenModule();
    const document = new FakeDocument();
    const unsafe = 'assets/<img src=x>\u0000\u001f\u0085.bin';

    applyLoaderScreenState(document, { phase: 'error', active: false, cohortClosed: true, completed: 0, total: 1, source: unsafe });
    expect(sanitizeResourceLabel(unsafe)).toBe('assets/<img src=x>���.bin');
    expect(document.getElementById('napplet-loader-resource').textContent).toBe('Resource assets/<img src=x>���.bin could not be loaded safely. Retry only this resource.');

    const markup = renderLoaderScreenMarkup();
    const style = renderLoaderScreenStyle();
    expect(markup).toMatch(/<button[^>]*id="napplet-loader-retry"[^>]*type="button"/);
    expect(markup).toMatch(/<button[^>]*id="napplet-loader-cancel"[^>]*type="button"/);
    expect(markup).toContain('dir="auto"');
    expect(markup).toContain('Resources are checked as they arrive.');
    expect(markup).toContain('<strong>Resource unavailable</strong>');
    expect(markup.match(/<progress\b/g)).toHaveLength(1);
    expect(style).toContain('min-height: 44px');
    expect(style).toContain('width: min(760px, 100%)');
    expect(style).toContain('.napplet-loader-card::after');
    expect(style).toContain('.napplet-loader-progress-panel');
    expect(style).toContain('.napplet-loader-progress-panel::before');
    expect(style).toContain('width: 14%');
    expect(style).toContain('width: 28%');
    expect(style).toContain(':focus-visible');
    expect(style).toContain('overflow-wrap: anywhere');
    expect(style).toContain('@media (prefers-color-scheme: dark)');
    expect(style).toContain('@media (prefers-reduced-motion: reduce)');
    expect(style).toContain('animation: none');
    expect(style).not.toMatch(/gradient|@import|url\(|transition:\s*all/i);
    expect(`${markup}\n${style}`).not.toMatch(/\b(?:bytes?|percent(?:age)?|rate|chunks?|ETA|elapsed|Blossom|Nostr|NAP-RESOURCE)\b/i);
    expect(contrastRatio('#16211c', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#f1f5f2', '#171d1a')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#2f6f58', '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#70d6aa', '#171d1a')).toBeGreaterThanOrEqual(3);
  });
});

describe('private NAP-RESOURCE runtime', () => {
  it('reports initial, active, integrity-gated partial, and success states', async () => {
    const oneBytes = bytes(4, 49);
    const twoBytes = bytes(4, 50);
    const one = entry('assets/one.bin', oneBytes);
    const two = entry('assets/two.bin', twoBytes);
    const work = new Map([[one.uri, deferred<Blob>()], [two.uri, deferred<Blob>()]]);
    const states: LoaderState[] = [];
    let closeCohort!: FrameCallback;
    const instance = runtime({
      entries: [one, two],
      window: fakeWindow({ bytes: (uri) => work.get(uri)!.promise }),
      onState: (state) => states.push(state),
      scheduleFrame: (callback) => { closeCohort = callback; return 1; },
    });

    expect(states.at(-1)).toMatchObject({ phase: 'initial', active: false, completed: 0, total: 0 });
    const first = instance.resolve(one.source);
    const second = instance.resolve(two.source);
    expect(states.at(-1)).toMatchObject({ phase: 'active', active: true, cohortClosed: false, completed: 0, total: 2 });
    closeCohort(16);
    expect(states.at(-1)).toMatchObject({ phase: 'active', cohortClosed: true, completed: 0, total: 2 });

    work.get(one.uri)!.resolve(new Blob([oneBytes]));
    await first;
    expect(states.at(-1)).toMatchObject({ phase: 'active', active: true, completed: 1, total: 2 });

    work.get(two.uri)!.resolve(new Blob([twoBytes]));
    await second;
    expect(states.at(-1)).toMatchObject({ phase: 'success', active: false, completed: 2, total: 2 });
  });

  it('starts sibling calls concurrently and coalesces duplicate in-flight sources', async () => {
    const one = entry('assets/one.bin', bytes(4, 49));
    const two = entry('assets/two.bin', bytes(4, 50));
    const work = new Map([[one.uri, deferred<Blob>()], [two.uri, deferred<Blob>()]]);
    const bytesCall = vi.fn((uri: string, _options?: { signal?: AbortSignal }) => work.get(uri)!.promise);
    const instance = runtime({ entries: [one, two], window: fakeWindow({ bytes: bytesCall }) });

    const first = instance.resolve(one.source);
    const duplicate = instance.resolve(one.source);
    const second = instance.resolve(two.source);
    expect(first).toBe(duplicate);
    expect(bytesCall).toHaveBeenCalledTimes(2);
    expect(bytesCall.mock.calls.map(([uri]) => uri)).toEqual([one.uri, two.uri]);
    expect(bytesCall.mock.calls.every(([, options]) => options?.signal instanceof AbortSignal)).toBe(true);

    work.get(one.uri)!.resolve(new Blob([bytes(4, 49)]));
    work.get(two.uri)!.resolve(new Blob([bytes(4, 50)]));
    await expect(Promise.all([first, duplicate, second])).resolves.toHaveLength(3);
  });

  it('remains pending and active beyond 30 seconds without a local timeout', async () => {
    vi.useFakeTimers();
    try {
      const resource = entry('assets/slow.bin', bytes(4, 49));
      const request = deferred<Blob>();
      const states: LoaderState[] = [];
      const instance = runtime({
        entries: [resource],
        window: fakeWindow({ bytes: (_uri, options) => {
          options?.signal?.addEventListener('abort', () => request.reject(new DOMException('cancelled', 'AbortError')));
          return request.promise;
        } }),
        onState: (state) => states.push(state),
      });

      const result = instance.resolve(resource.source);
      await vi.advanceTimersByTimeAsync(30_001);
      await expectPending(result);
      expect(states.at(-1)).toMatchObject({ phase: 'active', active: true });
      instance.cancel();
      expect(states.at(-1)).toMatchObject({ phase: 'cancelled', active: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('counts a resource only after exact length and SHA-256 verification', async () => {
    const value = bytes(4, 49);
    const resource = entry('assets/value.bin', value);
    const digest = deferred<string>();
    const states: LoaderState[] = [];
    const instance = runtime({
      entries: [resource],
      window: fakeWindow({ bytes: async () => new Blob([value]) }),
      digest: () => digest.promise,
      onState: (state) => states.push(state),
      scheduleFrame: (callback) => { callback(16); return 1; },
    });

    const result = instance.resolve(resource.source);
    await flushPromises();
    expect(states.at(-1)).toMatchObject({ phase: 'active', completed: 0, total: 1 });
    digest.resolve(resource.sha256);
    await result;
    expect(states.at(-1)).toMatchObject({ phase: 'success', completed: 1, total: 1 });
  });

  it('retains successful mixed bulk rows and retries only failures in original order', async () => {
    const values = [bytes(4, 49), bytes(4, 50), bytes(4, 51)];
    const entries = values.map((value, index) => entry(`assets/${String.fromCharCode(97 + index)}.bin`, value));
    const blobs = values.map((value) => new Blob([value]));
    const states: LoaderState[] = [];
    const errorState = deferred<LoaderState>();
    let errorSeen = false;
    const signals: AbortSignal[] = [];
    const manyCall = vi.fn(async (urls: string[], options?: { signal?: AbortSignal }) => {
      signals.push(options!.signal!);
      if (manyCall.mock.calls.length === 1) {
        return [
          { url: urls[0]!, ok: true, blob: blobs[0] },
          { url: urls[1]!, ok: false },
          { url: urls[2]!, ok: true, blob: blobs[2] },
        ];
      }
      return [{ url: urls[0]!, ok: true, blob: blobs[1] }];
    });
    const instance = runtime({
      entries,
      window: fakeWindow({ bytesMany: manyCall }),
      onState: (state) => {
        states.push(state);
        if (!errorSeen && state.phase === 'error') {
          errorSeen = true;
          errorState.resolve(state);
        }
      },
      scheduleFrame: (callback) => { callback(16); return 1; },
    });

    const aggregate = instance.resolveMany(entries.map(({ source }) => source));
    const failed = await errorState.promise;
    await expectPending(aggregate);
    expect(failed).toMatchObject({ phase: 'error', completed: 2, total: 3, source: entries[1]!.source });
    expect(manyCall).toHaveBeenCalledTimes(1);

    await instance.retry();
    await expect(aggregate).resolves.toEqual(blobs);
    expect(manyCall.mock.calls.map(([requests]) => requests)).toEqual([
      entries.map(({ uri }) => uri),
      [entries[1]!.uri],
    ]);
    expect(signals[0]).not.toBe(signals[1]);
    expect(states.at(-1)).toMatchObject({ phase: 'success', completed: 3, total: 3 });
  });

  it('keeps the original promise recoverable across cancellation and retry', async () => {
    const value = bytes(4, 49);
    const resource = entry('assets/cancel.bin', value);
    const states: LoaderState[] = [];
    const signals: AbortSignal[] = [];
    let call = 0;
    const bytesCall = vi.fn((_uri: string, options?: { signal?: AbortSignal }) => {
      call += 1;
      signals.push(options!.signal!);
      if (call === 2) return Promise.resolve(new Blob([value]));
      return new Promise<Blob>((_resolve, reject) => {
        options!.signal!.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')));
      });
    });
    const instance = runtime({
      entries: [resource],
      window: fakeWindow({ bytes: bytesCall }),
      onState: (state) => states.push(state),
      scheduleFrame: (callback) => { callback(16); return 1; },
    });

    const original = instance.resolve(resource.source);
    instance.cancel();
    expect(signals[0]!.aborted).toBe(true);
    expect(states.at(-1)).toMatchObject({ phase: 'cancelled', active: false, source: resource.source });
    await expectPending(original);

    await instance.retry();
    await expect(original).resolves.toBeInstanceOf(Blob);
    expect(signals[1]!.aborted).toBe(false);
    expect(states.at(-1)).toMatchObject({ phase: 'success', completed: 1, total: 1 });
  });

  it('preserves canonical requests, bounded batches/digests/cache, MIME, and URL ownership', async () => {
    const entries = [entry('assets/one.bin', bytes(4, 49)), entry('assets/two.bin', bytes(4, 50)), entry('assets/three.bin', bytes(4, 51))];
    const manyCall = vi.fn(async (urls: string[], _options?: { signal?: AbortSignal }) => urls.map((url) => {
      const index = entries.findIndex((candidate) => candidate.uri === url);
      return { url, ok: true, blob: new Blob([bytes(4, 49 + index)]) };
    }));
    let concurrent = 0;
    let peak = 0;
    const urls = { createObjectURL: vi.fn(() => 'blob:media'), revokeObjectURL: vi.fn() };
    const instance = runtime({
      entries,
      window: fakeWindow({ bytes: async () => new Blob([bytes(4, 49)]), bytesMany: manyCall }),
      url: urls,
      maxBatchSize: 2,
      maxConcurrentDigests: 1,
      maxLiveBytes: 12,
      digest: async (blob) => {
        concurrent += 1;
        peak = Math.max(peak, concurrent);
        await Promise.resolve();
        concurrent -= 1;
        return crypto.createHash('sha256').update(new Uint8Array(await blob.arrayBuffer())).digest('hex');
      },
    });

    await expect(instance.resolveMany(entries.map(({ source }) => source))).resolves.toHaveLength(3);
    expect(manyCall.mock.calls.map(([requests]) => requests)).toEqual([
      [entries[0]!.uri, entries[1]!.uri],
      [entries[2]!.uri],
    ]);
    expect(peak).toBe(1);

    instance.release();
    const response = await instance.response(entries[0]!.source);
    expect(response.headers.get('content-type')).toBe(entries[0]!.mime);
    expect(await instance.objectUrl(entries[0]!.source)).toBe('blob:media');
    expect(await instance.objectUrl(entries[0]!.source)).toBe('blob:media');
    instance.release(entries[0]!.source);
    expect(urls.revokeObjectURL).not.toHaveBeenCalled();
    instance.release(entries[0]!.source);
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:media');
    await instance.objectUrl(entries[0]!.source);
    instance.teardown();
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('fails closed on unknown, malformed, oversized, or reordered table associations', async () => {
    const value = bytes(4, 49);
    const valid = entry('assets/value.bin', value);
    const malformed = { ...valid, source: 'assets/malformed.bin', uri: `blossom:${'0'.repeat(64)}.bin` };
    const oversized = { ...valid, source: 'assets/oversized.bin', bytes: 10 * 1024 * 1024 + 1 };
    const instance = runtime({ entries: [valid, malformed, oversized], window: fakeWindow() });

    await expect(instance.resolve('assets/unknown.bin')).rejects.toThrow(/unknown/i);
    await expect(instance.resolve(malformed.source)).rejects.toThrow(/invalid/i);
    await expect(instance.resolve(oversized.source)).rejects.toThrow(/bounded asset limit/i);

    const states: LoaderState[] = [];
    const reordered = runtime({
      entries: [valid],
      window: fakeWindow({ bytesMany: async () => [{ url: malformed.uri, ok: true, blob: new Blob([value]) }] }),
      onState: (state) => states.push(state),
      scheduleFrame: (callback) => { callback(16); return 1; },
    });
    const aggregate = reordered.resolveMany([valid.source]);
    await flushPromises();
    await expectPending(aggregate);
    expect(states.at(-1)).toMatchObject({ phase: 'error', completed: 0, total: 1, source: valid.source });
  });

  it('keeps emitted and TypeScript runtimes aligned without new transport or a deadline', () => {
    const one = entry('assets/one.bin', bytes(4, 49));
    const source = renderResourceLoader([one]);

    expect(source).toContain('window.napplet.resource.bytes');
    expect(source).toContain('window.napplet.resource.bytesMany');
    expect(source).toContain('AbortController');
    expect(source).toContain('{ signal:');
    expect(source).toContain('textContent');
    expect(source).toContain('requestAnimationFrame');
    expect(() => new Function(source)).not.toThrow();
    expect(source).not.toContain('fetch(');
    expect(source).not.toMatch(/timeout|setTimeout/i);
    expect(source).not.toMatch(/postMessage|resource\.cancel/);
  });
});
