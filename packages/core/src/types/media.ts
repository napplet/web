/** The side that fetches/decodes media and emits authoritative playback state. */
export type MediaPlaybackOwner = 'shell' | 'napplet';

/** Source reference for shell-owned media playback or advisory source metadata. */
export interface MediaSourceRef {
  url?: string;
  blossomHash?: string;
  nostr?: {
    eventId?: string;
    address?: string;
    relays?: string[];
  };
  mimeType?: string;
}

/** Media session metadata. */
export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: { url?: string; hash?: string };
  duration?: number;
  mediaType?: 'audio' | 'video';
}

/** Media playback state. */
export interface MediaState {
  status: 'playing' | 'paused' | 'stopped' | 'buffering';
  position?: number;
  duration?: number;
  volume?: number;
}

/** Media action supported by a session or requested by a controller. */
export type MediaAction = 'play' | 'pause' | 'stop' | 'next' | 'prev' | 'seek' | 'volume';

interface MediaSessionCreateBase {
  sessionId?: string;
  metadata?: MediaMetadata;
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
