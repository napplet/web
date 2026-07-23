/**
 * Napplet NAP intent types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/intent -- Archetype intent dispatcher message types for the JSON envelope wire protocol.
 *
 * NAP-INTENT lets a napplet invoke *another* napplet by its archetype (a shared
 * role name such as `note`, `profile`, `emoji-list`) without addressing it
 * directly. A napplet describes the role, action, and payload; the shell resolves
 * the role to an installed napplet (honoring the user's default-handler
 * preference), creates or focuses the window, and delivers the payload using its
 * named convention. NAP-INTENT standardizes the envelope (routing + default
 * handling + window lifecycle), not the payload — `convention` (an opaque payload
 * shape identifier) and `archetype` (the routing role) are orthogonal (N:M).
 *
 * Defines the message types exchanged between napplet and shell:
 * - Napplet -> Shell: invoke, available, handlers
 * - Shell -> Napplet: invoke.result, available.result, handlers.result, changed
 *
 * All types form a discriminated union on the `type` field.
 */

import type {
  NappletMessage,
  IntentAvailability,
  IntentBehavior,
  IntentCandidate,
  IntentContract,
  IntentDelivery,
  IntentHandlerPreference,
  IntentInvokeOptions,
  IntentRequest,
  IntentResult,
} from '@napplet/core';

/** The NAP domain name for intent messages. */
export const DOMAIN = 'intent' as const;

/**
 * How the shell should pick the handling napplet:
 * - `default` -- the user's default handler for the archetype (the implicit case)
 * - `choose`  -- prompt the user with an "open with…" chooser
 * - a specific napplet `dTag` -- target that napplet (subject to user authorization)
 */
export type {
  IntentAvailability,
  IntentBehavior,
  IntentCandidate,
  IntentContract,
  IntentDelivery,
  IntentHandlerPreference,
  IntentInvokeOptions,
  IntentRequest,
  IntentResult,
};

/**
 * Base interface for all intent NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface IntentMessage extends NappletMessage {
  /** Message type in "intent.<action>" format. */
  type: `intent.${string}`;
}

/**
 * Dispatch a URI-normalized request to a napplet. The binding derives the stable
 * queryless convention identity and all routing fields before this message is
 * posted; the runtime only accepts delivery responsibility here.
 *
 * @example
 * ```ts
 * const msg: IntentInvokeMessage = {
 *   type: 'intent.invoke',
 *   id: crypto.randomUUID(),
 *   request: { archetype: 'note', action: 'open', convention: 'napplet:note/open', payload: { target: { type: 'event', id: 'abc' } } },
 * };
 * ```
 */
export interface IntentInvokeMessage extends IntentMessage {
  type: 'intent.invoke';
  /** Correlation ID for this request. */
  id: string;
  /** The normalized intent request derived from the authoritative URI. */
  request: IntentRequest;
}

/** Result of an `intent.invoke` request. */
export interface IntentInvokeResultMessage extends IntentMessage {
  type: 'intent.invoke.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The structured invocation result. */
  result?: IntentResult;
  /** Top-level error when the request could not be processed at all. */
  error?: string;
}

/**
 * A carrier-neutral target delivery, separate from the immediate invoke result.
 * It intentionally has no request, delivery, handling, or window identifier.
 */
export interface IntentDeliveryMessage extends IntentMessage {
  type: 'intent.deliver';
  /** Runtime-attested target delivery. */
  delivery: IntentDelivery;
}

/** Query whether the runtime can currently satisfy an archetype. */
export interface IntentAvailableMessage extends IntentMessage {
  type: 'intent.available';
  /** Correlation ID for this request. */
  id: string;
  /** The archetype to check. */
  archetype: string;
}

/** Result of an `intent.available` request. */
export interface IntentAvailableResultMessage extends IntentMessage {
  type: 'intent.available.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The archetype availability. */
  availability?: IntentAvailability;
  /** Error when availability could not be resolved. */
  error?: string;
}

/** Query availability for every archetype the runtime can satisfy. */
export interface IntentHandlersMessage extends IntentMessage {
  type: 'intent.handlers';
  /** Correlation ID for this request. */
  id: string;
}

/** Result of an `intent.handlers` request. */
export interface IntentHandlersResultMessage extends IntentMessage {
  type: 'intent.handlers.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Availability for each satisfiable archetype. */
  handlers?: IntentAvailability[];
  /** Error when handlers could not be enumerated. */
  error?: string;
}

/**
 * Shell-pushed availability update (a napplet was installed/removed, or a
 * default handler changed). Carries no correlation `id`; delivered to all
 * `onChanged` listeners.
 */
export interface IntentChangedMessage extends IntentMessage {
  type: 'intent.changed';
  /** The updated archetype availability. */
  availability: IntentAvailability;
}

/** Napplet -> Shell intent messages. */
export type IntentOutboundMessage =
  | IntentInvokeMessage
  | IntentAvailableMessage
  | IntentHandlersMessage;

/** Shell -> Napplet intent messages. */
export type IntentInboundMessage =
  | IntentInvokeResultMessage
  | IntentAvailableResultMessage
  | IntentHandlersResultMessage
  | IntentChangedMessage
  | IntentDeliveryMessage;

/** All intent NAP message types (discriminated union on `type` field). */
export type IntentNapMessage = IntentOutboundMessage | IntentInboundMessage;
