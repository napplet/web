/**
 * @napplet/nub/media -- Media session control message types
 * for the JSON envelope wire protocol.
 *
 * Defines 8 message types for media session management:
 * - Napplet -> Shell: session.create, session.update, session.destroy, state, capabilities
 * - Shell -> Napplet: session.create.result, command, controls
 *
 * All types form a discriminated union on the `type` field.
 * Media sessions enable shell-level playback controls for sandboxed napplets.
 */

import type { NappletMessage } from '@napplet/core';

// ─── Domain Constants ──────────────────────────────────────────────────────

/** The NUB domain name for media messages. */
export const DOMAIN = 'media' as const;

// ─── Supporting Types ──────────────────────────────────────────────────────

/**
 * Media session metadata. All fields are optional -- a session can be
 * created with no metadata and updated later.
 *
 * @example
 * ```ts
 * const metadata: MediaMetadata = {
 *   title: 'Song Title',
 *   artist: 'Artist Name',
 *   album: 'Album Name',
 *   artwork: { url: 'https://example.com/cover.jpg' },
 *   duration: 240,
 *   mediaType: 'audio',
 * };
 * ```
 */
export interface MediaMetadata {
  /** Track or media title. */
  title?: string;
  /** Artist or creator name. */
  artist?: string;
  /** Album or collection name. */
  album?: string;
  /** Artwork image reference. Supports direct URL or Blossom hash. */
  artwork?: MediaArtwork;
  /** Total duration in seconds. */
  duration?: number;
  /** Media type hint for shell UI. */
  mediaType?: 'audio' | 'video';
}

/**
 * Artwork reference for media sessions. Supports direct URL, Blossom hash, or both.
 *
 * @example
 * ```ts
 * const artwork: MediaArtwork = { url: 'https://example.com/cover.jpg' };
 * const blossomArt: MediaArtwork = { hash: 'abc123...' };
 * const both: MediaArtwork = { url: 'https://example.com/cover.jpg', hash: 'abc123...' };
 * ```
 */
export interface MediaArtwork {
  /** Direct URL to artwork image. */
  url?: string;
  /** Blossom hash (SHA-256) the shell can resolve via its Blossom servers. */
  hash?: string;
}

/**
 * Media playback state reported by the napplet.
 *
 * @example
 * ```ts
 * const state: MediaState = {
 *   status: 'playing',
 *   position: 42.5,
 *   duration: 240,
 *   volume: 0.8,
 * };
 * ```
 */
export interface MediaState {
  /** Current playback status. */
  status: 'playing' | 'paused' | 'stopped' | 'buffering';
  /** Current playback position in seconds. */
  position?: number;
  /** Total duration in seconds. */
  duration?: number;
  /** Napplet-side volume (0.0 to 1.0). Shell volume is separate. */
  volume?: number;
}

/**
 * Media actions that a session can support or that the shell can send.
 * Capabilities are dynamic -- they can change mid-session.
 */
export type MediaAction = 'play' | 'pause' | 'stop' | 'next' | 'prev' | 'seek' | 'volume';

// ─── Base Message Type ─────────────────────────────────────────────────────

/**
 * Base interface for all media NUB messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface MediaMessage extends NappletMessage {
  /** Message type in "media.<action>" format. */
  type: `media.${string}`;
}

// ─── Napplet -> Shell Request Messages ─────────────────────────────────────

/**
 * Create a new media session. The napplet provides a client-generated
 * sessionId and optional metadata. Uses `id` for correlation with the result.
 *
 * @example
 * ```ts
 * const msg: MediaSessionCreateMessage = {
 *   type: 'media.session.create',
 *   id: 'm1',
 *   sessionId: 's1',
 *   metadata: { title: 'My Song', artist: 'The Artist' },
 * };
 * ```
 */
export interface MediaSessionCreateMessage extends MediaMessage {
  type: 'media.session.create';
  /** Correlation ID for the request/result pair. */
  id: string;
  /** Client-generated session identifier. */
  sessionId: string;
  /** Optional initial metadata. */
  metadata?: MediaMetadata;
}

/**
 * Update metadata for an existing session. Partial updates supported --
 * only provided fields are changed. Fire-and-forget (no correlation ID).
 *
 * @example
 * ```ts
 * const msg: MediaSessionUpdateMessage = {
 *   type: 'media.session.update',
 *   sessionId: 's1',
 *   metadata: { title: 'Updated Title' },
 * };
 * ```
 */
export interface MediaSessionUpdateMessage extends MediaMessage {
  type: 'media.session.update';
  /** The session to update. */
  sessionId: string;
  /** Partial metadata -- only provided fields are updated. */
  metadata: Partial<MediaMetadata>;
}

/**
 * Destroy a media session. Fire-and-forget.
 *
 * @example
 * ```ts
 * const msg: MediaSessionDestroyMessage = {
 *   type: 'media.session.destroy',
 *   sessionId: 's1',
 * };
 * ```
 */
export interface MediaSessionDestroyMessage extends MediaMessage {
  type: 'media.session.destroy';
  /** The session to destroy. */
  sessionId: string;
}

/**
 * Report current playback state for a session.
 * Fire-and-forget, high frequency during active playback.
 *
 * @example
 * ```ts
 * const msg: MediaStateMessage = {
 *   type: 'media.state',
 *   sessionId: 's1',
 *   status: 'playing',
 *   position: 42.5,
 *   duration: 240,
 *   volume: 0.8,
 * };
 * ```
 */
export interface MediaStateMessage extends MediaMessage {
  type: 'media.state';
  /** The session this state belongs to. */
  sessionId: string;
  /** Current playback status. */
  status: 'playing' | 'paused' | 'stopped' | 'buffering';
  /** Current playback position in seconds. */
  position?: number;
  /** Total duration in seconds. */
  duration?: number;
  /** Napplet-side volume (0.0 to 1.0). */
  volume?: number;
}

/**
 * Declare which media actions the session currently supports.
 * Capabilities are dynamic -- can change mid-session. Fire-and-forget.
 *
 * @example
 * ```ts
 * const msg: MediaCapabilitiesMessage = {
 *   type: 'media.capabilities',
 *   sessionId: 's1',
 *   actions: ['play', 'pause', 'seek', 'volume'],
 * };
 * ```
 */
export interface MediaCapabilitiesMessage extends MediaMessage {
  type: 'media.capabilities';
  /** The session to update capabilities for. */
  sessionId: string;
  /** Currently supported actions. */
  actions: MediaAction[];
}

// ─── Shell -> Napplet Result/Push Messages ────────────────────────────────

/**
 * Result of a media.session.create request.
 * Carries the same correlation `id` as the request.
 *
 * @example
 * ```ts
 * const msg: MediaSessionCreateResultMessage = {
 *   type: 'media.session.create.result',
 *   id: 'm1',
 *   sessionId: 's1',
 * };
 * ```
 */
export interface MediaSessionCreateResultMessage extends MediaMessage {
  type: 'media.session.create.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The session identifier. */
  sessionId: string;
  /** Error message on failure (e.g., "session limit exceeded"). */
  error?: string;
}

/**
 * Shell-initiated media command to control napplet playback.
 * Sent when the user interacts with the shell's media controls.
 *
 * @example
 * ```ts
 * const msg: MediaCommandMessage = {
 *   type: 'media.command',
 *   sessionId: 's1',
 *   action: 'seek',
 *   value: 120,
 * };
 * ```
 */
export interface MediaCommandMessage extends MediaMessage {
  type: 'media.command';
  /** The session to control. */
  sessionId: string;
  /** The media action to perform. */
  action: MediaAction;
  /** Optional value for seek (position in seconds) or volume (0.0 to 1.0). */
  value?: number;
}

/**
 * Shell-initiated push of the shell's supported media controls.
 * The napplet can adapt its own UI based on what the shell supports.
 *
 * @example
 * ```ts
 * const msg: MediaControlsMessage = {
 *   type: 'media.controls',
 *   controls: ['play', 'pause', 'stop', 'next', 'prev', 'seek', 'volume'],
 * };
 * ```
 */
export interface MediaControlsMessage extends MediaMessage {
  type: 'media.controls';
  /** Media actions the shell supports. */
  controls: MediaAction[];
}

// ─── Discriminated Unions ──────────────────────────────────────────────────

/** Napplet -> Shell media request messages. */
export type MediaRequestMessage =
  | MediaSessionCreateMessage
  | MediaSessionUpdateMessage
  | MediaSessionDestroyMessage
  | MediaStateMessage
  | MediaCapabilitiesMessage;

/** Shell -> Napplet media result/push messages. */
export type MediaResultMessage =
  | MediaSessionCreateResultMessage
  | MediaCommandMessage
  | MediaControlsMessage;

/** All media NUB message types (discriminated union on `type` field). */
export type MediaNubMessage = MediaRequestMessage | MediaResultMessage;
