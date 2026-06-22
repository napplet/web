/** Options for a shell-mediated link open request (NAP-LINK). */
export interface LinkOpenOptions {
  /** Optional napplet-supplied prompt label. Shells must not treat it as trusted policy input. */
  label?: string;
}

/** Result status for a shell-mediated link open request. */
export type LinkOpenStatus = 'opened' | 'denied';

/** API result returned by `window.napplet.link.open()`. */
export interface LinkOpenResult {
  /** Whether the shell accepted and handed off the navigation, or denied it. */
  status: LinkOpenStatus;
}

/** Common denial reasons carried by `link.open.result` messages. */
export type LinkOpenErrorCode =
  | 'invalid-url'
  | 'unsupported-scheme'
  | 'blocked-by-policy'
  | 'user-denied'
  | (string & {});
