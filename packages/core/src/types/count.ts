import type { NostrFilter } from './nostr.js';

/** NAP-COUNT filter. */
export type CountFilter = NostrFilter;

/** Count query options. */
export interface CountOptions {
  /** Exact-count preference. */
  approximate?: boolean;
  /** HyperLogLog response preference. */
  hll?: boolean;
}

/** Count query result. */
export interface CountResult {
  /** Whether the query succeeded. */
  ok: boolean;
  /** Aggregate matching-event count. */
  count?: number;
  /** True when the count is approximate. */
  approximate?: boolean;
  /** HyperLogLog value. */
  hll?: string;
  /** Relays used for the query. */
  relays?: string[];
  /** Machine-readable error code. */
  error?: string;
  /** Human-readable refusal or failure reason. */
  reason?: string;
}
