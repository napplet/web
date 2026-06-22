/**
 * @napplet/conformance -- Runtime envelope validators for the napplet wire protocol.
 *
 * The NAP message types are TypeScript-only at the source. To conformance-test a
 * napplet we need to validate, at runtime, every postMessage envelope the napplet
 * emits against the protocol. This module hand-encodes the wire surface of the 15
 * optional NAP domains plus the foundational `shell` domain (NAP-SHELL) as a
 * single source-of-truth map ({@link ENVELOPE_SPECS}) and exposes
 * {@link validateEnvelope}.
 *
 * Each entry records the envelope's **direction** (`out` = napplet→shell, `in` =
 * shell→napplet) and the required fields a *napplet-emitted* (outbound) envelope
 * must carry. A drift test (envelope.drift.test.ts) cross-checks this map against
 * the `type:` discriminants declared in `@napplet/nap` source so a newly added
 * message type cannot ship without a matching spec here.
 *
 * @packageDocumentation
 */

import { NAP_DOMAINS } from '@napplet/core';

/**
 * Foundational domains carried alongside the optional NAP_DOMAINS. `shell` is
 * NAP-SHELL — mandatory, foundational, and NOT discoverable via `supports()`
 * (hence not a member of NAP_DOMAINS). The validator must accept `shell.*`
 * discriminants even though no `supports()` query can ever return a `shell`.
 */
const FOUNDATIONAL_DOMAINS = ['shell'] as const;

/** Direction of an envelope relative to the napplet. */
export type EnvelopeDirection = 'out' | 'in';

/**
 * Lightweight runtime kind for a required field. `present` means "must exist,
 * any type" — used for union-typed fields (e.g. filters that may be a single
 * filter object or an array) where a stricter check would produce false negatives.
 */
export type FieldKind = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'present';

/** Specification for a single wire envelope `type`. */
export interface EnvelopeSpec {
  /** `out` = sent by the napplet to the shell; `in` = sent by the shell to the napplet. */
  dir: EnvelopeDirection;
  /** Required fields (name → kind) for an outbound envelope. Optional fields are omitted. */
  fields?: Record<string, FieldKind>;
}

const ID = { id: 'string' } as const;

/**
 * The complete napplet wire surface: every `domain.action` discriminant across the
 * 15 optional NAP domains plus the foundational `shell` domain (NAP-SHELL), with
 * its direction and (for outbound) required fields.
 */
export const ENVELOPE_SPECS: Record<string, EnvelopeSpec> = {
  // ── shell (NAP-SHELL — foundational handshake) ─────────────────────────────
  // `shell.ready` is a bare liveness ping (no required fields); `shell.init` is
  // the runtime's environment reply (inbound — a napplet must not emit it).
  'shell.ready': { dir: 'out' },
  'shell.init': { dir: 'in' },

  // ── relay ────────────────────────────────────────────────────────────────
  'relay.subscribe': { dir: 'out', fields: { ...ID, subId: 'string', filters: 'array' } },
  'relay.close': { dir: 'out', fields: { ...ID, subId: 'string' } },
  'relay.publish': { dir: 'out', fields: { ...ID, event: 'object' } },
  'relay.publishEncrypted': { dir: 'out', fields: { ...ID, event: 'object', recipient: 'string' } },
  'relay.query': { dir: 'out', fields: { ...ID, filters: 'array' } },
  'relay.event': { dir: 'in' },
  'relay.eose': { dir: 'in' },
  'relay.closed': { dir: 'in' },
  'relay.publish.result': { dir: 'in' },
  'relay.publishEncrypted.result': { dir: 'in' },
  'relay.query.result': { dir: 'in' },

  // ── identity ─────────────────────────────────────────────────────────────
  'identity.getPublicKey': { dir: 'out', fields: { ...ID } },
  'identity.getRelays': { dir: 'out', fields: { ...ID } },
  'identity.getProfile': { dir: 'out', fields: { ...ID } },
  'identity.getFollows': { dir: 'out', fields: { ...ID } },
  'identity.getList': { dir: 'out', fields: { ...ID, listType: 'string' } },
  'identity.getZaps': { dir: 'out', fields: { ...ID } },
  'identity.getMutes': { dir: 'out', fields: { ...ID } },
  'identity.getBlocked': { dir: 'out', fields: { ...ID } },
  'identity.getBadges': { dir: 'out', fields: { ...ID } },
  'identity.changed': { dir: 'in' },
  'identity.getPublicKey.result': { dir: 'in' },
  'identity.getRelays.result': { dir: 'in' },
  'identity.getProfile.result': { dir: 'in' },
  'identity.getFollows.result': { dir: 'in' },
  'identity.getList.result': { dir: 'in' },
  'identity.getZaps.result': { dir: 'in' },
  'identity.getMutes.result': { dir: 'in' },
  'identity.getBlocked.result': { dir: 'in' },
  'identity.getBadges.result': { dir: 'in' },

  // ── storage ──────────────────────────────────────────────────────────────
  'storage.get': { dir: 'out', fields: { ...ID, key: 'string' } },
  'storage.set': { dir: 'out', fields: { ...ID, key: 'string', value: 'string' } },
  'storage.remove': { dir: 'out', fields: { ...ID, key: 'string' } },
  'storage.keys': { dir: 'out', fields: { ...ID } },
  'storage.get.result': { dir: 'in' },
  'storage.set.result': { dir: 'in' },
  'storage.remove.result': { dir: 'in' },
  'storage.keys.result': { dir: 'in' },

  // ── inc (inter-napplet communication) ─────────────────────────────────────
  'inc.emit': { dir: 'out', fields: { topic: 'string' } },
  'inc.subscribe': { dir: 'out', fields: { ...ID, topic: 'string' } },
  'inc.unsubscribe': { dir: 'out', fields: { topic: 'string' } },
  'inc.channel.open': { dir: 'out', fields: { ...ID, target: 'string' } },
  'inc.channel.emit': { dir: 'out', fields: { channelId: 'string' } },
  'inc.channel.broadcast': { dir: 'out' },
  'inc.channel.list': { dir: 'out', fields: { ...ID } },
  'inc.channel.close': { dir: 'out', fields: { channelId: 'string' } },
  'inc.subscribe.result': { dir: 'in' },
  'inc.event': { dir: 'in' },
  'inc.channel.open.result': { dir: 'in' },
  'inc.channel.event': { dir: 'in' },
  'inc.channel.list.result': { dir: 'in' },
  'inc.channel.closed': { dir: 'in' },

  // ── theme ────────────────────────────────────────────────────────────────
  'theme.get': { dir: 'out', fields: { ...ID } },
  'theme.get.result': { dir: 'in' },
  'theme.changed': { dir: 'in' },

  // ── keys ─────────────────────────────────────────────────────────────────
  'keys.forward': {
    dir: 'out',
    fields: { key: 'string', code: 'string', ctrl: 'boolean', alt: 'boolean', shift: 'boolean', meta: 'boolean' },
  },
  'keys.registerAction': { dir: 'out', fields: { ...ID, action: 'object' } },
  'keys.unregisterAction': { dir: 'out', fields: { actionId: 'string' } },
  'keys.registerAction.result': { dir: 'in' },
  'keys.bindings': { dir: 'in' },
  'keys.action': { dir: 'in' },

  // ── media ────────────────────────────────────────────────────────────────
  'media.session.create': { dir: 'out', fields: { ...ID, owner: 'object' } },
  'media.session.update': { dir: 'out', fields: { sessionId: 'string', metadata: 'object' } },
  'media.session.destroy': { dir: 'out', fields: { sessionId: 'string' } },
  'media.state': { dir: 'out', fields: { sessionId: 'string', status: 'string' } },
  'media.capabilities': { dir: 'out', fields: { sessionId: 'string', actions: 'array' } },
  'media.session.create.result': { dir: 'in' },
  'media.command': { dir: 'in' },
  'media.controls': { dir: 'in' },

  // ── notify ───────────────────────────────────────────────────────────────
  'notify.send': { dir: 'out', fields: { ...ID, title: 'string' } },
  'notify.dismiss': { dir: 'out', fields: { notificationId: 'string' } },
  'notify.badge': { dir: 'out', fields: { count: 'number' } },
  'notify.channel.register': { dir: 'out', fields: { channelId: 'string', label: 'string' } },
  'notify.permission.request': { dir: 'out', fields: { ...ID } },
  'notify.send.result': { dir: 'in' },
  'notify.permission.result': { dir: 'in' },
  'notify.action': { dir: 'in' },
  'notify.clicked': { dir: 'in' },
  'notify.dismissed': { dir: 'in' },
  'notify.controls': { dir: 'in' },

  // ── config ───────────────────────────────────────────────────────────────
  'config.registerSchema': { dir: 'out', fields: { ...ID, schema: 'object' } },
  'config.get': { dir: 'out', fields: { ...ID } },
  'config.subscribe': { dir: 'out' },
  'config.unsubscribe': { dir: 'out' },
  'config.openSettings': { dir: 'out' },
  'config.registerSchema.result': { dir: 'in' },
  'config.values': { dir: 'in' },
  'config.schemaError': { dir: 'in' },

  // ── resource ─────────────────────────────────────────────────────────────
  'resource.bytes': { dir: 'out', fields: { ...ID, url: 'string' } },
  'resource.cancel': { dir: 'out', fields: { ...ID } },
  'resource.bytes.result': { dir: 'in' },
  'resource.bytes.error': { dir: 'in' },

  // ── cvm ──────────────────────────────────────────────────────────────────
  'cvm.discover': { dir: 'out', fields: { ...ID } },
  'cvm.request': { dir: 'out', fields: { ...ID, server: 'object', message: 'object' } },
  'cvm.close': { dir: 'out', fields: { ...ID, server: 'object' } },
  'cvm.discover.result': { dir: 'in' },
  'cvm.request.result': { dir: 'in' },
  'cvm.close.result': { dir: 'in' },
  'cvm.event': { dir: 'in' },

  // ── outbox ───────────────────────────────────────────────────────────────
  'outbox.query': { dir: 'out', fields: { ...ID, filters: 'present' } },
  'outbox.subscribe': { dir: 'out', fields: { ...ID, subId: 'string', filters: 'present' } },
  'outbox.close': { dir: 'out', fields: { ...ID, subId: 'string' } },
  'outbox.publish': { dir: 'out', fields: { ...ID, event: 'object' } },
  'outbox.resolveRelays': { dir: 'out', fields: { ...ID, target: 'present' } },
  'outbox.query.result': { dir: 'in' },
  'outbox.event': { dir: 'in' },
  'outbox.eose': { dir: 'in' },
  'outbox.closed': { dir: 'in' },
  'outbox.publish.result': { dir: 'in' },
  'outbox.resolveRelays.result': { dir: 'in' },

  // ── upload ───────────────────────────────────────────────────────────────
  'upload.upload': { dir: 'out', fields: { ...ID, request: 'object' } },
  'upload.status': { dir: 'out', fields: { ...ID, uploadId: 'string' } },
  'upload.upload.result': { dir: 'in' },
  'upload.status.result': { dir: 'in' },
  'upload.status.changed': { dir: 'in' },

  // ── intent ───────────────────────────────────────────────────────────────
  'intent.invoke': { dir: 'out', fields: { ...ID, request: 'object' } },
  'intent.available': { dir: 'out', fields: { ...ID, archetype: 'string' } },
  'intent.handlers': { dir: 'out', fields: { ...ID } },
  'intent.invoke.result': { dir: 'in' },
  'intent.available.result': { dir: 'in' },
  'intent.handlers.result': { dir: 'in' },
  'intent.changed': { dir: 'in' },

  // ── common ───────────────────────────────────────────────────────────────
  'common.encodeNip19': { dir: 'out', fields: { ...ID, input: 'object' } },
  'common.decodeNip19': { dir: 'out', fields: { ...ID, value: 'string' } },
  'common.getProfile': { dir: 'out', fields: { ...ID, target: 'string' } },
  'common.follows': { dir: 'out', fields: { ...ID } },
  'common.follow': { dir: 'out', fields: { ...ID, pubkeys: 'array' } },
  'common.unfollow': { dir: 'out', fields: { ...ID, pubkeys: 'array' } },
  'common.react': { dir: 'out', fields: { ...ID, targetEventId: 'string', reaction: 'string' } },
  'common.report': { dir: 'out', fields: { ...ID, target: 'object', reason: 'string', text: 'string' } },
  'common.encodeNip19.result': { dir: 'in' },
  'common.decodeNip19.result': { dir: 'in' },
  'common.getProfile.result': { dir: 'in' },
  'common.follows.result': { dir: 'in' },
  'common.follow.result': { dir: 'in' },
  'common.unfollow.result': { dir: 'in' },
  'common.react.result': { dir: 'in' },
  'common.report.result': { dir: 'in' },
};

/** A single problem found while validating an envelope. */
export interface EnvelopeError {
  /** Machine-readable code: not-an-object | missing-type | malformed-type | unknown-domain | unknown-type | inbound-type-emitted | missing-field | wrong-type */
  code:
    | 'not-an-object'
    | 'missing-type'
    | 'malformed-type'
    | 'unknown-domain'
    | 'unknown-type'
    | 'inbound-type-emitted'
    | 'missing-field'
    | 'wrong-type';
  /** Human-readable explanation. */
  message: string;
  /** Field name, when the error concerns a specific field. */
  field?: string;
}

/** Verdict returned by {@link validateEnvelope}. */
export interface EnvelopeVerdict {
  /** True when the envelope is a well-formed, napplet-emittable (outbound) message. */
  ok: boolean;
  /** The envelope's `type` discriminant, when present and a string. */
  type?: string;
  /** The domain (part before the first `.`), when derivable. */
  domain?: string;
  /** Direction recorded in {@link ENVELOPE_SPECS}, when the type is known. */
  direction?: EnvelopeDirection;
  /** Problems found (empty when `ok`). */
  errors: EnvelopeError[];
}

function kindOf(value: unknown): FieldKind | 'undefined' | 'null' {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  if (t === 'object') return 'object';
  return 'present';
}

function matchesKind(value: unknown, kind: FieldKind): boolean {
  if (kind === 'present') return value !== undefined && value !== null;
  return kindOf(value) === kind;
}

/**
 * Validate a single postMessage envelope as if emitted by a napplet.
 *
 * Returns `ok: true` only when the message is an object with a known `domain.action`
 * `type` whose spec is **outbound** and whose required fields are present with the
 * right primitive kinds. Emitting an inbound (shell→napplet) type, an unknown type,
 * or a type in an unknown domain all fail — that is the point: it catches napplets
 * that put malformed or illegal traffic on the wire.
 *
 * @param message - The raw `MessageEvent.data` value the napplet posted.
 * @returns A structured {@link EnvelopeVerdict}.
 *
 * @example
 * ```ts
 * validateEnvelope({ type: 'relay.subscribe', id: 'a', subId: 'b', filters: [{}] }).ok; // true
 * validateEnvelope({ type: 'relay.subscribe', id: 'a' }).ok; // false (missing subId, filters)
 * validateEnvelope({ type: 'relay.event', subId: 'b' }).ok;  // false (inbound type emitted)
 * ```
 */
export function validateEnvelope(message: unknown): EnvelopeVerdict {
  const errors: EnvelopeError[] = [];

  if (typeof message !== 'object' || message === null || Array.isArray(message)) {
    return { ok: false, errors: [{ code: 'not-an-object', message: 'Envelope must be a non-null object' }] };
  }

  const record = message as Record<string, unknown>;
  const type = record['type'];
  if (typeof type !== 'string') {
    return { ok: false, errors: [{ code: 'missing-type', message: 'Envelope is missing a string `type` field' }] };
  }

  const dotIndex = type.indexOf('.');
  if (dotIndex <= 0) {
    return { ok: false, type, errors: [{ code: 'malformed-type', message: `Envelope type "${type}" is not in domain.action form` }] };
  }

  const domain = type.slice(0, dotIndex);
  const isKnownDomain =
    (NAP_DOMAINS as readonly string[]).includes(domain) ||
    (FOUNDATIONAL_DOMAINS as readonly string[]).includes(domain);
  if (!isKnownDomain) {
    return { ok: false, type, domain, errors: [{ code: 'unknown-domain', message: `"${domain}" is not a known NAP domain` }] };
  }

  const spec = ENVELOPE_SPECS[type];
  if (!spec) {
    return { ok: false, type, domain, errors: [{ code: 'unknown-type', message: `"${type}" is not a known ${domain} message type` }] };
  }

  if (spec.dir === 'in') {
    return {
      ok: false,
      type,
      domain,
      direction: 'in',
      errors: [{ code: 'inbound-type-emitted', message: `"${type}" is a shell→napplet message; a napplet must not emit it` }],
    };
  }

  for (const [field, kind] of Object.entries(spec.fields ?? {})) {
    if (!(field in record) || record[field] === undefined) {
      errors.push({ code: 'missing-field', message: `Required field "${field}" is missing`, field });
      continue;
    }
    if (!matchesKind(record[field], kind)) {
      errors.push({
        code: 'wrong-type',
        message: `Field "${field}" should be ${kind} but is ${kindOf(record[field])}`,
        field,
      });
    }
  }

  return { ok: errors.length === 0, type, domain, direction: 'out', errors };
}

/** Every envelope `type` known to the validator. */
export function knownEnvelopeTypes(): string[] {
  return Object.keys(ENVELOPE_SPECS);
}
