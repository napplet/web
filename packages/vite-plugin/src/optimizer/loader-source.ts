import { renderLoaderScreenRuntime } from './loader-screen.js';
import {
  DEFAULT_MAX_ASSET_BYTES,
  DEFAULT_MAX_BATCH_SIZE,
  DEFAULT_MAX_CONCURRENT_DIGESTS,
  DEFAULT_MAX_LIVE_BYTES,
  stableEntries,
} from './loader-shared.js';
import type { ResourceTableEntry } from './loader-shared.js';

function escapedPrivateResourceTable(entries: readonly ResourceTableEntry[]): string {
  return JSON.stringify(stableEntries(entries)).replace(/<\/script/gi, '<\\/script');
}

function renderEmittedResourceRuntime(table: string): string {
  return `(() => {
const table = new Map(${table}.map((entry) => [entry.source, entry]));
const cache = new Map();
const urls = new Map();
const pending = new Map();
const failures = new Map();
const attempts = new Set();
const requested = new Set();
const verifiedSources = new Set();
const digestWaiters = [];
let liveBytes = 0;
let digestActive = 0;
let cohortClosed = false;
let cohortFrameScheduled = false;
let lastFailureSource;
let controlsInstalled = false;
const MAX_ASSET_BYTES = ${DEFAULT_MAX_ASSET_BYTES};
const MAX_LIVE_BYTES = ${DEFAULT_MAX_LIVE_BYTES};
const MAX_BATCH_SIZE = ${DEFAULT_MAX_BATCH_SIZE};
const MAX_CONCURRENT_DIGESTS = ${DEFAULT_MAX_CONCURRENT_DIGESTS};
${renderLoaderScreenRuntime()}
function resource() {
  if (!window.napplet || !window.napplet.resource) throw new Error('window.napplet.resource is unavailable; this optimized artifact requires the existing resource capability');
  return window.napplet.resource;
}
function resourceBytes(uri, signal) { resource(); return window.napplet.resource.bytes(uri, { signal: signal }); }
function resourceBytesMany(urls, signal) { resource(); return window.napplet.resource.bytesMany(urls, { signal: signal }); }
function entryFor(source) {
  const entry = table.get(source);
  if (!entry || !/^blossom:[a-f0-9]{64}\\.bin$/.test(entry.uri) || !/^[a-f0-9]{64}$/.test(entry.sha256) || entry.uri !== 'blossom:' + entry.sha256 + '.bin' || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || entry.bytes > MAX_ASSET_BYTES) throw new Error('invalid optimized resource mapping: ' + source);
  return entry;
}
function loaderState() {
  const active = attempts.size > 0;
  const failed = lastFailureSource ? failures.get(lastFailureSource) : undefined;
  let completed = 0;
  for (const source of requested) if (verifiedSources.has(source)) completed += 1;
  let phase = failed ? failed.cancelled ? 'cancelled' : 'error' : active || requested.size > 0 ? 'active' : 'initial';
  if (!failed && !active && cohortClosed && requested.size > 0 && completed === requested.size) phase = 'success';
  return { phase: phase, active: active, cohortClosed: cohortClosed, completed: completed, total: requested.size, source: failed ? lastFailureSource : undefined };
}
function installControls() {
  if (controlsInstalled) return;
  const retryButton = document.getElementById('napplet-loader-retry');
  const cancelButton = document.getElementById('napplet-loader-cancel');
  if (!retryButton || !cancelButton) return;
  retryButton.addEventListener('click', retry);
  cancelButton.addEventListener('click', cancel);
  controlsInstalled = true;
}
function syncScreen() { applyLoaderScreenState(loaderState()); installControls(); }
function observe(source) {
  requested.add(source);
  if (!cohortFrameScheduled) {
    cohortFrameScheduled = true;
    requestAnimationFrame(() => { cohortClosed = true; syncScreen(); });
  }
  syncScreen();
}
function createPending() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise: promise, resolve: resolve, reject: reject };
}
async function digestBlob(blob) {
  if (digestActive >= MAX_CONCURRENT_DIGESTS) await new Promise((resolve) => digestWaiters.push(resolve));
  digestActive += 1;
  try {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } finally {
    digestActive -= 1;
    const next = digestWaiters.shift();
    if (next) next();
  }
}
async function verify(entry, blob) {
  if (blob.size !== entry.bytes) throw new Error('optimized resource length mismatch');
  if (await digestBlob(blob) !== entry.sha256) throw new Error('optimized resource digest mismatch');
  return blob;
}
function cacheVerified(source, blob) {
  if (!cache.has(source)) {
    if (liveBytes + blob.size > MAX_LIVE_BYTES) throw new Error('optimized resource live-byte limit exceeded');
    cache.set(source, blob);
    liveBytes += blob.size;
  }
  verifiedSources.add(source);
}
function complete(source, blob) {
  cacheVerified(source, blob);
  failures.delete(source);
  const waiter = pending.get(source);
  if (waiter) { pending.delete(source); waiter.resolve(blob); }
  syncScreen();
}
function createOperation(kind, sources) {
  const operation = { kind: kind, sources: sources.slice(), start: undefined };
  operation.start = () => kind === 'single' ? startSingle(operation) : startBatch(operation);
  return operation;
}
function prepareAttempt(operation) {
  const sources = operation.sources.filter((source) => pending.has(source) && !cache.has(source));
  if (!sources.length) return undefined;
  for (const source of sources) failures.delete(source);
  const attempt = { active: true, controller: new AbortController(), kind: operation.kind, sources: sources };
  attempts.add(attempt);
  syncScreen();
  return attempt;
}
function finishAttempt(attempt) {
  if (!attempt.active) return;
  attempt.active = false;
  attempts.delete(attempt);
  syncScreen();
}
function recordFailures(sources, cancelled, kind) {
  const unresolved = sources.filter((source) => pending.has(source) && !cache.has(source));
  if (!unresolved.length) return;
  const operation = createOperation(kind, unresolved);
  for (const source of unresolved) failures.set(source, { cancelled: cancelled, operation: operation });
  lastFailureSource = unresolved[0];
}
async function startSingle(operation) {
  const attempt = prepareAttempt(operation);
  if (!attempt) return;
  const source = attempt.sources[0];
  try {
    const entry = entryFor(source);
    const blob = await resourceBytes(entry.uri, attempt.controller.signal);
    const checked = await verify(entry, blob);
    if (attempt.active) complete(source, checked);
  } catch (_) {
    if (attempt.active) recordFailures([source], attempt.controller.signal.aborted, 'single');
  } finally { finishAttempt(attempt); }
}
async function startBatch(operation) {
  const attempt = prepareAttempt(operation);
  if (!attempt) return;
  const entries = attempt.sources.map(entryFor);
  const urls = entries.map((entry) => entry.uri);
  try {
    const items = await resourceBytesMany(urls, attempt.controller.signal);
    if (!attempt.active) return;
    if (items.length !== urls.length || items.some((item, index) => item.url !== urls[index])) {
      recordFailures(attempt.sources, false, 'batch');
      return;
    }
    const failed = [];
    await Promise.all(entries.map(async (entry, index) => {
      const item = items[index];
      if (!item.ok || !item.blob) { failed.push(entry.source); return; }
      try {
        const checked = await verify(entry, item.blob);
        if (attempt.active) complete(entry.source, checked);
      } catch (_) { failed.push(entry.source); }
    }));
    if (attempt.active && failed.length) recordFailures(failed, attempt.controller.signal.aborted, 'batch');
  } catch (_) {
    if (attempt.active) recordFailures(attempt.sources, attempt.controller.signal.aborted, 'batch');
  } finally { finishAttempt(attempt); }
}
function resolve(source) {
  let entry;
  try { entry = entryFor(source); } catch (error) { return Promise.reject(error); }
  if (cache.has(source)) return Promise.resolve(cache.get(source));
  if (pending.has(source)) return pending.get(source).promise;
  const waiter = createPending();
  pending.set(source, waiter);
  observe(source);
  createOperation('single', [entry.source]).start();
  return waiter.promise;
}
function resolveMany(sources) {
  try { for (const source of sources) entryFor(source); } catch (error) { return Promise.reject(error); }
  const created = [];
  const results = sources.map((source) => {
    if (cache.has(source)) return Promise.resolve(cache.get(source));
    if (pending.has(source)) return pending.get(source).promise;
    const waiter = createPending();
    pending.set(source, waiter);
    observe(source);
    created.push(source);
    return waiter.promise;
  });
  for (let index = 0; index < created.length; index += MAX_BATCH_SIZE) createOperation('batch', created.slice(index, index + MAX_BATCH_SIZE)).start();
  return Promise.all(results);
}
async function retry() {
  const operations = new Set(Array.from(failures.values(), (failure) => failure.operation));
  for (const operation of operations) for (const source of operation.sources) failures.delete(source);
  syncScreen();
  await Promise.all(Array.from(operations, (operation) => operation.start()));
}
function cancel() {
  for (const attempt of Array.from(attempts)) {
    attempt.active = false;
    attempts.delete(attempt);
    attempt.controller.abort();
    recordFailures(attempt.sources, true, attempt.kind);
  }
  syncScreen();
}
async function response(source) { const entry = entryFor(source); const value = new Response(await resolve(source), { headers: { 'content-type': entry.mime } }); release(source); return value; }
async function objectUrl(source) { const current = urls.get(source); if (current) { current.references += 1; return current.url; } const url = URL.createObjectURL(await resolve(source)); urls.set(source, { url: url, references: 1 }); return url; }
function release(source) { if (source === undefined) { for (const handle of urls.values()) URL.revokeObjectURL(handle.url); urls.clear(); cache.clear(); liveBytes = 0; return; } const handle = urls.get(source); if (handle && --handle.references <= 0) { URL.revokeObjectURL(handle.url); urls.delete(source); } if (!urls.has(source) && cache.has(source)) { liveBytes -= cache.get(source).size; cache.delete(source); } }
function teardown() { for (const attempt of attempts) { attempt.active = false; attempt.controller.abort(); } attempts.clear(); for (const waiter of pending.values()) waiter.reject(new Error('optimized resource loader was torn down')); pending.clear(); failures.clear(); release(); }
window.__nappletPrivateResourceLoader = { resolve: resolve, resolveMany: resolveMany, response: response, objectUrl: objectUrl, release: release, cancel: cancel, retry: retry, teardown: teardown };
requestAnimationFrame(syncScreen);
})();`;
}

/**
 * Render the deterministic private mapping stored inside the optimized HTML.
 *
 * @param entries - Canonical private resource mappings for the optimized artifact.
 * @returns JSON for the embedded private resource table.
 */
export function renderPrivateResourceTable(entries: readonly ResourceTableEntry[]): string {
  return JSON.stringify(stableEntries(entries));
}

/**
 * Render the private resource loader.
 *
 * @param entries - Canonical private resource mappings for the optimized artifact.
 * @returns Browser source for the embedded private resource loader runtime.
 */
export function renderResourceLoader(entries: readonly ResourceTableEntry[]): string {
  return renderEmittedResourceRuntime(escapedPrivateResourceTable(entries));
}
