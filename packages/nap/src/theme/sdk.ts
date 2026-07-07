/**
 * Napplet NAP theme sdk entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/theme -- SDK helpers wrapping window.napplet.theme.
 *
 * These convenience functions delegate to `window.napplet.theme.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal, Subscription } from '@napplet/core';
import type { Theme } from './types.js';

function requireTheme(): NonNullable<NappletGlobal['theme']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.theme) {
    throw new Error('window.napplet.theme is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.theme;
}

/**
 * Get the shell's current active theme.
 *
 * @returns The current theme payload
 *
 * @example
 * ```ts
 * import { themeGet } from '@napplet/nap/theme';
 *
 * const theme = await themeGet();
 * ```
 */
export function themeGet(): Promise<Theme> {
  return requireTheme().get();
}

/**
 * Listen for shell-pushed theme changes.
 *
 * @returns Subscription with close() to detach the handler
 *
 * @example
 * ```ts
 * import { themeOnChanged } from '@napplet/nap/theme';
 *
 * const sub = themeOnChanged((theme) => applyTheme(theme));
 * ```
 */
export function themeOnChanged(handler: (theme: Theme) => void): Subscription {
  return requireTheme().onChanged(handler);
}
