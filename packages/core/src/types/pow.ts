import type { NostrEvent, NostrTag } from './nostr.js';

/** POW job lifecycle state. */
export type PowState = 'queued' | 'mining' | 'paused' | 'done' | 'cancelled' | 'error';

/**
 * Event template submitted for NIP-13 proof-of-work mining.
 * The shell stamps `pubkey` and the committed `created_at` before mining.
 */
export interface PowEventTemplate {
  kind: number;
  content: string;
  tags?: NostrTag[];
  created_at?: number;
}

/** Runtime scheduling hints for a POW job. */
export interface PowOptions {
  workers?: number;
  priority?: number;
  timeoutMs?: number;
  commitCreatedAt?: boolean;
}

/** A Nostr-shaped event returned by POW mining. `mine` results may be unsigned. */
export type PowMinedEvent = Omit<NostrEvent, 'sig'> & { sig?: string };

/** Shell-pushed job state transition. */
export interface PowStateChange {
  jobId: string;
  state: PowState;
  position?: number;
}

/** Per-worker mining telemetry. */
export interface PowWorkerStat {
  workerId: number;
  bestPow: number;
  hashes: number;
  hashRate: number;
}

/** Progress snapshot for a POW job. */
export interface PowProgress {
  jobId: string;
  target: number;
  state: PowState;
  bestPow: number;
  bestNonce?: string;
  hashes: number;
  hashRate: number;
  workers: PowWorkerStat[];
  elapsedMs: number;
}

/** Miner-wide hash-rate telemetry. */
export interface PowHashrate {
  hashRate: number;
  workers: number;
  perWorker: { workerId: number; hashRate: number }[];
  byJob: { jobId: string; hashRate: number }[];
}

/** Publish result for `mineAndPublish`. */
export interface PowPublishResult {
  eventId: string;
  relays: Record<string, boolean>;
}

/** Completed POW result. */
export interface PowResult {
  jobId: string;
  ok: boolean;
  event: PowMinedEvent;
  pow: number;
  nonce: string;
  hashes: number;
  elapsedMs: number;
  published?: PowPublishResult;
  error?: string;
}

/** Queue summary for one tracked job. */
export interface PowJobSummary {
  jobId: string;
  target: number;
  state: PowState;
  priority: number;
  position?: number;
  bestPow: number;
  hashRate: number;
  kind: number;
  mode: 'mine' | 'mineAndPublish';
}

/** Shell-pushed POW job error. */
export interface PowError {
  jobId: string;
  error: string;
}

/** Local handle returned by `mine` / `mineAndPublish`. */
export interface PowJob {
  jobId: string;
  target: number;
  started: Promise<void>;
  completed: Promise<PowResult>;
  on(event: 'state', cb: (state: PowStateChange) => void): void;
  on(event: 'progress', cb: (progress: PowProgress) => void): void;
  on(event: 'done', cb: (result: PowResult) => void): void;
  on(event: 'error', cb: (error: PowError) => void): void;
  cancel(): Promise<boolean>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}
