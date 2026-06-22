/**
 * @napplet/conformance -- Reference mock shell.
 *
 * A minimal, spec-conformant host shell used to exercise a napplet during
 * conformance testing. It does two jobs:
 *
 *  1. **Records** every envelope the napplet emits, attaching a {@link EnvelopeVerdict}.
 *  2. **Answers** the napplet so its request/response promises resolve and it does
 *     not hang — including the NAP-SHELL `shell.ready` → `shell.init` bootstrap
 *     handshake that drives `window.napplet.shell.supports()`.
 *
 * The shell is transport-agnostic: {@link ReferenceShell.handle} takes one inbound
 * envelope and returns the response envelopes to send back. {@link attachReferenceShell}
 * binds that to a real `postMessage` channel between a host window and a napplet
 * iframe. Keeping `handle` pure makes the shell fully unit-testable without a
 * browser.
 *
 * @packageDocumentation
 */

import { NAP_DOMAINS } from '@napplet/core';
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

/**
 * Capability advertisement sent in the NAP-SHELL `shell.init` handshake.
 * Mirrors the canonical `{ domains, protocols }` capability shape.
 */
export interface ShellCapabilities {
  /** NAP domains the shell offers (e.g. `['relay', 'inc']`). */
  domains: string[];
  /** Per-domain numbered protocols the shell speaks (e.g. `{ inc: ['NAP-2'] }`). */
  protocols: Record<string, string[]>;
}

/** Options for {@link createReferenceShell}. */
export interface ReferenceShellOptions {
  /**
   * Capabilities advertised in `shell.init`. Defaults to **all** NAP domains and
   * no protocols — a fully-capable shell. Pass `{ domains: [], protocols: {} }` to
   * drive the graceful-degradation check (every `supports()` returns false).
   */
  capabilities?: Partial<ShellCapabilities>;
  /** Named services advertised in `shell.init`. Defaults to `[]`. */
  services?: string[];
  /** Injectable clock for deterministic tests. Defaults to `Date.now`. */
  now?: () => number;
}

/** A function that produces response envelopes for one outbound request. */
type Responder = (env: Record<string, unknown>) => unknown[];

const ok = <T extends Record<string, unknown>>(v: T): T[] => [v];
const none: Responder = () => [];

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
  'resource.bytes': (e) => ok({ type: 'resource.bytes.result', id: e.id, blob: new Blob([]), mime: 'application/octet-stream' }),
  'resource.cancel': none,

  // cvm
  'cvm.discover': (e) => ok({ type: 'cvm.discover.result', id: e.id, servers: [] }),
  'cvm.request': (e) => ok({ type: 'cvm.request.result', id: e.id, message: {} }),
  'cvm.close': (e) => ok({ type: 'cvm.close.result', id: e.id }),

  // outbox
  'outbox.query': (e) => ok({ type: 'outbox.query.result', id: e.id, events: [], relays: {} }),
  'outbox.subscribe': (e) => ok({ type: 'outbox.eose', subId: e.subId }),
  'outbox.close': none,
  'outbox.publish': (e) => ok({ type: 'outbox.publish.result', id: e.id, ok: true }),
  'outbox.resolveRelays': (e) => ok({ type: 'outbox.resolveRelays.result', id: e.id, plan: {} }),

  // upload
  'upload.upload': (e) => ok({ type: 'upload.upload.result', id: e.id, result: { url: REFERENCE_BLOB_URL } }),
  'upload.status': (e) => ok({ type: 'upload.status.result', id: e.id, status: {} }),

  // intent
  'intent.invoke': (e) => ok({ type: 'intent.invoke.result', id: e.id, result: {} }),
  'intent.available': (e) => ok({ type: 'intent.available.result', id: e.id, availability: {} }),
  'intent.handlers': (e) => ok({ type: 'intent.handlers.result', id: e.id, handlers: [] }),

  // pow
  'pow.mine': (e) => ok({ type: 'pow.mine.result', id: e.id, jobId: e.jobId, accepted: true, state: 'queued', position: 0 }),
  'pow.mineAndPublish': (e) => ok({ type: 'pow.mineAndPublish.result', id: e.id, jobId: e.jobId, accepted: true, state: 'queued', position: 0 }),
  'pow.queue': (e) => ok({ type: 'pow.queue.result', id: e.id, jobs: [] }),
  'pow.job': (e) => ok({
    type: 'pow.job.result',
    id: e.id,
    progress: {
      jobId: e.jobId,
      target: 0,
      state: 'queued',
      bestPow: 0,
      hashes: 0,
      hashRate: 0,
      workers: [],
      elapsedMs: 0,
    },
  }),
  'pow.hashrate': (e) => ok({ type: 'pow.hashrate.result', id: e.id, hashrate: { hashRate: 0, workers: 0, perWorker: [], byJob: [] } }),
  'pow.cancel': (e) => ok({ type: 'pow.cancel.result', id: e.id, jobId: e.jobId, cancelled: true }),
  'pow.pause': (e) => ok({ type: 'pow.pause.result', id: e.id, ...(typeof e.jobId === 'string' ? { jobId: e.jobId } : {}) }),
  'pow.resume': (e) => ok({ type: 'pow.resume.result', id: e.id, ...(typeof e.jobId === 'string' ? { jobId: e.jobId } : {}) }),
  // serial
  'serial.open': (e) => ok({ type: 'serial.open.result', id: e.id, session: { id: `serial-${String(e.id)}`, state: 'open' } }),
  'serial.write': (e) => ok({ type: 'serial.write.result', id: e.id }),
  'serial.close': (e) => ok({ type: 'serial.close.result', id: e.id }),
};

/** A reference shell instance. */
export interface ReferenceShell {
  /** Effective capabilities advertised in `shell.init`. */
  readonly capabilities: ShellCapabilities;
  /** Named services advertised in `shell.init`. */
  readonly services: string[];
  /** All envelopes recorded so far, in arrival order. */
  readonly records: readonly RecordedEnvelope[];
  /**
   * Process one inbound envelope from the napplet. Records it (with verdict) and
   * returns the response envelopes the shell would post back. `shell.ready` returns
   * the NAP-SHELL `shell.init` handshake; unknown/fire-and-forget messages return `[]`.
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
 * // NAP-SHELL handshake: shell.ready → shell.init { capabilities, services }
 * shell.handle({ type: 'shell.ready' });
 * shell.handle({ type: 'storage.get', id: '1', key: 'k' }); // → [{ type:'storage.get.result', id:'1', value:null }]
 * shell.records[0].verdict.ok;                       // true (shell.ready is not recorded)
 * ```
 */
export function createReferenceShell(options: ReferenceShellOptions = {}): ReferenceShell {
  const now = options.now ?? (() => Date.now());
  const capabilities: ShellCapabilities = {
    domains: options.capabilities?.domains ?? [...NAP_DOMAINS],
    protocols: options.capabilities?.protocols ?? {},
  };
  const services: string[] = options.services ?? [];
  const records: RecordedEnvelope[] = [];

  function handle(envelope: unknown): unknown[] {
    const type =
      envelope && typeof envelope === 'object' && typeof (envelope as Record<string, unknown>).type === 'string'
        ? ((envelope as Record<string, unknown>).type as string)
        : undefined;

    // The NAP-SHELL handshake is bootstrap scaffolding — keep it out of the
    // napplet-outbound validator/recorder so `records` reflects NAP traffic only.
    if (type === 'shell.ready') {
      return [
        {
          type: 'shell.init',
          capabilities: { domains: capabilities.domains, protocols: capabilities.protocols },
          services,
        },
      ];
    }

    records.push({ envelope, verdict: validateEnvelope(envelope), timestamp: now() });

    if (!type) return [];
    const responder = RESPONDERS[type];
    return responder ? responder(envelope as Record<string, unknown>) : [];
  }

  return {
    capabilities,
    services,
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
