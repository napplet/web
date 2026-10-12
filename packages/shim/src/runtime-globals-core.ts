import { shell } from '@napplet/nap/shell/shim';
import type { NapDomain, NappletGlobal } from '@napplet/core';
import {
  registerAction,
  unregisterAction,
  onAction,
} from '@napplet/nap/keys/shim';
import * as mediaShim from '@napplet/nap/media/shim';
import {
  send as notifySend,
  dismiss as notifyDismiss,
  badge as notifyBadge,
  registerChannel as notifyRegisterChannel,
  requestPermission as notifyRequestPermission,
  onAction as notifyOnAction,
  onClicked as notifyOnClicked,
  onDismissed as notifyOnDismissed,
  onControls as notifyOnControls,
} from '@napplet/nap/notify/shim';
import {
  nappletStorage,
} from '@napplet/nap/storage/shim';
import {
  subscribe,
  publish,
  publishEncrypted,
  query,
} from '@napplet/nap/relay/shim';
import * as identityShim from '@napplet/nap/identity/shim';
import * as themeShim from '@napplet/nap/theme/shim';
import {
  channel as incChannel,
  emit,
  on,
} from '@napplet/nap/inc/shim';
import {
  registerSchema as configRegisterSchema,
  get as configGet,
  subscribe as configSubscribe,
  openSettings as configOpenSettings,
  onSchemaError as configOnSchemaError,
} from '@napplet/nap/config/shim';


export function installCoreDomains(domains: ReadonlySet<NapDomain>, napplet: Partial<NappletGlobal>): void {
  if (domains.has('shell')) napplet.shell = shell;
  installFoundationDomains(domains, napplet);
  installPresentationDomains(domains, napplet);
}

function installFoundationDomains(domains: ReadonlySet<NapDomain>, napplet: Partial<NappletGlobal>): void {
  if (domains.has('relay')) {
    napplet.relay = {
      subscribe,
      publish,
      publishEncrypted,
      query,
    };
  }

  if (domains.has('inc')) {
    napplet.inc = {
      emit,
      on,
      channel: incChannel,
    };
  }

  if (domains.has('storage')) {
    napplet.storage = {
      getItem: nappletStorage.getItem.bind(nappletStorage),
      setItem: nappletStorage.setItem.bind(nappletStorage),
      removeItem: nappletStorage.removeItem.bind(nappletStorage),
      keys: nappletStorage.keys.bind(nappletStorage),
      instance: {
        getItem: nappletStorage.instance.getItem.bind(nappletStorage.instance),
        setItem: nappletStorage.instance.setItem.bind(nappletStorage.instance),
        removeItem: nappletStorage.instance.removeItem.bind(nappletStorage.instance),
        keys: nappletStorage.instance.keys.bind(nappletStorage.instance),
      },
    };
  }

  if (domains.has('keys')) {
    napplet.keys = {
      registerAction,
      unregisterAction,
      onAction,
    };
  }

  if (domains.has('media')) {
    napplet.media = {
      createSession: mediaShim.createSession,
      updateSession: mediaShim.updateSession,
      destroySession: mediaShim.destroySession,
      reportState: mediaShim.reportState,
      reportCapabilities: mediaShim.reportCapabilities,
      sendCommand: mediaShim.sendCommand,
      onCommand: mediaShim.onCommand,
      onState: mediaShim.onState,
      onCapabilities: mediaShim.onCapabilities,
      onControls: mediaShim.onControls,
    };
  }

  if (domains.has('notify')) {
    napplet.notify = {
      send: notifySend,
      dismiss: notifyDismiss,
      badge: notifyBadge,
      registerChannel: notifyRegisterChannel,
      requestPermission: notifyRequestPermission,
      onAction: notifyOnAction,
      onClicked: notifyOnClicked,
      onDismissed: notifyOnDismissed,
      onControls: notifyOnControls,
    };
  }
}

function installPresentationDomains(domains: ReadonlySet<NapDomain>, napplet: Partial<NappletGlobal>): void {
  if (domains.has('identity')) {
    napplet.identity = {
      getPublicKey: identityShim.getPublicKey,
      onChanged: identityShim.onChanged,
      getRelays: identityShim.getRelays,
      getProfile: identityShim.getProfile,
      getFollows: identityShim.getFollows,
      getList: identityShim.getList,
      getZaps: identityShim.getZaps,
      getMutes: identityShim.getMutes,
      getBlocked: identityShim.getBlocked,
      getBadges: identityShim.getBadges,
    };
  }

  if (domains.has('theme')) {
    napplet.theme = {
      get: themeShim.get,
      onChanged: themeShim.onChanged,
    };
  }

  if (domains.has('config')) {
    napplet.config = {
      registerSchema: configRegisterSchema,
      get: configGet,
      subscribe: configSubscribe,
      openSettings: configOpenSettings,
      onSchemaError: configOnSchemaError,
      schema: null,
    };
  }
}
