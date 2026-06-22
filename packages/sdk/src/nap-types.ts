/**
 * @napplet/sdk -- Type-only re-exports from `@napplet/core` and `@napplet/nap/*`.
 *
 * @packageDocumentation
 */

export type { NostrEvent } from '@napplet/core';
export type { NostrFilter } from '@napplet/core';
export type { Subscription } from '@napplet/core';
export type { EventTemplate } from '@napplet/core';

export type {
  NappletMessage,
  NapDomain,
  NamespacedCapability,
  NapProtocolId,
  ProtocolId,
  ShellSupports,
} from '@napplet/core';

// Relay NAP
export type {
  RelayMessage,
  RelaySubscribeMessage,
  RelayCloseMessage,
  RelayPublishMessage,
  RelayPublishEncryptedMessage,
  RelayQueryMessage,
  RelayEventMessage,
  RelayEoseMessage,
  RelayClosedMessage,
  RelayPublishResultMessage,
  RelayPublishEncryptedResultMessage,
  RelayQueryResultMessage,
  RelayOutboundMessage,
  RelayInboundMessage,
  RelayNapMessage,
} from '@napplet/nap/relay';

// Identity NAP
export type {
  ProfileData,
  ZapReceipt,
  Badge,
  RelayPermission as IdentityRelayPermission,
  IdentityMessage,
  IdentityGetPublicKeyMessage,
  IdentityGetRelaysMessage,
  IdentityGetProfileMessage,
  IdentityGetFollowsMessage,
  IdentityGetListMessage,
  IdentityGetZapsMessage,
  IdentityGetMutesMessage,
  IdentityGetBlockedMessage,
  IdentityGetBadgesMessage,
  IdentityGetPublicKeyResultMessage,
  IdentityGetRelaysResultMessage,
  IdentityGetProfileResultMessage,
  IdentityGetFollowsResultMessage,
  IdentityGetListResultMessage,
  IdentityGetZapsResultMessage,
  IdentityGetMutesResultMessage,
  IdentityGetBlockedResultMessage,
  IdentityGetBadgesResultMessage,
  IdentityChangedMessage,
  IdentityRequestMessage,
  IdentityResultMessage,
  IdentityNapMessage,
} from '@napplet/nap/identity';

// Storage NAP
export type {
  StorageMessage,
  StorageGetMessage,
  StorageSetMessage,
  StorageRemoveMessage,
  StorageKeysMessage,
  StorageGetResultMessage,
  StorageSetResultMessage,
  StorageRemoveResultMessage,
  StorageKeysResultMessage,
  StorageRequestMessage,
  StorageResultMessage,
  StorageNapMessage,
} from '@napplet/nap/storage';

// INC NAP
export type {
  IncMessage,
  IncEmitMessage,
  IncSubscribeMessage,
  IncSubscribeResultMessage,
  IncUnsubscribeMessage,
  IncEventMessage,
  IncChannelOpenMessage,
  IncChannelOpenResultMessage,
  IncChannelEmitMessage,
  IncChannelEventMessage,
  IncChannelBroadcastMessage,
  IncChannelListMessage,
  IncChannelListResultMessage,
  IncChannelCloseMessage,
  IncChannelClosedMessage,
  IncTopicMessage,
  IncChannelMessage,
  IncOutboundMessage,
  IncInboundMessage,
  IncNapMessage,
} from '@napplet/nap/inc';

// Deprecated IFC compatibility aliases
export type {
  IfcMessage,
  IfcEmitMessage,
  IfcSubscribeMessage,
  IfcSubscribeResultMessage,
  IfcUnsubscribeMessage,
  IfcEventMessage,
  IfcChannelOpenMessage,
  IfcChannelOpenResultMessage,
  IfcChannelEmitMessage,
  IfcChannelEventMessage,
  IfcChannelBroadcastMessage,
  IfcChannelListMessage,
  IfcChannelListResultMessage,
  IfcChannelCloseMessage,
  IfcChannelClosedMessage,
  IfcTopicMessage,
  IfcChannelMessage,
  IfcOutboundMessage,
  IfcInboundMessage,
  IfcNapMessage,
} from '@napplet/nap/ifc';

// Theme NAP
export type {
  ThemeColors,
  ThemeFont,
  ThemeBackground,
  Theme,
  ThemeMessage,
  ThemeGetMessage,
  ThemeGetResultMessage,
  ThemeChangedMessage,
  ThemeRequestMessage,
  ThemeResultMessage,
  ThemeNapMessage,
} from '@napplet/nap/theme';

// Keys NAP
export type {
  Action,
  RegisterResult,
  KeyBinding,
  KeysMessage,
  KeysForwardMessage,
  KeysRegisterActionMessage,
  KeysRegisterActionResultMessage,
  KeysUnregisterActionMessage,
  KeysBindingsMessage,
  KeysActionMessage,
  KeysRequestMessage,
  KeysResultMessage,
  KeysNapMessage,
} from '@napplet/nap/keys';

// Media NAP
export type {
  MediaMetadata,
  MediaArtwork,
  MediaPlaybackOwner,
  MediaSourceRef,
  MediaSessionCreate,
  MediaSessionResult,
  MediaState,
  MediaAction,
  MediaMessage,
  MediaSessionCreateMessage,
  MediaSessionCreateResultMessage,
  MediaSessionUpdateMessage,
  MediaSessionDestroyMessage,
  MediaStateMessage,
  MediaCapabilitiesMessage,
  MediaCommandMessage,
  MediaControlsMessage,
  MediaRequestMessage,
  MediaResultMessage,
  MediaNapMessage,
} from '@napplet/nap/media';

// Notify NAP
export type {
  NotificationPriority,
  NotificationAction,
  NotificationChannel,
  NotifyControl,
  NotifyMessage,
  NotifySendMessage,
  NotifySendResultMessage,
  NotifyDismissMessage,
  NotifyBadgeMessage,
  NotifyChannelRegisterMessage,
  NotifyPermissionRequestMessage,
  NotifyPermissionResultMessage,
  NotifyActionMessage,
  NotifyClickedMessage,
  NotifyDismissedMessage,
  NotifyControlsMessage,
  NotifyRequestMessage,
  NotifyResultMessage,
  NotifyNapMessage,
} from '@napplet/nap/notify';

// Config NAP
export type {
  NappletConfigSchema,
  ConfigSchema,
  ConfigValues,
  ConfigSchemaErrorCode,
  NappletConfigSchemaExtensions,
  ConfigMessage,
  ConfigRegisterSchemaMessage,
  ConfigGetMessage,
  ConfigSubscribeMessage,
  ConfigUnsubscribeMessage,
  ConfigOpenSettingsMessage,
  ConfigRegisterSchemaResultMessage,
  ConfigValuesMessage,
  ConfigSchemaErrorMessage,
  ConfigRequestMessage,
  ConfigResultMessage,
  ConfigNapMessage,
} from '@napplet/nap/config';

// Resource NAP
export type {
  ResourceErrorCode,
  ResourceScheme,
  ResourceMessage,
  ResourceBytesMessage,
  ResourceCancelMessage,
  ResourceBytesResultMessage,
  ResourceBytesErrorMessage,
  ResourceSidecarEntry,
  ResourceRequestMessage,
  ResourceResultMessage,
  ResourceNapMessage,
} from '@napplet/nap/resource';

// CVM NAP (ContextVM bridge)
export type {
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
  CvmMessage,
  CvmDiscoverMessage,
  CvmDiscoverResultMessage,
  CvmRequestMessage,
  CvmRequestResultMessage,
  CvmCloseMessage,
  CvmCloseResultMessage,
  CvmEventMessage,
  CvmOutboundMessage,
  CvmInboundMessage,
  CvmNapMessage,
} from '@napplet/nap/cvm';

// OUTBOX NAP (outbox-aware relay routing)
export type {
  OutboxStrategy,
  OutboxQueryOptions,
  OutboxSubscribeOptions,
  OutboxPublishOptions,
  OutboxTarget,
  OutboxRelayPlan,
  OutboxResult,
  OutboxPublishResult,
  OutboxSubscription,
  OutboxMessage,
  OutboxQueryMessage,
  OutboxQueryResultMessage,
  OutboxSubscribeMessage,
  OutboxEventMessage,
  OutboxEoseMessage,
  OutboxClosedMessage,
  OutboxCloseMessage,
  OutboxPublishMessage,
  OutboxPublishResultMessage,
  OutboxResolveRelaysMessage,
  OutboxResolveRelaysResultMessage,
  OutboxOutboundMessage,
  OutboxInboundMessage,
  OutboxNapMessage,
} from '@napplet/nap/outbox';

// UPLOAD NAP (shell-mediated file/blob upload)
export type {
  NostrTag,
  UploadRail,
  UploadState,
  UploadDimensions,
  UploadRequest,
  UploadResult,
  UploadStatus,
  UploadMessage,
  UploadUploadMessage,
  UploadUploadResultMessage,
  UploadStatusMessage,
  UploadStatusResultMessage,
  UploadStatusChangedMessage,
  UploadOutboundMessage,
  UploadInboundMessage,
  UploadNapMessage,
} from '@napplet/nap/upload';

// INTENT NAP (archetype intent dispatcher)
export type {
  IntentHandlerPreference,
  IntentBehavior,
  IntentRequest,
  IntentContract,
  IntentCandidate,
  IntentAvailability,
  IntentResult,
  IntentMessage,
  IntentInvokeMessage,
  IntentInvokeResultMessage,
  IntentAvailableMessage,
  IntentAvailableResultMessage,
  IntentHandlersMessage,
  IntentHandlersResultMessage,
  IntentChangedMessage,
  IntentOutboundMessage,
  IntentInboundMessage,
  IntentNapMessage,
} from '@napplet/nap/intent';

// LINK NAP (shell-mediated link opening)
export type {
  LinkOpenErrorCode,
  LinkOpenOptions,
  LinkOpenResult,
  LinkOpenStatus,
  LinkMessage,
  LinkOpenMessage,
  LinkOpenResultMessage,
  LinkOutboundMessage,
  LinkInboundMessage,
  LinkNapMessage,
} from '@napplet/nap/link';
// SERIAL NAP (runtime-mediated serial device access)
export type {
  SerialState,
  SerialPortFilter,
  SerialOpenOptions,
  SerialOpenRequest,
  SerialPortInfo,
  SerialSession,
  SerialOpenResult,
  SerialEvent,
  SerialMessage,
  SerialOpenMessage,
  SerialOpenResultMessage,
  SerialWriteMessage,
  SerialWriteResultMessage,
  SerialCloseMessage,
  SerialCloseResultMessage,
  SerialEventMessage,
  SerialOutboundMessage,
  SerialInboundMessage,
  SerialNapMessage,
} from '@napplet/nap/serial';
