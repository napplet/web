import type { NostrEvent, RelayEventResult } from './nostr.js';

/** Options for a one-shot outbox query. */
export interface OutboxQueryOptions {
  authors?: string[];
  relays?: string[];
  limit?: number;
  timeoutMs?: number;
}

/** Options for a single-event outbox lookup. */
export interface OutboxEventOptions {
  author?: string;
  relays?: string[];
  timeoutMs?: number;
}

/** Options for a live outbox subscription. */
export interface OutboxSubscribeOptions extends OutboxQueryOptions {}

/** Options for an outbox publish. */
export interface OutboxPublishOptions {
  relays?: string[];
  targetAuthors?: string[];
}

/** A read/write target for outbox relay-plan resolution. */
export interface OutboxTarget {
  authors?: string[];
  pubkey?: string;
  direction?: 'read' | 'write';
}

/** The relay plan the shell would use for an outbox target. */
export interface OutboxRelayPlan {
  relays: string[];
  source: 'nip65' | 'cache' | 'policy' | 'fallback';
  missingAuthors?: string[];
}

/** The result of an outbox query. */
export interface OutboxResult {
  events: RelayEventResult[];
  incomplete?: boolean;
  error?: string;
}

/** The result of a single-event outbox lookup. */
export interface OutboxEventResult {
  result?: RelayEventResult;
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
  on(event: 'event', cb: (result: RelayEventResult) => void): void;
  on(event: 'closed', cb: (reason?: string) => void): void;
  close(): void;
}
