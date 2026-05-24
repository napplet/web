
import { installKeysShim, handleKeysMessage, registerAction, unregisterAction, onAction } from '@napplet/nub/keys/shim';
import { installMediaShim, handleMediaMessage, createSession, updateSession, destroySession, reportState, reportCapabilities, onCommand, onControls } from '@napplet/nub/media/shim';
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
} from '@napplet/nub/notify/shim';
import { installNostrDb } from './nipdb-shim.js';
import { installStorageShim, nappletStorage } from '@napplet/nub/storage/shim';
import { subscribe, publish, publishEncrypted, query } from '@napplet/nub/relay/shim';
import * as identityShim from '@napplet/nub/identity/shim';
import { installIfcShim, emit, on, handleIfcEvent } from '@napplet/nub/ifc/shim';
import {
  installConfigShim,
  handleConfigMessage,
  registerSchema as configRegisterSchema,
  get as configGet,
  subscribe as configSubscribe,
  openSettings as configOpenSettings,
  onSchemaError as configOnSchemaError,
} from '@napplet/nub/config/shim';
import {
  installResourceShim,
  handleResourceMessage,
  bytes as resourceBytes,
  bytesAsObjectURL as resourceBytesAsObjectURL,
} from '@napplet/nub/resource/shim';
import { installConnectShim } from '@napplet/nub/connect/shim';
import { installClassShim, handleClassMessage } from '@napplet/nub/class/shim';
import { NUB_DOMAINS, type NappletGlobal, type NamespacedCapability } from "@napplet/core";
import type { IfcEventMessage } from '@napplet/nub/ifc/types';

/**
 * Central message handler for JSON envelope messages from the shell.
 * Routes messages to appropriate handlers based on type prefix.
 */
function handleEnvelopeMessage(event: MessageEvent): void {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;

  const type = msg.type as string;

  // Route keys.* messages to keys shim
  if (type.startsWith('keys.')) {
    handleKeysMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route media.* messages to media shim
  if (type.startsWith('media.')) {
    handleMediaMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route notify.* messages to notify shim
  if (type.startsWith('notify.')) {
    handleNotifyMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route resource.* messages to resource shim (covers resource.bytes.result + resource.bytes.error)
  if (type.startsWith('resource.')) {
    handleResourceMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route class.* messages to class shim (covers class.assigned)
  if (type.startsWith('class.')) {
    handleClassMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route identity.* result and error messages to identity shim
  if (type.startsWith('identity.') && (type.endsWith('.result') || type.endsWith('.error'))) {
    identityShim.handleIdentityMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route config.* messages to config shim
  //   (handles config.registerSchema.result, config.values, and config.schemaError internally)
  if (type.startsWith('config.')) {
    handleConfigMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route IFC event messages to topic handlers
  if (type === 'ifc.event') {
    handleIfcEvent(msg as IfcEventMessage);
    return;
  }
}

installIfcShim();

function defaultShellSupports(capability: NamespacedCapability): boolean {
  // perm:* — shell-granted only; nothing for the shim to assert.
  if (typeof capability === 'string' && capability.startsWith('perm:')) return false;

  // 'nub:<domain>' — strip the prefix and check the domain list.
  if (typeof capability === 'string' && capability.startsWith('nub:')) {
    const domain = capability.slice(4);
    return (NUB_DOMAINS as readonly string[]).includes(domain);
  }

  // Bare NUB shorthand (e.g. 'relay').
  return (NUB_DOMAINS as readonly string[]).includes(capability);
}

(window as unknown as { napplet: NappletGlobal }).napplet = {
  relay: {
    subscribe,
    publish,
    publishEncrypted,
    query,
  },
  ifc: {
    emit,
    on,
  },
  storage: {
    getItem: nappletStorage.getItem.bind(nappletStorage),
    setItem: nappletStorage.setItem.bind(nappletStorage),
    removeItem: nappletStorage.removeItem.bind(nappletStorage),
    keys: nappletStorage.keys.bind(nappletStorage),
  },
  keys: {
    registerAction,
    unregisterAction,
    onAction,
  },
  media: {
    createSession,
    updateSession,
    destroySession,
    reportState,
    reportCapabilities,
    onCommand,
    onControls,
  },
  notify: {
    send: notifySend,
    dismiss: notifyDismiss,
    badge: notifyBadge,
    registerChannel: notifyRegisterChannel,
    requestPermission: notifyRequestPermission,
    onAction: notifyOnAction,
    onClicked: notifyOnClicked,
    onDismissed: notifyOnDismissed,
    onControls: notifyOnControls,
  },
  identity: {
    getPublicKey: identityShim.getPublicKey,
    getRelays: identityShim.getRelays,
    getProfile: identityShim.getProfile,
    getFollows: identityShim.getFollows,
    getList: identityShim.getList,
    getZaps: identityShim.getZaps,
    getMutes: identityShim.getMutes,
    getBlocked: identityShim.getBlocked,
    getBadges: identityShim.getBadges,
    decrypt: identityShim.decrypt,
  },
  config: {
    registerSchema: configRegisterSchema,
    get: configGet,
    subscribe: configSubscribe,
    openSettings: configOpenSettings,
    onSchemaError: configOnSchemaError,
    schema: null,
  },
  resource: {
    bytes: resourceBytes,
    bytesAsObjectURL: resourceBytesAsObjectURL,
  },
  connect: {
    granted: false,
    origins: [],
  },
  shell: {
    supports: defaultShellSupports,
  },
};

// Install central envelope message listener
window.addEventListener('message', handleEnvelopeMessage);

// Install window.nostrdb NIP-DB proxy
installNostrDb();

// Install keys shim (smart forwarding + action keybindings)
installKeysShim();

// Install media shim (session management + command handlers)
installMediaShim();

// Install notify shim (notification sending + interaction handlers)
installNotifyShim();

// Install napplet-side storage proxy
installStorageShim();

// Install identity shim (read-only user identity queries)
identityShim.installIdentityShim();

// Install config shim (manifest-meta schema read + window.napplet.config mount with readonly `schema` getter)
installConfigShim();

// Install resource shim (single-flight cache for byte fetches; no install-time work)
installResourceShim();

// Install class shim (mounts window.napplet.class readonly getter; undefined until class.assigned arrives)
installClassShim();

// Install connect shim (reads <meta name="napplet-connect-granted">; replaces literal's connect field with defineProperty getter)
installConnectShim();
