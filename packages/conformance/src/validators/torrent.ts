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
const storage = choice('temporary', 'persistent', 'user-selected');

function record(required: Fields, optional: Fields = {}): Check {
  return (value) => {
    if (!object(value)) return false;
    const data = value as Record<string, unknown>;
    return Object.entries(required).every(([key, check]) => check(data[key]))
      && Object.entries(optional).every(([key, check]) => data[key] === undefined || check(data[key]));
  };
}

const file = record({ path: text }, { size: uint });
const reference = record({ prefix: text, value: text });
const descriptor = record({ infoHash: text, files: list(file), trackers: list(text), tags: list(text), references: list(reference) }, {
  title: text, description: text, magnet: text, eventId: text, author: text, createdAt: uint, result: object,
});
const selection = record({}, { indexes: list(uint), paths: list(text), priority: integer });
const source = record({ sourceType: choice('nip35', 'magnet', 'infohash', 'metainfo', 'runtime-file-set') }, {
  event: object, descriptor, magnet: text, infoHash: text, runtimeFileSetId: text,
  // The NAP declares metainfo as bstr but leaves its JSON encoding unspecified; do not invent a restriction.
});
const addOptions = record({}, {
  mode, transport: text, startPaused: bool, seedAfterComplete: bool,
  downloadLimitBytesPerSecond: uint, uploadLimitBytesPerSecond: uint, storage,
  trackers: list(text), webSeeds: list(text), fileSelection: selection,
});

const PAYLOADS: Record<string, { required?: Fields; optional?: Fields }> = {
  'torrent.fromEvent': { required: { event: object } },
  'torrent.toMagnet': { required: { descriptor } },
  'torrent.search': { required: { query: record({}, {
    text, infoHash: text, tags: list(text), references: list(reference), authors: list(text), since: uint, until: uint, limit: uint,
  }) } },
  'torrent.publish': { required: { request: record({ descriptor }, { content: text, relays: list(text), publish: bool }) } },
  'torrent.comment': { required: { request: record({ torrentEventId: text, torrentAuthor: text, content: text }, { relays: list(text) }) } },
  'torrent.pickFiles': { optional: { options: record({}, { multiple: bool, suggestedName: text }) } },
  'torrent.add': { required: { request: record({ source }, { jobId: text, options: addOptions }) } },
  'torrent.jobs': { optional: { filter: record({}, { states: list(state), modes: list(mode) }) } },
  'torrent.selectFiles': { required: { selection } },
  'torrent.remove': { optional: { options: record({}, { deleteData: bool }) } },
};

/** Validate published NAP-TORRENT request records without imposing backend policy. */
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
