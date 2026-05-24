/**
 * @napplet/nub/theme -- Shell-provided theming message types for the JSON envelope wire protocol.
 *
 * Defines 3 message types for read-only theme access:
 * - Napplet -> Shell: get
 * - Shell -> Napplet: get.result, changed
 *
 * All types form a discriminated union on the `type` field.
 * Theme payloads include colors (required), fonts, background media, and title (optional).
 */

import type { NappletMessage } from '@napplet/core';

/** The NUB domain name for theme messages. */
export const DOMAIN = 'theme' as const;

/** Required color fields for a theme. */
export interface ThemeColors {
  /** Hex color, e.g. "#1a1a2e". */
  background: string;
  /** Hex color. */
  text: string;
  /** Hex color. */
  primary: string;
}

/** Font definition with family name and URL. */
export interface ThemeFont {
  /** Font family name. */
  name: string;
  /** URL to font file (woff2, etc.). */
  url: string;
}

/** Background media definition. */
export interface ThemeBackground {
  /** URL to background image/media. */
  url: string;
  /** CSS background-size value, e.g. "cover". */
  mode: string;
  /** MIME type, e.g. "image/jpeg". */
  mime: string;
}

/** Full theme payload delivered by the shell. */
export interface Theme {
  /** Required color scheme. */
  colors: ThemeColors;
  /** Optional font definitions. */
  fonts?: {
    body?: ThemeFont;
    title?: ThemeFont;
  };
  /** Optional background media. */
  background?: ThemeBackground;
  /** Optional human-readable theme name. */
  title?: string;
}

/**
 * Base interface for all theme NUB messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface ThemeMessage extends NappletMessage {
  /** Message type in "theme.<action>" format. */
  type: `theme.${string}`;
}

/**
 * Request the current active theme from the shell.
 *
 * @example
 * ```ts
 * const msg: ThemeGetMessage = {
 *   type: 'theme.get',
 *   id: crypto.randomUUID(),
 * };
 * ```
 */
export interface ThemeGetMessage extends ThemeMessage {
  type: 'theme.get';
  /** Correlation ID. */
  id: string;
}

/**
 * Result of a theme.get request.
 */
export interface ThemeGetResultMessage extends ThemeMessage {
  type: 'theme.get.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The current theme payload. */
  theme?: Theme;
  /** Error message if request failed. */
  error?: string;
}

/**
 * Auto-push notification when the shell's active theme changes.
 * No correlation ID — this is shell-initiated, not a response to a request.
 */
export interface ThemeChangedMessage extends ThemeMessage {
  type: 'theme.changed';
  /** The updated theme payload. */
  theme: Theme;
}

/** Napplet -> Shell theme request messages. */
export type ThemeRequestMessage = ThemeGetMessage;

/** Shell -> Napplet theme result/push messages. */
export type ThemeResultMessage = ThemeGetResultMessage | ThemeChangedMessage;

/** All theme NUB message types (discriminated union on `type` field). */
export type ThemeNubMessage = ThemeRequestMessage | ThemeResultMessage;
