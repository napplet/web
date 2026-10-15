/**
 * @napplet/vite-plugin — private resource-table runtime.
 *
 * This runtime consumes implementation metadata embedded in a built artifact.
 * It is not a NIP-5A tag, NIP-5D field, or a new NAP operation: resource
 * retrieval remains on the existing `window.napplet.resource.bytes` boundary.
 */

import type { LoaderScreenState } from './loader-screen.js';
import {
  chunkValues,
  DEFAULT_MAX_ASSET_BYTES,
  DEFAULT_MAX_BATCH_SIZE,
  DEFAULT_MAX_CONCURRENT_DIGESTS,
  DEFAULT_MAX_LIVE_BYTES,
  deferredResource,
  defaultDigest,
  defaultScheduleFrame,
  canonicalUri,
  requireResource,
  type ActiveAttempt,
  type FrameCallback,
  type ObjectUrlApi,
  type ObjectUrlHandle,
  type PendingResource,
  type ResourceFailure,
  type ResourceRuntimeOptions,
  type ResourceTableEntry,
  type ResourceWindow,
  type RetryOperation,
} from './loader-shared.js';

type EntryResult =
  | { ok: true; entry: ResourceTableEntry }
  | { ok: false; reason: unknown };

interface PendingSourceResult {
  created: boolean;
  promise: Promise<Blob>;
}

/**
 * Bounded private runtime for generated artifact references.
 *
 * It deliberately accepts only table-authorized canonical Blossom URIs and
 * calls only the existing `window.napplet.resource` projection. Retrieval has
 * no napplet-owned deadline; failed and cancelled attempts stay recoverable.
 */
export class ResourceRuntime {
  private readonly entries: Map<string, ResourceTableEntry>;
  private readonly runtimeWindow: ResourceWindow;
  private readonly objectUrls: ObjectUrlApi;
  private readonly digest: (blob: Blob) => Promise<string>;
  private readonly maxAssetBytes: number;
  private readonly maxLiveBytes: number;
  private readonly maxBatchSize: number;
  private readonly maxConcurrentDigests: number;
  private readonly onState?: (state: LoaderScreenState) => void;
  private readonly scheduleFrame: (callback: FrameCallback) => number;
  private readonly cache = new Map<string, Blob>();
  private readonly liveUrls = new Map<string, ObjectUrlHandle>();
  private readonly pending = new Map<string, PendingResource>();
  private readonly failures = new Map<string, ResourceFailure>();
  private readonly attempts = new Set<ActiveAttempt>();
  private readonly requested = new Set<string>();
  private readonly verified = new Set<string>();
  private readonly digestWaiters: Array<() => void> = [];
  private liveBytes = 0;
  private digestActive = 0;
  private cohortClosed = false;
  private cohortFrameScheduled = false;
  private lastFailureSource: string | undefined;

  constructor(options: ResourceRuntimeOptions) {
    this.entries = new Map(options.entries.map((entry) => [entry.source, { ...entry }]));
    this.runtimeWindow = options.window ?? (globalThis as ResourceWindow);
    this.objectUrls = options.url ?? URL;
    this.digest = options.digest ?? defaultDigest;
    this.maxAssetBytes = options.maxAssetBytes ?? DEFAULT_MAX_ASSET_BYTES;
    this.maxLiveBytes = options.maxLiveBytes ?? DEFAULT_MAX_LIVE_BYTES;
    this.maxBatchSize = options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE;
    this.maxConcurrentDigests = options.maxConcurrentDigests ?? DEFAULT_MAX_CONCURRENT_DIGESTS;
    this.onState = options.onState;
    this.scheduleFrame = options.scheduleFrame ?? defaultScheduleFrame;
    if (!Number.isInteger(this.maxBatchSize) || this.maxBatchSize < 1) throw new Error('invalid optimized resource batch limit');
    if (!Number.isInteger(this.maxConcurrentDigests) || this.maxConcurrentDigests < 1) throw new Error('invalid optimized resource digest limit');
    this.emitState();
  }

  private entryFor(source: string): ResourceTableEntry {
    const entry = this.entries.get(source);
    if (!entry) throw new Error(`unknown optimized resource: ${source}`);
    if (!/^blossom:[a-f0-9]{64}\.bin$/.test(entry.uri) || !/^[a-f0-9]{64}$/.test(entry.sha256) || entry.uri !== canonicalUri(entry.sha256)) {
      throw new Error(`invalid optimized resource mapping: ${source}`);
    }
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || entry.bytes > this.maxAssetBytes) {
      throw new Error(`optimized resource exceeds bounded asset limit: ${source}`);
    }
    return entry;
  }

  private lookupEntry(source: string): EntryResult {
    try {
      return { ok: true, entry: this.entryFor(source) };
    } catch (reason) {
      return { ok: false, reason };
    }
  }

  private snapshot(): LoaderScreenState {
    const active = this.attempts.size > 0;
    const failed = this.lastFailureSource ? this.failures.get(this.lastFailureSource) : undefined;
    const completed = Array.from(this.requested).filter((source) => this.verified.has(source)).length;
    let phase: LoaderScreenState['phase'] = 'initial';
    if (failed) phase = failed.cancelled ? 'cancelled' : 'error';
    else if (active || this.requested.size > 0) phase = 'active';
    if (!failed && !active && this.cohortClosed && this.requested.size > 0 && completed === this.requested.size) phase = 'success';
    return {
      phase,
      active,
      cohortClosed: this.cohortClosed,
      completed,
      total: this.requested.size,
      ...(failed && this.lastFailureSource ? { source: this.lastFailureSource } : {}),
    };
  }

  private emitState(): void {
    this.onState?.(this.snapshot());
  }

  private observe(source: string): void {
    this.requested.add(source);
    if (!this.cohortFrameScheduled) {
      this.cohortFrameScheduled = true;
      this.scheduleFrame(() => {
        this.cohortClosed = true;
        this.emitState();
      });
    }
    this.emitState();
  }

  private async withDigestSlot<T>(operation: () => Promise<T>): Promise<T> {
    if (this.digestActive >= this.maxConcurrentDigests) {
      await new Promise<void>((resolve) => this.digestWaiters.push(resolve));
    }
    this.digestActive += 1;
    try {
      return await operation();
    } finally {
      this.digestActive -= 1;
      this.digestWaiters.shift()?.();
    }
  }

  private async verify(entry: ResourceTableEntry, blob: Blob): Promise<Blob> {
    if (blob.size !== entry.bytes) throw new Error(`optimized resource length mismatch: ${entry.source}`);
    const sha256 = await this.withDigestSlot(() => this.digest(blob));
    if (sha256 !== entry.sha256) throw new Error(`optimized resource digest mismatch: ${entry.source}`);
    return blob;
  }

  private cacheVerified(source: string, blob: Blob): void {
    if (!this.cache.has(source)) {
      if (this.liveBytes + blob.size > this.maxLiveBytes) throw new Error('optimized resource live-byte limit exceeded');
      this.cache.set(source, blob);
      this.liveBytes += blob.size;
    }
    this.verified.add(source);
  }

  private complete(source: string, blob: Blob): void {
    this.cacheVerified(source, blob);
    this.failures.delete(source);
    const pending = this.pending.get(source);
    if (pending) {
      this.pending.delete(source);
      pending.resolve(blob);
    }
    this.emitState();
  }

  private createOperation(kind: RetryOperation['kind'], sources: string[]): RetryOperation {
    const operation = {
      kind,
      sources: Array.from(sources),
      start: async (): Promise<void> => {
        if (kind === 'single') await this.startSingle(operation);
        else await this.startBatch(operation);
      },
    } satisfies RetryOperation;
    return operation;
  }

  private prepareAttempt(operation: RetryOperation): ActiveAttempt | undefined {
    const sources = operation.sources.filter((source) => this.pending.has(source) && !this.cache.has(source));
    if (sources.length === 0) return undefined;
    for (const source of sources) this.failures.delete(source);
    const attempt: ActiveAttempt = {
      active: true,
      controller: new AbortController(),
      kind: operation.kind,
      sources,
    };
    this.attempts.add(attempt);
    this.emitState();
    return attempt;
  }

  private finishAttempt(attempt: ActiveAttempt): void {
    if (!attempt.active) return;
    attempt.active = false;
    this.attempts.delete(attempt);
    this.emitState();
  }

  private recordFailures(sources: string[], cancelled: boolean, kind: RetryOperation['kind']): void {
    const unresolved = sources.filter((source) => this.pending.has(source) && !this.cache.has(source));
    if (unresolved.length === 0) return;
    const retry = this.createOperation(kind, unresolved);
    for (const source of unresolved) this.failures.set(source, { cancelled, operation: retry });
    this.lastFailureSource = unresolved[0];
  }

  private async startSingle(operation: RetryOperation): Promise<void> {
    const attempt = this.prepareAttempt(operation);
    if (!attempt) return;
    const source = attempt.sources[0]!;
    try {
      const entry = this.entryFor(source);
      const blob = await requireResource(this.runtimeWindow).bytes(entry.uri, { signal: attempt.controller.signal });
      const verified = await this.verify(entry, blob);
      if (attempt.active) this.complete(source, verified);
    } catch {
      if (attempt.active) this.recordFailures([source], attempt.controller.signal.aborted, 'single');
    } finally {
      this.finishAttempt(attempt);
    }
  }

  private async startBatch(operation: RetryOperation): Promise<void> {
    const attempt = this.prepareAttempt(operation);
    if (!attempt) return;
    const entries = attempt.sources.map((source) => this.entryFor(source));
    const urls = entries.map((entry) => entry.uri);
    try {
      const items = await requireResource(this.runtimeWindow).bytesMany(urls, { signal: attempt.controller.signal });
      if (!attempt.active) return;
      if (items.length !== urls.length || items.some((item, index) => item.url !== urls[index])) {
        this.recordFailures(attempt.sources, false, 'batch');
        return;
      }
      const failed: string[] = [];
      await Promise.all(entries.map(async (entry, index) => {
        const item = items[index]!;
        if (!item.ok || !item.blob) {
          failed.push(entry.source);
          return;
        }
        try {
          const verified = await this.verify(entry, item.blob);
          if (attempt.active) this.complete(entry.source, verified);
        } catch {
          failed.push(entry.source);
        }
      }));
      if (attempt.active && failed.length > 0) this.recordFailures(failed, attempt.controller.signal.aborted, 'batch');
    } catch {
      if (attempt.active) this.recordFailures(attempt.sources, attempt.controller.signal.aborted, 'batch');
    } finally {
      this.finishAttempt(attempt);
    }
  }

  private pendingSource(source: string): PendingSourceResult {
    const cached = this.cache.get(source);
    if (cached) return { created: false, promise: Promise.resolve(cached) };
    const existing = this.pending.get(source);
    if (existing) return { created: false, promise: existing.promise };
    const pending = deferredResource();
    this.pending.set(source, pending);
    this.observe(source);
    return { created: true, promise: pending.promise };
  }

  /** Resolve one private source through the existing whole-Blob resource API. */
  resolve(source: string): Promise<Blob> {
    const result = this.lookupEntry(source);
    if (!result.ok) return Promise.reject(result.reason);
    const pending = this.pendingSource(source);
    if (pending.created) void this.createOperation('single', [result.entry.source]).start();
    return pending.promise;
  }

  /** Resolve an ordered list in bounded `bytesMany` groups without serializing sibling groups. */
  resolveMany(sources: string[]): Promise<Blob[]> {
    for (const source of sources) {
      const result = this.lookupEntry(source);
      if (!result.ok) return Promise.reject(result.reason);
    }
    const created: string[] = [];
    const results = sources.map((source) => {
      const pending = this.pendingSource(source);
      if (pending.created) created.push(source);
      return pending.promise;
    });
    for (const group of chunkValues(created, this.maxBatchSize)) void this.createOperation('batch', group).start();
    return Promise.all(results);
  }

  /** Retry only unresolved failed or cancelled work under fresh controllers. */
  async retry(): Promise<void> {
    const operations = new Set(Array.from(this.failures.values(), ({ operation }) => operation));
    for (const operation of operations) {
      for (const source of operation.sources) this.failures.delete(source);
    }
    this.emitState();
    await Promise.all(Array.from(operations, (operation) => operation.start()));
  }

  /** Abort active attempts while retaining their original application-facing promises. */
  cancel(): void {
    for (const attempt of Array.from(this.attempts)) {
      attempt.active = false;
      this.attempts.delete(attempt);
      attempt.controller.abort();
      this.recordFailures(attempt.sources, true, attempt.kind);
    }
    this.emitState();
  }

  /** Return a Response backed only by an already verified complete Blob. */
  async response(source: string): Promise<Response> {
    const entry = this.entryFor(source);
    const response = new Response(await this.resolve(source), { headers: { 'content-type': entry.mime } });
    this.release(source);
    return response;
  }

  /** Allocate a reference-counted object URL for loader-owned image/audio/video/CSS paths. */
  async objectUrl(source: string): Promise<string> {
    const existing = this.liveUrls.get(source);
    if (existing) {
      existing.references += 1;
      return existing.url;
    }
    const url = this.objectUrls.createObjectURL(await this.resolve(source));
    this.liveUrls.set(source, { url, references: 1 });
    return url;
  }

  /** Release one reference or all resources, revoking every owned Blob URL at its final boundary. */
  release(source?: string): void {
    if (source === undefined) {
      for (const value of this.liveUrls.values()) this.objectUrls.revokeObjectURL(value.url);
      this.liveUrls.clear();
      this.cache.clear();
      this.liveBytes = 0;
      return;
    }
    const handle = this.liveUrls.get(source);
    if (handle) {
      handle.references -= 1;
      if (handle.references <= 0) {
        this.objectUrls.revokeObjectURL(handle.url);
        this.liveUrls.delete(source);
      }
    }
    const cached = this.cache.get(source);
    if (cached && !this.liveUrls.has(source)) {
      this.cache.delete(source);
      this.liveBytes -= cached.size;
    }
  }

  /** Deterministic page-teardown cleanup for controllers, promises, owned URLs, and Blobs. */
  teardown(): void {
    for (const attempt of this.attempts) {
      attempt.active = false;
      attempt.controller.abort();
    }
    this.attempts.clear();
    for (const pending of this.pending.values()) pending.reject(new Error('optimized resource loader was torn down'));
    this.pending.clear();
    this.failures.clear();
    this.release();
  }
}
