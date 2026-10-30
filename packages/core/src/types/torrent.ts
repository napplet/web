/** NAP-TORRENT types. Non-normative: https://github.com/napplet/naps/pull/72 */
import type { Subscription } from './nostr.js';

/** Runtime torrent backend family; custom transports are allowed. */
export type TorrentTransport = 'webtorrent' | 'bittorrent' | 'auto' | (string & {});
/** Requested transfer behavior. */
export type TorrentMode = 'download' | 'seed' | 'download-and-seed';
/** Runtime job lifecycle states. */
export type TorrentJobState = 'queued' | 'metadata' | 'downloading' | 'seeding' | 'paused' | 'complete' | 'cancelled' | 'error';
/** Generic transfer source selectors. */
export type TorrentSourceType = 'magnet' | 'infohash' | 'metainfo' | 'runtime-file-set';
/** Storage location, independent from retention. */
export type TorrentStorage = 'temporary' | 'persistent' | 'user-selected';
/** Fully validated metainfo formats. */
export type TorrentFormat = 'v1' | 'v2' | 'hybrid';
/** Job lifetime admitted by the runtime. */
export type TorrentRetention = 'session' | 'persistent';
/** Binary .torrent contents; input representation is projection-defined. */
export type MetainfoBytes = unknown;
/** Standard padded base64 encoding of bytes. */
export type Base64Bytes = string;
/** Full lowercase v1 identity, containing 40 hexadecimal characters. */
export type HexV1Hash = string;
/** Full lowercase v2 identity, containing 64 hexadecimal characters. */
export type HexV2Hash = string;
/** At least one complete info hash; verified hybrid metadata contains both. */
export type TorrentHashes = { v1: HexV1Hash; v2?: HexV2Hash } | { v1?: HexV1Hash; v2: HexV2Hash };

type Failure<Success extends object> = { ok: false; error: string; reason?: string }
  & { [Key in keyof Success]?: never };
type Result<Success extends object> = ({ ok: true; error?: never; reason?: string } & Success) | Failure<Success>;

/** Runtime transfer features and enforced content limits. Introspection is not authorization. */
export interface TorrentCapabilities {
  transports: TorrentTransport[];
  modes: TorrentMode[];
  formats: TorrentFormat[];
  createFormats: TorrentFormat[];
  retentions: TorrentRetention[];
  mutableSettings: string[];
  maxReadBytes: number;
  maxReadWaitMs: number;
  maxPendingReads: number;
  maxMetainfoBytes: number;
  canSaveFiles: boolean;
  canOpenFiles: boolean;
  maxActiveJobs?: number;
  maxTorrentSize?: number;
  canSeedRuntimeFiles?: boolean;
  canUseDht?: boolean;
  canUseTrackers?: boolean;
  canUseWebSeeds?: boolean;
}
/** Display metadata for a runtime-selected file. */
export interface TorrentFile { path: string; size?: number }
/** Runtime file-picker hints. */
export interface TorrentPickOptions { multiple?: boolean; suggestedName?: string }
/** Opaque endpoint-scoped file selection; it grants seeding, not content disclosure. */
export interface TorrentRuntimeFileSet {
  runtimeFileSetId: string;
  files: TorrentFile[];
  totalBytes: number;
  displayName?: string;
}
/** File selection result. */
export type TorrentFileSetResult = Result<{ fileSet: TorrentRuntimeFileSet }>;

/** Exactly one generic transfer source, selected by sourceType. */
export type TorrentSource =
  | { sourceType: 'magnet'; magnet: string; hashes?: never; metainfo?: never; runtimeFileSetId?: never }
  | { sourceType: 'infohash'; hashes: TorrentHashes; magnet?: never; metainfo?: never; runtimeFileSetId?: never }
  | { sourceType: 'metainfo'; metainfo: MetainfoBytes; magnet?: never; hashes?: never; runtimeFileSetId?: never }
  | { sourceType: 'runtime-file-set'; runtimeFileSetId: string; magnet?: never; hashes?: never; metainfo?: never };
/** Job creation options. Defaults and policy admission remain runtime-owned. */
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
  retention?: TorrentRetention;
  createFormat?: TorrentFormat;
}
/** Create one job. A preferred id must not mutate an existing job on collision. */
export interface TorrentAddRequest { source: TorrentSource; jobId?: string; options?: TorrentAddOptions }
/** Job creation acknowledgment; success does not mean transfer completion. */
export type TorrentJobAck = Result<{ jobId: string; state: TorrentJobState }>;
/** Runtime peer counters. */
export interface TorrentPeerStats { peers: number; seeds: number; leeches: number }
/** Current effective settings; withheld endpoint arrays are omitted rather than empty. */
export interface TorrentSettings {
  revision: number;
  downloadLimitBytesPerSecond: number;
  uploadLimitBytesPerSecond: number;
  seedAfterComplete: boolean;
  trackers?: string[];
  webSeeds?: string[];
  endpointsRedacted: boolean;
}
/** One successful job snapshot. Unknown hashes, totals and progress stay absent. */
export interface TorrentJobStatus {
  ok: true;
  jobId: string;
  state: TorrentJobState;
  mode: TorrentMode;
  transport: TorrentTransport;
  hashes?: TorrentHashes;
  downloadedBytes: number;
  uploadedBytes: number;
  totalBytes?: number;
  progress?: number;
  downloadRate: number;
  uploadRate: number;
  ratio: number;
  peers: TorrentPeerStats;
  settings: TorrentSettings;
  retention: TorrentRetention;
  title?: string;
  etaSeconds?: number;
  storage?: TorrentStorage;
  error?: never;
  reason?: string;
}
/** Discoverable owned job or explicitly authorized session alias. */
export interface TorrentJobSummary {
  jobId: string;
  state: TorrentJobState;
  mode: TorrentMode;
  transport: TorrentTransport;
  hashes?: TorrentHashes;
  progress?: number;
  downloadRate: number;
  uploadRate: number;
  ratio: number;
  retention: TorrentRetention;
  title?: string;
}
/** Job-list filters. */
export interface TorrentJobFilter { states?: TorrentJobState[]; modes?: TorrentMode[] }
/** Stable metadata index and advisory download counters for a file. */
export interface TorrentFileStatus {
  index: number;
  path: string;
  size: number;
  selected: boolean;
  priority: number;
  downloadedBytes: number;
  progress: number;
}
/** Changes persistent file selection or priority for a download job. */
export interface TorrentFileSelection { indexes?: number[]; paths?: string[]; priority?: number }
/** Optional data deletion request, subject to separate runtime authorization. */
export interface TorrentRemoveOptions { deleteData?: boolean }
/** Job removal result. jobId is present even on failure. */
export type TorrentRemoveResult = { jobId: string } & Result<{ deletedData?: boolean }>;
/** Verified identity and permitted discovery hints. */
export type TorrentMetadataResult = Result<{
  format: TorrentFormat;
  hashes: TorrentHashes;
  name?: string;
  private: boolean;
  magnet: string;
  trackers?: string[];
  webSeeds?: string[];
  endpointsRedacted: boolean;
  metainfoReady: boolean;
}>;
/** Bounded verified range read. All numeric fields use checked integer arithmetic at the runtime. */
export interface TorrentReadRequest { jobId: string; fileIndex: number; offset: number; length: number; waitMs?: number }
/** Complete clipped range or a typed failure; no partial success. */
export type TorrentReadResult = Result<{
  offset: number;
  dataBase64: Base64Bytes;
  byteLength: number;
  totalBytes: number;
  eof: boolean;
}>;
/** Complete .torrent export with its full verified identities. */
export type TorrentMetainfoResult = Result<{ dataBase64: Base64Bytes; byteLength: number; hashes: TorrentHashes }>;
/** User-mediated save completion or open responsibility acknowledgment. */
export type TorrentFileActionResult = Result<{ jobId: string; fileIndex: number; outcome: 'saved' | 'accepted' }>;
/** Whether cancellation won against a pending endpoint-owned operation. */
export type TorrentCancelResult = Result<{ cancelled: boolean }>;
/** Atomic patch. Omission leaves a setting unchanged; arrays replace the complete list. */
export interface TorrentSettingsPatch {
  downloadLimitBytesPerSecond?: number;
  uploadLimitBytesPerSecond?: number;
  seedAfterComplete?: boolean;
  trackers?: string[];
  webSeeds?: string[];
}
/** Compare-and-set update. The patch must be non-empty. */
export interface TorrentUpdateRequest { jobId: string; expectedRevision: number; patch: TorrentSettingsPatch }
/** Effective settings after success or a stale-revision failure. */
export type TorrentSettingsResult =
  | { ok: true; settings: TorrentSettings; error?: never; reason?: string }
  | { ok: false; error: 'revision-conflict'; settings: TorrentSettings; reason?: string }
  | { ok: false; error: string; settings?: never; reason?: string };

/** Local Promise convenience exposing the existing wire request id for cancellation. */
export interface TorrentPendingRequest<T> extends Promise<T> { readonly requestId: string }
/** State notification for an authorized job. */
export interface TorrentStateEvent { jobId: string; state: TorrentJobState; status?: TorrentJobStatus }
/** Progress notification for an authorized job. */
export interface TorrentProgressEvent { jobId: string; status: TorrentJobStatus }
/** Asynchronous failure for an authorized job. */
export interface TorrentErrorEvent { jobId: string; error: string; reason?: string }

/** Injected runtime transfer API. Presence signals availability, not authorization. */
export interface TorrentApi {
  /** Ask the runtime to perform torrent.capabilities. */
  capabilities(): Promise<TorrentCapabilities>;
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
  /** Ask the runtime to perform torrent.metadata. */
  metadata(jobId: string): Promise<TorrentMetadataResult>;
  /** Ask the runtime to perform torrent.read. */
  read(request: TorrentReadRequest): TorrentPendingRequest<TorrentReadResult>;
  /** Ask the runtime to perform torrent.exportMetainfo. */
  exportMetainfo(jobId: string): TorrentPendingRequest<TorrentMetainfoResult>;
  /** Ask the runtime to perform torrent.saveFile. */
  saveFile(jobId: string, fileIndex: number): TorrentPendingRequest<TorrentFileActionResult>;
  /** Ask the runtime to perform torrent.openFile. */
  openFile(jobId: string, fileIndex: number): Promise<TorrentFileActionResult>;
  /** Ask the runtime to perform torrent.cancel. */
  cancel(requestId: string): Promise<TorrentCancelResult>;
  /** Ask the runtime to perform torrent.update. */
  update(request: TorrentUpdateRequest): Promise<TorrentSettingsResult>;
  /** Observe job state notifications. */
  onState(handler: (event: TorrentStateEvent) => void): Subscription;
  /** Observe job progress notifications. */
  onProgress(handler: (event: TorrentProgressEvent) => void): Subscription;
  /** Observe job error notifications. */
  onError(handler: (event: TorrentErrorEvent) => void): Subscription;
}
