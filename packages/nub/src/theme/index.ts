/**
 * @napplet/nub/theme -- Theme NUB module.
 *
 * Exports typed message definitions for the theme domain and registers
 * the 'theme' domain with the core dispatch infrastructure on import.
 *
 * @example
 * ```ts
 * import type { ThemeGetMessage, ThemeNubMessage, Theme } from '@napplet/nub/theme';
 * import { DOMAIN } from '@napplet/nub/theme';
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
  ThemeNubMessage,
} from './types.js';

import { registerNub } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the theme domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'theme'.
 */
registerNub(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
