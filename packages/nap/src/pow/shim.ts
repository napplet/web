// @napplet/nap/pow -- Shell-mediated proof-of-work shim.
// Correlates pow.* request/result envelopes and routes POW job push messages.
// The shell owns mining, scheduling, identity stamping, signing, publishing, and policy.

import { postToShell } from '../boundary.js';
import {
  createPending,
  rejectAllPending,
  rejectPending,
  resolvePending,
  type PendingRequest,
} from './request.js';
import type {
  PowEventTemplate,
  PowOptions,
  PowJob,
  PowJobSummary,
  PowProgress,
  PowHashrate,
  PowResult,
  PowStateChange,
  PowError,
  PowMineMessage,
  PowMineAndPublishMessage,
  PowSubmitResultMessage,
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
} from './types.js';

const REQUEST_TIMEOUT_MS = 30_000;

type JobEventName = 'state' | 'progress' | 'done' | 'error';

interface JobRecord {
  jobId: string;
  target: number;
  startedResolve: () => void;
  startedReject: (reason: Error) => void;
  completedResolve: (result: PowResult) => void;
  completedReject: (reason: Error) => void;
  listeners: {
    state: Set<(state: PowStateChange) => void>;
    progress: Set<(progress: PowProgress) => void>;
    done: Set<(result: PowResult) => void>;
    error: Set<(error: PowError) => void>;
  };
}

interface PendingSubmit {
  jobId: string;
  timeout: ReturnType<typeof setTimeout>;
}

const jobs = new Map<string, JobRecord>();
const pendingSubmits = new Map<string, PendingSubmit>();
const pendingQueue = new Map<string, PendingRequest<PowJobSummary[]>>();
const pendingJob = new Map<string, PendingRequest<PowProgress>>();
const pendingHashrate = new Map<string, PendingRequest<PowHashrate>>();
const pendingCancel = new Map<string, PendingRequest<boolean>>();
const pendingPause = new Map<string, PendingRequest<void>>();
const pendingResume = new Map<string, PendingRequest<void>>();

let installed = false;

function isMessageType<T extends { type: string }>(
  msg: { type: string },
  type: T['type'],
): msg is T {
  return msg.type === type;
}

function clearPendingSubmit(id: string): PendingSubmit | undefined {
  const pending = pendingSubmits.get(id);
  if (!pending) return undefined;
  pendingSubmits.delete(id);
  clearTimeout(pending.timeout);
  return pending;
}

function rejectJob(jobId: string, reason: Error): void {
  const job = jobs.get(jobId);
  if (!job) return;
  jobs.delete(jobId);
  job.startedReject(reason);
  job.completedReject(reason);
}

function emitState(job: JobRecord, state: PowStateChange): void {
  for (const cb of job.listeners.state) cb(state);
}

function emitProgress(job: JobRecord, progress: PowProgress): void {
  for (const cb of job.listeners.progress) cb(progress);
}

function emitDone(job: JobRecord, result: PowResult): void {
  for (const cb of job.listeners.done) cb(result);
}

function emitError(job: JobRecord, error: PowError): void {
  for (const cb of job.listeners.error) cb(error);
}

function handleSubmitResult(msg: PowSubmitResultMessage): void {
  const pending = clearPendingSubmit(msg.id);
  if (!pending) return;
  const job = jobs.get(pending.jobId);
  if (!job) return;

  if (!msg.accepted) {
    const reason = new Error(msg.error ?? 'pow job rejected');
    emitError(job, { jobId: job.jobId, error: reason.message });
    rejectJob(job.jobId, reason);
    return;
  }

  const state: PowStateChange = { jobId: msg.jobId, state: msg.state };
  if (msg.position !== undefined) state.position = msg.position;
  emitState(job, state);
  if (msg.state === 'mining' || msg.state === 'done') {
    job.startedResolve();
  }
}

function handleState(msg: PowStateMessage): void {
  const job = jobs.get(msg.jobId);
  if (!job) return;
  const state: PowStateChange = { jobId: msg.jobId, state: msg.state };
  if (msg.position !== undefined) state.position = msg.position;
  emitState(job, state);
  if (msg.state === 'mining' || msg.state === 'done') {
    job.startedResolve();
  } else if (msg.state === 'cancelled') {
    rejectJob(msg.jobId, new Error('cancelled'));
  } else if (msg.state === 'error') {
    rejectJob(msg.jobId, new Error('pow job error'));
  }
}

function handleProgress(msg: PowProgressMessage): void {
  const job = jobs.get(msg.jobId);
  if (!job) return;
  emitProgress(job, msg.progress);
}

function handleDone(msg: PowDoneMessage): void {
  const job = jobs.get(msg.jobId);
  if (!job) return;
  jobs.delete(msg.jobId);
  job.startedResolve();
  emitDone(job, msg.result);
  job.completedResolve(msg.result);
}

function handleError(msg: PowErrorMessage): void {
  const job = jobs.get(msg.jobId);
  if (!job) return;
  emitError(job, { jobId: msg.jobId, error: msg.error });
  rejectJob(msg.jobId, new Error(msg.error));
}

/**
 * Handle pow.* messages from the shell via the central message listener.
 * Covers request results plus shell-pushed job state/progress/done/error.
 */
export function handlePowMessage(msg: { type: string; [key: string]: unknown }): void {
  if (isMessageType<PowSubmitResultMessage>(msg, 'pow.mine.result')) {
    handleSubmitResult(msg);
  } else if (isMessageType<PowSubmitResultMessage>(msg, 'pow.mineAndPublish.result')) {
    handleSubmitResult(msg);
  } else if (isMessageType<PowStateMessage>(msg, 'pow.state')) {
    handleState(msg);
  } else if (isMessageType<PowProgressMessage>(msg, 'pow.progress')) {
    handleProgress(msg);
  } else if (isMessageType<PowDoneMessage>(msg, 'pow.done')) {
    handleDone(msg);
  } else if (isMessageType<PowErrorMessage>(msg, 'pow.error')) {
    handleError(msg);
  } else if (isMessageType<PowQueueResultMessage>(msg, 'pow.queue.result')) {
    if (msg.error !== undefined) rejectPending(pendingQueue, msg.id, msg.error, 'pow queue unavailable');
    else resolvePending(pendingQueue, msg.id, msg.jobs ?? []);
  } else if (isMessageType<PowJobResultMessage>(msg, 'pow.job.result')) {
    if (msg.progress !== undefined) resolvePending(pendingJob, msg.id, msg.progress);
    else rejectPending(pendingJob, msg.id, msg.error, 'pow job unavailable');
  } else if (isMessageType<PowHashrateResultMessage>(msg, 'pow.hashrate.result')) {
    if (msg.hashrate !== undefined) resolvePending(pendingHashrate, msg.id, msg.hashrate);
    else rejectPending(pendingHashrate, msg.id, msg.error, 'pow hashrate unavailable');
  } else if (isMessageType<PowCancelResultMessage>(msg, 'pow.cancel.result')) {
    if (msg.error !== undefined) rejectPending(pendingCancel, msg.id, msg.error, 'pow cancel failed');
    else resolvePending(pendingCancel, msg.id, msg.cancelled);
  } else if (isMessageType<PowPauseResultMessage>(msg, 'pow.pause.result')) {
    if (msg.error !== undefined) rejectPending(pendingPause, msg.id, msg.error, 'pow pause failed');
    else resolvePending(pendingPause, msg.id, undefined);
  } else if (isMessageType<PowResumeResultMessage>(msg, 'pow.resume.result')) {
    if (msg.error !== undefined) rejectPending(pendingResume, msg.id, msg.error, 'pow resume failed');
    else resolvePending(pendingResume, msg.id, undefined);
  }
}

function submit(
  mode: 'mine' | 'mineAndPublish',
  template: PowEventTemplate,
  target: number,
  options?: PowOptions,
): PowJob {
  const id = crypto.randomUUID();
  const jobId = crypto.randomUUID();

  let startedResolve!: () => void;
  let startedReject!: (reason: Error) => void;
  const started = new Promise<void>((resolve, reject) => {
    startedResolve = resolve;
    startedReject = reject;
  });

  let completedResolve!: (result: PowResult) => void;
  let completedReject!: (reason: Error) => void;
  const completed = new Promise<PowResult>((resolve, reject) => {
    completedResolve = resolve;
    completedReject = reject;
  });

  const record: JobRecord = {
    jobId,
    target,
    startedResolve,
    startedReject,
    completedResolve,
    completedReject,
    listeners: {
      state: new Set(),
      progress: new Set(),
      done: new Set(),
      error: new Set(),
    },
  };
  jobs.set(jobId, record);

  const timeout = setTimeout(() => {
    if (!pendingSubmits.delete(id)) return;
    rejectJob(jobId, new Error(`${mode === 'mine' ? 'pow.mine' : 'pow.mineAndPublish'} timed out`));
  }, REQUEST_TIMEOUT_MS);
  pendingSubmits.set(id, { jobId, timeout });

  const msg: PowMineMessage | PowMineAndPublishMessage = {
    type: mode === 'mine' ? 'pow.mine' : 'pow.mineAndPublish',
    id,
    jobId,
    template,
    target,
    ...(options === undefined ? {} : { options }),
  };
  postToShell(msg);

  return {
    jobId,
    target,
    started,
    completed,
    on(event: JobEventName, cb: unknown): void {
      if (event === 'state') record.listeners.state.add(cb as (state: PowStateChange) => void);
      else if (event === 'progress') record.listeners.progress.add(cb as (progress: PowProgress) => void);
      else if (event === 'done') record.listeners.done.add(cb as (result: PowResult) => void);
      else if (event === 'error') record.listeners.error.add(cb as (error: PowError) => void);
    },
    cancel(): Promise<boolean> {
      return cancel(jobId);
    },
    pause(): Promise<void> {
      return pause(jobId);
    },
    resume(): Promise<void> {
      return resume(jobId);
    },
  };
}

/** Submit a proof-of-work mining job. */
export function mine(
  template: PowEventTemplate,
  target: number,
  options?: PowOptions,
): PowJob {
  return submit('mine', template, target, options);
}

/** Submit a proof-of-work mining job that the shell signs and publishes. */
export function mineAndPublish(
  template: PowEventTemplate,
  target: number,
  options?: PowOptions,
): PowJob {
  return submit('mineAndPublish', template, target, options);
}

/** Get tracked POW jobs for this napplet. */
export function queue(): Promise<PowJobSummary[]> {
  const { id, promise } = createPending(pendingQueue, 'pow.queue timed out');
  const msg: PowQueueMessage = { type: 'pow.queue', id };
  postToShell(msg);
  return promise;
}

/** Get a one-shot progress snapshot for a job. */
export function job(jobId: string): Promise<PowProgress> {
  const { id, promise } = createPending(pendingJob, 'pow.job timed out');
  const msg: PowJobMessage = { type: 'pow.job', id, jobId };
  postToShell(msg);
  return promise;
}

/** Get live miner-wide hash-rate telemetry. */
export function hashrate(): Promise<PowHashrate> {
  const { id, promise } = createPending(pendingHashrate, 'pow.hashrate timed out');
  const msg: PowHashrateMessage = { type: 'pow.hashrate', id };
  postToShell(msg);
  return promise;
}

/** Cancel a queued, running, or paused POW job. */
export function cancel(jobId: string): Promise<boolean> {
  const { id, promise } = createPending(pendingCancel, 'pow.cancel timed out');
  const msg: PowCancelMessage = { type: 'pow.cancel', id, jobId };
  postToShell(msg);
  return promise;
}

/** Pause one POW job, or the whole miner when `jobId` is omitted. */
export function pause(jobId?: string): Promise<void> {
  const { id, promise } = createPending(pendingPause, 'pow.pause timed out');
  const msg: PowPauseMessage = { type: 'pow.pause', id, ...(jobId === undefined ? {} : { jobId }) };
  postToShell(msg);
  return promise;
}

/** Resume one POW job, or the whole miner when `jobId` is omitted. */
export function resume(jobId?: string): Promise<void> {
  const { id, promise } = createPending(pendingResume, 'pow.resume timed out');
  const msg: PowResumeMessage = { type: 'pow.resume', id, ...(jobId === undefined ? {} : { jobId }) };
  postToShell(msg);
  return promise;
}

/** Format raw hashes per second for UI display. Sends no wire message. */
export function formatHashRate(hashesPerSecond: number): string {
  const units = ['H/s', 'kH/s', 'MH/s', 'GH/s', 'TH/s'];
  let value = Math.max(0, hashesPerSecond);
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** Install the POW shim and return a cleanup function. */
export function installPowShim(): () => void {
  if (installed) {
    return () => undefined;
  }
  installed = true;
  return () => {
    const reason = new Error('pow shim uninstalled');
    for (const pending of pendingSubmits.values()) clearTimeout(pending.timeout);
    pendingSubmits.clear();
    rejectAllPending([pendingQueue, pendingJob, pendingHashrate, pendingCancel, pendingPause, pendingResume], reason);
    for (const jobId of jobs.keys()) rejectJob(jobId, reason);
    installed = false;
  };
}
