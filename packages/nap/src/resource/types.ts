/**
 * Napplet NAP resource types entrypoint.
 *
 * @module
 */

/**
 * @napplet/nap/resource -- Resource NAP message types for the JSON envelope wire protocol.
 *
 * Defines resource byte-fetching messages:
 * - Napplet -> Shell: bytes, bytesMany, cancel
 * - Shell -> Napplet: bytes.result/error, bytesMany.result/error
 *
 * All types form a discriminated union on the `type` field.
 * Complete-byte delivery contract: no streaming, no partial payloads, no segmentation.
 */

import type {
  NappletMessage,
  ResourceBytesItem,
  ResourceBytes,
  ResourceErrorCode,
  ResourceInfo,
} from '@napplet/core';

export type {
  ResourceBytesOkItem,
  ResourceBytesErrorItem,
  ResourceBytesItem,
  ResourceBytes,
  ResourceErrorCode,
  ResourceSchemeInfo,
  ResourceInfo,
  ResourceSidecarEntry,
} from '@napplet/core';

/** The NAP domain name for resource messages. */
export const DOMAIN = 'resource' as const;

/**
 * Canonical URL schemes currently listed by NAP-RESOURCE.
 */
export type ResourceScheme = 'data' | 'https' | 'blossom' | 'htree' | 'hashtree' | 'nostr';

/**
 * Base interface for all resource NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface ResourceMessage extends NappletMessage {
  /** Message type in "resource.<action>" format. */
  type: `resource.${string}`;
}

/** Inspect resource schemes and coarse runtime policy limits. */
export interface ResourceInfoMessage extends ResourceMessage {
  type: 'resource.info';
  /** Correlation ID. */
  id: string;
}

/** Successful result for a `resource.info` request. */
export interface ResourceInfoResultMessage extends ResourceMessage {
  type: 'resource.info.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Advisory resource capability and policy limits. */
  info: ResourceInfo;
}

/** Failed result for a `resource.info` request. */
export interface ResourceInfoErrorMessage extends ResourceMessage {
  type: 'resource.info.error';
  /** Correlation ID matching the original request. */
  id: string;
  /** Error reason. */
  error: string;
  /** Optional human-readable error detail. */
  message?: string;
}

/**
 * Request bytes for a URL. The shell selects a scheme handler, applies
 * its resource policy, and replies with `resource.bytes.result` (success)
 * or `resource.bytes.error` (typed failure).
 *
 * NOTE: AbortSignal is napplet-side only and never crosses the wire.
 * In-flight cancellation flows via the separate `ResourceCancelMessage`.
 *
 * @see https://github.com/hzrd149/blossom/blob/master/buds/10.md BUD-10 Blossom URI schema for `blossom:` URLs
 *
 * @example
 * ```ts
 * const msg: ResourceBytesMessage = {
 *   type: 'resource.bytes',
 *   id: crypto.randomUUID(),
 *   url: 'blossom:<sha256>.png',
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
 * Request bytes for many resources in one envelope. The shell processes each
 * request as if it were an independent `resource.bytes` request, but returns
 * one ordered result array so one failed resource does not discard successful
 * siblings.
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
 * fetched bytes as canonical padded base64 plus the shell-classified MIME
 * (byte-sniffed; NEVER upstream Content-Type per RES-04).
 *
 * Complete-byte contract (RES-07): no segmentation, streaming, or range
 * fields exist anywhere in the result union. Streaming delivery is
 * reserved for a future audio/video milestone.
 *
 * @example
 * ```ts
 * const msg: ResourceBytesResultMessage = {
 *   type: 'resource.bytes.result',
 *   id: 'q1',
 *   blob: 'AAEC/w==',
 *   mime: 'image/png',
 * };
 * ```
 */
export interface ResourceBytesResultMessage extends ResourceMessage {
  type: 'resource.bytes.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** Fetched bytes as canonical padded base64. */
  blob: ResourceBytes;
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
  items: ResourceBytesItem<ResourceBytes>[];
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
  | ResourceInfoMessage
  | ResourceBytesMessage
  | ResourceBytesManyMessage
  | ResourceCancelMessage;

/** Shell -> Napplet resource result messages (success or error). */
export type ResourceResultMessage =
  | ResourceInfoResultMessage
  | ResourceInfoErrorMessage
  | ResourceBytesResultMessage
  | ResourceBytesErrorMessage
  | ResourceBytesManyResultMessage
  | ResourceBytesManyErrorMessage;

/** All resource NAP message types (discriminated union on `type` field). */
export type ResourceNapMessage = ResourceRequestMessage | ResourceResultMessage;
