
import { installKeysShim, handleKeysMessage, registerAction, unregisterAction, onAction } from '@napplet/nap/keys/shim';
import {
  installMediaShim,
  handleMediaMessage,
  createSession,
  updateSession,
  destroySession,
  reportState,
  reportCapabilities,
  sendCommand,
  onCommand,
  onState,
  onCapabilities,
  onControls,
} from '@napplet/nap/media/shim';
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
import { installNostrDb } from './nipdb-shim.js';
import { installStorageShim, nappletStorage } from '@napplet/nap/storage/shim';
import { subscribe, publish, publishEncrypted, query } from '@napplet/nap/relay/shim';
import * as identityShim from '@napplet/nap/identity/shim';
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
  bytes as resourceBytes,
  bytesAsObjectURL as resourceBytesAsObjectURL,
} from '@napplet/nap/resource/shim';
import { installConnectShim } from '@napplet/nap/connect/shim';
import { installClassShim, handleClassMessage } from '@napplet/nap/class/shim';
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
import { NAP_DOMAINS, type NappletGlobal, type NamespacedCapability, type ProtocolId } from '@napplet/core';
import type { IncEventMessage } from '@napplet/nap/inc/types';

interface ShellInitMessage {
  type: 'shell.init';
  capabilities?: {
    naps?: unknown;
    sandbox?: unknown;
  };
}

/**
 * Central message handler for JSON envelope messages from the shell.
 * Routes messages to appropriate handlers based on type prefix.
 */
function handleEnvelopeMessage(event: MessageEvent): void {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;

  const type = msg.type as string;

  if (type === 'shell.init') {
    installShellCapabilities(msg as ShellInitMessage);
    return;
  }

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

  // Route cvm.* messages to ContextVM shim (discover/request/close results + cvm.event)
  if (type.startsWith('cvm.')) {
    handleCvmMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route outbox.* messages to outbox shim (query/publish/resolveRelays results + event/eose/closed)
  if (type.startsWith('outbox.')) {
    handleOutboxMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route upload.* messages to upload shim (upload/status results + status.changed pushes)
  if (type.startsWith('upload.')) {
    handleUploadMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route intent.* messages to intent shim (invoke/available/handlers results + intent.changed pushes)
  if (type.startsWith('intent.')) {
    handleIntentMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route identity.* result and push messages to identity shim
  if (type.startsWith('identity.')) {
    identityShim.handleIdentityMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route config.* messages to config shim
  //   (handles config.registerSchema.result, config.values, and config.schemaError internally)
  if (type.startsWith('config.')) {
    handleConfigMessage(msg as { type: string; [key: string]: unknown });
    return;
  }

  // Route INC event messages to topic handlers
  if (type === 'inc.event') {
    handleIncEvent(msg as IncEventMessage);
    return;
  }
}

installIncShim();

function defaultShellSupports(capability: NamespacedCapability, protocol?: ProtocolId): boolean {
  if (protocol !== undefined) return false;

  // perm:* — shell-granted only; nothing for the shim to assert.
  if (typeof capability === 'string' && capability.startsWith('perm:')) return false;

  const domain = normalizeCapabilityDomain(capability);

  // Bare NAP shorthand (e.g. 'relay') or prefixed nap: capabilities.
  return (NAP_DOMAINS as readonly string[]).includes(domain);
}

function normalizeCapabilityDomain(capability: string): string {
  if (capability.startsWith('nap:')) {
    return capability.slice(4);
  }
  return capability;
}

function normalizeProtocol(protocol: ProtocolId | undefined): string | undefined {
  const upper = protocol?.toUpperCase();
  if (!upper) return undefined;
  return upper.startsWith('NAP-') ? `NAP-${upper.slice(4)}` : upper;
}

function listCapabilityNames(capabilities: ShellInitMessage['capabilities']): string[] {
  return [
    ...(Array.isArray(capabilities?.naps) ? capabilities.naps : []),
  ].filter((capability): capability is string => typeof capability === 'string');
}

function createShellSupports(capabilities: ShellInitMessage['capabilities']): (capability: NamespacedCapability, protocol?: ProtocolId) => boolean {
  const naps = new Set(
    listCapabilityNames(capabilities)
      .map(normalizeCapabilityDomain),
  );
  const protocols = new Set<string>();

  for (const capability of naps) {
    const match = /^([^:]+):(NAP-\d+)$/i.exec(capability);
    if (!match) continue;
    const [, domain, protocol] = match;
    protocols.add(`${domain}:${normalizeProtocol(protocol as ProtocolId)}`);
    naps.add(domain);
  }

  const sandbox = new Set(
    Array.isArray(capabilities?.sandbox)
      ? capabilities.sandbox.filter((capability): capability is string => typeof capability === 'string')
      : [],
  );

  return (capability: NamespacedCapability, protocol?: ProtocolId): boolean => {
    if (typeof capability !== 'string') return false;
    if (protocol !== undefined) {
      const normalizedProtocol = normalizeProtocol(protocol);
      if (capability.startsWith('perm:') || !normalizedProtocol) return false;
      const domain = normalizeCapabilityDomain(capability);
      return protocols.has(`${domain}:${normalizedProtocol}`);
    }
    if (capability.startsWith('perm:')) return sandbox.has(capability);
    return naps.has(normalizeCapabilityDomain(capability));
  };
}

function installShellCapabilities(msg: ShellInitMessage): void {
  const napplet = (window as Window & typeof globalThis & { napplet?: NappletGlobal }).napplet;
  if (!napplet) return;
  napplet.shell.supports = createShellSupports(msg.capabilities);
}

(window as Window & typeof globalThis & { napplet: NappletGlobal }).napplet = {
  relay: {
    subscribe,
    publish,
    publishEncrypted,
    query,
  },
  inc: {
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
    sendCommand,
    onCommand,
    onState,
    onCapabilities,
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
    onChanged: identityShim.onChanged,
    getRelays: identityShim.getRelays,
    getProfile: identityShim.getProfile,
    getFollows: identityShim.getFollows,
    getList: identityShim.getList,
    getZaps: identityShim.getZaps,
    getMutes: identityShim.getMutes,
    getBlocked: identityShim.getBlocked,
    getBadges: identityShim.getBadges,
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
  cvm: {
    discover: cvmDiscover,
    request: cvmRequest,
    listTools: cvmListTools,
    callTool: cvmCallTool,
    listResources: cvmListResources,
    readResource: cvmReadResource,
    close: cvmClose,
    onEvent: cvmOnEvent,
  },
  outbox: {
    query: outboxQuery,
    subscribe: outboxSubscribe,
    publish: outboxPublish,
    resolveRelays: outboxResolveRelays,
  },
  upload: {
    upload: uploadUpload,
    status: uploadStatusFn,
    onStatus: uploadOnStatus,
  },
  intent: {
    invoke: intentInvoke,
    open: intentOpen,
    available: intentAvailable,
    handlers: intentHandlers,
    onChanged: intentOnChanged,
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
window.parent.postMessage({ type: 'shell.ready' }, '*');

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

// Install ContextVM shim (cvm.* request/response correlation + cvm.event listeners; no install-time work)
installCvmShim();

// Install outbox shim (outbox.* request/response correlation + subscription event streaming; no install-time work)
installOutboxShim();

// Install upload shim (upload.* request/response correlation + status.changed listeners; no install-time work)
installUploadShim();

// Install intent shim (intent.* request/response correlation + intent.changed listeners; no install-time work)
installIntentShim();

// Install class shim (mounts window.napplet.class readonly getter; undefined until class.assigned arrives)
installClassShim();

// Install connect shim (reads <meta name="napplet-connect-granted">; replaces literal's connect field with defineProperty getter)
installConnectShim();
