/**
 * @napplet/core -- Shared protocol types, constants, and topic definitions.
 *
 * This package is the single source of truth for all protocol-level
 * definitions in the napplet ecosystem. All other @napplet/* packages
 * import their protocol types and constants from here.
 *
 * Zero dependencies. No DOM or browser APIs.
 *
 * @example
 * ```ts
 * import {
 *   type NostrEvent, type NostrFilter,
 *   type NappletMessage, type NapDomain, type ShellSupports,
 *   type NapHandler, type NapDispatch,
 *   NAP_DOMAINS, TOPICS,
 *   createDispatch, registerNap, dispatch, getRegisteredDomains,
 * } from '@napplet/core';
 * ```
 *
 * @packageDocumentation
 */

export type {
  NappletMessage,
  NapDomain,
  NamespacedCapability,
  NapProtocolId,
  ProtocolId,
  ShellSupports,
} from './envelope.js';
export { NAP_DOMAINS } from './envelope.js';

export type { NapHandler, NapDispatch } from './dispatch.js';
export { createDispatch, registerNap, dispatch, getRegisteredDomains } from './dispatch.js';

export type {
  NostrEvent,
  NostrFilter,
  Subscription,
  EventTemplate,
  MediaPlaybackOwner,
  MediaSourceRef,
  MediaMetadata,
  MediaState,
  MediaAction,
  MediaSessionCreate,
  MediaSessionResult,
  McpMessage,
  McpTool,
  McpContentBlock,
  McpToolResult,
  McpResource,
  McpTextResourceContents,
  McpBlobResourceContents,
  McpResourceContent,
  CvmServerRef,
  CvmDiscoverQuery,
  CvmServer,
  CvmRequestOptions,
  OutboxStrategy,
  OutboxQueryOptions,
  OutboxSubscribeOptions,
  OutboxPublishOptions,
  OutboxTarget,
  OutboxRelayPlan,
  OutboxResult,
  OutboxPublishResult,
  OutboxSubscription,
  NostrTag,
  UploadRail,
  UploadState,
  UploadRequest,
  UploadResult,
  UploadStatus,
  IntentHandlerPreference,
  IntentBehavior,
  IntentRequest,
  IntentCandidate,
  IntentAvailability,
  IntentResult,
  SystemHealth,
  SystemNapStatus,
  SystemServiceStatus,
  SystemRelayStatus,
  SystemStorageStatus,
  SystemMediaStatus,
  SystemScopeSummary,
  SystemScopeStatus,
  SerialState,
  SerialPortFilter,
  SerialOpenOptions,
  SerialOpenRequest,
  SerialPortInfo,
  SerialSession,
  SerialOpenResult,
  SerialEvent,
  ShellCapabilities,
  ShellEnvironment,
  NappletShell,
  ShellReadyMessage,
  ShellInitMessage,
  NappletGlobal,
  NappletInstanceStorage,
} from './types.js';

export { TOPICS } from './topics.js';
export type { TopicKey, TopicValue } from './topics.js';

export type { CloneMode, PostMessageTarget } from './boundary.js';
export {
  sendEnvelope,
  toCloneableSnapshot,
  setCloneMode,
  getCloneMode,
  clearCloneWarnings,
} from './boundary.js';
