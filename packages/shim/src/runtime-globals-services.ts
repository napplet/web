import type { NapDomain, NappletGlobal } from '@napplet/core';
import {
  info as resourceInfo,
  bytes as resourceBytes,
  bytesMany as resourceBytesMany,
  bytesAsObjectURL as resourceBytesAsObjectURL,
} from '@napplet/nap/resource/shim';
import {
  discover as cvmDiscover,
  request as cvmRequest,
  listTools as cvmListTools,
  callTool as cvmCallTool,
  listResources as cvmListResources,
  readResource as cvmReadResource,
  close as cvmClose,
  onEvent as cvmOnEvent,
  registryList as cvmRegistryList,
  registryHas as cvmRegistryHas,
  registryDescribe as cvmRegistryDescribe,
  registryCall as cvmRegistryCall,
} from '@napplet/nap/cvm/shim';
import {
  getEvent as outboxGetEvent,
  query as outboxQuery,
  subscribe as outboxSubscribe,
  publish as outboxPublish,
  resolveRelays as outboxResolveRelays,
} from '@napplet/nap/outbox/shim';
import {
  info as uploadInfo,
  upload as uploadUpload,
  status as uploadStatusFn,
  onStatus as uploadOnStatus,
} from '@napplet/nap/upload/shim';
import {
  invoke as intentInvoke,
  open as intentOpen,
  available as intentAvailable,
  handlers as intentHandlers,
  onChanged as intentOnChanged,
  onDelivery as intentOnDelivery,
} from '@napplet/nap/intent/shim';
import {
  open as webrtcOpen,
  send as webrtcSend,
  close as webrtcClose,
  onEvent as webrtcOnEvent,
} from '@napplet/nap/webrtc/shim';
import {
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
  open as linkOpen,
} from '@napplet/nap/link/shim';
import {
  query as countQuery,
} from '@napplet/nap/count/shim';
import {
  supported as listsSupported,
  add as listsAdd,
  remove as listsRemove,
} from '@napplet/nap/lists/shim';
import {
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
  open as serialOpen,
  write as serialWrite,
  close as serialClose,
  onEvent as serialOnEvent,
} from '@napplet/nap/serial/shim';
import {
  info as fsInfo,
  pickFile as fsPickFile,
  pickFiles as fsPickFiles,
  pickDirectory as fsPickDirectory,
  pickSaveFile as fsPickSaveFile,
  stat as fsStat,
  list as fsList,
  read as fsRead,
  write as fsWrite,
  mkdir as fsMkdir,
  remove as fsRemove,
  move as fsMove,
  watch as fsWatch,
  unwatch as fsUnwatch,
  onChanged as fsOnChanged,
} from '@napplet/nap/fs/shim';
import {
  status as dmStatus,
  conversations as dmConversations,
  messages as dmMessages,
  send as dmSend,
  subscribe as dmSubscribe,
  unsubscribe as dmUnsubscribe,
  onMessage as dmOnMessage,
} from '@napplet/nap/dm/shim';


export function installServiceDomains(domains: ReadonlySet<NapDomain>, napplet: Partial<NappletGlobal>): void {
  installNetworkDomains(domains, napplet);
  installDeviceDomains(domains, napplet);
  installFilesystemDomains(domains, napplet);
}

function installNetworkDomains(domains: ReadonlySet<NapDomain>, napplet: Partial<NappletGlobal>): void {
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
      registry: {
        list: cvmRegistryList,
        has: cvmRegistryHas,
        describe: cvmRegistryDescribe,
        call: cvmRegistryCall,
      },
    };
  }

  if (domains.has('outbox')) {
    napplet.outbox = {
      getEvent: outboxGetEvent,
      query: outboxQuery,
      subscribe: outboxSubscribe,
      publish: outboxPublish,
      resolveRelays: outboxResolveRelays,
    };
  }

  if (domains.has('upload')) {
    napplet.upload = {
      info: uploadInfo,
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
      onDelivery: intentOnDelivery,
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
}

function installDeviceDomains(domains: ReadonlySet<NapDomain>, napplet: Partial<NappletGlobal>): void {
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

  if (domains.has('count')) {
    napplet.count = {
      query: countQuery,
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
}

function installFilesystemDomains(domains: ReadonlySet<NapDomain>, napplet: Partial<NappletGlobal>): void {
  if (domains.has('fs')) {
    napplet.fs = {
      info: fsInfo,
      pickFile: fsPickFile,
      pickFiles: fsPickFiles,
      pickDirectory: fsPickDirectory,
      pickSaveFile: fsPickSaveFile,
      stat: fsStat,
      list: fsList,
      read: fsRead,
      write: fsWrite,
      mkdir: fsMkdir,
      remove: fsRemove,
      move: fsMove,
      watch: fsWatch,
      unwatch: fsUnwatch,
      onChanged: fsOnChanged,
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
}
