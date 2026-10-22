import type { LoaderScreenState } from './loader-screen.js';

export type FrameCallback = (timestamp: number) => void;

export interface ResourceTableEntry {
  source: string;
  uri: string;
  sha256: string;
  bytes: number;
  mime: string;
}

export interface ResourceBytesItem {
  url: string;
  ok: boolean;
  blob?: Blob;
}

export interface ResourceDomain {
  bytes(uri: string, options?: { signal?: AbortSignal }): Promise<Blob>;
  bytesMany(urls: string[], options?: { signal?: AbortSignal }): Promise<ResourceBytesItem[]>;
}

export interface ResourceWindow {
  napplet?: { resource?: ResourceDomain };
}

export interface ObjectUrlApi {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

export interface ResourceRuntimeOptions {
  entries: readonly ResourceTableEntry[];
  window?: ResourceWindow;
  url?: ObjectUrlApi;
  digest?: (blob: Blob) => Promise<string>;
  maxAssetBytes?: number;
  maxLiveBytes?: number;
  maxBatchSize?: number;
  maxConcurrentDigests?: number;
  onState?: (state: LoaderScreenState) => void;
  scheduleFrame?: (callback: FrameCallback) => number;
}

export interface ObjectUrlHandle {
  url: string;
  references: number;
}

export interface PendingResource {
  promise: Promise<Blob>;
  resolve(blob: Blob): void;
  reject(reason: unknown): void;
}

export interface RetryOperation {
  kind: 'single' | 'batch';
  sources: string[];
  start(): Promise<void>;
}

export interface ResourceFailure {
  cancelled: boolean;
  operation: RetryOperation;
}

export interface ActiveAttempt {
  active: boolean;
  controller: AbortController;
  kind: RetryOperation['kind'];
  sources: string[];
}

export const DEFAULT_MAX_ASSET_BYTES = 10 * 1024 * 1024;
export const DEFAULT_MAX_LIVE_BYTES = 50 * 1024 * 1024;
export const DEFAULT_MAX_BATCH_SIZE = 8;
export const DEFAULT_MAX_CONCURRENT_DIGESTS = 2;

export function canonicalUri(sha256: string): string {
  return `blossom:${sha256}.bin`;
}

export function requireResource(runtimeWindow: ResourceWindow): ResourceDomain {
  const resource = runtimeWindow.napplet?.resource;
  if (!resource) {
    throw new Error('window.napplet.resource is unavailable; this optimized artifact requires the existing resource capability');
  }
  return resource;
}

export function defaultDigest(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then(async (value) => {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', value);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  });
}

export function defaultScheduleFrame(callback: FrameCallback): number {
  const runtimeGlobal = globalThis as typeof globalThis & { requestAnimationFrame?: (callback: FrameCallback) => number };
  if (typeof runtimeGlobal.requestAnimationFrame === 'function') return runtimeGlobal.requestAnimationFrame(callback);
  queueMicrotask(() => callback(globalThis.performance.now()));
  return 0;
}

export function chunkValues<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export function deferredResource(): PendingResource {
  let resolve!: (blob: Blob) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Blob>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export function stableEntries(entries: readonly ResourceTableEntry[]): ResourceTableEntry[] {
  return Array.from(entries).sort((left, right) => left.source.localeCompare(right.source));
}
