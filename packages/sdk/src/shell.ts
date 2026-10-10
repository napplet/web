/** NAP-SHELL wrapper; other SDK domains remain independent of readiness. */
import type { ShellApi } from '@napplet/core';
import { requireDomain } from './require-napplet.js';

/** Optional runtime environment, queried only when the shell domain is exposed. */
export const shell: ShellApi = {
  supports: (domain) => requireDomain('shell').supports(domain),
  ready: () => requireDomain('shell').ready(),
  onReady: (handler) => requireDomain('shell').onReady(handler),
  get services() { return requireDomain('shell').services; },
};
