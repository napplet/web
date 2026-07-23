/**
 * Napplet NAP config types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/config -- NAP-CONFIG message types for per-napplet declarative
 * configuration in the JSON envelope wire protocol.
 *
 * Defines 8 message types:
 * - Napplet -> Shell: registerSchema, get, subscribe, unsubscribe, openSettings
 * - Shell -> Napplet: registerSchema.result, values, schemaError
 *
 * Plus the NappletConfigSchema / ConfigValues type aliases, the
 * NappletConfigSchemaExtensions potentiality type, and the
 * ConfigSchemaErrorCode union.
 *
 * All message types form a discriminated union on the `type` field.
 * Napplet is a strict reader: no config.set wire message exists (shell is
 * sole writer per NAP-CONFIG spec).
 */

import type { NappletMessage } from '@napplet/core';

/** The NAP domain name for config messages. */
export const DOMAIN = 'config' as const;

export type JsonSchemaPrimitive = string | number | boolean | null;
export type JsonSchemaValue =
  | JsonSchemaPrimitive
  | { readonly [key: string]: JsonSchemaValue | undefined }
  | readonly JsonSchemaValue[];

export type JsonSchemaTypeName =
  | 'array'
  | 'boolean'
  | 'integer'
  | 'null'
  | 'number'
  | 'object'
  | 'string';

/**
 * JSON Schema (draft-07+) describing a napplet's configuration surface.
 *
 * NAP-CONFIG restricts usage to the Core Subset defined in the spec (no
 * `$ref`, no `pattern`, no `oneOf`/`anyOf`/`allOf`/`not`, no `if`/`then`/`else`,
 * no tuple-typed arrays, max nesting depth 4). Subset enforcement is
 * shell-side.
 *
 * @see NAP-CONFIG Schema Contract section
 */
export interface NappletConfigSchema {
  $id?: string;
  id?: string;
  $schema?: string;
  title?: string;
  description?: string;
  type?: JsonSchemaTypeName | readonly JsonSchemaTypeName[];
  properties?: Readonly<Record<string, NappletConfigSchema>>;
  required?: readonly string[];
  items?: NappletConfigSchema | readonly NappletConfigSchema[];
  additionalProperties?: boolean | NappletConfigSchema;
  enum?: readonly JsonSchemaValue[];
  const?: JsonSchemaValue;
  default?: JsonSchemaValue;
  examples?: readonly JsonSchemaValue[];
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  format?: string;
  [keyword: string]: unknown;
}

/**
 * Spec-name alias for {@link NappletConfigSchema}.
 * The NAP-CONFIG public API Surface uses the bare name `ConfigSchema`.
 */
export type ConfigSchema = NappletConfigSchema;

/**
 * Shell-validated, shell-defaulted configuration values delivered to a napplet.
 *
 * Keys correspond to properties declared in the currently-registered schema;
 * values are JSON-serializable. Shell is the sole writer -- napplets observe
 * values via `config.get` (one-shot) or `config.subscribe` (snapshot + push).
 */
export type ConfigValues = Record<string, unknown>;

/**
 * Discriminated error codes emitted on `config.registerSchema.result` (when
 * `ok: false`) and on `config.schemaError` pushes. Corresponds to the
 * Error Envelopes section of the NAP-CONFIG spec.
 */
export type ConfigSchemaErrorCode =
  | 'invalid-schema'
  | 'unsupported-draft'
  | 'ref-not-allowed'
  | 'pattern-not-allowed'
  | 'secret-with-default'
  | 'schema-too-deep'
  | 'version-conflict'
  | 'no-schema';

/**
 * Standardized `x-napplet-*` extension keys recognized by conformant shells.
 * Napplets MAY declare these on any property of their schema; shells MAY act
 * on them or ignore them. Shells MUST NOT reject a schema on the basis of
 * unrecognized `x-napplet-*` keys.
 *
 * See NAP-CONFIG "Standardized Extensions (Potentialities)" table.
 *
 * @example
 * ```ts
 * const schema: NappletConfigSchema = {
 *   type: 'object',
 *   properties: {
 *     apiKey: {
 *       type: 'string',
 *       'x-napplet-secret': true,
 *       'x-napplet-section': 'credentials',
 *       'x-napplet-order': 1,
 *     },
 *   },
 * };
 * ```
 */
export interface NappletConfigSchemaExtensions {
  /**
   * Marks a `string` property as containing sensitive data. Shells MUST
   * mask input, SHOULD suppress logging, and MUST NOT accept a `default`
   * on any property also marked `x-napplet-secret: true` (returns
   * `secret-with-default`).
   */
  'x-napplet-secret'?: boolean;

  /**
   * Group key. Shells SHOULD render properties with the same section value
   * under a common heading in the settings UI.
   */
  'x-napplet-section'?: string;

  /**
   * Display-order hint within a section. Ascending; ties break alphabetically
   * by property key. Properties without `x-napplet-order` sort after.
   */
  'x-napplet-order'?: number;
}

/**
 * Base interface for all config NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface ConfigMessage extends NappletMessage {
  /** Message type in "config.<action>" format (possibly with a `.result` suffix). */
  type: `config.${string}`;
}

/**
 * Register a napplet config schema with the shell at runtime.
 *
 * @example
 * ```ts
 * const msg: ConfigRegisterSchemaMessage = {
 *   type: 'config.registerSchema',
 *   id: crypto.randomUUID(),
 *   schema: { type: 'object', properties: { theme: { type: 'string' } } },
 *   version: 1,
 * };
 * ```
 */
export interface ConfigRegisterSchemaMessage extends ConfigMessage {
  type: 'config.registerSchema';
  /** Correlation ID; shell responds with `config.registerSchema.result` carrying the same id. */
  id: string;
  /** JSON Schema (draft-07+) describing the napplet's config surface. */
  schema: NappletConfigSchema;
  /** Migration version hint (`$version` potentiality). */
  version?: number;
}

/**
 * Request a one-shot snapshot of current config values.
 * Shell responds with `config.values` bearing the same `id`.
 *
 * @example
 * ```ts
 * const msg: ConfigGetMessage = {
 *   type: 'config.get',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface ConfigGetMessage extends ConfigMessage {
  type: 'config.get';
  /** Correlation ID. */
  id: string;
}

/**
 * Start the live push stream. Shell MUST emit an immediate initial
 * `config.values` push (no `id`) as snapshot, then push on every change.
 *
 * @example
 * ```ts
 * const msg: ConfigSubscribeMessage = { type: 'config.subscribe' };
 * ```
 */
export interface ConfigSubscribeMessage extends ConfigMessage {
  type: 'config.subscribe';
}

/**
 * Stop the live push stream (clean-teardown path).
 * The reference shim SHOULD only emit this when the last local subscriber detaches.
 *
 * @example
 * ```ts
 * const msg: ConfigUnsubscribeMessage = { type: 'config.unsubscribe' };
 * ```
 */
export interface ConfigUnsubscribeMessage extends ConfigMessage {
  type: 'config.unsubscribe';
}

/**
 * Request the shell open its settings UI for this napplet.
 * Optional `section` deep-links by `x-napplet-section` name.
 *
 * @example
 * ```ts
 * const msg: ConfigOpenSettingsMessage = {
 *   type: 'config.openSettings',
 *   section: 'credentials',
 * };
 * ```
 */
export interface ConfigOpenSettingsMessage extends ConfigMessage {
  type: 'config.openSettings';
  /** Optional section name; MUST correspond to an `x-napplet-section` declared in the current schema. */
  section?: string;
}

/**
 * Positive-ACK result for `config.registerSchema`.
 * `ok: true` = schema accepted. `ok: false` = rejected; `code` and `error` populated.
 *
 * @example
 * ```ts
 * // success:
 * const ok: ConfigRegisterSchemaResultMessage = {
 *   type: 'config.registerSchema.result',
 *   id: 'r1',
 *   ok: true,
 * };
 * // rejection:
 * const bad: ConfigRegisterSchemaResultMessage = {
 *   type: 'config.registerSchema.result',
 *   id: 'r2',
 *   ok: false,
 *   code: 'pattern-not-allowed',
 *   error: 'JSON Schema `pattern` keyword is not permitted in the Core Subset',
 * };
 * ```
 */
export interface ConfigRegisterSchemaResultMessage extends ConfigMessage {
  type: 'config.registerSchema.result';
  /** Correlation ID matching the original `config.registerSchema`. */
  id: string;
  /** `true` = accepted; `false` = rejected (code + error populated). */
  ok: boolean;
  /** Populated when `ok === false`. */
  code?: ConfigSchemaErrorCode;
  /** Human-readable rejection reason. Populated when `ok === false`. */
  error?: string;
}

/**
 * Configuration values delivery. DUAL USE:
 * - With `id` present: correlated response to `config.get`.
 * - With `id` absent: subscription push (initial snapshot or change notification).
 *
 * Always carries the full validated+defaulted config object (no diffs).
 *
 * @example
 * ```ts
 * // push delivery (no id):
 * const push: ConfigValuesMessage = {
 *   type: 'config.values',
 *   values: { theme: 'dark', fontSize: 14 },
 * };
 * // correlated response:
 * const rsp: ConfigValuesMessage = {
 *   type: 'config.values',
 *   id: 'g1',
 *   values: { theme: 'dark', fontSize: 14 },
 * };
 * ```
 */
export interface ConfigValuesMessage extends ConfigMessage {
  type: 'config.values';
  /** Present = correlated response to `config.get`; absent = subscription push. */
  id?: string;
  /** Shell-validated, defaulted values. Keys match the currently-registered schema. */
  values: ConfigValues;
}

/**
 * Pushed when the shell rejects a `config.registerSchema` call asynchronously
 * (e.g., manifest schema cannot be parsed at napplet load time), OR when
 * `config.subscribe` / `config.get` arrives before any schema is registered
 * (`code: 'no-schema'`).
 *
 * @example
 * ```ts
 * const err: ConfigSchemaErrorMessage = {
 *   type: 'config.schemaError',
 *   code: 'invalid-schema',
 *   error: 'schema root must be of type `object`',
 * };
 * ```
 */
export interface ConfigSchemaErrorMessage extends ConfigMessage {
  type: 'config.schemaError';
  /** Human-readable explanation of the error. */
  error: string;
  /** Machine-readable error code (see {@link ConfigSchemaErrorCode}). */
  code: ConfigSchemaErrorCode;
}

/** Napplet -> Shell config request messages. */
export type ConfigRequestMessage =
  | ConfigRegisterSchemaMessage
  | ConfigGetMessage
  | ConfigSubscribeMessage
  | ConfigUnsubscribeMessage
  | ConfigOpenSettingsMessage;

/** Shell -> Napplet config result / push messages. */
export type ConfigResultMessage =
  | ConfigRegisterSchemaResultMessage
  | ConfigValuesMessage
  | ConfigSchemaErrorMessage;

/** All config NAP message types (discriminated union on `type` field). */
export type ConfigNapMessage = ConfigRequestMessage | ConfigResultMessage;
