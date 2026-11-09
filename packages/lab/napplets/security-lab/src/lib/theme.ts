// NAP-THEME integration. The shell delivers a colour scheme over the NAP port;
// we turn it into CSS custom properties. Everything derived (muted text,
// borders, elevated surfaces) is computed with color-mix from the three
// required colours, so a shell only has to supply the NAP-THEME minimum.

import type { Theme } from '@napplet/sdk';

export const THEME_VARIABLES = ['--lab-bg', '--lab-text', '--lab-accent', '--lab-font-body', '--lab-font-title'] as const;

export type ThemeVariables = Partial<Record<(typeof THEME_VARIABLES)[number], string>>;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function safeColor(value: unknown): string | undefined {
  return typeof value === 'string' && HEX_COLOR.test(value.trim()) ? value.trim() : undefined;
}

function safeFontName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  // Font family names end up inside a CSS value; reject anything that could
  // terminate the declaration or smuggle in another one.
  return name && !/[;{}()"'\\]/.test(name) ? `"${name}"` : undefined;
}

/** Map a NAP-THEME payload onto the lab's CSS variables. Unsafe values are dropped. */
export function themeToCssVariables(theme: Theme | null | undefined): ThemeVariables {
  if (!theme || typeof theme !== 'object') return {};
  const out: ThemeVariables = {};
  const colors = theme.colors ?? ({} as Theme['colors']);
  const background = safeColor(colors.background);
  const text = safeColor(colors.text);
  const primary = safeColor(colors.primary);
  if (background) out['--lab-bg'] = background;
  if (text) out['--lab-text'] = text;
  if (primary) out['--lab-accent'] = primary;
  const body = safeFontName(theme.fonts?.body?.name);
  const title = safeFontName(theme.fonts?.title?.name);
  if (body) out['--lab-font-body'] = body;
  if (title) out['--lab-font-title'] = title;
  return out;
}

/** Apply (or clear, when `theme` is null) theme variables on a root element. */
export function applyTheme(theme: Theme | null | undefined, root: HTMLElement): ThemeVariables {
  const variables = themeToCssVariables(theme);
  for (const name of THEME_VARIABLES) {
    const value = variables[name];
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }
  return variables;
}
