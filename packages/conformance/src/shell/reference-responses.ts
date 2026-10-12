/** A 64-hex reference user pubkey the shell reports for identity queries. */
export const REFERENCE_PUBKEY: string = 'f'.repeat(64);

/** A source identity supplied by the reference runtime's authenticated endpoint fixture. */
export interface ReferenceEndpoint {
  /** Authenticated running endpoint identifier. */
  id: string;
  /** Verified source catalog identifier. */
  catalogId: string;
  /** Exposed domains; omitted by the default all-domain fixture. */
  domains?: readonly string[];
}

/** Default authenticated reference endpoint. */
export const REFERENCE_ENDPOINT: ReferenceEndpoint = { id: 'reference-source-endpoint', catalogId: 'reference-source' };

/** A placeholder blob URL for canned upload responses. `.invalid` is reserved (RFC 2606) and never resolves. */
const REFERENCE_BLOB_URL = 'https://reference.invalid/blob';
export const REFERENCE_HANDLER = `named:${REFERENCE_PUBKEY}:reference-handler`;
export const REFERENCE_MANIFEST = { kind: 35129 as const, pubkey: REFERENCE_PUBKEY, id: '0'.repeat(64), tags: [['d', 'reference-handler'], ['z', 'note'], ['i', 'napplet:note/open', 'event']] };
export const REFERENCE_SUBSCRIBER = 'reference-subscriber';
export const REFERENCE_CONVENTION = 'napplet:note/open';

function pickResult(
  type: 'fs.pickFile.result' | 'fs.pickFiles.result' | 'fs.pickDirectory.result' | 'fs.pickSaveFile.result',
  id: unknown,
  entry: {
    path: string;
    kind: 'file' | 'directory';
    name: string;
    permissions: string[];
  },
) {
  return ok({ type, id, result: { entries: [entry] } });
}


/** A function that produces response envelopes for one outbound request. */
type Responder = (env: Record<string, unknown>) => unknown[];

export const ok = <T extends Record<string, unknown>>(v: T): T[] => [v];
const none: Responder = () => [];

function dataUrlToBlob(url: unknown): { blob: Blob; mime: string } | null {
  if (typeof url !== 'string' || !url.startsWith('data:')) return null;

  const comma = url.indexOf(',');
  if (comma < 0) {
    return { blob: new Blob([], { type: 'text/plain' }), mime: 'text/plain' };
  }

  const meta = url.slice('data:'.length, comma);
  const body = url.slice(comma + 1);
  const parts = meta.split(';').filter(Boolean);
  const base64 = parts.includes('base64');
  const mime = parts.find((part) => part.includes('/')) ?? 'text/plain';

  try {
    if (base64) {
      const binary = globalThis.atob(body);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return { blob: new Blob([bytes], { type: mime }), mime };
    }
    return { blob: new Blob([decodeURIComponent(body)], { type: mime }), mime };
  } catch {
    return null;
  }
}

/**
 * Spec-valid canned responders keyed by outbound `type`. Each echoes the
 * correlation `id`/`subId` so the napplet's pending promise resolves. Payloads are
 * benign but structurally plausible — conformance validates the napplet's emitted
 * envelopes, not the shell's responses.
 */
export const RESPONDERS: Record<string, Responder> = {
  // relay
  'relay.subscribe': (e) => ok({ type: 'relay.eose', subId: e.subId }),
  'relay.close': none,
  'relay.publish': (e) => ok({ type: 'relay.publish.result', id: e.id, ok: true, event: e.event }),
  'relay.publishEncrypted': (e) => ok({ type: 'relay.publishEncrypted.result', id: e.id, ok: true, event: e.event }),
  'relay.query': (e) => ok({ type: 'relay.query.result', id: e.id, events: [] }),

  // identity
  'identity.getPublicKey': (e) => ok({ type: 'identity.getPublicKey.result', id: e.id, pubkey: REFERENCE_PUBKEY }),
  'identity.getRelays': (e) => ok({ type: 'identity.getRelays.result', id: e.id, relays: {} }),
  'identity.getProfile': (e) => ok({ type: 'identity.getProfile.result', id: e.id, profile: null }),
  'identity.getFollows': (e) => ok({ type: 'identity.getFollows.result', id: e.id, pubkeys: [] }),
  'identity.getList': (e) => ok({ type: 'identity.getList.result', id: e.id, entries: [] }),
  'identity.getZaps': (e) => ok({ type: 'identity.getZaps.result', id: e.id, zaps: [] }),
  'identity.getMutes': (e) => ok({ type: 'identity.getMutes.result', id: e.id, pubkeys: [] }),
  'identity.getBlocked': (e) => ok({ type: 'identity.getBlocked.result', id: e.id, pubkeys: [] }),
  'identity.getBadges': (e) => ok({ type: 'identity.getBadges.result', id: e.id, badges: [] }),

  // storage
  'storage.get': (e) => ok({ type: 'storage.get.result', id: e.id, value: null }),
  'storage.set': (e) => ok({ type: 'storage.set.result', id: e.id }),
  'storage.remove': (e) => ok({ type: 'storage.remove.result', id: e.id }),
  'storage.keys': (e) => ok({ type: 'storage.keys.result', id: e.id, keys: [] }),

  // inc
  'inc.emit': none,
  'inc.subscribe': (e) => ok({ type: 'inc.subscribe.result', id: e.id }),
  'inc.unsubscribe': none,
  'inc.channel.open': (e) => ok({ type: 'inc.channel.open.result', id: e.id, channelId: `chan-${String(e.id)}`, peer: 'reference-peer' }),
  'inc.channel.emit': none,
  'inc.channel.broadcast': none,
  'inc.channel.list': (e) => ok({ type: 'inc.channel.list.result', id: e.id, channels: [] }),
  'inc.channel.close': none,

  // theme
  'theme.get': (e) => ok({ type: 'theme.get.result', id: e.id, theme: { colors: { background: '#000000', text: '#ffffff', primary: '#663399' } } }),

  // keys
  'keys.forward': none,
  'keys.registerAction': (e) => ok({ type: 'keys.registerAction.result', id: e.id, actionId: `action-${String(e.id)}` }),
  'keys.unregisterAction': none,

  // media
  'media.session.create': (e) => ok({ type: 'media.session.create.result', id: e.id, sessionId: `session-${String(e.id)}`, owner: e.owner }),
  'media.session.update': none,
  'media.session.destroy': none,
  'media.state': none,
  'media.capabilities': none,

  // notify
  'notify.send': (e) => ok({ type: 'notify.send.result', id: e.id, notificationId: `notif-${String(e.id)}` }),
  'notify.dismiss': none,
  'notify.badge': none,
  'notify.channel.register': none,
  'notify.permission.request': (e) => ok({ type: 'notify.permission.result', id: e.id, granted: true }),

  // config
  'config.registerSchema': (e) => ok({ type: 'config.registerSchema.result', id: e.id, ok: true }),
  'config.get': (e) => ok({ type: 'config.values', id: e.id, values: {} }),
  'config.subscribe': () => ok({ type: 'config.values', values: {} }),
  'config.unsubscribe': none,
  'config.openSettings': none,

  // resource
  'resource.bytes': (e) => {
    const decoded = dataUrlToBlob(e.url);
    if (!decoded) {
      return ok({ type: 'resource.bytes.result', id: e.id, blob: new Blob([]), mime: 'application/octet-stream' });
    }
    return ok({ type: 'resource.bytes.result', id: e.id, blob: decoded.blob, mime: decoded.mime });
  },
  'resource.bytesMany': (e) => ok({
    type: 'resource.bytesMany.result',
    id: e.id,
    items: Array.isArray(e.requests)
      ? e.requests.map((request) => {
        const url = typeof request === 'object' && request !== null && !Array.isArray(request)
          ? (request as Record<string, unknown>).url
          : undefined;
        const decoded = dataUrlToBlob(url);
        return {
          url: typeof url === 'string' ? url : '',
          ok: true,
          blob: decoded?.blob ?? new Blob([]),
          mime: decoded?.mime ?? 'application/octet-stream',
        };
      })
      : [],
  }),
  'resource.info': (e) => ok({
    type: 'resource.info.result',
    id: e.id,
    info: {
      schemes: [
        { scheme: 'data', enabled: true },
        { scheme: 'https', enabled: true },
      ],
      maxServers: 8,
    },
  }),
  'resource.cancel': none,

  // cvm
  'cvm.discover': (e) => ok({ type: 'cvm.discover.result', id: e.id, servers: [] }),
  'cvm.request': (e) => ok({ type: 'cvm.request.result', id: e.id, message: {} }),
  'cvm.close': (e) => ok({ type: 'cvm.close.result', id: e.id }),

  // outbox
  'outbox.getEvent': (e) => ok({ type: 'outbox.getEvent.result', id: e.id }),
  'outbox.query': (e) => ok({ type: 'outbox.query.result', id: e.id, events: [] }),
  'outbox.subscribe': (e) => ok({ type: 'outbox.closed', subId: e.subId, reason: 'reference shell complete' }),
  'outbox.close': none,
  'outbox.publish': (e) => ok({ type: 'outbox.publish.result', id: e.id, ok: true }),
  'outbox.resolveRelays': (e) => ok({ type: 'outbox.resolveRelays.result', id: e.id, plan: {} }),

  // upload
  'upload.info': (e) => ok({
    type: 'upload.info.result',
    id: e.id,
    info: {
      rails: [
        { rail: 'nip96', enabled: true, returns: ['https'] },
        { rail: 'blossom', enabled: true, returns: ['https', 'blossom'] },
      ],
    },
  }),
  'upload.upload': (e) => ok({ type: 'upload.upload.result', id: e.id, result: { url: REFERENCE_BLOB_URL } }),
  'upload.status': (e) => ok({ type: 'upload.status.result', id: e.id, status: {} }),

  // ble
  'ble.open': (e) => ok({
    type: 'ble.open.result',
    id: e.id,
    session: {
      id: 'ble-reference',
      state: 'open',
      device: { id: 'reference-device', name: 'Reference BLE' },
    },
  }),
  'ble.services': (e) => ok({ type: 'ble.services.result', id: e.id, services: [] }),
  'ble.read': (e) => ok({ type: 'ble.read.result', id: e.id, data: [] }),
  'ble.write': (e) => ok({ type: 'ble.write.result', id: e.id }),
  'ble.subscribe': (e) => ok({ type: 'ble.subscribe.result', id: e.id }),
  'ble.unsubscribe': (e) => ok({ type: 'ble.unsubscribe.result', id: e.id }),
  'ble.close': (e) => ok({ type: 'ble.close.result', id: e.id }),

  // common
  'common.encodeNip19': (e) => ok({ type: 'common.encodeNip19.result', id: e.id, ok: true, value: 'npub1reference', nip19Type: 'npub' }),
  'common.decodeNip19': (e) => ok({ type: 'common.decodeNip19.result', id: e.id, ok: true, nip19Type: 'npub', hex: REFERENCE_PUBKEY }),
  'common.getProfile': (e) => ok({ type: 'common.getProfile.result', id: e.id, ok: true, pubkey: REFERENCE_PUBKEY, profile: null }),
  'common.follows': (e) => ok({ type: 'common.follows.result', id: e.id, ok: true, pubkeys: [] }),
  'common.follow': (e) => ok({ type: 'common.follow.result', id: e.id, ok: true }),
  'common.unfollow': (e) => ok({ type: 'common.unfollow.result', id: e.id, ok: true }),
  'common.react': (e) => ok({ type: 'common.react.result', id: e.id, ok: true, eventId: '0'.repeat(64) }),
  'common.report': (e) => ok({ type: 'common.report.result', id: e.id, ok: true, eventId: '1'.repeat(64) }),

  // webrtc
  'webrtc.open': (e) => ok({
    type: 'webrtc.open.result',
    id: e.id,
    session: {
      id: 'webrtc-reference',
      scope: { type: 'direct', pubkey: REFERENCE_PUBKEY },
      channel: 'default',
      state: 'connecting',
    },
  }),
  'webrtc.send': (e) => ok({ type: 'webrtc.send.result', id: e.id }),
  'webrtc.close': (e) => ok({ type: 'webrtc.close.result', id: e.id }),
  // link
  'link.open': (e) => ok({ type: 'link.open.result', id: e.id, status: 'opened' }),
  // count
  'count.query': (e) => ok({ type: 'count.query.result', id: e.id, ok: true, count: 0 }),
  // lists
  'lists.supported': (e) => ok({ type: 'lists.supported.result', id: e.id, lists: [] }),
  'lists.add': (e) => ok({ type: 'lists.add.result', id: e.id, ok: true, added: 0, skipped: 0 }),
  'lists.remove': (e) => ok({ type: 'lists.remove.result', id: e.id, ok: true, removed: 0, skipped: 0 }),
  // serial
  'serial.open': (e) => ok({ type: 'serial.open.result', id: e.id, session: { id: `serial-${String(e.id)}`, state: 'open' } }),
  'serial.write': (e) => ok({ type: 'serial.write.result', id: e.id }),
  'serial.close': (e) => ok({ type: 'serial.close.result', id: e.id }),
  // fs -- virtual paths and curated labels only; never a host path, username,
  // device name, volume, or storage-provider string (NAP-FS info() disclosure rules)
  'fs.info': (e) => ok({
    type: 'fs.info.result',
    id: e.id,
    info: {
      roots: [{ path: '/shared', name: 'Shared files', permissions: ['read', 'list', 'write', 'create', 'delete', 'watch'] }],
      limits: { maxReadBytes: 1048576, maxWriteBytes: 1048576, maxWatchCount: 16 },
    },
  }),
  'fs.pickFile': (e) => pickResult('fs.pickFile.result', e.id, {
    path: '/picked/file.txt',
    kind: 'file',
    name: 'file.txt',
    permissions: ['read'],
  }),
  'fs.pickFiles': (e) => pickResult('fs.pickFiles.result', e.id, {
    path: '/picked/file.txt',
    kind: 'file',
    name: 'file.txt',
    permissions: ['read'],
  }),
  'fs.pickDirectory': (e) => pickResult('fs.pickDirectory.result', e.id, {
    path: '/picked',
    kind: 'directory',
    name: 'picked',
    permissions: ['read', 'list'],
  }),
  'fs.pickSaveFile': (e) => pickResult('fs.pickSaveFile.result', e.id, {
    path: '/picked/export.json',
    kind: 'file',
    name: 'export.json',
    permissions: ['write', 'create'],
  }),
  'fs.stat': (e) => ok({
    type: 'fs.stat.result',
    id: e.id,
    metadata: { path: e.path, kind: 'file', size: 0 },
  }),
  'fs.list': (e) => ok({ type: 'fs.list.result', id: e.id, entries: [] }),
  'fs.read': (e) => ok({
    type: 'fs.read.result',
    id: e.id,
    result: { data: '', offset: 0, bytesRead: 0, eof: true, size: 0 },
  }),
  'fs.write': (e) => ok({
    type: 'fs.write.result',
    id: e.id,
    result: { bytesWritten: 0, size: 0 },
  }),
  'fs.mkdir': (e) => ok({ type: 'fs.mkdir.result', id: e.id }),
  'fs.remove': (e) => ok({ type: 'fs.remove.result', id: e.id }),
  'fs.move': (e) => ok({ type: 'fs.move.result', id: e.id }),
  'fs.watch': (e) => ok({ type: 'fs.watch.result', id: e.id, watchId: `watch-${String(e.id)}` }),
  'fs.unwatch': (e) => ok({ type: 'fs.unwatch.result', id: e.id }),
};
