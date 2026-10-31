/** NAP-SOULSEEK wire envelopes. Canonical proposal: https://github.com/napplet/naps/pull/135 */
import type {
  NappletMessage,
  SoulseekChunk,
  SoulseekFailure,
  SoulseekHandleKind,
  SoulseekInfo,
  SoulseekQuery,
  SoulseekQueryPage,
  SoulseekReleased,
  SoulseekSaved,
  SoulseekSearchRequest,
  SoulseekTransfer,
} from '@napplet/core';

export type {
  SoulseekAccountState,
  SoulseekQueryKind,
  SoulseekQueryState,
  SoulseekQueryReason,
  SoulseekTransferState,
  SoulseekHandleKind,
  SoulseekErrorCode,
  SoulseekByteCount,
  SoulseekFailure,
  SoulseekInfo,
  SoulseekSearchRequest,
  SoulseekQuery,
  SoulseekFile,
  SoulseekQueryPage,
  SoulseekTransfer,
  SoulseekChunk,
  SoulseekSaved,
  SoulseekReleased,
  SoulseekApi,
} from '@napplet/core';

/** Soulseek domain discriminator. */
export const DOMAIN = 'soulseek' as const;

/** The closed NAP-SOULSEEK error code set, in specification order. */
export const SOULSEEK_ERROR_CODES = [
  'invalid_request',
  'denied',
  'unavailable',
  'unsupported',
  'not_found',
  'invalid_state',
  'limit_exceeded',
  'peer_unavailable',
  'peer_denied',
  'source_changed',
  'timeout',
  'cancelled',
  'revoked',
  'backend_error',
] as const;

/** A result envelope carries the same id and exactly one of `value` or `error`. */
type Reply<Value> = NappletMessage & { id: string }
  & ({ value: Value; error?: never } | { error: SoulseekFailure; value?: never });

/** Request for soulseek.info. */
export interface SoulseekInfoMessage extends NappletMessage {
  type: 'soulseek.info';
  id: string;
}
/** Response to soulseek.info. */
export type SoulseekInfoResultMessage = {
  type: 'soulseek.info.result';
} & Reply<SoulseekInfo>;

/** Request for soulseek.search. */
export interface SoulseekSearchMessage extends NappletMessage {
  type: 'soulseek.search';
  id: string;
  request: SoulseekSearchRequest;
}
/** Response to soulseek.search. */
export type SoulseekSearchResultMessage = {
  type: 'soulseek.search.result';
} & Reply<SoulseekQuery>;

/** Request for soulseek.browse. */
export interface SoulseekBrowseMessage extends NappletMessage {
  type: 'soulseek.browse';
  id: string;
  username: string;
}
/** Response to soulseek.browse. */
export type SoulseekBrowseResultMessage = {
  type: 'soulseek.browse.result';
} & Reply<SoulseekQuery>;

/** Request for soulseek.results. Optional fields are omitted, never `null`. */
export interface SoulseekResultsMessage extends NappletMessage {
  type: 'soulseek.results';
  id: string;
  queryId: string;
  after?: number;
  limit?: number;
}
/** Response to soulseek.results. */
export type SoulseekResultsResultMessage = {
  type: 'soulseek.results.result';
} & Reply<SoulseekQueryPage>;

/** Request for soulseek.stop. */
export interface SoulseekStopMessage extends NappletMessage {
  type: 'soulseek.stop';
  id: string;
  queryId: string;
}
/** Response to soulseek.stop. */
export type SoulseekStopResultMessage = {
  type: 'soulseek.stop.result';
} & Reply<SoulseekQuery>;

/** Request for soulseek.download. */
export interface SoulseekDownloadMessage extends NappletMessage {
  type: 'soulseek.download';
  id: string;
  fileId: string;
}
/** Response to soulseek.download. */
export type SoulseekDownloadResultMessage = {
  type: 'soulseek.download.result';
} & Reply<SoulseekTransfer>;

/** Request for soulseek.transfers. */
export interface SoulseekTransfersMessage extends NappletMessage {
  type: 'soulseek.transfers';
  id: string;
}
/** Response to soulseek.transfers. */
export type SoulseekTransfersResultMessage = {
  type: 'soulseek.transfers.result';
} & Reply<SoulseekTransfer[]>;

/** Request for soulseek.status. */
export interface SoulseekStatusMessage extends NappletMessage {
  type: 'soulseek.status';
  id: string;
  transferId: string;
}
/** Response to soulseek.status. */
export type SoulseekStatusResultMessage = {
  type: 'soulseek.status.result';
} & Reply<SoulseekTransfer>;

/** Request for soulseek.pause. */
export interface SoulseekPauseMessage extends NappletMessage {
  type: 'soulseek.pause';
  id: string;
  transferId: string;
}
/** Response to soulseek.pause. */
export type SoulseekPauseResultMessage = {
  type: 'soulseek.pause.result';
} & Reply<SoulseekTransfer>;

/** Request for soulseek.resume. */
export interface SoulseekResumeMessage extends NappletMessage {
  type: 'soulseek.resume';
  id: string;
  transferId: string;
}
/** Response to soulseek.resume. */
export type SoulseekResumeResultMessage = {
  type: 'soulseek.resume.result';
} & Reply<SoulseekTransfer>;

/** Request for soulseek.cancel. */
export interface SoulseekCancelMessage extends NappletMessage {
  type: 'soulseek.cancel';
  id: string;
  transferId: string;
}
/** Response to soulseek.cancel. */
export type SoulseekCancelResultMessage = {
  type: 'soulseek.cancel.result';
} & Reply<SoulseekTransfer>;

/** Request for soulseek.read. `offset` is canonical decimal text. */
export interface SoulseekReadMessage extends NappletMessage {
  type: 'soulseek.read';
  id: string;
  transferId: string;
  offset: string;
  length: number;
}
/** Response to soulseek.read. */
export type SoulseekReadResultMessage = {
  type: 'soulseek.read.result';
} & Reply<SoulseekChunk>;

/** Request for soulseek.save. */
export interface SoulseekSaveMessage extends NappletMessage {
  type: 'soulseek.save';
  id: string;
  transferId: string;
}
/** Response to soulseek.save. */
export type SoulseekSaveResultMessage = {
  type: 'soulseek.save.result';
} & Reply<SoulseekSaved>;

/** Request for soulseek.release. */
export interface SoulseekReleaseMessage extends NappletMessage {
  type: 'soulseek.release';
  id: string;
  kind: SoulseekHandleKind;
  handle: string;
}
/** Response to soulseek.release. */
export type SoulseekReleaseResultMessage = {
  type: 'soulseek.release.result';
} & Reply<SoulseekReleased>;

/** Napplet-to-runtime soulseek envelopes. */
export type SoulseekOutboundMessage =
  | SoulseekInfoMessage
  | SoulseekSearchMessage
  | SoulseekBrowseMessage
  | SoulseekResultsMessage
  | SoulseekStopMessage
  | SoulseekDownloadMessage
  | SoulseekTransfersMessage
  | SoulseekStatusMessage
  | SoulseekPauseMessage
  | SoulseekResumeMessage
  | SoulseekCancelMessage
  | SoulseekReadMessage
  | SoulseekSaveMessage
  | SoulseekReleaseMessage;

/** Runtime-to-napplet soulseek envelopes. NAP-SOULSEEK defines no unsolicited messages. */
export type SoulseekInboundMessage =
  | SoulseekInfoResultMessage
  | SoulseekSearchResultMessage
  | SoulseekBrowseResultMessage
  | SoulseekResultsResultMessage
  | SoulseekStopResultMessage
  | SoulseekDownloadResultMessage
  | SoulseekTransfersResultMessage
  | SoulseekStatusResultMessage
  | SoulseekPauseResultMessage
  | SoulseekResumeResultMessage
  | SoulseekCancelResultMessage
  | SoulseekReadResultMessage
  | SoulseekSaveResultMessage
  | SoulseekReleaseResultMessage;

/** All soulseek wire envelopes. */
export type SoulseekNapMessage = SoulseekOutboundMessage | SoulseekInboundMessage;
