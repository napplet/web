/**
 * @napplet/nap/pow -- Shell-mediated NIP-13 proof-of-work mining module (NAP-POW).
 *
 * A napplet submits an event template and target difficulty to the shell. The
 * shell stamps identity fields, schedules CPU work, mines the nonce, signs and
 * publishes only when requested, and reports progress over `pow.*` envelopes.
 * Napplets receive job handles and telemetry, never signing keys or direct CPU
 * scheduling authority beyond shell policy.
 *
 * Exports typed message definitions for the POW domain, shim installer, SDK
 * helpers, and registers the `pow` domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import { minePow, formatPowHashRate } from '@napplet/nap/pow';
 *
 * const job = minePow({ kind: 1, content: 'gm', tags: [] }, 21);
 * job.on('progress', (p) => console.log(formatPowHashRate(p.hashRate)));
 * const result = await job.completed;
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

export type {
  PowState,
  PowEventTemplate,
  PowOptions,
  PowStateChange,
  PowWorkerStat,
  PowProgress,
  PowHashrate,
  PowPublishResult,
  PowResult,
  PowJobSummary,
  PowError,
  PowJob,
  PowMinedEvent,
  PowMessage,
  PowMineMessage,
  PowMineAndPublishMessage,
  PowMineResultMessage,
  PowMineAndPublishResultMessage,
  PowStateMessage,
  PowProgressMessage,
  PowDoneMessage,
  PowErrorMessage,
  PowQueueMessage,
  PowQueueResultMessage,
  PowJobMessage,
  PowJobResultMessage,
  PowHashrateMessage,
  PowHashrateResultMessage,
  PowCancelMessage,
  PowCancelResultMessage,
  PowPauseMessage,
  PowPauseResultMessage,
  PowResumeMessage,
  PowResumeResultMessage,
  PowSubmitMessage,
  PowSubmitResultMessage,
  PowOutboundMessage,
  PowInboundMessage,
  PowNapMessage,
} from './types.js';

export {
  installPowShim,
  handlePowMessage,
  mine,
  mineAndPublish,
  queue,
  job,
  hashrate,
  cancel,
  pause,
  resume,
  formatHashRate,
} from './shim.js';

export {
  minePow,
  mineAndPublishPow,
  powQueue,
  powJob,
  powHashrate,
  cancelPow,
  pausePow,
  resumePow,
  formatPowHashRate,
} from './sdk.js';

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the POW domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'pow'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
