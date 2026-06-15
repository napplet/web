/**
 * @napplet/sdk -- Declarative config and resource byte-fetch wrapper objects.
 *
 * @packageDocumentation
 */

import type { Subscription } from '@napplet/core';
import { requireNapplet } from './require-napplet.js';

/**
 * Per-napplet declarative configuration (NAP-CONFIG): register a schema,
 * read current values, subscribe to live updates, deep-link into the
 * shell-owned settings UI, and listen for schema errors.
 *
 * @example
 * ```ts
 * import { config } from '@napplet/sdk';
 *
 * await config.registerSchema({
 *   type: 'object',
 *   properties: { theme: { type: 'string', enum: ['light', 'dark'], default: 'dark' } },
 * });
 *
 * const sub = config.subscribe((values) => { applyTheme(values.theme); });
 *
 * config.openSettings({ section: 'appearance' });
 * ```
 */
export const config = {
  /**
   * Snapshot current validated + defaulted config values.
   * @returns A one-shot ConfigValues object.
   */
  get(): Promise<Record<string, unknown>> {
    return requireNapplet().config.get();
  },

  /**
   * Subscribe to live configuration updates.
   * First delivery is an immediate snapshot; subsequent deliveries fire on change.
   * @param callback  Invoked with the full ConfigValues on every change.
   * @returns A Subscription with close() to stop listening.
   */
  subscribe(
    callback: (values: Record<string, unknown>) => void,
  ): Subscription {
    return requireNapplet().config.subscribe(callback);
  },

  /**
   * Request the shell open its settings UI for this napplet.
   * @param options  Optional { section } to deep-link by x-napplet-section name.
   */
  openSettings(options?: { section?: string }): void {
    requireNapplet().config.openSettings(options);
  },

  /**
   * Register a napplet configuration schema at runtime (escape hatch;
   * prefer manifest-declared via @napplet/vite-plugin's configSchema option).
   * @param schema   JSON Schema (draft-07+) describing the config surface.
   * @param version  Optional `$version` migration hint.
   */
  registerSchema(
    schema: Record<string, unknown>,
    version?: number,
  ): Promise<void> {
    return requireNapplet().config.registerSchema(schema, version);
  },

  /**
   * Listen for schema-registration errors pushed by the shell
   * (manifest parse failure, no-schema on subscribe-before-schema, etc.).
   * @param callback  Invoked with { code, error } on every push.
   * @returns A plain teardown function that detaches the listener.
   */
  onSchemaError(
    callback: (err: { code: string; error: string }) => void,
  ): () => void {
    return requireNapplet().config.onSchemaError(callback);
  },

  /**
   * Current schema snapshot (readonly). Populated from the
   * `<meta name="napplet-config-schema">` manifest tag at shim install,
   * updated on successful registerSchema responses.
   * @returns The registered schema, or null if none.
   */
  get schema(): Record<string, unknown> | null {
    return requireNapplet().config.schema;
  },
};

/**
 * Browser-enforced byte-fetching primitive: napplets request bytes by URL,
 * shell fetches and returns a Blob. URL space is scheme-pluggable
 * (`data:`, `https:`, `blossom:`, `nostr:`).
 *
 * @example
 * ```ts
 * import { resource } from '@napplet/sdk';
 *
 * const blob = await resource.bytes('https://example.com/avatar.png');
 * const handle = resource.bytesAsObjectURL('blossom:abc123...');
 * imgEl.src = handle.url;
 * imgEl.onload = () => handle.revoke();
 * ```
 */
export const resource = {
  /**
   * Fetch bytes for a URL through the shell's resource pipeline.
   * @param url  URL identifying the resource (any registered scheme).
   * @returns Promise resolving to the fetched bytes as a Blob.
   */
  bytes(url: string): Promise<Blob> {
    return requireNapplet().resource.bytes(url);
  },

  /**
   * Fetch bytes and return a managed object URL handle.
   * Call `revoke()` to release the underlying Blob URL.
   * @param url  URL identifying the resource.
   * @returns Synchronous handle `{ url, revoke }`.
   */
  bytesAsObjectURL(url: string): { url: string; revoke: () => void } {
    return requireNapplet().resource.bytesAsObjectURL(url);
  },
};
