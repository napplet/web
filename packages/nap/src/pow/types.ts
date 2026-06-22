/**
 * @napplet/nap/pow -- NIP-13 proof-of-work job message types for the JSON envelope wire protocol.
 *
 * NAP-POW lets napplets submit shell-mediated proof-of-work jobs. The shell owns
 * identity stamping, mining workers/threads, scheduling, signing, publishing,
 * consent, and policy; napplets receive job handles, progress telemetry, and
 * results over `pow.*` envelopes.
 *
 * Defines the message types exchanged between napplet and shell:
 * - Napplet -> Shell: mine, mineAndPublish, queue, job, hashrate, cancel, pause, resume
 * - Shell -> Napplet: submit results, state, progress, done, error, query/control results
 *
 * All types form a discriminated union on the `type` field.
 */

import type { NappletMessage } from '@napplet/core';
import type * as Core from '@napplet/core';

/** The NAP domain name for proof-of-work messages. */
export const DOMAIN = 'pow' as const;

export type PowState = Core.PowState;
export type PowEventTemplate = Core.PowEventTemplate;
export type PowOptions = Core.PowOptions;
export type PowStateChange = Core.PowStateChange;
export type PowWorkerStat = Core.PowWorkerStat;
export type PowProgress = Core.PowProgress;
export type PowHashrate = Core.PowHashrate;
export type PowPublishResult = Core.PowPublishResult;
export type PowResult = Core.PowResult;
export type PowJobSummary = Core.PowJobSummary;
export type PowError = Core.PowError;
export type PowJob = Core.PowJob;
export type PowMinedEvent = Core.PowMinedEvent;

/** Base interface for all POW NAP messages. */
export interface PowMessage extends NappletMessage {
  /** Message type in "pow.<action>" format. */
  type: `pow.${string}`;
}

/** Submit a mining job and return an unsigned mined event through `pow.done`. */
export interface PowMineMessage extends PowMessage {
  type: 'pow.mine';
  id: string;
  jobId: string;
  template: PowEventTemplate;
  target: number;
  options?: PowOptions;
}

/** Submit a mining job that the shell signs and publishes on success. */
export interface PowMineAndPublishMessage extends PowMessage {
  type: 'pow.mineAndPublish';
  id: string;
  jobId: string;
  template: PowEventTemplate;
  target: number;
  options?: PowOptions;
}

/** Initial acknowledgement for `pow.mine`. */
export interface PowMineResultMessage extends PowMessage {
  type: 'pow.mine.result';
  id: string;
  jobId: string;
  accepted: boolean;
  state: PowState;
  position?: number;
  error?: string;
}

/** Initial acknowledgement for `pow.mineAndPublish`. */
export interface PowMineAndPublishResultMessage extends PowMessage {
  type: 'pow.mineAndPublish.result';
  id: string;
  jobId: string;
  accepted: boolean;
  state: PowState;
  position?: number;
  error?: string;
}

/** Shell-pushed lifecycle transition for a POW job. */
export interface PowStateMessage extends PowMessage, PowStateChange {
  type: 'pow.state';
}

/** Shell-pushed progress snapshot for a POW job. */
export interface PowProgressMessage extends PowMessage {
  type: 'pow.progress';
  jobId: string;
  progress: PowProgress;
}

/** Shell-pushed completion for a POW job. */
export interface PowDoneMessage extends PowMessage {
  type: 'pow.done';
  jobId: string;
  result: PowResult;
}

/** Shell-pushed terminal error for a POW job. */
export interface PowErrorMessage extends PowMessage, PowError {
  type: 'pow.error';
}

/** Request current queue summaries. */
export interface PowQueueMessage extends PowMessage {
  type: 'pow.queue';
  id: string;
}

/** Result for `pow.queue`. */
export interface PowQueueResultMessage extends PowMessage {
  type: 'pow.queue.result';
  id: string;
  jobs: PowJobSummary[];
  error?: string;
}

/** Request a one-shot progress snapshot for one job. */
export interface PowJobMessage extends PowMessage {
  type: 'pow.job';
  id: string;
  jobId: string;
}

/** Result for `pow.job`. */
export interface PowJobResultMessage extends PowMessage {
  type: 'pow.job.result';
  id: string;
  progress?: PowProgress;
  error?: string;
}

/** Request miner-wide hash-rate telemetry. */
export interface PowHashrateMessage extends PowMessage {
  type: 'pow.hashrate';
  id: string;
}

/** Result for `pow.hashrate`. */
export interface PowHashrateResultMessage extends PowMessage {
  type: 'pow.hashrate.result';
  id: string;
  hashrate?: PowHashrate;
  error?: string;
}

/** Cancel a POW job. */
export interface PowCancelMessage extends PowMessage {
  type: 'pow.cancel';
  id: string;
  jobId: string;
}

/** Result for `pow.cancel`. */
export interface PowCancelResultMessage extends PowMessage {
  type: 'pow.cancel.result';
  id: string;
  jobId: string;
  cancelled: boolean;
  error?: string;
}

/** Pause one job or the whole miner when `jobId` is omitted. */
export interface PowPauseMessage extends PowMessage {
  type: 'pow.pause';
  id: string;
  jobId?: string;
}

/** Result for `pow.pause`. */
export interface PowPauseResultMessage extends PowMessage {
  type: 'pow.pause.result';
  id: string;
  jobId?: string;
  error?: string;
}

/** Resume one job or the whole miner when `jobId` is omitted. */
export interface PowResumeMessage extends PowMessage {
  type: 'pow.resume';
  id: string;
  jobId?: string;
}

/** Result for `pow.resume`. */
export interface PowResumeResultMessage extends PowMessage {
  type: 'pow.resume.result';
  id: string;
  jobId?: string;
  error?: string;
}

export type PowSubmitMessage = PowMineMessage | PowMineAndPublishMessage;
export type PowSubmitResultMessage = PowMineResultMessage | PowMineAndPublishResultMessage;

export type PowOutboundMessage =
  | PowMineMessage
  | PowMineAndPublishMessage
  | PowQueueMessage
  | PowJobMessage
  | PowHashrateMessage
  | PowCancelMessage
  | PowPauseMessage
  | PowResumeMessage;

export type PowInboundMessage =
  | PowMineResultMessage
  | PowMineAndPublishResultMessage
  | PowStateMessage
  | PowProgressMessage
  | PowDoneMessage
  | PowErrorMessage
  | PowQueueResultMessage
  | PowJobResultMessage
  | PowHashrateResultMessage
  | PowCancelResultMessage
  | PowPauseResultMessage
  | PowResumeResultMessage;

export type PowNapMessage = PowOutboundMessage | PowInboundMessage;
