/**
 * @napplet/nap/count -- Runtime-mediated event count message types.
 *
 * NAP-COUNT lets a napplet ask the runtime to count events matching non-empty
 * NIP-01 filter arrays without returning matching event payloads. The runtime
 * owns relay COUNT support, index/cache use, aggregation, approximation, and
 * refusal policy.
 */

import type {
  CountFilter,
  CountOptions,
  CountResult,
  NappletMessage,
} from '@napplet/core';

/** The NAP domain name for runtime-mediated event counts. */
export const DOMAIN = 'count' as const;

export type {
  CountFilter,
  CountOptions,
  CountResult,
};

/** Base interface for all count NAP messages. */
export interface CountMessage extends NappletMessage {
  /** Message type in "count.<action>" format. */
  type: `count.${string}`;
}

/** Request an aggregate count for one or more NIP-01 filters. */
export interface CountQueryMessage extends CountMessage {
  type: 'count.query';
  /** Correlation ID for this request. */
  id: string;
  /** Non-empty NIP-01 filter array. Multiple filters use NIP-45 OR semantics. */
  filters: CountFilter[];
  /** Runtime-owned approximation/HLL hints. */
  options?: CountOptions;
}

/** Result of a `count.query` request. */
export interface CountQueryResultMessage extends CountMessage, CountResult {
  type: 'count.query.result';
  /** Correlation ID matching the original request. */
  id: string;
}

/** Napplet -> Shell count messages. */
export type CountOutboundMessage = CountQueryMessage;

/** Shell -> Napplet count messages. */
export type CountInboundMessage = CountQueryResultMessage;

/** All count NAP message types. */
export type CountNapMessage = CountOutboundMessage | CountInboundMessage;
