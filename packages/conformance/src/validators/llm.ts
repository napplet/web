import type { EnvelopeError } from './envelope-types.js';

/**
 * NAP-LLM request schema checks for napplet-emitted envelopes.
 * Living proposal: https://github.com/napplet/naps/pull/134 (Schemas, Wire Protocol).
 *
 * Every request carries `type`, a nonempty `id`, and exactly the parameters in
 * its API row. Input records reject unknown fields and explicit `null`; optional
 * fields may be omitted. Image data is standard padded base64 without whitespace.
 * These checks test the napplet's emitted request, not runtime policy limits,
 * selection ownership, or consent.
 */

type Check = (value: unknown) => boolean;
type Fields = Record<string, Check>;

const text: Check = (value) => typeof value === 'string';
const nonemptyText: Check = (value) => typeof value === 'string' && value.length > 0;
const boolean: Check = (value) => typeof value === 'boolean';
const oneOf = (...allowed: readonly string[]): Check => (value) => typeof value === 'string' && allowed.includes(value);
/** RFC 4648 standard alphabet, padded, no whitespace, at least one quantum. */
const base64: Check = (value) =>
  typeof value === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value) && value.length >= 4;

function exactRecord(required: Fields, optional: Fields = {}): Check {
  return (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const data = value as Record<string, unknown>;
    if (Object.keys(data).some((key) => !(key in required) && !(key in optional))) return false;
    return Object.entries(required).every(([key, check]) => check(data[key]))
      && Object.entries(optional).every(([key, check]) => data[key] === undefined || check(data[key]));
  };
}

const nonemptyList = (item: Check): Check => (value) => Array.isArray(value) && value.length > 0 && value.every(item);

const textPart = exactRecord({ type: oneOf('text'), text });
const imagePart = exactRecord({ type: oneOf('image'), mimeType: oneOf('image/png', 'image/jpeg', 'image/webp'), data: base64 });
const part: Check = (value) => textPart(value) || imagePart(value);
const message = exactRecord({ role: oneOf('system', 'user', 'assistant'), content: nonemptyList(part) });
const requirements = exactRecord({}, { model: nonemptyText, images: boolean, json: boolean });
const generationRequest = exactRecord({ handle: nonemptyText, messages: nonemptyList(message) }, { format: oneOf('text', 'json') });

const PAYLOADS: Record<string, { required?: Fields; optional?: Fields }> = {
  'llm.select': { optional: { requirements } },
  'llm.describe': { required: { handle: nonemptyText } },
  'llm.generate': { required: { request: generationRequest } },
  'llm.cancel': { required: { requestId: nonemptyText } },
};

/**
 * Validate a NAP-LLM request's parameters against the living schema.
 * @param type Envelope discriminant, already known to be an llm request.
 * @param envelope The napplet-emitted request.
 * @param errors Accumulator for validation problems.
 */
export function validateLlmRequest(type: string, envelope: Record<string, unknown>, errors: EnvelopeError[]): void {
  const schema = PAYLOADS[type];
  if (!schema) return;
  const required = schema.required ?? {};
  const optional = schema.optional ?? {};
  if (envelope.id !== undefined && !nonemptyText(envelope.id)) {
    errors.push({ code: 'wrong-type', field: 'id', message: 'NAP-LLM request ids are non-empty text' });
  }
  for (const field of Object.keys(envelope)) {
    if (field === 'type' || field === 'id' || field in required || field in optional) continue;
    errors.push({ code: 'forbidden-field', field,
      message: `Field "${field}" is not a parameter of ${type}; NAP-LLM requests carry exactly their API row parameters` });
  }
  for (const [field, check] of Object.entries({ ...required, ...optional })) {
    const value = envelope[field];
    if (value === undefined) {
      if (field in required) errors.push({ code: 'missing-field', field, message: `Field "${field}" is required by ${type}` });
      continue;
    }
    if (!check(value)) {
      errors.push({ code: 'wrong-type', field, message: `Field "${field}" must match the NAP-LLM ${type} schema` });
    }
  }
}
