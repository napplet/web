/**
 * @napplet/nap/resource -- Resource NAP message types for the JSON envelope wire protocol.
 *
 * Defines resource byte-fetching messages:
 * - Napplet -> Shell: bytes, bytesMany, cancel
 * - Shell -> Napplet: bytes.result/error, bytesMany.result/error
 *
 * All types form a discriminated union on the `type` field.
 * Single-Blob delivery contract: no streaming, no partial payloads, no segmentation.
 */

import type {
  NappletMessage,
  ResourceBytesItem,
  ResourceErrorCode,
} from '@napplet/core';

export type {
  ResourceBytesOkItem,
  ResourceBytesErrorItem,
  ResourceBytesItem,
  ResourceErrorCode,
} from '@napplet/core';

/** The NAP domain name for resource messages. */
export const DOMAIN = 'resource' as const;

/**
 * The four canonical v0.28.0 URL schemes routed through the resource NAP.
 * Future schemes plug in at the spec level (NAP-RESOURCE Phase 132 scheme registration).
 */
export type ResourceScheme = 'data' | 'https' | 'blossom' | 'nostr';

/**
 * Pre-resolved resource entry delivered alongside a relay event via the
 * NAP-RELAY sidecar amendment (Phase 127 / SIDE-01..04). Same shape as the
 * result envelope minus correlation/type fields.
 *
 * @example
 * ```ts
 * const entry: ResourceSidecarEntry = {
 *   url: 'https://example.com/avatar.png',
 *   blob: new Blob([...], { type: 'image/png' }),
 *   mime: 'image/png',
 * };
 * ```
 */
export interface ResourceSidecarEntry {
  /** The exact URL the napplet would request via `bytes(url)`. */
  url: string;
  /** Pre-fetched bytes. */
  blob: Blob;
  /** Shell-classified MIME (byte-sniffed; NOT upstream Content-Type). */
  mime: string;
}

/**
 * Base interface for all resource NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface ResourceMessage extends NappletMessage {
  /** Message type in "resource.<action>" format. */
  type: `resource.${string}`;
}

/**
 * Request bytes for a URL. The shell selects a scheme handler, applies
 * its resource policy, and replies with `resource.bytes.result` (success)
 * or `resource.bytes.error` (typed failure).
 *
 * NOTE: AbortSignal is napplet-side only and never crosses the wire.
 * In-flight cancellation flows via the separate `ResourceCancelMessage`.
 *
 * @example
 * ```ts
 * const msg: ResourceBytesMessage = {
 *   type: 'resource.bytes',
 *   id: crypto.randomUUID(),
 *   url: 'https://example.com/avatar.png',
 * };
 * ```
 */
export interface ResourceBytesMessage extends ResourceMessage {
  type: 'resource.bytes';
  /** Correlation ID. */
  id: string;
  /** URL identifying the resource (any registered scheme). */
  url: string;
}

/**
 * Request bytes for many URLs in one envelope. The shell processes each URL as
 * if it were an independent `resource.bytes` request, but returns one ordered
 * result array so one failed URL does not discard successful siblings.
 */
export interface ResourceBytesManyMessage extends ResourceMessage {
  type: 'resource.bytesMany';
  /** Correlation ID. */
  id: string;
  /** Non-empty URL list. Result items preserve this order and length. */
  urls: string[];
}

/**
 * Cancel an in-flight `resource.bytes` request by correlation ID.
 * Fire-and-forget. The shell SHOULD abort upstream work and free
 * the request slot for quota purposes; no result is returned.
 *
 * @example
 * ```ts
 * const msg: ResourceCancelMessage = {
 *   type: 'resource.cancel',
 *   id: 'previously-issued-id',
 * };
 * ```
 */
export interface ResourceCancelMessage extends ResourceMessage {
  type: 'resource.cancel';
  /** Correlation ID of the request to cancel. */
  id: string;
}

/**
 * Successful result for a `resource.bytes` request. Carries the
 * fetched bytes as a single Blob plus the shell-classified MIME
 * (byte-sniffed; NEVER upstream Content-Type per RES-04).
 *
 * Single-Blob contract (RES-07): no segmentation, streaming, or range
 * fields exist anywhere in the result union. Streaming delivery is
 * reserved for a future audio/video milestone.
 *
 * @example
 * ```ts
 * const msg: ResourceBytesResultMessage = {
 *   type: 'resource.bytes.result',
 *   id: 'q1',
 *   blob: new Blob([...]),
 *   mime: 'image/png',
 * };
 * ```
 */
export interface ResourceBytesResultMessage extends ResourceMessage {
  type: 'resource.bytes.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Fetched bytes as a single Blob. */
  blob: Blob;
  /** Shell-classified MIME type (byte-sniffed). */
  mime: string;
}

/**
 * Successful bulk result. `items` preserves input order and length; each item
 * records its own success or failure.
 */
export interface ResourceBytesManyResultMessage extends ResourceMessage {
  type: 'resource.bytesMany.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Ordered one-item-per-input-URL result list. */
  items: ResourceBytesItem[];
}

/**
 * Failed result for a `resource.bytes` request. Carries one typed error code
 * plus an optional human-readable message.
 *
 * @example
 * ```ts
 * const msg: ResourceBytesErrorMessage = {
 *   type: 'resource.bytes.error',
 *   id: 'q1',
 *   error: 'blocked-by-policy',
 *   message: 'private-IP block list rejected 192.168.1.1',
 * };
 * ```
 */
export interface ResourceBytesErrorMessage extends ResourceMessage {
  type: 'resource.bytes.error';
  /** Correlation ID matching the original request. */
  id: string;
  /** Typed error code. */
  error: ResourceErrorCode;
  /** Optional human-readable error detail. */
  message?: string;
}

/** Top-level failure for malformed or policy-rejected `resource.bytesMany`. */
export interface ResourceBytesManyErrorMessage extends ResourceMessage {
  type: 'resource.bytesMany.error';
  /** Correlation ID matching the original request. */
  id: string;
  /** Typed error code. */
  error: ResourceErrorCode;
  /** Optional human-readable error detail. */
  message?: string;
}

/** Napplet -> Shell resource messages. */
export type ResourceRequestMessage =
  | ResourceBytesMessage
  | ResourceBytesManyMessage
  | ResourceCancelMessage;

/** Shell -> Napplet resource result messages (success or error). */
export type ResourceResultMessage =
  | ResourceBytesResultMessage
  | ResourceBytesErrorMessage
  | ResourceBytesManyResultMessage
  | ResourceBytesManyErrorMessage;

/** All resource NAP message types (discriminated union on `type` field). */
export type ResourceNapMessage = ResourceRequestMessage | ResourceResultMessage;
