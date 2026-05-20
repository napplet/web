/**
 * @napplet/nub/resource -- Resource NUB message types for the JSON envelope wire protocol.
 *
 * Defines 4 message types for byte-fetching:
 * - Napplet -> Shell: bytes (request), cancel (in-flight cancellation)
 * - Shell -> Napplet: bytes.result (success with Blob + MIME), bytes.error (8-code typed error)
 *
 * All types form a discriminated union on the `type` field.
 * Single-Blob delivery contract: no streaming, no partial payloads, no segmentation.
 */

import type { NappletMessage } from '@napplet/core';

// ─── Domain Constants ──────────────────────────────────────────────────────

/** The NUB domain name for resource messages. */
export const DOMAIN = 'resource' as const;

// ─── Supporting Types ──────────────────────────────────────────────────────

/**
 * Typed error vocabulary for resource fetch failures.
 * The shell selects exactly one code per failed fetch.
 *
 * | Code | Meaning |
 * |------|---------|
 * | `not-found`         | Resource does not exist at the given URL |
 * | `blocked-by-policy` | Shell policy refused the fetch (e.g., private-IP block, scheme not allowed) |
 * | `timeout`           | Fetch exceeded the shell-imposed wall-clock budget |
 * | `too-large`         | Response body exceeded the shell's size cap |
 * | `unsupported-scheme`| URL scheme has no registered handler in this shell |
 * | `decode-failed`     | Bytes could not be decoded (e.g., malformed `data:` URI, invalid Blossom hash) |
 * | `network-error`     | Underlying transport failure (DNS, TLS, socket, refused) |
 * | `quota-exceeded`    | Per-napplet rate limit or concurrency cap reached |
 */
export type ResourceErrorCode =
  | 'not-found'
  | 'blocked-by-policy'
  | 'timeout'
  | 'too-large'
  | 'unsupported-scheme'
  | 'decode-failed'
  | 'network-error'
  | 'quota-exceeded';

/**
 * The four canonical v0.28.0 URL schemes routed through the resource NUB.
 * Future schemes plug in at the spec level (NUB-RESOURCE Phase 132 scheme registration).
 */
export type ResourceScheme = 'data' | 'https' | 'blossom' | 'nostr';

/**
 * Pre-resolved resource entry delivered alongside a relay event via the
 * NUB-RELAY sidecar amendment (Phase 127 / SIDE-01..04). Same shape as the
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

// ─── Base Message Type ─────────────────────────────────────────────────────

/**
 * Base interface for all resource NUB messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface ResourceMessage extends NappletMessage {
  /** Message type in "resource.<action>" format. */
  type: `resource.${string}`;
}

// ─── Napplet -> Shell Request Messages ─────────────────────────────────────

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

// ─── Shell -> Napplet Result Messages ────────────────────────────────────

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
 * Failed result for a `resource.bytes` request. Carries one of the
 * 8 typed error codes plus an optional human-readable message.
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

// ─── Discriminated Unions ──────────────────────────────────────────────────

/** Napplet -> Shell resource messages. */
export type ResourceRequestMessage =
  | ResourceBytesMessage
  | ResourceCancelMessage;

/** Shell -> Napplet resource result messages (success or error). */
export type ResourceResultMessage =
  | ResourceBytesResultMessage
  | ResourceBytesErrorMessage;

/** All resource NUB message types (discriminated union on `type` field). */
export type ResourceNubMessage = ResourceRequestMessage | ResourceResultMessage;
