/**
 * Napplet NAP link types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/link -- Shell-mediated link opening message types.
 *
 * NAP-LINK lets a sandboxed napplet ask the shell to open an external URL for
 * the user. The shell owns navigation, policy, prompting, and browser context.
 * The napplet never receives direct navigation authority, opener access,
 * network access, or fetched bytes.
 */

import type {
  LinkOpenErrorCode,
  LinkOpenOptions,
  LinkOpenResult,
  LinkOpenStatus,
  NappletMessage,
} from '@napplet/core';

/** The NAP domain name for shell-mediated link opening. */
export const DOMAIN = 'link' as const;

export type {
  LinkOpenErrorCode,
  LinkOpenOptions,
  LinkOpenResult,
  LinkOpenStatus,
};

/** Base interface for all link NAP messages. */
export interface LinkMessage extends NappletMessage {
  /** Message type in "link.<action>" format. */
  type: `link.${string}`;
}

/** Request that the shell open a user-visible external URL. */
export interface LinkOpenMessage extends LinkMessage {
  type: 'link.open';
  /** Correlation ID for this request. */
  id: string;
  /** Absolute URL requested by the napplet. */
  url: string;
  /** Optional prompt/display hints. */
  options?: LinkOpenOptions;
}

/** Result of a `link.open` request. */
export interface LinkOpenResultMessage extends LinkMessage {
  type: 'link.open.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Whether the shell opened or denied the link. */
  status: LinkOpenStatus;
  /** Optional denial reason when `status` is `"denied"`. */
  error?: LinkOpenErrorCode;
}

/** Napplet -> Shell link messages. */
export type LinkOutboundMessage = LinkOpenMessage;

/** Shell -> Napplet link messages. */
export type LinkInboundMessage = LinkOpenResultMessage;

/** All link NAP message types. */
export type LinkNapMessage = LinkOutboundMessage | LinkInboundMessage;
