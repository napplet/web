import { NAP_DOMAINS } from '@napplet/core';
import { ENVELOPE_SPECS } from './envelope-specs.js';
import type {
  EnvelopeError,
  EnvelopeVerdict,
  FieldKind,
} from './envelope-types.js';

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

/** Validate the merged NAP-INTENT request shape. */
function validateIntentInvokeRequest(request: unknown, errors: EnvelopeError[]): void {
  if (typeof request !== 'object' || request === null || Array.isArray(request)) return;

  const intent = request as Record<string, unknown>;
  if (typeof intent.archetype !== 'string') {
    errors.push({
      code: intent.archetype === undefined ? 'missing-field' : 'wrong-type',
      message: 'Intent request requires a string "archetype" field',
      field: 'request.archetype',
    });
  }
  for (const field of ['action', 'convention'] as const) {
    if (typeof intent[field] !== 'string') {
      errors.push({
        code: intent[field] === undefined ? 'missing-field' : 'wrong-type',
        message: `Intent request field "${field}" must be a string`,
        field: `request.${field}`,
      });
    }
  }

  const match = typeof intent.convention === 'string' ? /^napplet:([^/?#]+)\/([^/?#]+)$/.exec(intent.convention) : null;
  if (!match || match[1] !== intent.archetype || match[2] !== intent.action) {
    errors.push({ code: 'wrong-type', message: 'Intent convention must be stable and match archetype and action', field: 'request.convention' });
  }

  if (intent.handler !== undefined && typeof intent.handler !== 'string') {
    errors.push({ code: 'wrong-type', message: 'Intent request field "handler" must be a string', field: 'request.handler' });
  }
  if (intent.behavior !== undefined && kindOf(intent.behavior) !== 'object') {
    errors.push({ code: 'wrong-type', message: 'Intent request field "behavior" must be an object', field: 'request.behavior' });
  }
  if (intent.handlerHint !== undefined) validateIntentHandlerHint(intent.handlerHint, errors);

  if ('sender' in intent) {
    errors.push({
      code: 'forbidden-field',
      message: 'Intent request does not define a caller-supplied sender field',
      field: 'request.sender',
    });
  }
}

/** Validate the NAP-INTENT recommendation: a kind 35129 coordinate plus optional relay hints. */
function validateIntentHandlerHint(hint: unknown, errors: EnvelopeError[]): void {
  if (kindOf(hint) !== 'object') {
    errors.push({ code: 'wrong-type', message: 'Intent request field "handlerHint" must be an object', field: 'request.handlerHint' });
    return;
  }
  const { address, relays } = hint as Record<string, unknown>;
  if (typeof address !== 'string' || !/^35129:[0-9a-f]{64}:.+$/s.test(address)) {
    errors.push({
      code: address === undefined ? 'missing-field' : 'wrong-type',
      message: 'Intent handler hint "address" must be a 35129:<pubkey>:<d> coordinate',
      field: 'request.handlerHint.address',
    });
  }
  if (relays !== undefined && !(Array.isArray(relays) && relays.every((relay) => typeof relay === 'string'))) {
    errors.push({ code: 'wrong-type', message: 'Intent handler hint "relays" must be an array of strings', field: 'request.handlerHint.relays' });
  }
}

function validateServerHints(value: unknown, field: string, errors: EnvelopeError[]): void {
  if (Array.isArray(value) && value.every((server) => typeof server === 'string')) return;
  errors.push({
    code: 'wrong-type',
    message: `Field "${field}" must be an array of strings`,
    field,
  });
}

/** Validate NAP-RESOURCE request metadata without applying shell-owned network policy. */
function validateResourceRequestFields(record: Record<string, unknown>, errors: EnvelopeError[]): void {
  if (record.servers !== undefined) validateServerHints(record.servers, 'servers', errors);
}

function validateResourceBytesManyRequests(requests: unknown, errors: EnvelopeError[]): void {
  if (!Array.isArray(requests)) return;
  if (requests.length === 0) {
    errors.push({
      code: 'invalid-resource-request',
      message: 'Field "requests" must contain at least one resource request',
      field: 'requests',
    });
    return;
  }

  for (const [index, request] of requests.entries()) {
    const field = `requests[${index}]`;
    if (typeof request !== 'object' || request === null || Array.isArray(request)) {
      errors.push({
        code: 'invalid-resource-request',
        message: `Field "${field}" must be a resource request object`,
        field,
      });
      continue;
    }
    const entry = request as Record<string, unknown>;
    if (typeof entry.url !== 'string') {
      errors.push({
        code: entry.url === undefined ? 'missing-field' : 'wrong-type',
        message: `Field "${field}.url" must be a string`,
        field: `${field}.url`,
      });
    }
    if (entry.servers !== undefined) validateServerHints(entry.servers, `${field}.servers`, errors);
  }
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
  const isKnownDomain = (NAP_DOMAINS as readonly string[]).includes(domain);
  if (!isKnownDomain) {
    return { ok: false, type, domain, errors: [{ code: 'unknown-domain', message: `"${domain}" is not a known NAP domain` }] };
  }

  const spec = ENVELOPE_SPECS[type];
  if (!spec) {
    return { ok: false, type, domain, errors: [{ code: 'unknown-type', message: `"${type}" is not a known ${domain} message type` }] };
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

  if (spec.dir === 'in') {
    return {
      ok: false,
      type,
      domain,
      direction: 'in',
      errors: [
        { code: 'inbound-type-emitted', message: `"${type}" is a shell→napplet message; a napplet must not emit it` },
        ...errors,
      ],
    };
  }

  for (const field of spec.forbiddenFields ?? []) {
    if (field in record) {
      errors.push({
        code: 'forbidden-field',
        message: `Field "${field}" must be runtime-derived and cannot be emitted by a napplet`,
        field,
      });
    }
  }

  if (type === 'intent.invoke') {
    validateIntentInvokeRequest(record.request, errors);
  }
  if (type === 'resource.bytes') {
    validateResourceRequestFields(record, errors);
  }
  if (type === 'resource.bytesMany') {
    validateResourceBytesManyRequests(record.requests, errors);
  }

  return { ok: errors.length === 0, type, domain, direction: 'out', errors };
}

/** Every envelope `type` known to the validator. */
export function knownEnvelopeTypes(): string[] {
  return Object.keys(ENVELOPE_SPECS);
}
