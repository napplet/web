/** NAP-TORRENT types. Non-normative: https://github.com/napplet/naps/pull/72 */
import type { NostrEvent, RelayEventResult, Subscription } from './nostr.js';

/** NAP-TORRENT Transport values. */
export type TorrentTransport = 'webtorrent' | 'bittorrent' | 'auto' | (string & {});

/** NAP-TORRENT Mode values. */
export type TorrentMode = 'download' | 'seed' | 'download-and-seed';

/** NAP-TORRENT JobState values. */
export type TorrentJobState = 'queued' | 'metadata' | 'downloading' | 'seeding' | 'paused' | 'complete' | 'cancelled' | 'error';

/** NAP-TORRENT SourceType values. */
export type TorrentSourceType = 'nip35' | 'magnet' | 'infohash' | 'metainfo' | 'runtime-file-set';

/** NAP-TORRENT Storage values. */
export type TorrentStorage = 'temporary' | 'persistent' | 'user-selected';

/** NAP-TORRENT ReferencePrefix values. */
export type TorrentReferencePrefix = 'tcat' | 'newznab' | 'tmdb' | 'ttvdb' | 'imdb' | 'mal' | 'anilist' | (string & {});

/** TorrentCapabilities record from NAP-TORRENT. */
export interface TorrentCapabilities {
  transports: TorrentTransport[];
  modes: TorrentMode[];
  maxActiveJobs?: number;
  maxTorrentSize?: number;
  canPublishNip35?: boolean;
  canComment?: boolean;
  canSeedRuntimeFiles?: boolean;
  canUseDht?: boolean;
  canUseTrackers?: boolean;
  canUseWebSeeds?: boolean;
}

/** TorrentFile record from NAP-TORRENT. */
export interface TorrentFile {
  path: string;
  size?: number;
}

/** TorrentReference record from NAP-TORRENT. */
export interface TorrentReference {
  prefix: TorrentReferencePrefix;
  value: string;
}

/** TorrentDescriptor record from NAP-TORRENT. */
export interface TorrentDescriptor {
  infoHash: string;
  files: TorrentFile[];
  trackers: string[];
  tags: string[];
  references: TorrentReference[];
  title?: string;
  description?: string;
  magnet?: string;
  eventId?: string;
  author?: string;
  createdAt?: number;
  result?: RelayEventResult;
}

/** TorrentDescriptorResult record from NAP-TORRENT. */
export interface TorrentDescriptorResult {
  ok: boolean;
  descriptor?: TorrentDescriptor;
  error?: string;
  reason?: string;
}

/** TorrentMagnetResult record from NAP-TORRENT. */
export interface TorrentMagnetResult {
  ok: boolean;
  magnet?: string;
  error?: string;
  reason?: string;
}

/** TorrentSearchQuery record from NAP-TORRENT. */
export interface TorrentSearchQuery {
  text?: string;
  infoHash?: string;
  tags?: string[];
  references?: TorrentReference[];
  authors?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

/** TorrentSearchResult record from NAP-TORRENT. */
export interface TorrentSearchResult {
  descriptor: TorrentDescriptor;
  result: RelayEventResult;
}

/** TorrentPublishRequest record from NAP-TORRENT. */
export interface TorrentPublishRequest {
  descriptor: TorrentDescriptor;
  content?: string;
  relays?: string[];
  publish?: boolean;
}

/** TorrentCommentRequest record from NAP-TORRENT. */
export interface TorrentCommentRequest {
  torrentEventId: string;
  torrentAuthor: string;
  content: string;
  relays?: string[];
}

/** TorrentPublishResult record from NAP-TORRENT. */
export interface TorrentPublishResult {
  ok: boolean;
  eventId?: string;
  event?: NostrEvent;
  relays?: Record<string, boolean>;
  error?: string;
  reason?: string;
}

/** TorrentPickOptions record from NAP-TORRENT. */
export interface TorrentPickOptions {
  multiple?: boolean;
  suggestedName?: string;
}

/** TorrentRuntimeFileSet record from NAP-TORRENT. */
export interface TorrentRuntimeFileSet {
  runtimeFileSetId: string;
  files: TorrentFile[];
  totalBytes: number;
  displayName?: string;
}

/** TorrentFileSetResult record from NAP-TORRENT. */
export interface TorrentFileSetResult {
  ok: boolean;
  fileSet?: TorrentRuntimeFileSet;
  error?: string;
  reason?: string;
}

/** TorrentSource record from NAP-TORRENT. */
export interface TorrentSource {
  sourceType: TorrentSourceType;
  event?: NostrEvent;
  descriptor?: TorrentDescriptor;
  magnet?: string;
  infoHash?: string;
  /** Abstract byte string; the draft does not yet define its JSON web encoding. */
  metainfo?: unknown;
  runtimeFileSetId?: string;
}

/** TorrentAddOptions record from NAP-TORRENT. */
export interface TorrentAddOptions {
  mode?: TorrentMode;
  transport?: TorrentTransport;
  startPaused?: boolean;
  seedAfterComplete?: boolean;
  downloadLimitBytesPerSecond?: number;
  uploadLimitBytesPerSecond?: number;
  storage?: TorrentStorage;
  trackers?: string[];
  webSeeds?: string[];
  fileSelection?: TorrentFileSelection;
}

/** TorrentAddRequest record from NAP-TORRENT. */
export interface TorrentAddRequest {
  source: TorrentSource;
  jobId?: string;
  options?: TorrentAddOptions;
}

/** TorrentJobAck record from NAP-TORRENT. */
export interface TorrentJobAck {
  ok: boolean;
  jobId?: string;
  state?: TorrentJobState;
  error?: string;
  reason?: string;
}

/** TorrentPeerStats record from NAP-TORRENT. */
export interface TorrentPeerStats {
  peers: number;
  seeds: number;
  leeches: number;
}

/** TorrentJobStatus record from NAP-TORRENT. */
export interface TorrentJobStatus {
  ok: boolean;
  jobId: string;
  state: TorrentJobState;
  mode: TorrentMode;
  transport: TorrentTransport;
  infoHash: string;
  downloadedBytes: number;
  uploadedBytes: number;
  totalBytes: number;
  progress: number;
  downloadRate: number;
  uploadRate: number;
  ratio: number;
  peers: TorrentPeerStats;
  title?: string;
  etaSeconds?: number;
  storage?: TorrentStorage;
  error?: string;
  reason?: string;
}

/** TorrentJobSummary record from NAP-TORRENT. */
export interface TorrentJobSummary {
  jobId: string;
  state: TorrentJobState;
  mode: TorrentMode;
  transport: TorrentTransport;
  infoHash: string;
  progress: number;
  downloadRate: number;
  uploadRate: number;
  ratio: number;
  title?: string;
}

/** TorrentJobFilter record from NAP-TORRENT. */
export interface TorrentJobFilter {
  states?: TorrentJobState[];
  modes?: TorrentMode[];
}

/** TorrentFileStatus record from NAP-TORRENT. */
export interface TorrentFileStatus {
  index: number;
  path: string;
  size: number;
  selected: boolean;
  priority: number;
  downloadedBytes: number;
  progress: number;
}

/** TorrentFileSelection record from NAP-TORRENT. */
export interface TorrentFileSelection {
  indexes?: number[];
  paths?: string[];
  priority?: number;
}

/** TorrentRemoveOptions record from NAP-TORRENT. */
export interface TorrentRemoveOptions {
  deleteData?: boolean;
}

/** TorrentRemoveResult record from NAP-TORRENT. */
export interface TorrentRemoveResult {
  ok: boolean;
  jobId: string;
  deletedData?: boolean;
  error?: string;
  reason?: string;
}

/** State notification for a napplet-scoped job. */
export interface TorrentStateEvent { jobId: string; state: TorrentJobState; status?: TorrentJobStatus }
/** Progress notification for a napplet-scoped job. */
export interface TorrentProgressEvent { jobId: string; status: TorrentJobStatus }
/** Asynchronous failure for a napplet-scoped job. */
export interface TorrentErrorEvent { jobId: string; error: string; reason?: string }

/** Injected runtime torrent API. Presence signals availability, not authorization. */
export interface TorrentApi {
  /** Ask the runtime to perform torrent.capabilities. */
  capabilities(): Promise<TorrentCapabilities>;
  /** Ask the runtime to perform torrent.fromEvent. */
  fromEvent(event: NostrEvent): Promise<TorrentDescriptorResult>;
  /** Ask the runtime to perform torrent.toMagnet. */
  toMagnet(descriptor: TorrentDescriptor): Promise<TorrentMagnetResult>;
  /** Ask the runtime to perform torrent.search. */
  search(query: TorrentSearchQuery): Promise<TorrentSearchResult[]>;
  /** Ask the runtime to perform torrent.publish. */
  publish(request: TorrentPublishRequest): Promise<TorrentPublishResult>;
  /** Ask the runtime to perform torrent.comment. */
  comment(request: TorrentCommentRequest): Promise<TorrentPublishResult>;
  /** Ask the runtime to perform torrent.pickFiles. */
  pickFiles(options?: TorrentPickOptions): Promise<TorrentFileSetResult>;
  /** Ask the runtime to perform torrent.add. */
  add(request: TorrentAddRequest): Promise<TorrentJobAck>;
  /** Ask the runtime to perform torrent.status. */
  status(jobId: string): Promise<TorrentJobStatus>;
  /** Ask the runtime to perform torrent.jobs. */
  jobs(filter?: TorrentJobFilter): Promise<TorrentJobSummary[]>;
  /** Ask the runtime to perform torrent.files. */
  files(jobId: string): Promise<TorrentFileStatus[]>;
  /** Ask the runtime to perform torrent.selectFiles. */
  selectFiles(jobId: string, selection: TorrentFileSelection): Promise<TorrentJobStatus>;
  /** Ask the runtime to perform torrent.pause. */
  pause(jobId: string): Promise<TorrentJobStatus>;
  /** Ask the runtime to perform torrent.resume. */
  resume(jobId: string): Promise<TorrentJobStatus>;
  /** Ask the runtime to perform torrent.remove. */
  remove(jobId: string, options?: TorrentRemoveOptions): Promise<TorrentRemoveResult>;
  /** Listen for runtime job state notifications. */
  onState(handler: (event: TorrentStateEvent) => void): Subscription;
  /** Listen for runtime job progress notifications. */
  onProgress(handler: (event: TorrentProgressEvent) => void): Subscription;
  /** Listen for runtime job error notifications. */
  onError(handler: (event: TorrentErrorEvent) => void): Subscription;
}
