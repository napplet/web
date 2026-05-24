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

export type {
  // Schema + values aliases
  NappletConfigSchema,
  ConfigSchema,
  ConfigValues,
  ConfigSchemaErrorCode,
  // Schema extension potentialities
  NappletConfigSchemaExtensions,
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
  ConfigRequestMessage,
  ConfigResultMessage,
  ConfigNubMessage,
} from './types.js';

export {
  installConfigShim,
  handleConfigMessage,
} from './shim.js';

export {
  get,
  subscribe,
  openSettings,
  registerSchema,
  onSchemaError,
} from './sdk.js';
