/**
 * @napplet/nub/media -- Media session control message types
 * for the JSON envelope wire protocol.
 *
 * Defines 8 message types for media session management:
 * - Napplet -> Shell: session.create, session.update, session.destroy
 * - Owner -> Peer: state, capabilities
 * - Controller -> Owner: command
 * - Shell -> Napplet: session.create.result, controls
 *
 * All types form a discriminated union on the `type` field.
 * Media sessions support napplet-owned and shell-owned playback.
 */

import type { NappletMessage } from '@napplet/core';

/** The NAP domain name for media messages. */
export const DOMAIN = 'media' as const;

/** The side that fetches/decodes media and emits authoritative playback state. */
export type MediaPlaybackOwner = 'shell' | 'napplet';

/**
 * Source reference for shell-owned playback, or advisory source metadata for
 * napplet-owned playback.
 */
export interface MediaSourceRef {
  /** Direct URL to media bytes. Shells fetch through shell-controlled policy. */
  url?: string;
  /** Blossom content hash reference. */
  blossomHash?: string;
  /** Nostr event/address reference. */
  nostr?: {
    /** Event id containing or referencing media. */
    eventId?: string;
    /** Address coordinate containing or referencing media. */
    address?: string;
    /** Relay hints for resolving the Nostr reference. */
    relays?: string[];
  };
  /** Optional MIME type hint. */
  mimeType?: string;
}

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

interface MediaSessionCreateBase {
  /** Preferred client session id hint. Shell returns the canonical id. */
  sessionId?: string;
  /** Optional initial metadata. */
  metadata?: MediaMetadata;
  /** Initial supported actions. */
  capabilities?: MediaAction[];
  /** Request autoplay for shell-owned playback when policy allows it. */
  autoplay?: boolean;
  /** Whether the media is a live source. */
  live?: boolean;
}

/**
 * Public create-session options.
 * Shell-owned sessions require a source because the shell owns fetching/playback.
 */
export type MediaSessionCreate =
  | (MediaSessionCreateBase & {
      owner: 'shell';
      source: MediaSourceRef;
    })
  | (MediaSessionCreateBase & {
      owner: 'napplet';
      source?: MediaSourceRef;
    });

/** Result of a create-session request. */
export interface MediaSessionResult {
  /** Shell-canonical session id. Present on success. */
  sessionId?: string;
  /** Shell-confirmed playback owner. Present on success. */
  owner?: MediaPlaybackOwner;
  /** Creation error. When present, the session was not created. */
  error?: string;
}

/**
 * Base interface for all media NAP messages.
 * Concrete message types narrow the `type` field to specific literals.
 */
export interface MediaMessage extends NappletMessage {
  /** Message type in "media.<action>" format. */
  type: `media.${string}`;
}

/**
 * Create a new media session. Uses `id` for correlation with the result.
 * The napplet MUST set `owner`; `sessionId` is a preferred hint and the shell
 * returns the canonical session id.
 *
 * @example
 * ```ts
 * const msg: MediaSessionCreateMessage = {
 *   type: 'media.session.create',
 *   id: 'm1',
 *   owner: 'napplet',
 *   sessionId: 's1',
 *   metadata: { title: 'My Song', artist: 'The Artist' },
 * };
 * ```
 */
export interface MediaSessionCreateMessage extends MediaMessage {
  type: 'media.session.create';
  /** Correlation ID for the request/result pair. */
  id: string;
  /** Playback owner for this session. */
  owner: MediaPlaybackOwner;
  /** Preferred client session identifier. Shell returns the canonical id. */
  sessionId?: string;
  /** Source reference. Required by shells for shell-owned sessions. */
  source?: MediaSourceRef;
  /** Optional initial metadata. */
  metadata?: MediaMetadata;
  /** Initial supported actions. */
  capabilities?: MediaAction[];
  /** Request autoplay when policy allows it. */
  autoplay?: boolean;
  /** Whether the media is a live source. */
  live?: boolean;
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

/**
 * Result of a media.session.create request.
 * Carries the same correlation `id` as the request and the shell-canonical
 * session id on success.
 *
 * @example
 * ```ts
 * const msg: MediaSessionCreateResultMessage = {
 *   type: 'media.session.create.result',
 *   id: 'm1',
 *   sessionId: 's1',
 *   owner: 'napplet',
 * };
 * ```
 */
export interface MediaSessionCreateResultMessage extends MediaMessage {
  type: 'media.session.create.result';
  /** Correlation ID matching the original request. */
  id: string;
  /** The shell-canonical session identifier. */
  sessionId?: string;
  /** The shell-confirmed playback owner. */
  owner?: MediaPlaybackOwner;
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
 *   sessionId: 's1',
 *   controls: ['play', 'pause', 'stop', 'next', 'prev', 'seek', 'volume'],
 * };
 * ```
 */
export interface MediaControlsMessage extends MediaMessage {
  type: 'media.controls';
  /** The session this control list applies to. */
  sessionId: string;
  /** Media actions the shell supports. */
  controls: MediaAction[];
}

/** Napplet -> Shell media request messages. */
export type MediaRequestMessage =
  | MediaSessionCreateMessage
  | MediaSessionUpdateMessage
  | MediaSessionDestroyMessage
  | MediaStateMessage
  | MediaCapabilitiesMessage
  | MediaCommandMessage;

/** Shell -> Napplet media result/push messages. */
export type MediaResultMessage =
  | MediaSessionCreateResultMessage
  | MediaStateMessage
  | MediaCapabilitiesMessage
  | MediaCommandMessage
  | MediaControlsMessage;

/** All media NAP message types (discriminated union on `type` field). */
export type MediaNapMessage = MediaRequestMessage | MediaResultMessage;

/** @deprecated Use {@link MediaNapMessage}. */
export type MediaNubMessage = MediaNapMessage;
