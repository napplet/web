/**
 * @napplet/sdk -- Value re-exports from `@napplet/core` and `@napplet/nap/*`:
 * protocol constants, shim installers, and domain helper functions.
 *
 * @packageDocumentation
 */

export { NAP_DOMAINS } from '@napplet/core';

export { DOMAIN as RELAY_DOMAIN } from '@napplet/nap/relay';
export { DOMAIN as IDENTITY_DOMAIN } from '@napplet/nap/identity';
export { DOMAIN as STORAGE_DOMAIN } from '@napplet/nap/storage';
export { DOMAIN as INC_DOMAIN } from '@napplet/nap/inc';
/**
 * @deprecated Use {@link INC_DOMAIN}. This compatibility export resolves to
 * the canonical `inc` domain string.
 */
export { DOMAIN as IFC_DOMAIN } from '@napplet/nap/ifc';
export { DOMAIN as THEME_DOMAIN } from '@napplet/nap/theme';
export { DOMAIN as KEYS_DOMAIN } from '@napplet/nap/keys';
export { DOMAIN as MEDIA_DOMAIN } from '@napplet/nap/media';
export { DOMAIN as NOTIFY_DOMAIN } from '@napplet/nap/notify';
export { DOMAIN as CONFIG_DOMAIN } from '@napplet/nap/config';
export { DOMAIN as RESOURCE_DOMAIN } from '@napplet/nap/resource';
export { DOMAIN as CVM_DOMAIN } from '@napplet/nap/cvm';
export { DOMAIN as OUTBOX_DOMAIN } from '@napplet/nap/outbox';
export { DOMAIN as UPLOAD_DOMAIN } from '@napplet/nap/upload';
export { DOMAIN as INTENT_DOMAIN } from '@napplet/nap/intent';
export { DOMAIN as BLE_DOMAIN } from '@napplet/nap/ble';
export { DOMAIN as WEBRTC_DOMAIN } from '@napplet/nap/webrtc';
export { DOMAIN as LINK_DOMAIN } from '@napplet/nap/link';
export { DOMAIN as LISTS_DOMAIN } from '@napplet/nap/lists';
export { DOMAIN as COMMON_DOMAIN } from '@napplet/nap/common';
export { DOMAIN as SERIAL_DOMAIN } from '@napplet/nap/serial';

export { installRelayShim } from '@napplet/nap/relay';
export { installIdentityShim } from '@napplet/nap/identity';
export { installThemeShim } from '@napplet/nap/theme';
export { installStorageShim } from '@napplet/nap/storage';
export { installIncShim } from '@napplet/nap/inc';
/**
 * @deprecated Use {@link installIncShim}.
 */
export { installIfcShim } from '@napplet/nap/ifc';
export { installKeysShim } from '@napplet/nap/keys';
export { installMediaShim } from '@napplet/nap/media';
export { installNotifyShim } from '@napplet/nap/notify';
export { installConfigShim } from '@napplet/nap/config';
export { installResourceShim } from '@napplet/nap/resource';
export { installCvmShim } from '@napplet/nap/cvm';
export { installOutboxShim } from '@napplet/nap/outbox';
export { installUploadShim } from '@napplet/nap/upload';
export { installIntentShim } from '@napplet/nap/intent';
export { installBleShim } from '@napplet/nap/ble';
export { installWebrtcShim } from '@napplet/nap/webrtc';
export { installLinkShim } from '@napplet/nap/link';
export { installListsShim } from '@napplet/nap/lists';
export { installCommonShim } from '@napplet/nap/common';
export { installSerialShim } from '@napplet/nap/serial';

export { relaySubscribe, relayPublish, relayPublishEncrypted, relayQuery } from '@napplet/nap/relay';
export {
  identityGetPublicKey,
  identityOnChanged,
  identityGetRelays,
  identityGetProfile,
  identityGetFollows,
  identityGetList,
  identityGetZaps,
  identityGetMutes,
  identityGetBlocked,
  identityGetBadges,
} from '@napplet/nap/identity';
export { themeGet, themeOnChanged } from '@napplet/nap/theme';
export {
  storageGetItem,
  storageSetItem,
  storageRemoveItem,
  storageKeys,
  storageInstanceGetItem,
  storageInstanceSetItem,
  storageInstanceRemoveItem,
  storageInstanceKeys,
} from '@napplet/nap/storage';
export { incEmit, incOn } from '@napplet/nap/inc';
/**
 * @deprecated Use {@link incEmit} and {@link incOn}.
 */
export { ifcEmit, ifcOn } from '@napplet/nap/ifc';
export { keysRegisterAction, keysUnregisterAction, keysOnAction, keysRegister } from '@napplet/nap/keys';
export { mediaCreateSession, mediaUpdateSession, mediaDestroySession, mediaReportState, mediaReportCapabilities, mediaSendCommand, mediaOnCommand, mediaOnState, mediaOnCapabilities, mediaOnControls } from '@napplet/nap/media';
export { notifySend, notifyDismiss, notifyBadge, notifyRegisterChannel, notifyRequestPermission, notifyOnAction, notifyOnClicked, notifyOnDismissed, notifyOnControls } from '@napplet/nap/notify';
export { resourceBytes, resourceBytesMany, resourceBytesAsObjectURL } from '@napplet/nap/resource';
export {
  cvmDiscover,
  cvmRequest,
  cvmListTools,
  cvmCallTool,
  cvmListResources,
  cvmReadResource,
  cvmClose,
  cvmOnEvent,
} from '@napplet/nap/cvm';
export {
  outboxQuery,
  outboxSubscribe,
  outboxPublish,
  outboxResolveRelays,
} from '@napplet/nap/outbox';
export {
  uploadFile,
  uploadStatus,
  uploadOnStatus,
} from '@napplet/nap/upload';
export {
  intentInvoke,
  intentOpen,
  intentAvailable,
  intentHandlers,
  intentOnChanged,
} from '@napplet/nap/intent';
export {
  bleOpen,
  bleServices,
  bleRead,
  bleWrite,
  bleSubscribe,
  bleUnsubscribe,
  bleClose,
  bleOnEvent,
} from '@napplet/nap/ble';
export { linkOpen } from '@napplet/nap/link';
export {
  listsSupported,
  listsAdd,
  listsRemove,
} from '@napplet/nap/lists';
export {
  commonEncodeNip19,
  commonDecodeNip19,
  commonGetProfile,
  commonFollows,
  commonFollow,
  commonUnfollow,
  commonReact,
  commonReport,
} from '@napplet/nap/common';
export {
  webrtcOpen,
  webrtcSend,
  webrtcClose,
  webrtcOnEvent,
} from '@napplet/nap/webrtc';
export {
  serialOpen,
  serialWrite,
  serialClose,
  serialOnEvent,
} from '@napplet/nap/serial';
