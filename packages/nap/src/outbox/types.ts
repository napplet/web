/**
 * @napplet/nap/outbox -- Outbox-aware relay routing message types for the JSON envelope wire protocol.
 *
 * NAP-OUTBOX gives napplets outbox-model relay routing through the shell. A napplet
 * supplies Nostr filters and intent; the runtime discovers the correct relays
 * (NIP-65 write/read relays, fallbacks, relay intelligence), queries them,
 * deduplicates events by id, validates signatures, and streams updates. The shell
 * owns relay discovery, routing, fallback, deduplication, and publish fanout policy.
 *
 * Defines the message types exchanged between napplet and shell:
 * - Napplet -> Shell: getEvent, query, subscribe, close, publish, resolveRelays
 * - Shell -> Napplet: getEvent.result, query.result, event, closed, publish.result, resolveRelays.result
 *
 * All types form a discriminated union on the `type` field.
 */

import type {
  NappletMessage,
  NostrEvent,
  NostrFilter,
  RelayEventResult,
  EventTemplate,
  OutboxStrategy,
} from '@napplet/core';

/** The NAP domain name for outbox messages. */
export const DOMAIN = 'outbox' as const;

/**
 * Relay-selection strategy:
 * - `outbox` -- query/publish via author write relays (the outbox model)
 * - `inbox`  -- query/publish via recipient read relays (the inbox model)
 * - `auto`   -- let the shell choose per its policy and relay intelligence
 */
export type { OutboxStrategy, RelayEventResult };

/** Options for a single-event outbox lookup. */
export interface OutboxEventOptions {
  /** Author hint whose outbox relays should be primary when present. */
  author?: string;
  /** Relay hints; treated as hints subject to shell validation, not a bypass. */
  relays?: string[];
  /** Relay-selection strategy. */
  strategy?: OutboxStrategy;
  /** Wall-clock budget for the lookup, in milliseconds. */
  timeoutMs?: number;
}

/** Options for a one-shot outbox query. */
export interface OutboxQueryOptions {
  /** Explicit author hints (augment/override authors derived from filters). */
  authors?: string[];
  /** Relay hints; treated as a hint subject to shell validation, not a bypass. */
  relays?: string[];
  /** Relay-selection strategy. */
  strategy?: OutboxStrategy;
  /** Maximum events to collect. */
  limit?: number;
  /** Wall-clock budget for the query, in milliseconds. */
  timeoutMs?: number;
}

/** Options for a live outbox subscription. */
export interface OutboxSubscribeOptions extends OutboxQueryOptions {
  /** Keep the subscription open for real-time events after EOSE. */
  live?: boolean;
}

/** Options for an outbox publish. */
export interface OutboxPublishOptions {
  /** Relay hints; treated as a hint subject to shell validation. */
  relays?: string[];
  /** Recipient authors whose inbox relays should be included for directed events. */
  targetAuthors?: string[];
  /** Relay-selection strategy. */
  strategy?: OutboxStrategy;
}

/** A read/write target for relay-plan resolution. */
export interface OutboxTarget {
  /** Authors to resolve relays for. */
  authors?: string[];
  /** Single pubkey to resolve relays for. */
  pubkey?: string;
  /** Whether the plan is for reading (their write relays) or writing (their read relays). */
  direction?: 'read' | 'write';
  /** Relay-selection strategy. */
  strategy?: OutboxStrategy;
}

/** The relay plan the shell would use for a target. */
export interface OutboxRelayPlan {
  /** Resolved relay URLs. */
  relays: string[];
  /** Where the plan came from. */
  source: 'nip65' | 'cache' | 'policy' | 'fallback';
  /** Authors for which no relay list could be resolved. */
  missingAuthors?: string[];
}

/** The result of a single-event outbox lookup. */
export interface OutboxEventResult {
  /** The validated event result when found. */
  result?: RelayEventResult;
  /** True when lookup results are partial. */
  incomplete?: boolean;
  /** Error reason when the lookup could not complete. */
  error?: string;
}

/** The result of an outbox query. */
export interface OutboxResult {
  /** Deduplicated, signature-validated event results. */
  events: RelayEventResult[];
  /** True when some relay lists or connections failed and results are partial. */
  incomplete?: boolean;
  /** Error reason when the query could not complete. */
  error?: string;
}

/** The result of an outbox publish. */
export interface OutboxPublishResult {
  /** Whether the publish succeeded on at least the required relays. */
  ok: boolean;
  /** The signed event returned by the shell. */
  event?: NostrEvent;
  /** The published event id. */
  eventId?: string;
  /** Map of relay URL -> per-relay publish success. */
  relays?: Record<string, boolean>;
  /** Error reason when the publish failed. */
  error?: string;
}

/**
 * Handle for a live outbox subscription. Register listeners with `on(...)`
 * and tear the subscription down with `close()`.
 */
export interface OutboxSubscription {
  /** Listen for matching event results. */
  on(event: 'event', cb: (result: RelayEventResult) => void): void;
  /** Listen for shell/upstream subscription closure. */
  on(event: 'closed', cb: (reason?: string) => void): void;
  /** Close the subscription and stop receiving events. */
  close(): void;
}

/**
 * Base interface for all outbox NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface OutboxMessage extends NappletMessage {
  /** Message type in "outbox.<action>" format. */
  type: `outbox.${string}`;
}

/**
 * Fetch one event by ID through shell-owned outbox routing.
 *
 * @example
 * ```ts
 * const msg: OutboxGetEventMessage = {
 *   type: 'outbox.getEvent',
 *   id: crypto.randomUUID(),
 *   eventId: 'ev1...',
 *   options: { author: 'ab12...', strategy: 'outbox', timeoutMs: 3000 },
 * };
 * ```
 */
export interface OutboxGetEventMessage extends OutboxMessage {
  type: 'outbox.getEvent';
  /** Correlation ID for this request. */
  id: string;
  /** Event id to fetch. */
  eventId: string;
  /** Optional author/relay hints and request policy. */
  options?: OutboxEventOptions;
}

/** Result of an `outbox.getEvent` request. */
export interface OutboxGetEventResultMessage extends OutboxMessage {
  type: 'outbox.getEvent.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The validated event result when found. */
  result?: RelayEventResult;
  /** True when lookup results are partial. */
  incomplete?: boolean;
  /** Error reason when the lookup could not complete. */
  error?: string;
}

/**
 * Perform a one-shot outbox-aware query. The shell derives authors, resolves
 * relays, queries them, deduplicates events by id, and replies with
 * `outbox.query.result`.
 *
 * @example
 * ```ts
 * const msg: OutboxQueryMessage = {
 *   type: 'outbox.query',
 *   id: crypto.randomUUID(),
 *   filters: [{ authors: ['ab12...'], kinds: [1], limit: 20 }],
 *   options: { strategy: 'outbox', timeoutMs: 3000 },
 * };
 * ```
 */
export interface OutboxQueryMessage extends OutboxMessage {
  type: 'outbox.query';
  /** Correlation ID for this request. */
  id: string;
  /** NIP-01 filter or filters. */
  filters: NostrFilter | NostrFilter[];
  /** Optional query options. */
  options?: OutboxQueryOptions;
}

/** Result of an `outbox.query` request. */
export interface OutboxQueryResultMessage extends OutboxMessage {
  type: 'outbox.query.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Deduplicated event results. */
  events: RelayEventResult[];
  /** True when results are partial. */
  incomplete?: boolean;
  /** Error reason when the query could not complete. */
  error?: string;
}

/**
 * Open a live outbox-aware subscription. The shell may add/remove relay
 * connections as NIP-65 relay lists are discovered or updated.
 *
 * @example
 * ```ts
 * const msg: OutboxSubscribeMessage = {
 *   type: 'outbox.subscribe',
 *   id: crypto.randomUUID(),
 *   subId: 'sub-1',
 *   filters: [{ authors: ['ab12...'], kinds: [1], limit: 50 }],
 *   options: { strategy: 'outbox', live: true },
 * };
 * ```
 */
export interface OutboxSubscribeMessage extends OutboxMessage {
  type: 'outbox.subscribe';
  /** Correlation ID for this request. */
  id: string;
  /** Subscription ID for the event stream lifecycle. */
  subId: string;
  /** NIP-01 filter or filters. */
  filters: NostrFilter | NostrFilter[];
  /** Optional subscribe options. */
  options?: OutboxSubscribeOptions;
}

/** A matching event delivered to an active outbox subscription. */
export interface OutboxEventMessage extends OutboxMessage {
  type: 'outbox.event';
  /** Subscription ID this event belongs to. */
  subId: string;
  /** The raw event plus optional delivery sidecar metadata. */
  result: RelayEventResult;
}

/** An outbox subscription was closed by the shell or upstream relay. */
export interface OutboxClosedMessage extends OutboxMessage {
  type: 'outbox.closed';
  /** Subscription ID that was closed. */
  subId: string;
  /** Optional reason for closure. */
  reason?: string;
}

/** Close an active outbox subscription. */
export interface OutboxCloseMessage extends OutboxMessage {
  type: 'outbox.close';
  /** Correlation ID for this request. */
  id: string;
  /** Subscription ID to close. */
  subId: string;
}

/**
 * Publish a shell-signed event using outbox-aware relay fanout.
 *
 * @example
 * ```ts
 * const msg: OutboxPublishMessage = {
 *   type: 'outbox.publish',
 *   id: crypto.randomUUID(),
 *   event: { kind: 1, content: 'hello', tags: [], created_at: now },
 *   options: { strategy: 'outbox' },
 * };
 * ```
 */
export interface OutboxPublishMessage extends OutboxMessage {
  type: 'outbox.publish';
  /** Correlation ID for this request. */
  id: string;
  /** Unsigned event template; the shell signs before fanout. */
  event: EventTemplate;
  /** Optional publish options. */
  options?: OutboxPublishOptions;
}

/**
 * Result of an `outbox.publish` request. Carries the same publish-outcome
 * fields as {@link OutboxPublishResult} (`ok`/`event`/`eventId`/`relays`/`error`)
 * plus the envelope discriminant `type` and the correlation `id`.
 */
export interface OutboxPublishResultMessage extends OutboxMessage, OutboxPublishResult {
  type: 'outbox.publish.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Resolve the relay plan the shell would use for a read/write target. */
export interface OutboxResolveRelaysMessage extends OutboxMessage {
  type: 'outbox.resolveRelays';
  /** Correlation ID for this request. */
  id: string;
  /** The read/write target to resolve relays for. */
  target: OutboxTarget;
}

/** Result of an `outbox.resolveRelays` request. */
export interface OutboxResolveRelaysResultMessage extends OutboxMessage {
  type: 'outbox.resolveRelays.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The resolved relay plan. */
  plan: OutboxRelayPlan;
  /** Error reason when the plan could not be resolved. */
  error?: string;
}

/** Napplet -> Shell outbox messages. */
export type OutboxOutboundMessage =
  | OutboxGetEventMessage
  | OutboxQueryMessage
  | OutboxSubscribeMessage
  | OutboxCloseMessage
  | OutboxPublishMessage
  | OutboxResolveRelaysMessage;

/** Shell -> Napplet outbox messages. */
export type OutboxInboundMessage =
  | OutboxGetEventResultMessage
  | OutboxQueryResultMessage
  | OutboxEventMessage
  | OutboxClosedMessage
  | OutboxPublishResultMessage
  | OutboxResolveRelaysResultMessage;

/** All outbox NAP message types (discriminated union on `type` field). */
export type OutboxNapMessage = OutboxOutboundMessage | OutboxInboundMessage;
