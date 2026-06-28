import { NAP_DOMAINS } from '@napplet/core';
import type { NapDomain, NappletGlobal } from '@napplet/core';
import { installKeysShim, handleKeysMessage, registerAction, unregisterAction, onAction } from '@napplet/nap/keys/shim';
import * as mediaShim from '@napplet/nap/media/shim';
import {
  installNotifyShim,
  handleNotifyMessage,
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
import { installStorageShim, nappletStorage } from '@napplet/nap/storage/shim';
import { subscribe, publish, publishEncrypted, query } from '@napplet/nap/relay/shim';
import * as identityShim from '@napplet/nap/identity/shim';
import * as themeShim from '@napplet/nap/theme/shim';
import { installIncShim, emit, on, handleIncEvent } from '@napplet/nap/inc/shim';
import {
  installConfigShim,
  handleConfigMessage,
  registerSchema as configRegisterSchema,
  get as configGet,
  subscribe as configSubscribe,
  openSettings as configOpenSettings,
  onSchemaError as configOnSchemaError,
} from '@napplet/nap/config/shim';
import {
  installResourceShim,
  handleResourceMessage,
  info as resourceInfo,
  bytes as resourceBytes,
  bytesMany as resourceBytesMany,
  bytesAsObjectURL as resourceBytesAsObjectURL,
} from '@napplet/nap/resource/shim';
import {
  installCvmShim,
  handleCvmMessage,
  discover as cvmDiscover,
  request as cvmRequest,
  listTools as cvmListTools,
  callTool as cvmCallTool,
  listResources as cvmListResources,
  readResource as cvmReadResource,
  close as cvmClose,
  onEvent as cvmOnEvent,
} from '@napplet/nap/cvm/shim';
import {
  installOutboxShim,
  handleOutboxMessage,
  query as outboxQuery,
  subscribe as outboxSubscribe,
  publish as outboxPublish,
  resolveRelays as outboxResolveRelays,
} from '@napplet/nap/outbox/shim';
import {
  installUploadShim,
  handleUploadMessage,
  upload as uploadUpload,
  status as uploadStatusFn,
  onStatus as uploadOnStatus,
} from '@napplet/nap/upload/shim';
import {
  installIntentShim,
  handleIntentMessage,
  invoke as intentInvoke,
  open as intentOpen,
  available as intentAvailable,
  handlers as intentHandlers,
  onChanged as intentOnChanged,
} from '@napplet/nap/intent/shim';
import {
  installWebrtcShim,
  handleWebrtcMessage,
  open as webrtcOpen,
  send as webrtcSend,
  close as webrtcClose,
  onEvent as webrtcOnEvent,
} from '@napplet/nap/webrtc/shim';
import {
  installBleShim,
  handleBleMessage,
  open as bleOpen,
  services as bleServices,
  read as bleRead,
  write as bleWrite,
  subscribe as bleSubscribe,
  unsubscribe as bleUnsubscribe,
  close as bleClose,
  onEvent as bleOnEvent,
} from '@napplet/nap/ble/shim';
import {
  installLinkShim,
  handleLinkMessage,
  open as linkOpen,
} from '@napplet/nap/link/shim';
import {
  installListsShim,
  handleListsMessage,
  supported as listsSupported,
  add as listsAdd,
  remove as listsRemove,
} from '@napplet/nap/lists/shim';
import {
  installCommonShim,
  handleCommonMessage,
  encodeNip19 as commonEncodeNip19,
  decodeNip19 as commonDecodeNip19,
  getProfile as commonGetProfile,
  follows as commonFollows,
  follow as commonFollow,
  unfollow as commonUnfollow,
  react as commonReact,
  report as commonReport,
} from '@napplet/nap/common/shim';
import {
  installSerialShim,
  handleSerialMessage,
  open as serialOpen,
  write as serialWrite,
  close as serialClose,
  onEvent as serialOnEvent,
} from '@napplet/nap/serial/shim';
import {
  installDmShim,
  handleDmMessage,
  status as dmStatus,
  conversations as dmConversations,
  messages as dmMessages,
  send as dmSend,
  subscribe as dmSubscribe,
  unsubscribe as dmUnsubscribe,
  onMessage as dmOnMessage,
} from '@napplet/nap/dm/shim';
import type { IncEventMessage } from '@napplet/nap/inc/types';

export interface NappletShimInstallOptions {
  /** Domains the runtime exposes to this napplet. Omit to install every bundled domain. */
  domains?: readonly NapDomain[];
}

type DomainHandler = (msg: { type: string; [key: string]: unknown }) => void;

const DEFAULT_DOMAINS = new Set<NapDomain>(NAP_DOMAINS);
const installedDomainShims = new Set<NapDomain>();
let messageListenerInstalled = false;

const DOMAIN_ROUTERS: ReadonlyArray<readonly [string, DomainHandler]> = [
  ['keys.', handleKeysMessage],
  ['media.', mediaShim.handleMediaMessage],
  ['notify.', handleNotifyMessage],
  ['resource.', handleResourceMessage],
  ['cvm.', handleCvmMessage],
  ['outbox.', handleOutboxMessage],
  ['upload.', handleUploadMessage],
  ['intent.', handleIntentMessage],
  ['ble.', handleBleMessage],
  ['webrtc.', handleWebrtcMessage],
  ['link.', handleLinkMessage],
  ['lists.', handleListsMessage],
  ['common.', handleCommonMessage],
  ['serial.', handleSerialMessage],
  ['dm.', handleDmMessage],
  ['identity.', identityShim.handleIdentityMessage],
  ['theme.', themeShim.handleThemeMessage],
  ['config.', handleConfigMessage],
];

function handleEnvelopeMessage(event: MessageEvent): void {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;

  const type = msg.type as string;

  if (type === 'inc.event') {
    handleIncEvent(msg as IncEventMessage);
    return;
  }

  const typed = msg as { type: string; [key: string]: unknown };
  for (const [prefix, route] of DOMAIN_ROUTERS) {
    if (type.startsWith(prefix)) {
      route(typed);
      return;
    }
  }
}

function createNappletGlobal(domains: ReadonlySet<NapDomain>): NappletGlobal {
  const napplet: Partial<NappletGlobal> = {};

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

  if (domains.has('resource')) {
    napplet.resource = {
      info: resourceInfo,
      bytes: resourceBytes,
      bytesMany: resourceBytesMany,
      bytesAsObjectURL: resourceBytesAsObjectURL,
    };
  }

  if (domains.has('cvm')) {
    napplet.cvm = {
      discover: cvmDiscover,
      request: cvmRequest,
      listTools: cvmListTools,
      callTool: cvmCallTool,
      listResources: cvmListResources,
      readResource: cvmReadResource,
      close: cvmClose,
      onEvent: cvmOnEvent,
    };
  }

  if (domains.has('outbox')) {
    napplet.outbox = {
      query: outboxQuery,
      subscribe: outboxSubscribe,
      publish: outboxPublish,
      resolveRelays: outboxResolveRelays,
    };
  }

  if (domains.has('upload')) {
    napplet.upload = {
      upload: uploadUpload,
      status: uploadStatusFn,
      onStatus: uploadOnStatus,
    };
  }

  if (domains.has('intent')) {
    napplet.intent = {
      invoke: intentInvoke,
      open: intentOpen,
      available: intentAvailable,
      handlers: intentHandlers,
      onChanged: intentOnChanged,
    };
  }

  if (domains.has('webrtc')) {
    napplet.webrtc = {
      open: webrtcOpen,
      send: webrtcSend,
      close: webrtcClose,
      onEvent: webrtcOnEvent,
    };
  }

  if (domains.has('ble')) {
    napplet.ble = {
      open: bleOpen,
      services: bleServices,
      read: bleRead,
      write: bleWrite,
      subscribe: bleSubscribe,
      unsubscribe: bleUnsubscribe,
      close: bleClose,
      onEvent: bleOnEvent,
    };
  }

  if (domains.has('link')) {
    napplet.link = {
      open: linkOpen,
    };
  }

  if (domains.has('lists')) {
    napplet.lists = {
      supported: listsSupported,
      add: listsAdd,
      remove: listsRemove,
    };
  }

  if (domains.has('common')) {
    napplet.common = {
      encodeNip19: commonEncodeNip19,
      decodeNip19: commonDecodeNip19,
      getProfile: commonGetProfile,
      follows: commonFollows,
      follow: commonFollow,
      unfollow: commonUnfollow,
      react: commonReact,
      report: commonReport,
    };
  }

  if (domains.has('serial')) {
    napplet.serial = {
      open: serialOpen,
      write: serialWrite,
      close: serialClose,
      onEvent: serialOnEvent,
    };
  }

  if (domains.has('dm')) {
    napplet.dm = {
      status: dmStatus,
      conversations: dmConversations,
      messages: dmMessages,
      send: dmSend,
      subscribe: dmSubscribe,
      unsubscribe: dmUnsubscribe,
      onMessage: dmOnMessage,
    };
  }

  return napplet as NappletGlobal;
}

function normalizeDomains(domains?: readonly NapDomain[]): Set<NapDomain> {
  if (!domains) return new Set(DEFAULT_DOMAINS);
  return new Set(domains.filter((domain) => DEFAULT_DOMAINS.has(domain)));
}

function installDomainShim(domain: NapDomain): void {
  if (installedDomainShims.has(domain)) return;
  installedDomainShims.add(domain);

  switch (domain) {
    case 'relay':
      return;
    case 'inc':
      installIncShim();
      return;
    case 'storage':
      installStorageShim();
      return;
    case 'keys':
      installKeysShim();
      return;
    case 'media':
      mediaShim.installMediaShim();
      return;
    case 'notify':
      installNotifyShim();
      return;
    case 'identity':
      identityShim.installIdentityShim();
      return;
    case 'theme':
      themeShim.installThemeShim();
      return;
    case 'config':
      installConfigShim();
      return;
    case 'resource':
      installResourceShim();
      return;
    case 'cvm':
      installCvmShim();
      return;
    case 'outbox':
      installOutboxShim();
      return;
    case 'upload':
      installUploadShim();
      return;
    case 'intent':
      installIntentShim();
      return;
    case 'ble':
      installBleShim();
      return;
    case 'webrtc':
      installWebrtcShim();
      return;
    case 'link':
      installLinkShim();
      return;
    case 'lists':
      installListsShim();
      return;
    case 'serial':
      installSerialShim();
      return;
    case 'common':
      installCommonShim();
      return;
    case 'dm':
      installDmShim();
      return;
  }
}

/**
 * Install the runtime-provided `window.napplet` namespace.
 *
 * Runtimes call this before any napplet script executes. Domain properties are
 * only present when the runtime exposes that NAP to the napplet.
 */
export function installNappletGlobal(options: NappletShimInstallOptions = {}): NappletGlobal {
  const domains = normalizeDomains(options.domains);
  const napplet = createNappletGlobal(domains);

  (window as Window & typeof globalThis & { napplet: NappletGlobal }).napplet = napplet;

  if (!messageListenerInstalled) {
    window.addEventListener('message', handleEnvelopeMessage);
    messageListenerInstalled = true;
  }

  for (const domain of domains) {
    installDomainShim(domain);
  }

  return napplet;
}

installNappletGlobal();
