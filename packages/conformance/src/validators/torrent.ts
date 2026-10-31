import type { EnvelopeError } from './envelope-types.js';

type Check = (value: unknown) => boolean;
type Fields = Record<string, Check>;
const text: Check = (value) => typeof value === 'string';
const bool: Check = (value) => typeof value === 'boolean';
const uint: Check = (value) => Number.isSafeInteger(value) && Number(value) >= 0;
const integer: Check = (value) => Number.isSafeInteger(value);
const object: Check = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (check: Check): Check => (value) => Array.isArray(value) && value.every(check);
const choice = (...values: string[]): Check => (value) => typeof value === 'string' && values.includes(value);
const mode = choice('download', 'seed', 'download-and-seed');
const state = choice('queued', 'metadata', 'downloading', 'seeding', 'paused', 'complete', 'cancelled', 'error');
const format = choice('v1', 'v2', 'hybrid');
const storage = choice('temporary', 'persistent', 'user-selected');

function record(required: Fields, optional: Fields = {}): Check {
  return (value) => {
    if (!object(value)) return false;
    const data = value as Record<string, unknown>;
    return Object.entries(required).every(([key, check]) => check(data[key]))
      && Object.entries(optional).every(([key, check]) => data[key] === undefined || check(data[key]));
  };
}

const hash = (length: number): Check => (value) => typeof value === 'string' && new RegExp(`^[0-9a-f]{${length}}$`).test(value);
const hashes: Check = (value) => record({}, { v1: hash(40), v2: hash(64) })(value)
  && ((value as Record<string, unknown>).v1 !== undefined || (value as Record<string, unknown>).v2 !== undefined);
const selection = record({}, { indexes: list(uint), paths: list(text), priority: integer });
const sourceFields: Record<string, string> = { magnet: 'magnet', infohash: 'hashes', metainfo: 'metainfo', 'runtime-file-set': 'runtimeFileSetId' };
const source: Check = (value) => {
  if (!record({ sourceType: choice(...Object.keys(sourceFields)) }, { magnet: text, hashes, runtimeFileSetId: text })(value)) return false;
  const data = value as Record<string, unknown>;
  const selected = sourceFields[String(data.sourceType)];
  // Metainfo input is projection-defined. Check presence without inventing a byte encoding.
  return data[selected] !== undefined && Object.values(sourceFields).every((field) => field === selected || data[field] === undefined)
    && ['event', 'descriptor', 'infoHash'].every((field) => data[field] === undefined);
};
const settings = {
  downloadLimitBytesPerSecond: uint, uploadLimitBytesPerSecond: uint, seedAfterComplete: bool,
  trackers: list(text), webSeeds: list(text),
};
const addOptions = record({}, { mode, transport: text, startPaused: bool, storage, ...settings,
  fileSelection: selection, retention: choice('session', 'persistent'), createFormat: format });
const addRequest: Check = (value) => {
  if (!record({ source }, { jobId: text, options: addOptions })(value)) return false;
  const request = value as { source: Record<string, unknown>; options?: Record<string, unknown> };
  const options = request.options ?? {};
  if (options.createFormat !== undefined && request.source.sourceType !== 'runtime-file-set') return false;
  return options.seedAfterComplete === undefined || options.seedAfterComplete === ((options.mode ?? 'download') !== 'download');
};
const readRequest: Check = (value) => {
  if (!record({ jobId: text, fileIndex: uint, offset: uint, length: uint }, { waitMs: uint })(value)) return false;
  const request = value as Record<string, number>;
  return request.length > 0 && request.length <= 1048576 && (request.waitMs ?? 0) <= 30000
    && Number.isSafeInteger(request.offset + request.length);
};
const patch: Check = (value) => record({}, settings)(value) && Object.keys(value as object).length > 0;
const PAYLOADS: Record<string, { required?: Fields; optional?: Fields }> = {
  'torrent.pickFiles': { optional: { options: record({}, { multiple: bool, suggestedName: text }) } },
  'torrent.add': { required: { request: addRequest } },
  'torrent.jobs': { optional: { filter: record({}, { states: list(state), modes: list(mode) }) } },
  'torrent.selectFiles': { required: { selection } },
  'torrent.remove': { optional: { options: record({}, { deleteData: bool }) } },
  'torrent.read': { required: { request: readRequest } },
  'torrent.saveFile': { required: { fileIndex: uint } },
  'torrent.openFile': { required: { fileIndex: uint } },
  'torrent.update': { required: { request: record({ jobId: text, expectedRevision: uint, patch }) } },
};

/** Validate NAP-TORRENT requests without replacing runtime authorization or backend policy. */
export function validateTorrentRequest(type: string, envelope: Record<string, unknown>, errors: EnvelopeError[]): void {
  const schema = PAYLOADS[type];
  if (!schema) return;
  for (const [field, check] of Object.entries({ ...schema.required, ...schema.optional })) {
    if (envelope[field] === undefined && !(field in (schema.required ?? {}))) continue;
    if (!check(envelope[field])) {
      errors.push({ code: envelope[field] === undefined ? 'missing-field' : 'wrong-type', field,
        message: `Field "${field}" must match the NAP-TORRENT ${type} schema` });
    }
  }
}
