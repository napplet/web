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
export const REFERENCE_PUBKEY: string = 'f'.repeat(64);

/** A source identity supplied by the reference runtime's authenticated endpoint fixture. */
export interface ReferenceEndpoint {
  /** The authenticated source napplet dTag. */
  dTag: string;
}

/** Default authenticated source used by the backwards-compatible {@link ReferenceShell.handle} helper. */
export const REFERENCE_ENDPOINT: ReferenceEndpoint = { dTag: 'reference-source' };

/** A placeholder blob URL for canned upload responses. `.invalid` is reserved (RFC 2606) and never resolves. */
const REFERENCE_BLOB_URL = 'https://reference.invalid/blob';
const REFERENCE_HANDLER = 'reference-handler';
const REFERENCE_SUBSCRIBER = 'reference-subscriber';
const REFERENCE_CONVENTION = 'napplet:note/open';
const REFERENCE_CONTRACT = { convention: REFERENCE_CONVENTION, eventKinds: [1, 30023] };

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
  /**
   * Process one inbound envelope from an explicitly authenticated source endpoint.
   * The endpoint, never envelope fields, determines delivered sender provenance.
   */
  handleFrom(endpoint: ReferenceEndpoint, envelope: unknown): unknown[];
  /** Drain retained target deliveries for one resolved reference target. */
  takeDeliveries(target: string): unknown[];
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
  const targetQueues = new Map<string, unknown[]>();

  function queueDelivery(target: string, delivery: unknown): void {
    const queue = targetQueues.get(target);
    if (queue) {
      queue.push(delivery);
      return;
    }
    targetQueues.set(target, [delivery]);
  }

  function takeDeliveries(target: string): unknown[] {
    const queue = targetQueues.get(target) ?? [];
    targetQueues.delete(target);
    return queue;
  }

  function unavailableIntent(id: unknown, error: string): unknown[] {
    return ok({ type: 'intent.invoke.result', id, result: { ok: false, error } });
  }

  function handleIntentInvoke(endpoint: ReferenceEndpoint, env: Record<string, unknown>): unknown[] {
    const request = env.request;
    if (typeof request !== 'object' || request === null || Array.isArray(request)) {
      return unavailableIntent(env.id, 'invalid intent request');
    }

    const normalized = request as Record<string, unknown>;
    const { archetype, action, convention } = normalized;
    if (typeof archetype !== 'string' || typeof action !== 'string' || typeof convention !== 'string') {
      return unavailableIntent(env.id, 'intent request must carry normalized identity');
    }

    const parsed = /^napplet:([^/?#\s]+)\/([^/?#\s]+)$/.exec(convention);
    if (!parsed || parsed[1] !== archetype || parsed[2] !== action) {
      return unavailableIntent(env.id, 'intent request conflicts with its convention');
    }
    if (convention !== REFERENCE_CONVENTION) {
      return unavailableIntent(env.id, 'no reference handler for convention');
    }

    const delivery: Record<string, unknown> = {
      sender: endpoint.dTag,
      archetype,
      action,
      convention,
    };
    if ('payload' in normalized) delivery.payload = normalized.payload;
    queueDelivery(REFERENCE_HANDLER, { type: 'intent.deliver', delivery });

    return ok({
      type: 'intent.invoke.result',
      id: env.id,
      result: { ok: true, archetype, action, convention, handler: REFERENCE_HANDLER },
    });
  }

  function intentAvailability(archetype: unknown): Record<string, unknown> {
    if (archetype !== 'note') {
      return { archetype, available: false, candidates: [], hasDefault: false };
    }
    return {
      archetype,
      available: true,
      candidates: [{
        dTag: REFERENCE_HANDLER,
        actions: ['open'],
        conventions: [REFERENCE_CONVENTION],
        contracts: [REFERENCE_CONTRACT],
        isDefault: true,
      }],
      hasDefault: true,
    };
  }

  function handleFrom(endpoint: ReferenceEndpoint, envelope: unknown): unknown[] {
    const type =
      envelope && typeof envelope === 'object' && typeof (envelope as Record<string, unknown>).type === 'string'
        ? ((envelope as Record<string, unknown>).type as string)
        : undefined;

    const verdict = validateEnvelope(envelope);
    records.push({ envelope, verdict, timestamp: now() });

    if (!type || !verdict.ok) return [];
    const env = envelope as Record<string, unknown>;
    if (type === 'intent.invoke') return handleIntentInvoke(endpoint, env);
    if (type === 'intent.available') {
      return ok({ type: 'intent.available.result', id: env.id, availability: intentAvailability(env.archetype) });
    }
    if (type === 'intent.handlers') {
      return ok({ type: 'intent.handlers.result', id: env.id, handlers: [intentAvailability('note')] });
    }
    if (type === 'inc.emit') {
      if (env.topic === REFERENCE_CONVENTION) {
        const event: Record<string, unknown> = {
          type: 'inc.event',
          topic: env.topic,
          sender: endpoint.dTag,
        };
        if ('payload' in env) event.payload = env.payload;
        queueDelivery(REFERENCE_SUBSCRIBER, event);
      }
      return [];
    }
    const responder = RESPONDERS[type];
    return responder ? responder(env) : [];
  }

  function handle(envelope: unknown): unknown[] {
    return handleFrom(REFERENCE_ENDPOINT, envelope);
  }

  return {
    get records() {
      return records;
    },
    handle,
    handleFrom,
    takeDeliveries,
    reset() {
      records.length = 0;
      targetQueues.clear();
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
  /** Authenticated endpoint identity for messages that pass the web source guard. */
  endpoint?: ReferenceEndpoint;
}

/**
 * Bind a {@link ReferenceShell} to a real postMessage channel. Returns a detach
 * function that removes the listener.
 */
export function attachReferenceShell(shell: ReferenceShell, options: AttachOptions): () => void {
  const listener = (event: MessageEvent): void => {
    if (options.expectedSource !== undefined && event.source !== options.expectedSource) return;
    for (const response of shell.handleFrom(options.endpoint ?? REFERENCE_ENDPOINT, event.data)) {
      options.target.postMessage(response, '*');
    }
  };
  options.host.addEventListener('message', listener);
  return () => options.host.removeEventListener('message', listener);
}
