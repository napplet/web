/**
 * NAP-SOULSEEK schema types for runtime-mediated Soulseek discovery and downloads.
 *
 * Non-normative note -- the canonical definition lives in napplet/naps#135:
 * <https://github.com/napplet/naps/pull/135>
 *
 * Byte counts and offsets travel as canonical unsigned decimal text so 64-bit
 * Soulseek file sizes survive the JSON wire. Handles are opaque, endpoint-owned,
 * and compared exactly. Every result carries exactly one of `value` or `error`.
 */

/** Availability of the shell-selected Soulseek account. */
export type SoulseekAccountState = 'unconfigured' | 'offline' | 'online';

/** Operation that created a query. */
export type SoulseekQueryKind = 'search' | 'browse';

/** Query lifecycle; `collecting` is the only nonterminal state. */
export type SoulseekQueryState = 'collecting' | 'complete' | 'stopped' | 'failed';

/** Why a query reached `complete` or `stopped`. */
export type SoulseekQueryReason = 'deadline' | 'limit' | 'peer_complete' | 'cancelled';

/** Transfer lifecycle. `complete`, `cancelled`, and `failed` are terminal and immutable. */
export type SoulseekTransferState = 'queued' | 'transferring' | 'paused' | 'complete' | 'cancelled' | 'failed';

/** Handle kind accepted by `release`. */
export type SoulseekHandleKind = 'query' | 'transfer';

/** Closed set of NAP-SOULSEEK error codes. Never widen this to `string`. */
export type SoulseekErrorCode =
  | 'invalid_request'
  | 'denied'
  | 'unavailable'
  | 'unsupported'
  | 'not_found'
  | 'invalid_state'
  | 'limit_exceeded'
  | 'peer_unavailable'
  | 'peer_denied'
  | 'source_changed'
  | 'timeout'
  | 'cancelled'
  | 'revoked'
  | 'backend_error';

/** Canonical unsigned decimal text: `"0"`, or digits without a leading zero, up to 18446744073709551615. */
export type SoulseekByteCount = string;

/** Machine-readable failure attached to a result or a retained snapshot. */
export interface SoulseekFailure {
  /** One of the NAP-SOULSEEK error codes. */
  code: SoulseekErrorCode;
  /** Nonempty diagnostic text; never credentials, addresses, or local paths. */
  message: string;
}

/** Runtime capability information and policy limits. Limits are not authorization. */
export interface SoulseekInfo {
  state: SoulseekAccountState;
  /** Whether user-mediated export is implemented; not an authorization grant. */
  canSave: boolean;
  /** Positive maximum retained queries per endpoint. */
  maxQueries: number;
  /** Positive maximum retained transfers per endpoint, including terminal ones. */
  maxTransfers: number;
  /** Positive maximum files retained per query. */
  maxResults: number;
  /** Positive maximum entries per results page. */
  maxPageSize: number;
  /** Positive maximum decoded bytes per read. */
  maxReadBytes: number;
  /** Positive maximum UTF-8 bytes per input text value, including IDs. */
  maxTextBytes: number;
  /** Positive maximum query collection time in milliseconds from acceptance. */
  queryTimeoutMs: number;
  /** Positive recommended minimum interval between polls of the same query or transfer. */
  pollIntervalMs: number;
}

/** Network or single-peer search parameters. */
export interface SoulseekSearchRequest {
  /** Nonempty search expression with at least one non-whitespace character. */
  text: string;
  /** Target one peer; omission searches the network. */
  username?: string;
}

/** Immutable, paginated query snapshot. */
export interface SoulseekQuery {
  /** Endpoint-owned handle. */
  queryId: string;
  kind: SoulseekQueryKind;
  state: SoulseekQueryState;
  /** Required for `complete` or `stopped`; forbidden otherwise. */
  reason?: SoulseekQueryReason;
  /** Number of immutable retained entries. */
  count: number;
  /** Effective collection bound captured at acceptance. */
  maxResults: number;
  /** Positive page bound captured at acceptance. */
  maxPageSize: number;
  /** Effective collection deadline duration captured at acceptance. */
  timeoutMs: number;
  /** Present exactly when `state` is `failed`. */
  error?: SoulseekFailure;
}

/** One peer-offered file. Peer metadata is untrusted display data. */
export interface SoulseekFile {
  /** Opaque handle bound to this query, peer, remote path, size, and account context. */
  fileId: string;
  /** Peer claiming to offer the file; not an authenticated content author. */
  username: string;
  /** Nonempty remote virtual path, preserved for display; never a local path. */
  path: string;
  /** Advertised byte count as canonical decimal text. */
  size: SoulseekByteCount;
  /** Peer reports restricted access. `false` does not promise download permission. */
  locked: boolean;
  /** Peer-reported format hint; not a trusted media type. */
  extension?: string;
  /** Positive peer-reported kilobits per second. */
  bitrateKbps?: number;
  /** Peer-reported duration in seconds. */
  durationSeconds?: number;
  /** Positive peer-reported sample rate. */
  sampleRateHz?: number;
  /** Positive peer-reported bits per sample. */
  bitDepth?: number;
}

/** One page of retained query entries, snapshotted atomically with its query. */
export interface SoulseekQueryPage {
  query: SoulseekQuery;
  /** Entries starting at the requested zero-based offset, in arrival order. */
  files: SoulseekFile[];
  /** Requested `after` plus the number of entries returned. */
  next: number;
}

/** Endpoint-owned transfer snapshot. */
export interface SoulseekTransfer {
  /** Endpoint-owned handle. */
  transferId: string;
  /** Frozen source descriptor, retained independently of its query. */
  file: SoulseekFile;
  state: SoulseekTransferState;
  /** Positive read bound captured at admission. */
  maxReadBytes: number;
  /** Contiguous bytes retained from offset zero, no greater than `file.size`. */
  received: SoulseekByteCount;
  /** Positive peer-reported queue position; omitted when unavailable or not queued. */
  queuePosition?: number;
  /** Observed nonnegative byte rate; omitted when unavailable. */
  bytesPerSecond?: number;
  /** Present exactly when `state` is `failed`. */
  error?: SoulseekFailure;
}

/** Bounded read of a complete transfer's bytes. */
export interface SoulseekChunk {
  /** Requested offset as canonical decimal text. */
  offset: SoulseekByteCount;
  /** Standard padded base64 of the returned bytes, without whitespace. */
  data: string;
  /** Decoded byte count. */
  length: number;
  /** Whether offset plus returned length equals `file.size`. */
  eof: boolean;
}

/** Successful user-mediated export. */
export interface SoulseekSaved {
  /** Always `true`; the shell completed the export. */
  saved: true;
}

/** Outcome of releasing a handle. */
export interface SoulseekReleased {
  /** `true` if a live owned handle was removed; otherwise `false`. */
  released: boolean;
}

/**
 * Injected `window.napplet.soulseek` API. Presence signals domain availability, not a
 * connected account or a policy grant. Each method resolves with the operation's
 * result record and rejects when the runtime answers with a `Failure`.
 */
export interface SoulseekApi {
  /** Report account state and captured policy limits; works offline. */
  info(): Promise<SoulseekInfo>;
  /** Start one network or single-peer search; returns after admission. */
  search(request: SoulseekSearchRequest): Promise<SoulseekQuery>;
  /** Request a flat snapshot of one peer's shared files; returns after admission. */
  browse(username: string): Promise<SoulseekQuery>;
  /** Read one page of retained entries from an immutable snapshot. */
  results(queryId: string, after?: number, limit?: number): Promise<SoulseekQueryPage>;
  /** Freeze a collecting query as `stopped`; terminal queries return unchanged. */
  stop(queryId: string): Promise<SoulseekQuery>;
  /** Admit a download for a live file handle issued to this endpoint. */
  download(fileId: string): Promise<SoulseekTransfer>;
  /** List all non-released transfers owned by this endpoint, in admission order. */
  transfers(): Promise<SoulseekTransfer[]>;
  /** Read one transfer snapshot. */
  status(transferId: string): Promise<SoulseekTransfer>;
  /** Pause a queued or transferring transfer. */
  pause(transferId: string): Promise<SoulseekTransfer>;
  /** Re-queue a paused transfer against the same frozen source. */
  resume(transferId: string): Promise<SoulseekTransfer>;
  /** Cancel a nonterminal transfer and discard partial bytes. */
  cancel(transferId: string): Promise<SoulseekTransfer>;
  /** Read up to `length` bytes of a complete transfer from a decimal-text offset. */
  read(transferId: string, offset: SoulseekByteCount, length: number): Promise<SoulseekChunk>;
  /** Export a complete transfer through the shell's destination picker. */
  save(transferId: string): Promise<SoulseekSaved>;
  /** Stop work and remove an owned query or transfer handle. */
  release(kind: SoulseekHandleKind, handle: string): Promise<SoulseekReleased>;
}
