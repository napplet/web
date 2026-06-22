
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
import { installNostrDb } from './nipdb-shim.js';
import { installRuntimeGuard, markRuntimePresent } from './runtime-guard.js';
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
  bytes as resourceBytes,
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
import { sendEnvelope } from '@napplet/core';
import type { NappletGlobal, NappletShell, ShellEnvironment, ShellInitMessage } from '@napplet/core';
import { createShellEnvironment, makeSupports, defaultSupports } from '@napplet/nap/shell/shim';
import type { IncEventMessage } from '@napplet/nap/inc/types';

// ── NAP-SHELL handshake state (foundational; mandatory) ──────────────────────
// The shim posts shell.ready, the runtime replies once with shell.init, and we
// cache that environment so window.napplet.shell.supports() answers locally.
let currentEnv: ShellEnvironment | null = null;
const readyResolvers: Array<(env: ShellEnvironment) => void> = [];
const onReadyHandlers = new Set<(env: ShellEnvironment) => void>();

/**
 * Handle the first `shell.init`. Idempotent: a duplicate is ignored (first wins)
 * per the NAP-SHELL "exactly once" + idempotent-readiness rule.
 */
function handleShellInit(msg: ShellInitMessage): void {
  if (currentEnv) return; // first init wins
  const env = createShellEnvironment(msg);
  currentEnv = env;

  const napplet = (window as Window & typeof globalThis & { napplet?: NappletGlobal }).napplet;
  if (napplet) {
    const shell = napplet.shell as NappletShell & {
      supports: NappletShell['supports'];
      services: readonly string[];
    };
    shell.supports = makeSupports(env);
    shell.services = env.services;
  }

  // Resolve all pending ready() promises and fire each onReady handler once.
  for (const resolve of readyResolvers.splice(0)) resolve(env);
  for (const handler of onReadyHandlers) handler(env);
  onReadyHandlers.clear();
}

/** `window.napplet.shell.ready()` — resolve now if delivered, else queue. */
function shellReady(): Promise<ShellEnvironment> {
  if (currentEnv) return Promise.resolve(currentEnv);
  return new Promise<ShellEnvironment>((resolve) => {
    readyResolvers.push(resolve);
  });
}

/** `window.napplet.shell.onReady()` — fire now if delivered, else register once. */
function shellOnReady(handler: (env: ShellEnvironment) => void): { close(): void } {
  if (currentEnv) {
    handler(currentEnv);
    return { close() { /* already fired */ } };
  }
  onReadyHandlers.add(handler);
  let closed = false;
  return {
    close() {
      if (closed) return;
      closed = true;
      onReadyHandlers.delete(handler);
    },
  };
}

/**
 * Central message handler for JSON envelope messages from the shell.
 * Routes messages to appropriate handlers based on type prefix.
 */
type DomainHandler = (msg: { type: string; [key: string]: unknown }) => void;

// Domain prefix -> shim handler. Each NAP routes its own `<domain>.*` result
// and push messages; prefixes are mutually exclusive so order is irrelevant.
const DOMAIN_ROUTERS: ReadonlyArray<readonly [string, DomainHandler]> = [
  ['keys.', handleKeysMessage],
  ['media.', mediaShim.handleMediaMessage],
  ['notify.', handleNotifyMessage],
  ['resource.', handleResourceMessage],
  ['cvm.', handleCvmMessage],
  ['outbox.', handleOutboxMessage],
  ['upload.', handleUploadMessage],
  ['intent.', handleIntentMessage],
  ['common.', handleCommonMessage],
  ['serial.', handleSerialMessage],
  ['identity.', identityShim.handleIdentityMessage],
  ['theme.', themeShim.handleThemeMessage],
  ['config.', handleConfigMessage],
];

function handleEnvelopeMessage(event: MessageEvent): void {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;

  // A valid envelope from the parent proves a runtime is on the other side;
  // cancel the runtime guard so it never fires for an embedded napplet.
  markRuntimePresent();

  const type = msg.type as string;

  if (type === 'shell.init') {
    handleShellInit(msg as ShellInitMessage);
    return;
  }

  // INC events fan out to topic handlers (exact match, not a domain prefix).
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

installIncShim();

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
    instance: {
      getItem: nappletStorage.instance.getItem.bind(nappletStorage.instance),
      setItem: nappletStorage.instance.setItem.bind(nappletStorage.instance),
      removeItem: nappletStorage.instance.removeItem.bind(nappletStorage.instance),
      keys: nappletStorage.instance.keys.bind(nappletStorage.instance),
    },
  },
  keys: {
    registerAction,
    unregisterAction,
    onAction,
  },
  media: {
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
  theme: {
    get: themeShim.get,
    onChanged: themeShim.onChanged,
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
  common: {
    encodeNip19: commonEncodeNip19,
    decodeNip19: commonDecodeNip19,
    getProfile: commonGetProfile,
    follows: commonFollows,
    follow: commonFollow,
    unfollow: commonUnfollow,
    react: commonReact,
    report: commonReport,
  },
  serial: {
    open: serialOpen,
    write: serialWrite,
    close: serialClose,
    onEvent: serialOnEvent,
  },
  shell: {
    supports: defaultSupports,
    services: [],
    ready: shellReady,
    onReady: shellOnReady,
  },
};

// Install central envelope message listener
window.addEventListener('message', handleEnvelopeMessage);
sendEnvelope(window.parent, { type: 'shell.ready' });

// Arm the runtime guard: if no runtime answers the handshake (e.g. this napplet
// was opened directly from a NIP-5A nsite gateway), surface a clear error modal
// instead of silently failing. Must run after shell.ready is posted above.
installRuntimeGuard();

// Install window.nostrdb NIP-DB proxy
installNostrDb();

// Install keys shim (smart forwarding + action keybindings)
installKeysShim();

// Install media shim (session management + command handlers)
mediaShim.installMediaShim();

// Install notify shim (notification sending + interaction handlers)
installNotifyShim();

// Install napplet-side storage proxy
installStorageShim();

// Install identity shim (read-only user identity queries)
identityShim.installIdentityShim();

// Install theme shim (read-only shell theme access; theme.get + theme.changed)
themeShim.installThemeShim();

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

// Install common shim (common.* request/response correlation; no install-time work)
installCommonShim();
// Install serial shim (serial.* request/response correlation + serial.event listeners; no install-time work)
installSerialShim();
