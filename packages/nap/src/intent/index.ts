/**
 * Napplet NAP intent domain entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/intent -- Archetype intent dispatcher NAP module (NAP-INTENT).
 *
 * Invoke another napplet by its archetype (role) without addressing it directly.
 * A napplet names a role + action + payload; the shell resolves the role to an
 * installed napplet (honoring the user's default-handler preference), creates or
 * focuses the window, and delivers the payload using the named NAP-N protocol.
 * The shell owns archetype resolution, default handling, window lifecycle, and
 * payload delivery; routing (`archetype`) and payload format (`protocol`) are
 * orthogonal.
 *
 * Exports typed message definitions for the intent domain, shim installer,
 * SDK helpers, and registers the 'intent' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { IntentRequest, IntentResult } from '@napplet/nap/intent';
 * import { DOMAIN, installIntentShim, intentOpen } from '@napplet/nap/intent';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  IntentHandlerPreference,
  IntentBehavior,
  IntentRequest,
  IntentContract,
  IntentCandidate,
  IntentAvailability,
  IntentResult,
  IntentMessage,
  IntentInvokeMessage,
  IntentInvokeResultMessage,
  IntentAvailableMessage,
  IntentAvailableResultMessage,
  IntentHandlersMessage,
  IntentHandlersResultMessage,
  IntentChangedMessage,
  IntentOutboundMessage,
  IntentInboundMessage,
  IntentNapMessage,
} from './types.js';

export {
  installIntentShim,
  handleIntentMessage,
  invoke,
  open,
  available,
  handlers,
  onChanged,
} from './shim.js';

export {
  intentInvoke,
  intentOpen,
  intentAvailable,
  intentHandlers,
  intentOnChanged,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the intent domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'intent'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
