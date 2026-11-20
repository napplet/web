/** The side that fetches/decodes media and emits authoritative playback state. */
export type MediaPlaybackOwner = 'shell' | 'napplet';

/** Nostr event or address reference with optional relay hints. */
export interface MediaNostrRef {
  eventId?: string;
  address?: string;
  relays?: string[];
}

/** Source reference for shell-owned media playback or advisory source metadata. */
export interface MediaSourceRef {
  url?: string;
  blossomHash?: string;
  nostr?: MediaNostrRef;
  mimeType?: string;
}

/** Artwork reference for media sessions. */
export interface MediaArtwork {
  url?: string;
  hash?: string;
}

/** Media session metadata. */
export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaArtwork;
  duration?: number;
  mediaType?: 'audio' | 'video';
}

/** Link from a media session context to a related resource. */
export interface MediaContextLink {
  rel: string;
  title?: string;
  nostr?: MediaNostrRef;
}

/** Optional UI, queue, and related-resource context for a media session. */
export interface MediaSessionContext {
  label?: string;
  detail?: string;
  index?: number;
  total?: number;
  links?: MediaContextLink[];
}

/** Media playback state. */
export interface MediaState {
  status: 'playing' | 'paused' | 'stopped' | 'buffering';
  position?: number;
  duration?: number;
  volume?: number;
  /**
   * Cause of this transition, such as `user`, `ended`, `error`, or `focus-lost`.
   * Missing or unrecognized reasons are unspecified causes.
   */
  reason?: string;
}

/** Terminal retirement record delivered by `media.session.ended`. */
export interface MediaSessionEnded {
  /** Canonical identifier of the retired session. */
  sessionId: string;
  /** Why the shell retired the session, such as `destroyed`, `preempted`, or `policy`. */
  reason: string;
}

/** Media action supported by a session or requested by a controller. */
export type MediaAction = 'play' | 'pause' | 'stop' | 'next' | 'prev' | 'seek' | 'volume';

interface MediaSessionCreateBase {
  sessionId?: string;
  metadata?: MediaMetadata;
  context?: MediaSessionContext;
  capabilities?: MediaAction[];
  autoplay?: boolean;
  live?: boolean;
}

/** Ownership-aware media session creation options. */
export type MediaSessionCreate =
  | (MediaSessionCreateBase & {
      owner: 'shell';
      source: MediaSourceRef;
    })
  | (MediaSessionCreateBase & {
      owner: 'napplet';
      source?: MediaSourceRef;
    });

/** Result of a media session creation request. */
export interface MediaSessionResult {
  sessionId?: string;
  owner?: MediaPlaybackOwner;
  error?: string;
}
