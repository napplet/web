/**
 * Napplet NAP intent types entrypoint.
 *
 * @module
 */

import type { IntentAvailability, IntentDelivery, IntentRequest, IntentResult, NappletMessage } from '@napplet/core';

/** The NAP domain name for intent messages. */
export const DOMAIN = 'intent' as const;

export type {
  IntentAvailability,
  IntentBehavior,
  IntentCandidate,
  IntentContract,
  IntentDelivery,
  IntentHandlerHint,
  IntentHandlerPreference,
  IntentInvokeOptions,
  IntentOpenOptions,
  IntentRequest,
  IntentResult,
} from '@napplet/core';

/** Base interface for all INTENT envelopes. */
export interface IntentMessage extends NappletMessage {
  /** Message type in `intent.<action>` format. */
  type: `intent.${string}`;
}

/** Dispatch an action to a napplet archetype. */
export interface IntentInvokeMessage extends IntentMessage {
  type: 'intent.invoke';
  /** Correlation identifier. */
  id: string;
  /** Archetype dispatch request. */
  request: IntentRequest;
}

/** Result of an intent invocation. */
export interface IntentInvokeResultMessage extends IntentMessage {
  type: 'intent.invoke.result';
  /** Correlation identifier matching the request. */
  id: string;
  /** Structured dispatch result required by NAP-INTENT. */
  result: IntentResult;
}

/** Query whether the runtime can satisfy an archetype. */
export interface IntentAvailableMessage extends IntentMessage {
  type: 'intent.available';
  /** Correlation identifier. */
  id: string;
  /** Archetype to inspect. */
  archetype: string;
}

/** Result of an archetype availability query. */
export interface IntentAvailableResultMessage extends IntentMessage {
  type: 'intent.available.result';
  /** Correlation identifier matching the request. */
  id: string;
  /** Installed-catalog availability. */
  availability?: IntentAvailability;
  /** Top-level processing error. */
  error?: string;
}

/** Query all satisfiable archetypes. */
export interface IntentHandlersMessage extends IntentMessage {
  type: 'intent.handlers';
  /** Correlation identifier. */
  id: string;
}

/** Result containing all satisfiable archetypes. */
export interface IntentHandlersResultMessage extends IntentMessage {
  type: 'intent.handlers.result';
  /** Correlation identifier matching the request. */
  id: string;
  /** Availability records. */
  handlers?: IntentAvailability[];
  /** Top-level processing error. */
  error?: string;
}

/** Runtime-pushed availability update. */
export interface IntentChangedMessage extends IntentMessage {
  type: 'intent.changed';
  /** Updated availability record. */
  availability: IntentAvailability;
}

/** A runtime push, without request or delivery correlation identifiers. */
export interface IntentDeliverMessage extends IntentMessage {
  type: 'intent.deliver';
  delivery: IntentDelivery;
}

/** Napplet-to-runtime INTENT envelopes. */
export type IntentOutboundMessage =
  | IntentInvokeMessage
  | IntentAvailableMessage
  | IntentHandlersMessage;

/** Runtime-to-napplet INTENT envelopes. */
export type IntentInboundMessage =
  | IntentInvokeResultMessage
  | IntentAvailableResultMessage
  | IntentHandlersResultMessage
  | IntentChangedMessage
  | IntentDeliverMessage;

/** Every INTENT envelope. */
export type IntentNapMessage = IntentOutboundMessage | IntentInboundMessage;
