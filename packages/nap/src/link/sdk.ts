/**
 * @napplet/nap/link -- SDK helpers wrapping window.napplet.link.
 */

import type { LinkOpenOptions, LinkOpenResult, NappletGlobal } from '@napplet/core';

function requireLink(): NappletGlobal['link'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.link) {
    throw new Error('window.napplet.link not installed -- import @napplet/shim first');
  }
  return w.napplet.link;
}

/**
 * Request that the shell open an external URL for the user.
 *
 * @param url      Absolute URL to open.
 * @param options  Optional prompt/display hints.
 * @returns Promise resolving to the shell's open/deny status.
 */
export function linkOpen(url: string, options?: LinkOpenOptions): Promise<LinkOpenResult> {
  return requireLink().open(url, options);
}
