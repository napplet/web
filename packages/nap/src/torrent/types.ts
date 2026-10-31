/** NAP-TORRENT wire envelopes. https://github.com/napplet/naps/pull/72 */
import type { NappletMessage,
  TorrentAddRequest,
  TorrentCancelResult,
  TorrentCapabilities,
  TorrentErrorEvent,
  TorrentFileActionResult,
  TorrentFileSelection,
  TorrentFileSetResult,
  TorrentFileStatus,
  TorrentJobAck,
  TorrentJobFilter,
  TorrentJobStatus,
  TorrentJobSummary,
  TorrentMetadataResult,
  TorrentMetainfoResult,
  TorrentPickOptions,
  TorrentProgressEvent,
  TorrentReadRequest,
  TorrentReadResult,
  TorrentRemoveOptions,
  TorrentRemoveResult,
  TorrentSettingsResult,
  TorrentStateEvent,
  TorrentUpdateRequest,
} from '@napplet/core';

export type {
  TorrentTransport,
  TorrentMode,
  TorrentJobState,
  TorrentSourceType,
  TorrentStorage,
  TorrentFormat,
  TorrentRetention,
  MetainfoBytes,
  Base64Bytes,
  HexV1Hash,
  HexV2Hash,
  TorrentHashes,
  TorrentCapabilities,
  TorrentFile,
  TorrentPickOptions,
  TorrentRuntimeFileSet,
  TorrentFileSetResult,
  TorrentSource,
  TorrentAddOptions,
  TorrentAddRequest,
  TorrentJobAck,
  TorrentPeerStats,
  TorrentSettings,
  TorrentJobStatus,
  TorrentJobSummary,
  TorrentJobFilter,
  TorrentFileStatus,
  TorrentFileSelection,
  TorrentRemoveOptions,
  TorrentRemoveResult,
  TorrentMetadataResult,
  TorrentReadRequest,
  TorrentReadResult,
  TorrentMetainfoResult,
  TorrentFileActionResult,
  TorrentCancelResult,
  TorrentSettingsPatch,
  TorrentUpdateRequest,
  TorrentSettingsResult,
  TorrentPendingRequest,
  TorrentStateEvent,
  TorrentProgressEvent,
  TorrentErrorEvent,
  TorrentApi,
} from '@napplet/core';

/** Torrent domain discriminator. */
export const DOMAIN = 'torrent' as const;

type Reply<Payload extends object> = NappletMessage & { id: string }
  & (Payload & { error?: never } | { error: string } & { [Key in keyof Payload]?: never });

/** Request for torrent.capabilities. */
export interface TorrentCapabilitiesMessage extends NappletMessage {
  type: 'torrent.capabilities';
  id: string;
}
/** Response to torrent.capabilities. */
export type TorrentCapabilitiesResultMessage = {
  type: 'torrent.capabilities.result';
} & Reply<{ capabilities: TorrentCapabilities }>;

/** Request for torrent.pickFiles. */
export interface TorrentPickFilesMessage extends NappletMessage {
  type: 'torrent.pickFiles';
  id: string;
  options?: TorrentPickOptions;
}
/** Response to torrent.pickFiles. */
export interface TorrentPickFilesResultMessage extends NappletMessage {
  type: 'torrent.pickFiles.result';
  id: string;
  result: TorrentFileSetResult;
}

/** Request for torrent.add. */
export interface TorrentAddMessage extends NappletMessage {
  type: 'torrent.add';
  id: string;
  request: TorrentAddRequest;
}
/** Response to torrent.add. */
export interface TorrentAddResultMessage extends NappletMessage {
  type: 'torrent.add.result';
  id: string;
  ack: TorrentJobAck;
}

/** Request for torrent.status. */
export interface TorrentStatusMessage extends NappletMessage {
  type: 'torrent.status';
  id: string;
  jobId: string;
}
/** Response to torrent.status. */
export type TorrentStatusResultMessage = {
  type: 'torrent.status.result';
} & Reply<{ status: TorrentJobStatus }>;

/** Request for torrent.jobs. */
export interface TorrentJobsMessage extends NappletMessage {
  type: 'torrent.jobs';
  id: string;
  filter?: TorrentJobFilter;
}
/** Response to torrent.jobs. */
export type TorrentJobsResultMessage = {
  type: 'torrent.jobs.result';
} & Reply<{ jobs: TorrentJobSummary[] }>;

/** Request for torrent.files. */
export interface TorrentFilesMessage extends NappletMessage {
  type: 'torrent.files';
  id: string;
  jobId: string;
}
/** Response to torrent.files. */
export type TorrentFilesResultMessage = {
  type: 'torrent.files.result';
} & Reply<{ files: TorrentFileStatus[] }>;

/** Request for torrent.selectFiles. */
export interface TorrentSelectFilesMessage extends NappletMessage {
  type: 'torrent.selectFiles';
  id: string;
  jobId: string;
  selection: TorrentFileSelection;
}
/** Response to torrent.selectFiles. */
export type TorrentSelectFilesResultMessage = {
  type: 'torrent.selectFiles.result';
} & Reply<{ status: TorrentJobStatus }>;

/** Request for torrent.pause. */
export interface TorrentPauseMessage extends NappletMessage {
  type: 'torrent.pause';
  id: string;
  jobId: string;
}
/** Response to torrent.pause. */
export type TorrentPauseResultMessage = {
  type: 'torrent.pause.result';
} & Reply<{ status: TorrentJobStatus }>;

/** Request for torrent.resume. */
export interface TorrentResumeMessage extends NappletMessage {
  type: 'torrent.resume';
  id: string;
  jobId: string;
}
/** Response to torrent.resume. */
export type TorrentResumeResultMessage = {
  type: 'torrent.resume.result';
} & Reply<{ status: TorrentJobStatus }>;

/** Request for torrent.remove. */
export interface TorrentRemoveMessage extends NappletMessage {
  type: 'torrent.remove';
  id: string;
  jobId: string;
  options?: TorrentRemoveOptions;
}
/** Response to torrent.remove. */
export interface TorrentRemoveResultMessage extends NappletMessage {
  type: 'torrent.remove.result';
  id: string;
  result: TorrentRemoveResult;
}

/** Request for torrent.metadata. */
export interface TorrentMetadataMessage extends NappletMessage {
  type: 'torrent.metadata';
  id: string;
  jobId: string;
}
/** Response to torrent.metadata. */
export interface TorrentMetadataResultMessage extends NappletMessage {
  type: 'torrent.metadata.result';
  id: string;
  result: TorrentMetadataResult;
}

/** Request for torrent.read. */
export interface TorrentReadMessage extends NappletMessage {
  type: 'torrent.read';
  id: string;
  request: TorrentReadRequest;
}
/** Response to torrent.read. */
export interface TorrentReadResultMessage extends NappletMessage {
  type: 'torrent.read.result';
  id: string;
  result: TorrentReadResult;
}

/** Request for torrent.exportMetainfo. */
export interface TorrentExportMetainfoMessage extends NappletMessage {
  type: 'torrent.exportMetainfo';
  id: string;
  jobId: string;
}
/** Response to torrent.exportMetainfo. */
export interface TorrentExportMetainfoResultMessage extends NappletMessage {
  type: 'torrent.exportMetainfo.result';
  id: string;
  result: TorrentMetainfoResult;
}

/** Request for torrent.saveFile. */
export interface TorrentSaveFileMessage extends NappletMessage {
  type: 'torrent.saveFile';
  id: string;
  jobId: string;
  fileIndex: number;
}
/** Response to torrent.saveFile. */
export interface TorrentSaveFileResultMessage extends NappletMessage {
  type: 'torrent.saveFile.result';
  id: string;
  result: TorrentFileActionResult;
}

/** Request for torrent.openFile. */
export interface TorrentOpenFileMessage extends NappletMessage {
  type: 'torrent.openFile';
  id: string;
  jobId: string;
  fileIndex: number;
}
/** Response to torrent.openFile. */
export interface TorrentOpenFileResultMessage extends NappletMessage {
  type: 'torrent.openFile.result';
  id: string;
  result: TorrentFileActionResult;
}

/** Request for torrent.cancel. */
export interface TorrentCancelMessage extends NappletMessage {
  type: 'torrent.cancel';
  id: string;
  requestId: string;
}
/** Response to torrent.cancel. */
export interface TorrentCancelResultMessage extends NappletMessage {
  type: 'torrent.cancel.result';
  id: string;
  result: TorrentCancelResult;
}

/** Request for torrent.update. */
export interface TorrentUpdateMessage extends NappletMessage {
  type: 'torrent.update';
  id: string;
  request: TorrentUpdateRequest;
}
/** Response to torrent.update. */
export interface TorrentUpdateResultMessage extends NappletMessage {
  type: 'torrent.update.result';
  id: string;
  result: TorrentSettingsResult;
}

/** Runtime job state push; correlated by jobId, without id. */
export interface TorrentStateMessage extends NappletMessage, TorrentStateEvent {
  type: 'torrent.state';
}

/** Runtime job progress push; correlated by jobId, without id. */
export interface TorrentProgressMessage extends NappletMessage, TorrentProgressEvent {
  type: 'torrent.progress';
}

/** Runtime job error push; correlated by jobId, without id. */
export interface TorrentErrorMessage extends NappletMessage, TorrentErrorEvent {
  type: 'torrent.error';
}

/** Napplet-to-runtime torrent envelopes. */
export type TorrentOutboundMessage =
  TorrentCapabilitiesMessage |
  TorrentPickFilesMessage |
  TorrentAddMessage |
  TorrentStatusMessage |
  TorrentJobsMessage |
  TorrentFilesMessage |
  TorrentSelectFilesMessage |
  TorrentPauseMessage |
  TorrentResumeMessage |
  TorrentRemoveMessage |
  TorrentMetadataMessage |
  TorrentReadMessage |
  TorrentExportMetainfoMessage |
  TorrentSaveFileMessage |
  TorrentOpenFileMessage |
  TorrentCancelMessage |
  TorrentUpdateMessage;

/** Runtime-to-napplet torrent envelopes. */
export type TorrentInboundMessage =
  TorrentCapabilitiesResultMessage |
  TorrentPickFilesResultMessage |
  TorrentAddResultMessage |
  TorrentStatusResultMessage |
  TorrentJobsResultMessage |
  TorrentFilesResultMessage |
  TorrentSelectFilesResultMessage |
  TorrentPauseResultMessage |
  TorrentResumeResultMessage |
  TorrentRemoveResultMessage |
  TorrentMetadataResultMessage |
  TorrentReadResultMessage |
  TorrentExportMetainfoResultMessage |
  TorrentSaveFileResultMessage |
  TorrentOpenFileResultMessage |
  TorrentCancelResultMessage |
  TorrentUpdateResultMessage |
  TorrentStateMessage |
  TorrentProgressMessage |
  TorrentErrorMessage;

/** All torrent wire envelopes. */
export type TorrentNapMessage = TorrentOutboundMessage | TorrentInboundMessage;
