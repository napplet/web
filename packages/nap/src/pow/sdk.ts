/**
 * @napplet/nap/pow -- SDK helpers wrapping window.napplet.pow.
 *
 * These convenience functions delegate to `window.napplet.pow.*` at call time.
 * The shim must be imported somewhere to install the global.
 */

import type { NappletGlobal } from '@napplet/core';
import type {
  PowEventTemplate,
  PowOptions,
  PowJob,
  PowJobSummary,
  PowProgress,
  PowHashrate,
} from './types.js';

function requirePow(): NappletGlobal['pow'] {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.pow) {
    throw new Error('window.napplet.pow not installed -- import @napplet/shim first');
  }
  return w.napplet.pow;
}

/**
 * Submit a shell-mediated proof-of-work mining job.
 *
 * @param template  Event template to mine
 * @param target    Required leading-zero-bit difficulty
 * @param options   Optional scheduling and timeout hints
 * @returns A local POW job handle
 */
export function minePow(
  template: PowEventTemplate,
  target: number,
  options?: PowOptions,
): PowJob {
  return requirePow().mine(template, target, options);
}

/**
 * Submit a shell-mediated mining job that the shell signs and publishes on success.
 *
 * @param template  Event template to mine and publish
 * @param target    Required leading-zero-bit difficulty
 * @param options   Optional scheduling and timeout hints
 * @returns A local POW job handle
 */
export function mineAndPublishPow(
  template: PowEventTemplate,
  target: number,
  options?: PowOptions,
): PowJob {
  return requirePow().mineAndPublish(template, target, options);
}

/**
 * Inspect tracked POW jobs.
 *
 * @returns Promise resolving to queue summaries
 */
export function powQueue(): Promise<PowJobSummary[]> {
  return requirePow().queue();
}

/**
 * Get a one-shot progress snapshot for a POW job.
 *
 * @param jobId  Job id to inspect
 * @returns Promise resolving to the current progress snapshot
 */
export function powJob(jobId: string): Promise<PowProgress> {
  return requirePow().job(jobId);
}

/**
 * Get live miner-wide hash-rate telemetry.
 *
 * @returns Promise resolving to aggregate/per-worker/per-job hash rates
 */
export function powHashrate(): Promise<PowHashrate> {
  return requirePow().hashrate();
}

/**
 * Cancel a POW job.
 *
 * @param jobId  Job id to cancel
 * @returns Promise resolving true when the shell cancelled a matching job
 */
export function cancelPow(jobId: string): Promise<boolean> {
  return requirePow().cancel(jobId);
}

/**
 * Pause one POW job, or the whole miner when omitted.
 *
 * @param jobId  Optional job id to pause
 */
export function pausePow(jobId?: string): Promise<void> {
  return requirePow().pause(jobId);
}

/**
 * Resume one POW job, or the whole miner when omitted.
 *
 * @param jobId  Optional job id to resume
 */
export function resumePow(jobId?: string): Promise<void> {
  return requirePow().resume(jobId);
}

/**
 * Format raw hashes per second for display.
 *
 * @param hashesPerSecond  Raw H/s value
 * @returns Human-readable scaled hash rate
 */
export function formatPowHashRate(hashesPerSecond: number): string {
  return requirePow().formatHashRate(hashesPerSecond);
}
