/** NAP-BLOSSOM wire envelopes. Canonical proposal: https://github.com/napplet/naps/pull/71. */
import type * as Core from '@napplet/core';
import type { NappletMessage } from '@napplet/core';
export type {
  BlossomAuthMode,
  BlossomApi,
  BlossomHeaders,
  BlossomDescriptor,
  BlossomUri,
  BlossomBlobCheckRequest,
  BlossomGetRequest,
  BlossomCheckRequest,
  BlossomUploadRequest,
  BlossomMirrorRequest,
  BlossomMediaRequest,
  BlossomListRequest,
  BlossomDeleteRequest,
  BlossomAddServerRequest,
  BlossomBlobCheckResult,
  BlossomBytesResult,
  BlossomCheckResult,
  BlossomDescriptorResult,
  BlossomListResult,
  BlossomDeleteResult,
  BlossomServerListResult,
} from '@napplet/core';

/** Capability namespace for low-level Blossom operations. */
export const DOMAIN = 'blossom' as const;

export interface BlossomCheckMessage extends NappletMessage {
  type: 'blossom.check';
  id: string;
  request: Core.BlossomBlobCheckRequest;
}
export interface BlossomCheckResultMessage extends NappletMessage {
  type: 'blossom.check.result';
  id: string;
  result?: Core.BlossomBlobCheckResult;
  error?: string;
}
export interface BlossomGetMessage extends NappletMessage {
  type: 'blossom.get';
  id: string;
  request: Core.BlossomGetRequest;
}
export interface BlossomGetResultMessage extends NappletMessage {
  type: 'blossom.get.result';
  id: string;
  result?: Core.BlossomBytesResult;
  error?: string;
}
export interface BlossomCheckUploadMessage extends NappletMessage {
  type: 'blossom.checkUpload';
  id: string;
  request: Core.BlossomCheckRequest;
}
export interface BlossomCheckUploadResultMessage extends NappletMessage {
  type: 'blossom.checkUpload.result';
  id: string;
  result?: Core.BlossomCheckResult;
  error?: string;
}
export interface BlossomUploadMessage extends NappletMessage {
  type: 'blossom.upload';
  id: string;
  request: Core.BlossomUploadRequest;
}
export interface BlossomUploadResultMessage extends NappletMessage {
  type: 'blossom.upload.result';
  id: string;
  result?: Core.BlossomDescriptorResult;
  error?: string;
}
export interface BlossomMirrorMessage extends NappletMessage {
  type: 'blossom.mirror';
  id: string;
  request: Core.BlossomMirrorRequest;
}
export interface BlossomMirrorResultMessage extends NappletMessage {
  type: 'blossom.mirror.result';
  id: string;
  result?: Core.BlossomDescriptorResult;
  error?: string;
}
export interface BlossomCheckMediaMessage extends NappletMessage {
  type: 'blossom.checkMedia';
  id: string;
  request: Core.BlossomCheckRequest;
}
export interface BlossomCheckMediaResultMessage extends NappletMessage {
  type: 'blossom.checkMedia.result';
  id: string;
  result?: Core.BlossomCheckResult;
  error?: string;
}
export interface BlossomMediaMessage extends NappletMessage {
  type: 'blossom.media';
  id: string;
  request: Core.BlossomMediaRequest;
}
export interface BlossomMediaResultMessage extends NappletMessage {
  type: 'blossom.media.result';
  id: string;
  result?: Core.BlossomDescriptorResult;
  error?: string;
}
export interface BlossomListMessage extends NappletMessage {
  type: 'blossom.list';
  id: string;
  request: Core.BlossomListRequest;
}
export interface BlossomListResultMessage extends NappletMessage {
  type: 'blossom.list.result';
  id: string;
  result?: Core.BlossomListResult;
  error?: string;
}
export interface BlossomDeleteMessage extends NappletMessage {
  type: 'blossom.delete';
  id: string;
  request: Core.BlossomDeleteRequest;
}
export interface BlossomDeleteResultMessage extends NappletMessage {
  type: 'blossom.delete.result';
  id: string;
  result?: Core.BlossomDeleteResult;
  error?: string;
}
export interface BlossomServersMessage extends NappletMessage {
  type: 'blossom.servers';
  id: string;
}
export interface BlossomServersResultMessage extends NappletMessage {
  type: 'blossom.servers.result';
  id: string;
  result?: Core.BlossomServerListResult;
  error?: string;
}
export interface BlossomAddServerMessage extends NappletMessage {
  type: 'blossom.addServer';
  id: string;
  request: Core.BlossomAddServerRequest;
}
export interface BlossomAddServerResultMessage extends NappletMessage {
  type: 'blossom.addServer.result';
  id: string;
  result?: Core.BlossomServerListResult;
  error?: string;
}
export interface BlossomRemoveServerMessage extends NappletMessage {
  type: 'blossom.removeServer';
  id: string;
  server: string;
}
export interface BlossomRemoveServerResultMessage extends NappletMessage {
  type: 'blossom.removeServer.result';
  id: string;
  result?: Core.BlossomServerListResult;
  error?: string;
}
export interface BlossomReorderServersMessage extends NappletMessage {
  type: 'blossom.reorderServers';
  id: string;
  servers: string[];
}
export interface BlossomReorderServersResultMessage extends NappletMessage {
  type: 'blossom.reorderServers.result';
  id: string;
  result?: Core.BlossomServerListResult;
  error?: string;
}
export type BlossomOutboundMessage = BlossomCheckMessage | BlossomGetMessage | BlossomCheckUploadMessage | BlossomUploadMessage | BlossomMirrorMessage | BlossomCheckMediaMessage | BlossomMediaMessage | BlossomListMessage | BlossomDeleteMessage | BlossomServersMessage | BlossomAddServerMessage | BlossomRemoveServerMessage | BlossomReorderServersMessage;
export type BlossomInboundMessage = BlossomCheckResultMessage | BlossomGetResultMessage | BlossomCheckUploadResultMessage | BlossomUploadResultMessage | BlossomMirrorResultMessage | BlossomCheckMediaResultMessage | BlossomMediaResultMessage | BlossomListResultMessage | BlossomDeleteResultMessage | BlossomServersResultMessage | BlossomAddServerResultMessage | BlossomRemoveServerResultMessage | BlossomReorderServersResultMessage;
export type BlossomNapMessage = BlossomOutboundMessage | BlossomInboundMessage;
