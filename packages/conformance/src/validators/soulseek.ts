import type { EnvelopeError } from './envelope-types.js';

/**
 * NAP-SOULSEEK request schema checks for napplet-emitted envelopes.
 * Living proposal: https://github.com/napplet/naps/pull/135 (Schemas, Wire Protocol).
 *
 * Every request carries `type`, `id`, and exactly the parameters in its API row.
 * Text is nonempty Unicode without U+0000; handles are opaque nonempty text; byte
 * offsets are canonical unsigned decimal text up to 2^64-1; other integers are
 * safe nonnegative integers. These checks test the napplet's emitted request, not
 * runtime authorization, ownership, or policy limits.
 */

type Check = (value: unknown) => boolean;
type Fields = Record<string, Check>;

const MAX_UINT64 = (1n << 64n) - 1n;

const text: Check = (value) => typeof value === 'string' && value.length > 0 && !value.includes('\u0000')
  && !/\p{Surrogate}/u.test(value);
const searchText: Check = (value) => text(value) && /\S/.test(value as string);
const uint: Check = (value) => Number.isSafeInteger(value) && (value as number) >= 0;
const positive: Check = (value) => uint(value) && (value as number) > 0;
/** Canonical unsigned decimal text: `"0"`, or digits without a leading zero, at most 18446744073709551615. */
export const decimalText: Check = (value) =>
  typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) <= MAX_UINT64;
const handleKind: Check = (value) => value === 'query' || value === 'transfer';

function exactRecord(required: Fields, optional: Fields = {}): Check {
  return (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const data = value as Record<string, unknown>;
    if (Object.keys(data).some((key) => !(key in required) && !(key in optional))) return false;
    return Object.entries(required).every(([key, check]) => check(data[key]))
      && Object.entries(optional).every(([key, check]) => data[key] === undefined || check(data[key]));
  };
}

const PAYLOADS: Record<string, { required?: Fields; optional?: Fields }> = {
  'soulseek.info': {},
  'soulseek.search': { required: { request: exactRecord({ text: searchText }, { username: text }) } },
  'soulseek.browse': { required: { username: text } },
  'soulseek.results': { required: { queryId: text }, optional: { after: uint, limit: positive } },
  'soulseek.stop': { required: { queryId: text } },
  'soulseek.download': { required: { fileId: text } },
  'soulseek.transfers': {},
  'soulseek.status': { required: { transferId: text } },
  'soulseek.pause': { required: { transferId: text } },
  'soulseek.resume': { required: { transferId: text } },
  'soulseek.cancel': { required: { transferId: text } },
  'soulseek.read': { required: { transferId: text, offset: decimalText, length: positive } },
  'soulseek.save': { required: { transferId: text } },
  'soulseek.release': { required: { kind: handleKind, handle: text } },
};

/**
 * Validate a NAP-SOULSEEK request's parameters against the living schema.
 * @param type Envelope discriminant, already known to be a soulseek request.
 * @param envelope The napplet-emitted request.
 * @param errors Accumulator for validation problems.
 */
export function validateSoulseekRequest(type: string, envelope: Record<string, unknown>, errors: EnvelopeError[]): void {
  const schema = PAYLOADS[type];
  if (!schema) return;
  const required = schema.required ?? {};
  const optional = schema.optional ?? {};
  for (const field of Object.keys(envelope)) {
    if (field === 'type' || field === 'id' || field in required || field in optional) continue;
    errors.push({ code: 'forbidden-field', field,
      message: `Field "${field}" is not a parameter of ${type}; NAP-SOULSEEK requests carry exactly their API row parameters` });
  }
  for (const [field, check] of Object.entries({ ...required, ...optional })) {
    const value = envelope[field];
    if (value === undefined) {
      if (field in required) errors.push({ code: 'missing-field', field, message: `Field "${field}" is required by ${type}` });
      continue;
    }
    if (!check(value)) {
      errors.push({ code: 'wrong-type', field, message: `Field "${field}" must match the NAP-SOULSEEK ${type} schema` });
    }
  }
}
