import { installLlmShim, handleLlmMessage } from '@napplet/nap/llm/shim';
import { installBlossomShim, handleBlossomMessage } from '@napplet/nap/blossom/shim';
import { installCatalogShim, handleCatalogMessage } from '@napplet/nap/catalog/shim';
import { installTorrentShim, handleTorrentMessage } from '@napplet/nap/torrent/shim';
import { installGamepadShim, handleGamepadMessage } from '@napplet/nap/gamepad/shim';
import { installNavigationShim, handleNavigationMessage } from '@napplet/nap/navigation/shim';
import { handleShellMessage, installShellShim } from '@napplet/nap/shell/shim';
import {
  NAP_DOMAINS,
} from '@napplet/core';
import type {
  NapDomain,
  NappletGlobal,
} from '@napplet/core';
import {
  installKeysShim,
  handleKeysMessage,
} from '@napplet/nap/keys/shim';
import * as mediaShim from '@napplet/nap/media/shim';
import {
  installNotifyShim,
  handleNotifyMessage,
} from '@napplet/nap/notify/shim';
import {
  installStorageShim,
} from '@napplet/nap/storage/shim';
import * as identityShim from '@napplet/nap/identity/shim';
import * as themeShim from '@napplet/nap/theme/shim';
import {
  installIncShim,
  handleIncMessage,
} from '@napplet/nap/inc/shim';
import {
  installConfigShim,
  handleConfigMessage,
} from '@napplet/nap/config/shim';
import {
  installResourceShim,
  handleResourceMessage,
} from '@napplet/nap/resource/shim';
import {
  installCvmShim,
  handleCvmMessage,
} from '@napplet/nap/cvm/shim';
import {
  installOutboxShim,
  handleOutboxMessage,
} from '@napplet/nap/outbox/shim';
import {
  installUploadShim,
  handleUploadMessage,
} from '@napplet/nap/upload/shim';
import {
  installIntentShim,
  handleIntentMessage,
} from '@napplet/nap/intent/shim';
import {
  installWebrtcShim,
  handleWebrtcMessage,
} from '@napplet/nap/webrtc/shim';
import {
  installBleShim,
  handleBleMessage,
} from '@napplet/nap/ble/shim';
import {
  installLinkShim,
  handleLinkMessage,
} from '@napplet/nap/link/shim';
import {
  installCountShim,
  handleCountMessage,
} from '@napplet/nap/count/shim';
import {
  installListsShim,
  handleListsMessage,
} from '@napplet/nap/lists/shim';
import {
  installCommonShim,
  handleCommonMessage,
} from '@napplet/nap/common/shim';
import {
  installSerialShim,
  handleSerialMessage,
} from '@napplet/nap/serial/shim';
import {
  installFsShim,
  handleFsMessage,
} from '@napplet/nap/fs/shim';
import {
  installDmShim,
  handleDmMessage,
} from '@napplet/nap/dm/shim';
import { connectShell, onShellMessage, type ShellMessage } from '@napplet/nap/boundary';
import { createNappletGlobal } from './runtime-globals.js';

export interface NappletShimInstallOptions {
  /** Domains the runtime exposes to this napplet. Omit to install every bundled domain. */
  domains?: readonly NapDomain[];
}

type DomainHandler = (msg: { type: string; [key: string]: unknown }) => void;

const DEFAULT_DOMAINS = new Set<NapDomain>(NAP_DOMAINS);
const installedDomainShims = new Set<NapDomain>();
let messageListenerInstalled = false;

const DOMAIN_ROUTERS: ReadonlyArray<readonly [string, DomainHandler]> = [
  ['llm.', handleLlmMessage],
  ['blossom.', handleBlossomMessage],
  ['catalog.', handleCatalogMessage],
  ['torrent.', handleTorrentMessage],
  ['gamepad.', handleGamepadMessage],
  ['shell.', handleShellMessage],
  ['keys.', handleKeysMessage],
  ['media.', mediaShim.handleMediaMessage],
  ['notify.', handleNotifyMessage],
  ['resource.', handleResourceMessage],
  ['cvm.', handleCvmMessage],
  ['outbox.', handleOutboxMessage],
  ['upload.', handleUploadMessage],
  ['intent.', handleIntentMessage],
  ['navigation.', handleNavigationMessage],
  ['inc.', handleIncMessage],
  ['ble.', handleBleMessage],
  ['webrtc.', handleWebrtcMessage],
  ['link.', handleLinkMessage],
  ['count.', handleCountMessage],
  ['lists.', handleListsMessage],
  ['common.', handleCommonMessage],
  ['serial.', handleSerialMessage],
  ['fs.', handleFsMessage],
  ['dm.', handleDmMessage],
  ['identity.', identityShim.handleIdentityMessage],
  ['theme.', themeShim.handleThemeMessage],
  ['config.', handleConfigMessage],
];

function handleEnvelopeMessage(typed: ShellMessage): void {
  const type = typed.type;
  for (const [prefix, route] of DOMAIN_ROUTERS) {
    const domain = prefix.slice(0, -1) as NapDomain;
    if (type.startsWith(prefix) && (window as Window & { napplet?: NappletGlobal }).napplet?.[domain]) {
      route(typed);
      return;
    }
  }
}

function normalizeDomains(domains?: readonly NapDomain[]): Set<NapDomain> {
  if (!domains) return new Set(DEFAULT_DOMAINS);
  return new Set(domains.filter((domain) => DEFAULT_DOMAINS.has(domain)));
}

/** Per-domain shim installers; `relay` needs no installer beyond the shared router. */
const DOMAIN_SHIM_INSTALLERS: Readonly<Record<NapDomain, () => void>> = {
  llm: () => { installLlmShim(); },
  blossom: () => { installBlossomShim(); },
  catalog: () => { installCatalogShim(); },
  torrent: () => { installTorrentShim(); },
  gamepad: () => { installGamepadShim(); },
  shell: () => { installShellShim(); },
  relay: () => undefined,
  inc: () => { installIncShim(); },
  storage: () => { installStorageShim(); },
  keys: () => { installKeysShim(); },
  media: () => { mediaShim.installMediaShim(); },
  notify: () => { installNotifyShim(); },
  identity: () => { identityShim.installIdentityShim(); },
  theme: () => { themeShim.installThemeShim(); },
  config: () => { installConfigShim(); },
  resource: () => { installResourceShim(); },
  cvm: () => { installCvmShim(); },
  outbox: () => { installOutboxShim(); },
  upload: () => { installUploadShim(); },
  intent: () => { installIntentShim(); },
  navigation: () => { installNavigationShim(); },
  ble: () => { installBleShim(); },
  webrtc: () => { installWebrtcShim(); },
  link: () => { installLinkShim(); },
  count: () => { installCountShim(); },
  lists: () => { installListsShim(); },
  serial: () => { installSerialShim(); },
  fs: () => { installFsShim(); },
  common: () => { installCommonShim(); },
  dm: () => { installDmShim(); },
};

function installDomainShim(domain: NapDomain): void {
  if (installedDomainShims.has(domain)) return;
  installedDomainShims.add(domain);
  DOMAIN_SHIM_INSTALLERS[domain]();
}

/**
 * Install the runtime-provided `window.napplet` namespace.
 *
 * Runtimes call this before any napplet script executes. It opens the NIP-5D
 * channel first: a `MessageChannel` whose private port carries every NAP
 * message, with the other port handed to the shell once in `napplet.hello`.
 * Domain properties are only present when the runtime exposes that NAP to the
 * napplet.
 */
export function installNappletGlobal(options: NappletShimInstallOptions = {}): NappletGlobal {
  connectShell();
  const domains = normalizeDomains(options.domains);
  const napplet = createNappletGlobal(domains);

  (window as Window & typeof globalThis & { napplet: NappletGlobal }).napplet = napplet;

  if (!messageListenerInstalled) {
    onShellMessage(handleEnvelopeMessage);
    messageListenerInstalled = true;
  }

  for (const domain of domains) {
    installDomainShim(domain);
  }

  return napplet;
}
