/**
 * @napplet/nap/intent -- Archetype intent dispatcher message types for the JSON envelope wire protocol.
 *
 * NAP-INTENT lets a napplet invoke *another* napplet by its archetype (a shared
 * role name such as `note`, `profile`, `emoji-list`) without addressing it
 * directly. A napplet describes the role, action, and payload; the shell resolves
 * the role to an installed napplet (honoring the user's default-handler
 * preference), creates or focuses the window, and delivers the payload using the
 * named NAP-N `protocol`. NAP-INTENT standardizes the envelope (routing + default
 * handling + window lifecycle), not the payload — `protocol` (a numbered NAP-N
 * wire format) and `archetype` (the routing role) are orthogonal (N:M).
 *
 * Defines the message types exchanged between napplet and shell:
 * - Napplet -> Shell: invoke, available, handlers
 * - Shell -> Napplet: invoke.result, available.result, handlers.result, changed
 *
 * All types form a discriminated union on the `type` field.
 */

import type { NappletMessage } from '@napplet/core';

/** The NAP domain name for intent messages. */
export const DOMAIN = 'intent' as const;

/**
 * How the shell should pick the handling napplet:
 * - `default` -- the user's default handler for the archetype (the implicit case)
 * - `choose`  -- prompt the user with an "open with…" chooser
 * - a specific napplet `dTag` -- target that napplet (subject to user authorization)
 */
export type IntentHandlerPreference = 'default' | 'choose' | (string & {});

/** Window behavior hints for an invoke. */
export interface IntentBehavior {
  focus?: boolean;
  newWindow?: boolean;
  reuse?: boolean;
}

/** A request to dispatch an action to a napplet of a given archetype. */
export interface IntentRequest {
  /** Role slug, e.g. `note` (see ARCHETYPES.md). */
  archetype: string;
  /** Verb; defaults to `open` (e.g. `open` | `edit` | `pick` | `share`). */
  action?: string;
  /** NAP-N id shaping `payload`; omit for the archetype's recommended default. */
  protocol?: string;
  /** Opaque payload, typed by `protocol`. */
  payload?: unknown;
  /** Handler selection: user default, an "open with…" prompt, or a specific dTag. */
  handler?: IntentHandlerPreference;
  /** Window behavior hints. */
  behavior?: IntentBehavior;
}

/** A napplet that can fulfill an archetype, sourced from the manifest catalog. */
export interface IntentCandidate {
  /** The napplet that can fulfill the archetype. */
  dTag: string;
  /** Display title. */
  title?: string;
  /** Verbs this candidate supports for the archetype. */
  actions: string[];
  /** NAP-N ids this candidate accepts for the archetype. */
  protocols: string[];
  /** Whether this candidate is the user/runtime default. */
  isDefault?: boolean;
}

/** Availability of an archetype, sourced from the installed-napplet catalog. */
export interface IntentAvailability {
  /** The archetype this availability describes. */
  archetype: string;
  /** Whether at least one installed napplet fulfills it. */
  available: boolean;
  /** Candidate napplets (from manifests, not running instances). */
  candidates: IntentCandidate[];
  /** Whether a user/runtime default is set for this archetype. */
  hasDefault: boolean;
}

/** The result of an intent invocation. */
export interface IntentResult {
  /** Whether the invoke succeeded. */
  ok: boolean;
  /** The archetype that was requested. */
  archetype: string;
  /** The action that was dispatched. */
  action: string;
  /** Whether a handler actually handled it. */
  handled: boolean;
  /** dTag of the napplet that handled it. */
  handler?: string;
  /** Window the handler was opened/focused in. */
  windowId?: string;
  /** The wire format actually used. */
  protocol?: string;
  /** Error reason when the invoke failed. */
  error?: string;
}

/**
 * Base interface for all intent NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface IntentMessage extends NappletMessage {
  /** Message type in "intent.<action>" format. */
  type: `intent.${string}`;
}

/**
 * Dispatch `action` (default `open`) to a napplet of `archetype` with `payload`.
 * The shell resolves the archetype to a handler, creates/focuses its window, and
 * delivers the payload using the named `protocol` (or the archetype default).
 * `action` is a field, never part of the message type, so new actions never
 * expand the wire surface.
 *
 * @example
 * ```ts
 * const msg: IntentInvokeMessage = {
 *   type: 'intent.invoke',
 *   id: crypto.randomUUID(),
 *   request: { archetype: 'note', action: 'open', protocol: 'NAP-4', payload: { target: { type: 'event', id: 'abc' } } },
 * };
 * ```
 */
export interface IntentInvokeMessage extends IntentMessage {
  type: 'intent.invoke';
  /** Correlation ID for this request. */
  id: string;
  /** The intent request (archetype + action + payload + routing). */
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
  | IntentChangedMessage;

/** All intent NAP message types (discriminated union on `type` field). */
export type IntentNapMessage = IntentOutboundMessage | IntentInboundMessage;
