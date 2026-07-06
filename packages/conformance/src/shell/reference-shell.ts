/**
 * @napplet/conformance -- Reference mock shell.
 *
 * A minimal, spec-conformant host runtime used to exercise a napplet during
 * conformance testing. It does two jobs:
 *
 *  1. **Records** every envelope the napplet emits, attaching a {@link EnvelopeVerdict}.
 *  2. **Answers** the napplet so its request/response promises resolve and it does
 *     not hang.
 *
 * The shell is transport-agnostic: {@link ReferenceShell.handle} takes one inbound
 * envelope and returns the response envelopes to send back. {@link attachReferenceShell}
 * binds that to a real `postMessage` channel between a host window and a napplet
 * iframe. Keeping `handle` pure makes the shell fully unit-testable without a
 * browser.
 *
 * @packageDocumentation
 */

import { validateEnvelope, type EnvelopeVerdict } from '../validators/envelope.js';

/** A 64-hex reference user pubkey the shell reports for identity queries. */
export const REFERENCE_PUBKEY = 'f'.repeat(64);

/** A placeholder blob URL for canned upload responses. `.invalid` is reserved (RFC 2606) and never resolves. */
const REFERENCE_BLOB_URL = 'https://reference.invalid/blob';

/** One recorded inbound envelope from the napplet, with its validation verdict. */
export interface RecordedEnvelope {
  /** The raw envelope the napplet posted. */
  envelope: unknown;
  /** Verdict from {@link validateEnvelope}. */
  verdict: EnvelopeVerdict;
  /** Monotonic-ish timestamp (ms) when the shell received it. */
  timestamp: number;
}

/** Options for {@link createReferenceShell}. */
export interface ReferenceShellOptions {
  /** Injectable clock for deterministic tests. Defaults to `Date.now`. */
  now?: () => number;
}

/** A function that produces response envelopes for one outbound request. */
type Responder = (env: Record<string, unknown>) => unknown[];

const ok = <T extends Record<string, unknown>>(v: T): T[] => [v];
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
const RESPONDERS: Record<string, Responder> = {
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
  'theme.get': (e) => ok({ type: 'theme.get.result', id: e.id, theme: { colors: {}, mode: 'dark' } }),

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
    items: Array.isArray(e.urls)
      ? e.urls.map((url) => {
        const decoded = dataUrlToBlob(url);
        return {
          url,
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

  // intent
  'intent.invoke': (e) => ok({ type: 'intent.invoke.result', id: e.id, result: { ok: true, archetype: 'reference', action: 'open', handled: true } }),
  'intent.available': (e) => ok({
    type: 'intent.available.result',
    id: e.id,
    availability: {
      archetype: e.archetype,
      available: true,
      candidates: [
        {
          dTag: 'reference-handler',
          actions: ['open'],
          protocols: ['NAP-4'],
          contracts: [{ action: 'open', protocol: 'NAP-4', eventKinds: [1] }],
          isDefault: true,
        },
      ],
      hasDefault: true,
    },
  }),
  'intent.handlers': (e) => ok({ type: 'intent.handlers.result', id: e.id, handlers: [] }),

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
};

/** A reference shell instance. */
export interface ReferenceShell {
  /** All envelopes recorded so far, in arrival order. */
  readonly records: readonly RecordedEnvelope[];
  /**
   * Process one inbound envelope from the napplet. Records it (with verdict) and
   * returns the response envelopes the runtime would post back.
   * Unknown/fire-and-forget messages return `[]`.
   */
  handle(envelope: unknown): unknown[];
  /** Clear recorded envelopes. */
  reset(): void;
}

/**
 * Create a reference shell.
 *
 * @example
 * ```ts
 * const shell = createReferenceShell();
 * shell.handle({ type: 'storage.get', id: '1', key: 'k' }); // → [{ type:'storage.get.result', id:'1', value:null }]
 * shell.records[0].verdict.ok;                       // true
 * ```
 */
export function createReferenceShell(options: ReferenceShellOptions = {}): ReferenceShell {
  const now = options.now ?? (() => Date.now());
  const records: RecordedEnvelope[] = [];

  function handle(envelope: unknown): unknown[] {
    const type =
      envelope && typeof envelope === 'object' && typeof (envelope as Record<string, unknown>).type === 'string'
        ? ((envelope as Record<string, unknown>).type as string)
        : undefined;

    records.push({ envelope, verdict: validateEnvelope(envelope), timestamp: now() });

    if (!type) return [];
    const responder = RESPONDERS[type];
    return responder ? responder(envelope as Record<string, unknown>) : [];
  }

  return {
    get records() {
      return records;
    },
    handle,
    reset() {
      records.length = 0;
    },
  };
}

/** Minimal window surface {@link attachReferenceShell} needs (eases testing). */
export interface MessageWindowLike {
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

/** Minimal target surface the shell posts responses to. */
export interface PostTargetLike {
  postMessage(message: unknown, targetOrigin: string): void;
}

/** Options for {@link attachReferenceShell}. */
export interface AttachOptions {
  /** The window that receives `message` events (usually the host `window`). */
  host: MessageWindowLike;
  /** The napplet target to post responses to (usually `iframe.contentWindow`). */
  target: PostTargetLike;
  /**
   * Optional source guard: only handle events whose `source` matches. Pass the
   * iframe's `contentWindow` so cross-frame noise is ignored. When omitted, all
   * message events are handled (useful with isolated MessageChannel tests).
   */
  expectedSource?: unknown;
}

/**
 * Bind a {@link ReferenceShell} to a real postMessage channel. Returns a detach
 * function that removes the listener.
 */
export function attachReferenceShell(shell: ReferenceShell, options: AttachOptions): () => void {
  const listener = (event: MessageEvent): void => {
    if (options.expectedSource !== undefined && event.source !== options.expectedSource) return;
    for (const response of shell.handle(event.data)) {
      options.target.postMessage(response, '*');
    }
  };
  options.host.addEventListener('message', listener);
  return () => options.host.removeEventListener('message', listener);
}
