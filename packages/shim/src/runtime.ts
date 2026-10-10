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
  ['shell.', handleShellMessage],
  ['keys.', handleKeysMessage],
  ['media.', mediaShim.handleMediaMessage],
  ['notify.', handleNotifyMessage],
  ['resource.', handleResourceMessage],
  ['cvm.', handleCvmMessage],
  ['outbox.', handleOutboxMessage],
  ['upload.', handleUploadMessage],
  ['intent.', handleIntentMessage],
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

function handleEnvelopeMessage(event: MessageEvent): void {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') return;

  const typed = msg as { type: string; [key: string]: unknown };
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

function installDomainShim(domain: NapDomain): void {
  if (installedDomainShims.has(domain)) return;
  installedDomainShims.add(domain);

  switch (domain) {
    case 'shell':
      installShellShim();
      return;
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
    case 'count':
      installCountShim();
      return;
    case 'lists':
      installListsShim();
      return;
    case 'serial':
      installSerialShim();
      return;
    case 'fs':
      installFsShim();
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
