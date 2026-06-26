/**
 * @napplet/nap/config -- SDK helpers wrapping window.napplet.config.
 *
 * These convenience functions delegate to `window.napplet.config.*` at call time.
 * The runtime must inject the `config` domain before these wrappers are called.
 * Each wrapper is a thin, stateless facade over the mounted API -- no domain
 * logic lives here.
 *
 * Bare names are used (not `configGet` / `configSubscribe` etc.) per the merged
 * NAP-CONFIG spec. Phase 115 re-exports these under a `config` namespace in
 * `@napplet/sdk` to avoid collisions with other NAPs.
 */

import type {
  NappletConfigSchema,
  ConfigValues,
  ConfigSchemaErrorCode,
} from './types.js';
import type { Subscription } from '@napplet/core';

/**
 * Shape of `window.napplet.config` as installed by `installConfigShim()`.
 *
 * Declared locally because `NappletGlobal` in `@napplet/core` does not yet
 * include the `config` namespace (phase 115 adds it). Keeping the guard's
 * return type local keeps this package's integration surface decoupled from
 * the phase-115 core extension.
 */
interface ConfigNamespace {
  registerSchema(schema: NappletConfigSchema, version?: number): Promise<void>;
  get(): Promise<ConfigValues>;
  subscribe(cb: (values: ConfigValues) => void): Subscription;
  openSettings(options?: { section?: string }): void;
  onSchemaError(
    cb: (err: { code: ConfigSchemaErrorCode; error: string }) => void,
  ): () => void;
  readonly schema: NappletConfigSchema | null;
}

function requireNapplet(): ConfigNamespace {
  const w = window as Window & { napplet?: { config?: ConfigNamespace } };
  if (!w.napplet?.config) {
    throw new Error(
      'window.napplet.config is unavailable -- runtime did not inject this domain',
    );
  }
  return w.napplet.config;
}

/**
 * Snapshot current validated + defaulted config values.
 *
 * @returns A one-shot ConfigValues object.
 *
 * @example
 * ```ts
 * import { get } from '@napplet/nap/config';
 *
 * const values = await get();
 * console.log(values.theme);
 * ```
 */
export function get(): Promise<ConfigValues> {
  return requireNapplet().get();
}

/**
 * Subscribe to live config values. First delivery is an immediate snapshot;
 * subsequent deliveries fire whenever the shell commits a change.
 *
 * @param cb  Called with the full validated + defaulted ConfigValues on every change.
 * @returns A Subscription with close() to stop listening.
 *
 * @example
 * ```ts
 * import { subscribe } from '@napplet/nap/config';
 *
 * const sub = subscribe((values) => { applyTheme(values.theme); });
 * // later:
 * sub.close();
 * ```
 */
export function subscribe(
  cb: (values: ConfigValues) => void,
): Subscription {
  return requireNapplet().subscribe(cb);
}

/**
 * Request the shell open its settings UI for this napplet.
 * Optional section deep-links by `x-napplet-section` name.
 *
 * @param options  Optional section deep-link.
 *
 * @example
 * ```ts
 * import { openSettings } from '@napplet/nap/config';
 *
 * openSettings({ section: 'credentials' });
 * ```
 */
export function openSettings(options?: { section?: string }): void {
  requireNapplet().openSettings(options);
}

/**
 * Register a configuration schema at runtime (escape hatch; prefer the
 * manifest-declared schema via @napplet/vite-plugin's configSchema option).
 *
 * @param schema   JSON Schema (draft-07+) describing the config surface.
 * @param version  Optional `$version` migration hint.
 * @returns Promise that resolves on successful registration, rejects on shell rejection.
 *
 * @example
 * ```ts
 * import { registerSchema } from '@napplet/nap/config';
 *
 * await registerSchema({
 *   type: 'object',
 *   properties: { theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' } },
 * }, 1);
 * ```
 */
export function registerSchema(
  schema: NappletConfigSchema,
  version?: number,
): Promise<void> {
  return requireNapplet().registerSchema(schema, version);
}

/**
 * Listen for schema-registration errors pushed by the shell (manifest parse
 * failure, subscribe-before-schema, etc.).
 *
 * @param cb  Called with { code, error } on every config.schemaError push.
 * @returns A teardown function that detaches the listener.
 *
 * @example
 * ```ts
 * import { onSchemaError } from '@napplet/nap/config';
 *
 * const off = onSchemaError((err) => console.error(err.code, err.error));
 * // later:
 * off();
 * ```
 */
export function onSchemaError(
  cb: (err: { code: ConfigSchemaErrorCode; error: string }) => void,
): () => void {
  return requireNapplet().onSchemaError(cb);
}
