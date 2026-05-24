/**
 * @napplet/nub/class -- Class NUB message types for the JSON envelope wire protocol.
 *
 * NUB-CLASS establishes the abstract napplet-class concept: shell assigns an
 * integer class at iframe-ready time, delivers it over the wire via the
 * terminal `class.assigned` envelope, and the napplet reads it at
 * `window.napplet.class`. Concrete class semantics live in sibling
 * `NUB-CLASS-$N` documents.
 *
 * Wire protocol (one message, shell -> napplet only):
 * - `class.assigned` — at-most-one terminal envelope per napplet lifecycle,
 *   sent after iframe ready + before any other napplet-bound envelope.
 *
 * Per NUB-CLASS.md: the integer value is a plain `number`, not a literal
 * union — the class space is extensible as new NUB-CLASS-$N sub-track
 * members are defined.
 */

import type { NappletMessage } from '@napplet/core';

/** The NUB domain name for class messages. */
export const DOMAIN = 'class' as const;

/**
 * Base interface for all class NUB messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface ClassMessage extends NappletMessage {
  /** Message type in "class.<action>" format. */
  type: `class.${string}`;
}

/**
 * Terminal assignment envelope sent by the shell at iframe-ready time.
 *
 * The integer `class` field selects a concrete class definition from the
 * `NUB-CLASS-$N` sub-track (e.g., `class: 1` -> `NUB-CLASS-1.md`).
 *
 * Normative constraints per NUB-CLASS.md:
 * - Shell MUST send after the iframe signals readiness, before any other
 *   napplet-bound envelope for that iframe.
 * - Shell MUST send AT MOST ONE per lifecycle. Dynamic re-classification is
 *   out of scope for v1; duplicate envelopes are protocol violations.
 * - `id` is a fresh correlation identifier per NIP-5D envelope conventions;
 *   no napplet-side response envelope is expected.
 * - `class` is a non-negative integer.
 *
 * @example
 * ```ts
 * const msg: ClassAssignedMessage = {
 *   type: 'class.assigned',
 *   id: 'c-7f3a',
 *   class: 2,
 * };
 * ```
 */
export interface ClassAssignedMessage extends ClassMessage {
  type: 'class.assigned';
  /** Correlation ID (fresh per envelope; no response is returned). */
  id: string;
  /** Non-negative integer selecting a concrete NUB-CLASS-$N member. */
  class: number;
}

/**
 * Optional runtime state shape reflected at `window.napplet.class`.
 *
 * Unlike NappletConnect, `class` may legitimately be `undefined`:
 * - Before the shell has sent `class.assigned` (early bootstrap).
 * - When the shell does not implement `nub:class`.
 * - When the shell implements the NUB but intentionally withholds assignment.
 *
 * This interface exists for downstream typing convenience; the actual
 * window.napplet.class surface is typed directly on NappletGlobal in
 * @napplet/core (kept there to preserve the core zero-dep constraint).
 */
export interface NappletClass {
  /** Shell-assigned class number. Undefined until `class.assigned` arrives. */
  readonly class: number | undefined;
}

/** All class NUB message types (v1: single terminal assignment envelope). */
export type ClassNubMessage = ClassAssignedMessage;
