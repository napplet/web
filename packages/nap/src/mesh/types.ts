/** NAP-MESH wire types, defined by https://github.com/napplet/naps/pull/122. */
import type {
  EventTemplate, MeshBlobsResult, MeshInfo, MeshPublishResult,
  NappletMessage, NostrFilter, RelayEventResult,
} from '@napplet/core';

export type {
  MeshApi, MeshLimits, MeshInfo, MeshPublishOptions, MeshPublishResult,
  MeshSubscribeOptions, MeshSubscription, MeshBlobsResult, RelayEventResult,
} from '@napplet/core';

/** NAP-MESH capability domain. */
export const DOMAIN = 'mesh' as const;

/** Base mesh envelope; correlation ids belong only to request/result messages. */
export interface MeshMessage extends NappletMessage {
  type: `mesh.${string}`;
}
/** Request circle status. */
export interface MeshInfoMessage extends MeshMessage {
  type: 'mesh.info';
  id: string;
}
/** Circle status response. */
export type MeshInfoResultMessage = MeshMessage & {
  type: 'mesh.info.result';
  id: string;
} & (
  | (MeshInfo & { error?: undefined })
  | (Partial<MeshInfo> & { error: string })
);
/** Publish unsigned content with an optional circle-hop budget. */
export interface MeshPublishMessage extends MeshMessage {
  type: 'mesh.publish';
  id: string;
  event: EventTemplate;
  ttl?: number;
}
/** Shell publication result. */
export interface MeshPublishResultMessage extends MeshMessage, MeshPublishResult {
  type: 'mesh.publish.result';
  id: string;
}
/** Open a subscription; the request id is answered only on refusal. */
export interface MeshSubscribeMessage extends MeshMessage {
  type: 'mesh.subscribe';
  id: string;
  subId: string;
  filters: NostrFilter | NostrFilter[];
  ttl?: number;
}
/** Subscription refusal before it opens. */
export interface MeshSubscribeResultMessage extends MeshMessage {
  type: 'mesh.subscribe.result';
  id: string;
  error: string;
}
/** A local or circle event. */
export interface MeshEventMessage extends MeshMessage {
  type: 'mesh.event';
  subId: string;
  result: RelayEventResult;
}
/** End of local backlog, carrying the effective backlog hop budget. */
export interface MeshEoseMessage extends MeshMessage {
  type: 'mesh.eose';
  subId: string;
  ttl: number;
}
/** Close a subscription without a request id or response. */
export interface MeshCloseMessage extends MeshMessage {
  type: 'mesh.close';
  subId: string;
}
/** Shell-initiated end of an opened subscription. */
export interface MeshClosedMessage extends MeshMessage {
  type: 'mesh.closed';
  subId: string;
  reason?: string;
}
/** Query blob availability among reachable members. */
export interface MeshBlobsMessage extends MeshMessage {
  type: 'mesh.blobs';
  id: string;
  hashes: string[];
}
/** Blob counts or query failure. */
export type MeshBlobsResultMessage = MeshMessage & {
  type: 'mesh.blobs.result';
  id: string;
} & (
  | (MeshBlobsResult & { error?: undefined })
  | (Partial<MeshBlobsResult> & { error: string })
);

/** Napplet-to-shell mesh envelopes. */
export type MeshOutboundMessage = MeshInfoMessage | MeshPublishMessage | MeshSubscribeMessage | MeshCloseMessage | MeshBlobsMessage;
/** Shell-to-napplet mesh envelopes. */
export type MeshInboundMessage = MeshInfoResultMessage | MeshPublishResultMessage | MeshSubscribeResultMessage | MeshEventMessage | MeshEoseMessage | MeshClosedMessage | MeshBlobsResultMessage;
/** All NAP-MESH envelopes. */
export type MeshNapMessage = MeshOutboundMessage | MeshInboundMessage;
