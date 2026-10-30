import type { EnvelopeError } from './envelope-types.js';

const HASH = /^[0-9a-f]{64}$/;
const uint = (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const text = (value: unknown): boolean => typeof value === 'string';
const hash = (value: unknown): boolean => typeof value === 'string' && HASH.test(value);
function bytes(value: unknown): boolean {
  if (value instanceof Blob) return true;
  try {
    // The intrinsic getter accepts cross-realm buffers but rejects toStringTag spoofs.
    Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')!.get!.call(value);
    return true;
  } catch { return false; }
}

type FieldCheck = (value: unknown) => boolean;
const REQUEST_FIELDS: Record<string, Record<string, FieldCheck>> = {
  check: { server: text, sha256: hash },
  get: { server: text, sha256: hash },
  checkUpload: { server: text, sha256: hash, size: uint, type: text },
  upload: { server: text, data: bytes },
  mirror: { server: text, url: text },
  checkMedia: { server: text, sha256: hash, size: uint, type: text },
  media: { server: text, data: bytes },
  list: { server: text, pubkey: hash },
  delete: { server: text, sha256: hash },
  addServer: { server: text },
};
const AUTH_FIELDS = ['auth', 'purpose'];
const OPTIONAL_BY_ACTION: Record<string, string[]> = {
  check: [...AUTH_FIELDS, 'extension'],
  get: [...AUTH_FIELDS, 'extension', 'range'],
  checkUpload: AUTH_FIELDS,
  upload: [...AUTH_FIELDS, 'sha256', 'size', 'type'],
  mirror: [...AUTH_FIELDS, 'sha256'],
  checkMedia: AUTH_FIELDS,
  media: [...AUTH_FIELDS, 'sha256', 'size', 'type'],
  list: [...AUTH_FIELDS, 'cursor', 'limit'],
  delete: [...AUTH_FIELDS, 'extension'],
  addServer: ['position'],
};
const OPTIONAL_FIELDS: Record<string, FieldCheck> = {
  sha256: hash, size: uint, type: text, extension: text, range: text,
  cursor: hash, limit: uint, position: uint, purpose: text,
  auth: (value) => value === 'auto' || value === 'required' || value === 'none',
};

/** Validate NAP-BLOSSOM Schemas, leaving endpoint and network policy to the shell. */
export function validateBlossomFields(record: Record<string, unknown>, errors: EnvelopeError[]): void {
  const action = String(record.type).slice('blossom.'.length);
  if (action === 'reorderServers' && Array.isArray(record.servers) && !record.servers.every(text)) {
    errors.push({ code: 'wrong-type', field: 'servers', message: 'Blossom servers must be an array of strings' });
  }
  const fields = REQUEST_FIELDS[action];
  if (!fields || !record.request || typeof record.request !== 'object' || Array.isArray(record.request)) return;
  const request = record.request as Record<string, unknown>;
  const optional = Object.fromEntries((OPTIONAL_BY_ACTION[action] ?? []).map(name => [name, OPTIONAL_FIELDS[name]]));
  for (const [name, check] of Object.entries({ ...optional, ...fields })) {
    const value = request[name];
    if (value === undefined && !(name in fields)) continue;
    if (!check(value)) {
      errors.push({
        code: value === undefined ? 'missing-field' : 'wrong-type',
        field: `request.${name}`,
        message: `Blossom request field "${name}" must match the NAP-BLOSSOM schema`,
      });
    }
  }
}
