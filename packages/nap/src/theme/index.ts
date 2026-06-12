/**
 * @napplet/nap/theme -- Theme NAP module.
 *
 * Exports typed message definitions for the theme domain and registers
 * the 'theme' domain with the core dispatch infrastructure on import.
 *
 * @example
 * ```ts
 * import type { ThemeGetMessage, ThemeNapMessage, Theme } from '@napplet/nap/theme';
 * import { DOMAIN } from '@napplet/nap/theme';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  ThemeColors,
  ThemeFont,
  ThemeBackground,
  Theme,
  ThemeMessage,
  ThemeGetMessage,
  ThemeGetResultMessage,
  ThemeChangedMessage,
  ThemeRequestMessage,
  ThemeResultMessage,
  ThemeNapMessage,
} from './types.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the theme domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'theme'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
