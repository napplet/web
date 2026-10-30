/** NAP-TORRENT wire envelopes. https://github.com/napplet/naps/pull/72 */
import type {
  NostrEvent,
  NappletMessage,
  TorrentCapabilities,
  TorrentDescriptor,
  TorrentDescriptorResult,
  TorrentMagnetResult,
  TorrentSearchQuery,
  TorrentSearchResult,
  TorrentPublishRequest,
  TorrentCommentRequest,
  TorrentPublishResult,
  TorrentPickOptions,
  TorrentFileSetResult,
  TorrentAddRequest,
  TorrentJobAck,
  TorrentJobStatus,
  TorrentJobSummary,
  TorrentJobFilter,
  TorrentFileStatus,
  TorrentFileSelection,
  TorrentRemoveOptions,
  TorrentRemoveResult,
  TorrentStateEvent,
  TorrentProgressEvent,
  TorrentErrorEvent,
} from '@napplet/core';

export type {
  TorrentTransport,
  TorrentMode,
  TorrentJobState,
  TorrentSourceType,
  TorrentStorage,
  TorrentReferencePrefix,
  TorrentCapabilities,
  TorrentFile,
  TorrentReference,
  TorrentDescriptor,
  TorrentDescriptorResult,
  TorrentMagnetResult,
  TorrentSearchQuery,
  TorrentSearchResult,
  TorrentPublishRequest,
  TorrentCommentRequest,
  TorrentPublishResult,
  TorrentPickOptions,
  TorrentRuntimeFileSet,
  TorrentFileSetResult,
  TorrentSource,
  TorrentAddOptions,
  TorrentAddRequest,
  TorrentJobAck,
  TorrentPeerStats,
  TorrentJobStatus,
  TorrentJobSummary,
  TorrentJobFilter,
  TorrentFileStatus,
  TorrentFileSelection,
  TorrentRemoveOptions,
  TorrentRemoveResult,
  TorrentStateEvent,
  TorrentProgressEvent,
  TorrentErrorEvent,
  TorrentApi,
} from '@napplet/core';

/** Torrent domain discriminator. */
export const DOMAIN = 'torrent' as const;

/** Request for torrent.capabilities. */
export interface TorrentCapabilitiesMessage extends NappletMessage {
  type: 'torrent.capabilities';
  id: string;
}
/** Response to torrent.capabilities. */
export interface TorrentCapabilitiesResultMessage extends NappletMessage {
  type: 'torrent.capabilities.result';
  id: string;
  capabilities?: TorrentCapabilities;
  error?: string;
}

/** Request for torrent.fromEvent. */
export interface TorrentFromEventMessage extends NappletMessage {
  type: 'torrent.fromEvent';
  id: string;
  event: NostrEvent;
}
/** Response to torrent.fromEvent. */
export interface TorrentFromEventResultMessage extends NappletMessage {
  type: 'torrent.fromEvent.result';
  id: string;
  result: TorrentDescriptorResult;
}

/** Request for torrent.toMagnet. */
export interface TorrentToMagnetMessage extends NappletMessage {
  type: 'torrent.toMagnet';
  id: string;
  descriptor: TorrentDescriptor;
}
/** Response to torrent.toMagnet. */
export interface TorrentToMagnetResultMessage extends NappletMessage {
  type: 'torrent.toMagnet.result';
  id: string;
  result: TorrentMagnetResult;
}

/** Request for torrent.search. */
export interface TorrentSearchMessage extends NappletMessage {
  type: 'torrent.search';
  id: string;
  query: TorrentSearchQuery;
}
/** Response to torrent.search. */
export interface TorrentSearchResultMessage extends NappletMessage {
  type: 'torrent.search.result';
  id: string;
  results?: TorrentSearchResult[];
  error?: string;
}

/** Request for torrent.publish. */
export interface TorrentPublishMessage extends NappletMessage {
  type: 'torrent.publish';
  id: string;
  request: TorrentPublishRequest;
}
/** Response to torrent.publish. */
export interface TorrentPublishResultMessage extends NappletMessage {
  type: 'torrent.publish.result';
  id: string;
  result: TorrentPublishResult;
}

/** Request for torrent.comment. */
export interface TorrentCommentMessage extends NappletMessage {
  type: 'torrent.comment';
  id: string;
  request: TorrentCommentRequest;
}
/** Response to torrent.comment. */
export interface TorrentCommentResultMessage extends NappletMessage {
  type: 'torrent.comment.result';
  id: string;
  result: TorrentPublishResult;
}

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
export interface TorrentStatusResultMessage extends NappletMessage {
  type: 'torrent.status.result';
  id: string;
  status?: TorrentJobStatus;
  error?: string;
}

/** Request for torrent.jobs. */
export interface TorrentJobsMessage extends NappletMessage {
  type: 'torrent.jobs';
  id: string;
  filter?: TorrentJobFilter;
}
/** Response to torrent.jobs. */
export interface TorrentJobsResultMessage extends NappletMessage {
  type: 'torrent.jobs.result';
  id: string;
  jobs?: TorrentJobSummary[];
  error?: string;
}

/** Request for torrent.files. */
export interface TorrentFilesMessage extends NappletMessage {
  type: 'torrent.files';
  id: string;
  jobId: string;
}
/** Response to torrent.files. */
export interface TorrentFilesResultMessage extends NappletMessage {
  type: 'torrent.files.result';
  id: string;
  files?: TorrentFileStatus[];
  error?: string;
}

/** Request for torrent.selectFiles. */
export interface TorrentSelectFilesMessage extends NappletMessage {
  type: 'torrent.selectFiles';
  id: string;
  jobId: string; selection: TorrentFileSelection;
}
/** Response to torrent.selectFiles. */
export interface TorrentSelectFilesResultMessage extends NappletMessage {
  type: 'torrent.selectFiles.result';
  id: string;
  status?: TorrentJobStatus;
  error?: string;
}

/** Request for torrent.pause. */
export interface TorrentPauseMessage extends NappletMessage {
  type: 'torrent.pause';
  id: string;
  jobId: string;
}
/** Response to torrent.pause. */
export interface TorrentPauseResultMessage extends NappletMessage {
  type: 'torrent.pause.result';
  id: string;
  status?: TorrentJobStatus;
  error?: string;
}

/** Request for torrent.resume. */
export interface TorrentResumeMessage extends NappletMessage {
  type: 'torrent.resume';
  id: string;
  jobId: string;
}
/** Response to torrent.resume. */
export interface TorrentResumeResultMessage extends NappletMessage {
  type: 'torrent.resume.result';
  id: string;
  status?: TorrentJobStatus;
  error?: string;
}

/** Request for torrent.remove. */
export interface TorrentRemoveMessage extends NappletMessage {
  type: 'torrent.remove';
  id: string;
  jobId: string; options?: TorrentRemoveOptions;
}
/** Response to torrent.remove. */
export interface TorrentRemoveResultMessage extends NappletMessage {
  type: 'torrent.remove.result';
  id: string;
  result: TorrentRemoveResult;
}

/** Runtime job state push; correlation is jobId, never id. */
export interface TorrentStateMessage extends NappletMessage, TorrentStateEvent {
  type: 'torrent.state';
}

/** Runtime job progress push; correlation is jobId, never id. */
export interface TorrentProgressMessage extends NappletMessage, TorrentProgressEvent {
  type: 'torrent.progress';
}

/** Runtime job error push; correlation is jobId, never id. */
export interface TorrentErrorMessage extends NappletMessage, TorrentErrorEvent {
  type: 'torrent.error';
}

/** Napplet-to-runtime torrent envelopes. */
export type TorrentOutboundMessage =
  TorrentCapabilitiesMessage |
  TorrentFromEventMessage |
  TorrentToMagnetMessage |
  TorrentSearchMessage |
  TorrentPublishMessage |
  TorrentCommentMessage |
  TorrentPickFilesMessage |
  TorrentAddMessage |
  TorrentStatusMessage |
  TorrentJobsMessage |
  TorrentFilesMessage |
  TorrentSelectFilesMessage |
  TorrentPauseMessage |
  TorrentResumeMessage |
  TorrentRemoveMessage;

/** Runtime-to-napplet torrent envelopes. */
export type TorrentInboundMessage =
  TorrentCapabilitiesResultMessage |
  TorrentFromEventResultMessage |
  TorrentToMagnetResultMessage |
  TorrentSearchResultMessage |
  TorrentPublishResultMessage |
  TorrentCommentResultMessage |
  TorrentPickFilesResultMessage |
  TorrentAddResultMessage |
  TorrentStatusResultMessage |
  TorrentJobsResultMessage |
  TorrentFilesResultMessage |
  TorrentSelectFilesResultMessage |
  TorrentPauseResultMessage |
  TorrentResumeResultMessage |
  TorrentRemoveResultMessage |
  TorrentStateMessage |
  TorrentProgressMessage |
  TorrentErrorMessage;

/** All torrent wire envelopes. */
export type TorrentNapMessage = TorrentOutboundMessage | TorrentInboundMessage;
