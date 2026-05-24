
import type {
  NappletConfigSchema,
  ConfigValues,
  ConfigSchemaErrorCode,
  ConfigRegisterSchemaMessage,
  ConfigGetMessage,
  ConfigSubscribeMessage,
  ConfigUnsubscribeMessage,
  ConfigOpenSettingsMessage,
  ConfigRegisterSchemaResultMessage,
  ConfigValuesMessage,
  ConfigSchemaErrorMessage,
} from './types.js';
import type { Subscription } from '@napplet/core';

type ConfigWindow = Window & typeof globalThis & {
  napplet?: Record<string, unknown> & { config?: Record<string, unknown> };
};

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

/** Default timeout for correlated requests (30 seconds). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Meta tag name carrying the manifest-declared JSON-escaped schema. */
const SCHEMA_META_NAME = 'napplet-config-schema';

/** Currently-registered schema (from manifest meta tag or config.registerSchema). null until set. */
let currentSchema: NappletConfigSchema | null = null;

/** Latest config.values snapshot (populated by every push OR correlated response). null until first delivery. */
let lastValues: ConfigValues | null = null;

/** Local live subscribers. Ref-counted: wire-level config.subscribe emitted on 0->1, unsubscribe on 1->0. */
const subscribers = new Set<(values: ConfigValues) => void>();

/** Schema-error fan-out listeners (uncorrelated pushes). */
const schemaErrorHandlers = new Set<(err: { code: ConfigSchemaErrorCode; error: string }) => void>();

/** Pending config.get requests: correlation id -> promise resolvers. */
const pendingGets = new Map<string, {
  resolve: (values: ConfigValues) => void;
  reject: (reason: Error) => void;
}>();

/** Pending config.registerSchema requests: correlation id -> resolvers + schema (to cache on success). */
const pendingRegistrations = new Map<string, {
  resolve: () => void;
  reject: (reason: Error) => void;
  schema: NappletConfigSchema;
}>();

/** Double-install guard. */
let installed = false;

/**
 * Handle config.* messages from the shell. Called by the central shim dispatcher.
 *
 * Routes three shell->napplet message types:
 * - `config.registerSchema.result` -- positive-ACK for registerSchema (correlated by id)
 * - `config.values` -- dual-use: correlated response to config.get (with id) OR subscription push (without id)
 * - `config.schemaError` -- uncorrelated error push (e.g., no-schema, manifest parse failure)
 *
 * @param msg  A parsed envelope object with at least a `type` string field
 */
export function handleConfigMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<ConfigRegisterSchemaResultMessage>(msg, 'config.registerSchema.result')) {
    handleRegisterSchemaResult(msg);
  } else if (isMessageType<ConfigValuesMessage>(msg, 'config.values')) {
    handleValues(msg);
  } else if (isMessageType<ConfigSchemaErrorMessage>(msg, 'config.schemaError')) {
    handleSchemaError(msg);
  }
}

/**
 * Handle config.registerSchema.result: resolve or reject the pending registration
 * promise correlated by id. On ok:true, update the local schema cache so the
 * `schema` accessor reflects the newly-accepted schema.
 */
function handleRegisterSchemaResult(msg: ConfigRegisterSchemaResultMessage): void {
  const pending = pendingRegistrations.get(msg.id);
  if (!pending) return;
  pendingRegistrations.delete(msg.id);

  if (msg.ok) {
    currentSchema = pending.schema;
    pending.resolve();
  } else {
    const code = msg.code ?? 'invalid-schema';
    const error = msg.error ?? 'schema rejected';
    pending.reject(new Error(`${code}: ${error}`));
  }
}

/**
 * Handle config.values: update the cached snapshot unconditionally, then either
 * resolve a pending config.get (when `id` is present) or fan out to live
 * subscribers (when `id` is absent).
 */
function handleValues(msg: ConfigValuesMessage): void {
  // Always cache the latest values so late-subscribers can receive a synchronous
  // initial snapshot via queueMicrotask without a round-trip to the shell.
  lastValues = msg.values;

  if (typeof msg.id === 'string') {
    // Correlated response to config.get.
    const pending = pendingGets.get(msg.id);
    if (!pending) return;
    pendingGets.delete(msg.id);
    pending.resolve(msg.values);
    return;
  }

  // Subscription push (no id). Fan out to every live local subscriber.
  for (const cb of subscribers) {
    try {
      cb(msg.values);
    } catch {
      /* subscriber callback threw; best-effort -- swallow to avoid poisoning the loop */
    }
  }
}

/**
 * Handle config.schemaError: fan out to every registered onSchemaError listener.
 * These pushes are uncorrelated (no id); they surface background failures such as
 * manifest schema parse errors or subscribe-before-schema.
 */
function handleSchemaError(msg: ConfigSchemaErrorMessage): void {
  const payload = { code: msg.code, error: msg.error };
  for (const cb of schemaErrorHandlers) {
    try {
      cb(payload);
    } catch {
      /* listener threw; best-effort -- swallow */
    }
  }
}

/**
 * Read the manifest-declared schema from <meta name="napplet-config-schema"> if present.
 * Silent on any failure (missing tag, missing content, invalid JSON) -- schema remains null.
 */
function readManifestSchema(): NappletConfigSchema | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(`meta[name="${SCHEMA_META_NAME}"]`);
  if (!el) return null;
  const raw = el.getAttribute('content');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NappletConfigSchema;
  } catch {
    return null;
  }
}

/**
 * Register a napplet configuration schema at runtime.
 *
 * Prefer the manifest-declared path (via @napplet/vite-plugin's configSchema
 * option) for static schemas -- this is the runtime escape hatch for schemas
 * that genuinely cannot be known at build time.
 *
 * Correlates via UUID; resolves on `config.registerSchema.result { ok: true }`;
 * rejects with `Error(code + ': ' + error)` on `{ ok: false }`.
 *
 * @param schema   JSON Schema (draft-07+) describing this napplet's config surface.
 * @param version  Optional `$version` migration hint.
 * @returns Promise<void> that resolves on acceptance.
 */
export function registerSchema(
  schema: NappletConfigSchema,
  version?: number,
): Promise<void> {
  const id = crypto.randomUUID();

  return new Promise<void>((resolve, reject) => {
    pendingRegistrations.set(id, { resolve, reject, schema });

    const msg: ConfigRegisterSchemaMessage = version === undefined
      ? { type: 'config.registerSchema', id, schema }
      : { type: 'config.registerSchema', id, schema, version };
    window.parent.postMessage(msg, '*');

    setTimeout(() => {
      if (pendingRegistrations.delete(id)) {
        reject(new Error('config.registerSchema timed out'));
      }
    }, REQUEST_TIMEOUT_MS);
  });
}

/**
 * Request a one-shot snapshot of the current validated + defaulted config values.
 *
 * Correlates via UUID; resolves on `config.values` carrying the matching id.
 *
 * @returns Promise resolving to the current ConfigValues.
 */
export function get(): Promise<ConfigValues> {
  const id = crypto.randomUUID();

  return new Promise<ConfigValues>((resolve, reject) => {
    pendingGets.set(id, { resolve, reject });

    const msg: ConfigGetMessage = { type: 'config.get', id };
    window.parent.postMessage(msg, '*');

    setTimeout(() => {
      if (pendingGets.delete(id)) {
        reject(new Error('config.get timed out'));
      }
    }, REQUEST_TIMEOUT_MS);
  });
}

/**
 * Subscribe to live configuration updates.
 *
 * The wire-level `config.subscribe` is emitted only on the 0->1 local-subscriber
 * transition; subsequent subscribers piggyback on the existing wire subscription.
 * Late subscribers (arriving after a snapshot has already landed) receive an
 * initial callback via `queueMicrotask` using the cached `lastValues`, so every
 * subscriber gets an initial delivery without waiting for the next push.
 *
 * The returned Subscription's `close()` removes the callback; on 1->0 transition
 * the wire-level `config.unsubscribe` is emitted.
 *
 * @param callback  Invoked with the current ConfigValues snapshot on each push.
 * @returns A Subscription with `close()` to detach.
 */
export function subscribe(
  callback: (values: ConfigValues) => void,
): Subscription {
  const firstSubscriber = subscribers.size === 0;
  subscribers.add(callback);

  if (firstSubscriber) {
    const msg: ConfigSubscribeMessage = { type: 'config.subscribe' };
    window.parent.postMessage(msg, '*');
  } else if (lastValues !== null) {
    // Late subscriber: we already have a cached snapshot. Deliver it on the
    // next microtask so the caller sees the Subscription returned first.
    const snapshot = lastValues;
    queueMicrotask(() => {
      if (subscribers.has(callback) && snapshot !== null) {
        try {
          callback(snapshot);
        } catch {
          /* best-effort */
        }
      }
    });
  }

  return {
    close(): void {
      const existed = subscribers.delete(callback);
      if (existed && subscribers.size === 0) {
        const msg: ConfigUnsubscribeMessage = { type: 'config.unsubscribe' };
        window.parent.postMessage(msg, '*');
      }
    },
  };
}

/**
 * Request the shell open its settings UI for this napplet.
 *
 * Fire-and-forget. The optional `section` deep-links to a named section
 * declared via the `x-napplet-section` extension somewhere in the current
 * schema. The shell decides render style (modal, panel, tab) and MAY ignore
 * an unknown section silently.
 *
 * @param options.section  Optional section name to deep-link to.
 */
export function openSettings(options?: { section?: string }): void {
  const section = options?.section;
  const msg: ConfigOpenSettingsMessage = section === undefined
    ? { type: 'config.openSettings' }
    : { type: 'config.openSettings', section };
  window.parent.postMessage(msg, '*');
}

/**
 * Listen for schema-registration errors pushed by the shell.
 *
 * Fires on every `config.schemaError` push (no correlation id); typical
 * triggers are manifest schema parse failures at napplet load time and
 * `no-schema` when a subscribe/get arrives before any schema has been
 * registered.
 *
 * @param callback  Invoked with `{ code, error }` on each error push.
 * @returns A plain teardown function that removes the listener.
 */
export function onSchemaError(
  callback: (err: { code: ConfigSchemaErrorCode; error: string }) => void,
): () => void {
  schemaErrorHandlers.add(callback);
  return () => {
    schemaErrorHandlers.delete(callback);
  };
}

/**
 * Install the config shim: read the manifest-declared schema (if any) from
 * `<meta name="napplet-config-schema">` and mount `window.napplet.config`.
 *
 * Idempotent: a second call is a no-op and returns a no-op cleanup.
 *
 * @returns cleanup function that clears all state and removes the window mount.
 */
export function installConfigShim(): () => void {
  if (installed) {
    return () => { /* already installed */ };
  }

  // 1. Read manifest-declared schema synchronously so the `schema` accessor
  //    has a value from the first microtask of napplet execution.
  currentSchema = readManifestSchema();

  // 2. Mount window.napplet.config. Use Object.defineProperty for the readonly
  //    `schema` accessor so authors reading window.napplet.config.schema at any
  //    point in time get the current cached value (updated by successful
  //    registerSchema responses).
  const configWindow = window as ConfigWindow;
  const napplet = configWindow.napplet ?? (configWindow.napplet = {});
  const api: Record<string, unknown> = {
    registerSchema,
    get,
    subscribe,
    openSettings,
    onSchemaError,
  };
  Object.defineProperty(api, 'schema', {
    get: () => currentSchema,
    enumerable: true,
    configurable: false,
  });
  napplet.config = api;

  installed = true;

  return () => {
    subscribers.clear();
    schemaErrorHandlers.clear();
    pendingGets.clear();
    pendingRegistrations.clear();
    lastValues = null;
    currentSchema = null;
    if (napplet.config === api) delete napplet.config;
    installed = false;
  };
}
