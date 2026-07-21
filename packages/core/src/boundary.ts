/**
 * @napplet/core -- iframe boundary helpers for clone-safe `postMessage`.
 *
 * Every NAP shim crosses the napplet ⇄ shell boundary by posting a JSON
 * envelope through `window.parent.postMessage(msg, '*')`, which **structured-
 * clones** its argument. Framework reactive values -- Svelte 5 `$state`, Vue
 * `reactive`, Solid stores -- are `Proxy` objects that are NOT structured-
 * cloneable, so `postMessage` throws a `DataCloneError`. In an async/Promise
 * path that throw becomes an unhandled rejection that gets silently swallowed,
 * and the envelope simply never crosses the boundary (napplet/web#67).
 *
 * These helpers make that failure mode disappear or surface loudly, depending
 * on the configured {@link CloneMode}:
 *
 * - **`'auto'` (default)** -- post the envelope as-is; only if the structured
 *   clone fails, take a proxy-stripping {@link toCloneableSnapshot} and retry,
 *   warning once per message type. Zero overhead on the happy path; reactive
 *   napplets "just work"; a genuinely non-cloneable value (a function, etc.)
 *   still throws a loud, actionable, synchronous error.
 * - **`'strict'`** -- never auto-recover; on `DataCloneError` throw the loud
 *   actionable error immediately. Use this to catch accidental proxy leaks.
 * - **`'snapshot'`** -- always snapshot before posting (eager normalization).
 *
 * NOTE: this module references no browser globals. The post target is passed
 * in by the caller (NAP shims pass `window.parent`), so `@napplet/core` stays
 * DOM-free. These helpers are pure SDK plumbing: the bytes placed on the wire
 * are identical plain envelopes either way, so nothing here is protocol surface.
 *
 * @packageDocumentation
 */

/**
 * How {@link sendEnvelope} treats arguments that are not structured-cloneable.
 *
 * - `'auto'` -- post as-is, snapshot-and-retry on `DataCloneError` (default).
 * - `'strict'` -- throw a loud actionable error on `DataCloneError`.
 * - `'snapshot'` -- always snapshot before posting.
 */
export type CloneMode = 'auto' | 'strict' | 'snapshot';

/** Minimal post target -- `window.parent` satisfies this without DOM types. */
export interface PostMessageTarget {
  postMessage(message: unknown, targetOrigin: string): void;
}

let cloneMode: CloneMode = 'auto';

/** Message types we have already warned about (auto-recovery), to warn once each. */
const warnedTypes = new Set<string>();

/**
 * Set the global clone mode for {@link sendEnvelope}.
 *
 * @param mode - One of `'auto'` (default), `'strict'`, or `'snapshot'`.
 *
 * @example
 * ```ts
 * import { setCloneMode } from '@napplet/core';
 * // Eagerly snapshot every outbound argument (framework-heavy napplets):
 * setCloneMode('snapshot');
 * ```
 */
export function setCloneMode(mode: CloneMode): void {
  cloneMode = mode;
}

/**
 * Return the current clone mode.
 *
 * @returns The active {@link CloneMode}.
 */
export function getCloneMode(): CloneMode {
  return cloneMode;
}

/**
 * Reset the once-per-type auto-recovery warning state.
 *
 * Mostly useful in tests and when a shell re-initializes the shim runtime.
 */
export function clearCloneWarnings(): void {
  warnedTypes.clear();
}

/** Tags of values that are structured-cloneable leaves -- copied by reference. */
function isCloneableLeaf(value: object): boolean {
  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  ) {
    return true;
  }
  // Tag check keeps Blob/File detection DOM-lib-free.
  const tag = Object.prototype.toString.call(value);
  return tag === '[object Blob]' || tag === '[object File]';
}

/**
 * Produce a structured-cloneable deep snapshot of `value`, stripping framework
 * reactive proxies (Svelte 5 `$state`, Vue `reactive`, Solid stores) into plain
 * objects and arrays.
 *
 * Unlike a `JSON` round-trip, this **preserves binary** (`Uint8Array`,
 * `ArrayBuffer`, typed arrays), `Date`, `RegExp`, `Map`, and `Set`, and handles
 * cyclic references. Functions and symbols are not representable and throw a
 * `TypeError` -- matching `structuredClone`, so genuinely non-cloneable input is
 * never silently masked.
 *
 * @typeParam T - The value type (preserved in the return type).
 * @param value - The value to snapshot.
 * @returns A plain, structured-cloneable copy of `value`.
 * @throws {TypeError} If `value` contains a function or symbol.
 *
 * @example
 * ```ts
 * import { toCloneableSnapshot } from '@napplet/core';
 * // In a Svelte 5 napplet, filters/relays are $state proxies:
 * napplet.outbox.subscribe(
 *   toCloneableSnapshot(filters),
 *   { relays: toCloneableSnapshot(relays), timeoutMs: 3000 },
 * );
 * ```
 */
export function toCloneableSnapshot<T>(value: T): T {
  return snapshot(value, new WeakMap()) as T;
}

function snapshot(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (value === null) return null;

  const type = typeof value;
  if (type === 'function' || type === 'symbol') {
    throw new TypeError(
      `toCloneableSnapshot: a ${type} is not structured-cloneable and cannot be sent across the napplet boundary`,
    );
  }
  if (type !== 'object') return value; // string, number, boolean, bigint, undefined

  const obj = value as object;
  const existing = seen.get(obj);
  if (existing !== undefined) return existing; // cyclic / shared reference

  if (isCloneableLeaf(obj)) return obj;

  if (Array.isArray(obj)) {
    const out: unknown[] = [];
    seen.set(obj, out);
    for (const item of obj) out.push(snapshot(item, seen));
    return out;
  }

  if (obj instanceof Map) {
    const out = new Map<unknown, unknown>();
    seen.set(obj, out);
    for (const [k, v] of obj) out.set(snapshot(k, seen), snapshot(v, seen));
    return out;
  }

  if (obj instanceof Set) {
    const out = new Set<unknown>();
    seen.set(obj, out);
    for (const v of obj) out.add(snapshot(v, seen));
    return out;
  }

  // Plain object, class instance, or reactive proxy: rebuild from own
  // enumerable keys (reads pass transparently through framework proxies).
  const out: Record<string, unknown> = {};
  seen.set(obj, out);
  for (const key of Object.keys(obj)) {
    out[key] = snapshot((obj as Record<string, unknown>)[key], seen);
  }
  return out;
}

function isDataCloneError(err: unknown): boolean {
  return err instanceof Error && err.name === 'DataCloneError';
}

function cloneError(type: string, cause: unknown): Error {
  const err = new Error(
    `napplet boundary: message "${type}" could not be sent -- an argument is not ` +
      `structured-cloneable (a reactive Proxy?). Svelte 5 $state / Vue reactive / ` +
      `Solid store values can't be postMessage'd. Pass a plain snapshot ` +
      `(e.g. $state.snapshot(x), toCloneableSnapshot(x) from @napplet/core), or ` +
      `call setCloneMode('snapshot') to normalize automatically.`,
  );
  err.name = 'NappletDataCloneError';
  (err as { cause?: unknown }).cause = cause;
  return err;
}

/**
 * Post a JSON envelope to the shell across the iframe boundary, handling
 * non-structured-cloneable arguments per the active {@link CloneMode}.
 *
 * This is the single boundary chokepoint every NAP shim uses instead of calling
 * `target.postMessage(msg, '*')` directly, so that a `DataCloneError` is either
 * transparently recovered (`'auto'`/`'snapshot'`) or raised as a loud,
 * actionable, synchronous error (`'strict'`, or any mode when the value is
 * genuinely non-cloneable) rather than swallowed in an async path.
 *
 * @param target - The post target (NAP shims pass `window.parent`).
 * @param message - The envelope; must carry a `type` discriminator.
 * @param targetOrigin - The `postMessage` target origin (defaults to `'*'`).
 * @throws {Error} `NappletDataCloneError` if the message cannot be made cloneable.
 *
 * @example
 * ```ts
 * import { sendEnvelope } from '@napplet/core';
 * sendEnvelope(window.parent, { type: 'outbox.subscribe', id, subId, filters });
 * ```
 */
export function sendEnvelope<T extends { type: string }>(
  target: PostMessageTarget,
  message: T,
  targetOrigin = '*',
): void {
  if (cloneMode === 'snapshot') {
    let snap: unknown;
    try {
      snap = toCloneableSnapshot(message);
    } catch (cause) {
      throw cloneError(message.type, cause);
    }
    try {
      target.postMessage(snap, targetOrigin);
    } catch (cause) {
      if (isDataCloneError(cause)) throw cloneError(message.type, cause);
      throw cause;
    }
    return;
  }

  try {
    target.postMessage(message, targetOrigin);
    return;
  } catch (cause) {
    if (!isDataCloneError(cause)) throw cause;
    if (cloneMode === 'strict') throw cloneError(message.type, cause);

    // 'auto': snapshot-and-retry, then warn once per message type.
    try {
      target.postMessage(toCloneableSnapshot(message), targetOrigin);
    } catch {
      throw cloneError(message.type, cause);
    }
    if (!warnedTypes.has(message.type)) {
      warnedTypes.add(message.type);
      console.warn(
        `napplet boundary: "${message.type}" received a non-cloneable argument ` +
          `(a reactive Proxy?) and was auto-snapshotted before sending. Pass a ` +
          `plain snapshot (e.g. $state.snapshot(x), toCloneableSnapshot(x)) to ` +
          `silence this, or call setCloneMode('strict') to make it throw.`,
      );
    }
  }
}
