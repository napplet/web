/**
 * @napplet/nub/config -- NUB-CONFIG message types, shim installer, and SDK
 * helpers for per-napplet declarative configuration.
 *
 * Per-napplet declarative configuration: napplet declares a JSON Schema
 * (typically at build time via @napplet/vite-plugin's configSchema option,
 * or at runtime via registerSchema); shell renders settings UI, validates,
 * persists values scoped by (dTag, aggregateHash), and delivers live values
 * via snapshot + push. Shell is the sole writer.
 *
 * @example
 * ```ts
 * // Cherry-picked import:
 * import { installConfigShim, subscribe, registerSchema, DOMAIN } from '@napplet/nub/config';
 *
 * installConfigShim();
 *
 * await registerSchema({
 *   type: 'object',
 *   properties: { theme: { type: 'string', default: 'dark' } },
 * });
 *
 * const sub = subscribe((values) => { applyTheme(values.theme); });
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

// ─── Type Exports ──────────────────────────────────────────────────────────

export type {
  // Schema + values aliases
  NappletConfigSchema,
  ConfigSchema,
  ConfigValues,
  ConfigSchemaErrorCode,
  // Schema extension potentialities
  NappletConfigSchemaExtensions,
  // Base message type
  ConfigMessage,
  // Napplet -> Shell request messages
  ConfigRegisterSchemaMessage,
  ConfigGetMessage,
  ConfigSubscribeMessage,
  ConfigUnsubscribeMessage,
  ConfigOpenSettingsMessage,
  // Shell -> Napplet result / push messages
  ConfigRegisterSchemaResultMessage,
  ConfigValuesMessage,
  ConfigSchemaErrorMessage,
  // Discriminated unions
  ConfigRequestMessage,
  ConfigResultMessage,
  ConfigNubMessage,
} from './types.js';

// ─── Shim Exports ─────────────────────────────────────────────────────────

export {
  installConfigShim,
  handleConfigMessage,
} from './shim.js';

// ─── SDK Exports ──────────────────────────────────────────────────────────

export {
  get,
  subscribe,
  openSettings,
  registerSchema,
  onSchemaError,
} from './sdk.js';
