/**
 * @napplet/nub/notify -- Notify NUB module.
 *
 * Exports typed message definitions for the notify domain, shim installer,
 * SDK helpers, and registers the 'notify' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { NotifySendMessage, NotifyNubMessage, NotificationAction } from '@napplet/nub/notify';
 * import { DOMAIN, installNotifyShim, notifySend } from '@napplet/nub/notify';
 * ```
 *
 * @packageDocumentation
 */

export { DOMAIN } from './types.js';

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
  NotifyNubMessage,
} from './types.js';

export {
  installNotifyShim,
  handleNotifyMessage,
  send,
  dismiss,
  badge,
  registerChannel,
  requestPermission,
  onAction,
  onClicked,
  onDismissed,
  onControls,
} from './shim.js';

export {
  notifySend,
  notifyDismiss,
  notifyBadge,
  notifyRegisterChannel,
  notifyRequestPermission,
  notifyOnAction,
  notifyOnClicked,
  notifyOnDismissed,
  notifyOnControls,
} from './sdk.js';

import { registerNub } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the notify domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'notify'.
 */
registerNub(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
