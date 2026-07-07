/**
 * Napplet NAP notify -- Notify NAP module.
 *
 * Exports typed message definitions for the notify domain, shim installer,
 * SDK helpers, and registers the 'notify' domain with core dispatch on import.
 *
 * @example
 * ```ts
 * import type { NotifySendMessage, NotifyNapMessage, NotificationAction } from '@napplet/nap/notify';
 * import { DOMAIN, installNotifyShim, notifySend } from '@napplet/nap/notify';
 * ```
 *
 * @module
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
  NotifyNapMessage,
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

import { registerNap } from '@napplet/core';
import { DOMAIN } from './types.js';

/**
 * Register the notify domain with the core dispatch singleton.
 * Handler is a no-op placeholder -- the shell/shim provide real handlers.
 * Registration ensures dispatch.getRegisteredDomains() includes 'notify'.
 */
registerNap(DOMAIN, (_msg) => {
  /* Shell or shim replaces this handler at runtime */
});
