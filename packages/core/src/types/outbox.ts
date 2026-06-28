import type { NostrEvent } from './nostr.js';

/** Relay-selection strategy for outbox-model routing (NAP-OUTBOX). */
export type OutboxStrategy = 'outbox' | 'inbox' | 'auto';

/** Options for a one-shot outbox query. */
export interface OutboxQueryOptions {
  authors?: string[];
  relays?: string[];
  strategy?: OutboxStrategy;
  limit?: number;
  timeoutMs?: number;
}

/** Options for a single-event outbox lookup. */
export interface OutboxEventOptions {
  author?: string;
  relays?: string[];
  strategy?: OutboxStrategy;
  timeoutMs?: number;
}

/** Options for a live outbox subscription. */
export interface OutboxSubscribeOptions extends OutboxQueryOptions {
  live?: boolean;
}

/** Options for an outbox publish. */
export interface OutboxPublishOptions {
  relays?: string[];
  targetAuthors?: string[];
  strategy?: OutboxStrategy;
}

/** A read/write target for outbox relay-plan resolution. */
export interface OutboxTarget {
  authors?: string[];
  pubkey?: string;
  direction?: 'read' | 'write';
  strategy?: OutboxStrategy;
}

/** The relay plan the shell would use for an outbox target. */
export interface OutboxRelayPlan {
  relays: string[];
  source: 'nip65' | 'cache' | 'policy' | 'fallback';
  missingAuthors?: string[];
}

/** The result of an outbox query. */
export interface OutboxResult {
  events: NostrEvent[];
  relays: Record<string, string[]>;
  incomplete?: boolean;
  error?: string;
}

/** The result of a single-event outbox lookup. */
export interface OutboxEventResult {
  event?: NostrEvent;
  relays: string[];
  incomplete?: boolean;
  error?: string;
}

/** The result of an outbox publish. */
export interface OutboxPublishResult {
  ok: boolean;
  event?: NostrEvent;
  eventId?: string;
  relays?: Record<string, boolean>;
  error?: string;
}

/** Handle for a live outbox subscription. */
export interface OutboxSubscription {
  on(event: 'event', cb: (event: NostrEvent, relay?: string) => void): void;
  on(event: 'eose', cb: () => void): void;
  on(event: 'closed', cb: (reason?: string) => void): void;
  close(): void;
}
