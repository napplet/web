import type { ReferenceEndpoint } from './reference-responses.js';

type RecordValue = Record<string, unknown>;
interface Session { jobs: Map<string, RecordValue>; usedIds: Set<string> }
const object = (value: unknown): RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as RecordValue : {};
const MUTABLE_SETTINGS = ['downloadLimitBytesPerSecond', 'uploadLimitBytesPerSecond', 'seedAfterComplete', 'trackers', 'webSeeds'];
const CAPABILITIES = {
  transports: ['reference'], modes: ['download', 'download-and-seed'], formats: [], createFormats: [], retentions: ['session'],
  mutableSettings: MUTABLE_SETTINGS, maxReadBytes: 1048576, maxReadWaitMs: 30000, maxPendingReads: 1, maxMetainfoBytes: 1048576,
  canSaveFiles: false, canOpenFiles: false, canSeedRuntimeFiles: false,
  canUseDht: false, canUseTrackers: false, canUseWebSeeds: false,
};

function decodeV1(value: string): string | undefined {
  if (/^[0-9a-fA-F]{40}$/.test(value)) return value.toLowerCase();
  if (!/^[A-Z2-7]{32}$/i.test(value)) return undefined;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of value.toUpperCase()) bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  return bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2).toString(16).padStart(2, '0')).join('');
}

/** Parse claimed magnet identities only. This fixture cannot verify metainfo or content. */
function magnetHashes(value: unknown): RecordValue | undefined {
  if (typeof value !== 'string') return undefined;
  let uri: URL;
  try { uri = new URL(value); } catch { return undefined; }
  if (uri.protocol !== 'magnet:') return undefined;
  const hashes: RecordValue = {};
  for (const xt of uri.searchParams.getAll('xt')) {
    const decoded = xt.startsWith('urn:btih:') ? decodeV1(xt.slice(9)) : undefined;
    const kind = decoded ? 'v1' : /^urn:btmh:1220[0-9a-fA-F]{64}$/.test(xt) ? 'v2' : undefined;
    if (!kind) return undefined;
    const hash = decoded ?? xt.slice(13).toLowerCase();
    if (hashes[kind] !== undefined && hashes[kind] !== hash) return undefined;
    hashes[kind] = hash;
  }
  return Object.keys(hashes).length ? hashes : undefined;
}

function initialSettings(options: RecordValue): RecordValue {
  return {
    revision: 0, downloadLimitBytesPerSecond: options.downloadLimitBytesPerSecond ?? 0,
    uploadLimitBytesPerSecond: options.uploadLimitBytesPerSecond ?? 0,
    seedAfterComplete: options.mode === 'download-and-seed', trackers: options.trackers ?? [], webSeeds: options.webSeeds ?? [],
    endpointsRedacted: false,
  };
}

function addJob(session: Session, request: RecordValue, nextId: () => string): RecordValue {
  const source = object(request.source);
  const options = object(request.options);
  if (!['auto', 'reference'].includes(String(options.transport ?? 'auto'))) return { ok: false, error: 'unsupported-transport' };
  if (!['download', 'download-and-seed'].includes(String(options.mode ?? 'download'))) return { ok: false, error: 'unsupported-mode' };
  if (options.retention === 'persistent') return { ok: false, error: 'unsupported' };
  if (source.sourceType !== 'infohash' && source.sourceType !== 'magnet') return { ok: false, error: 'unsupported-source' };
  const hashes = source.sourceType === 'infohash' ? object(source.hashes) : magnetHashes(source.magnet);
  if (!hashes) return { ok: false, error: 'invalid-magnet' };
  const jobId = typeof request.jobId === 'string' ? request.jobId : nextId();
  if (session.usedIds.has(jobId)) return { ok: false, error: 'job-conflict' };
  const status: RecordValue = {
    ok: true, jobId, state: options.startPaused === true ? 'paused' : 'metadata', mode: options.mode ?? 'download',
    transport: 'reference', hashes, downloadedBytes: 0, uploadedBytes: 0, downloadRate: 0, uploadRate: 0, ratio: 0,
    peers: { peers: 0, seeds: 0, leeches: 0 }, settings: initialSettings(options), retention: 'session',
  };
  if (options.storage !== undefined) status.storage = options.storage;
  session.usedIds.add(jobId);
  session.jobs.set(jobId, structuredClone(status));
  return { ok: true, jobId, state: status.state };
}

function updateJob(job: RecordValue, request: RecordValue): RecordValue {
  const settings = object(job.settings);
  const patch = object(request.patch);
  if (Object.keys(patch).some((key) => !MUTABLE_SETTINGS.includes(key))) return { ok: false, error: 'unsupported-setting' };
  if (request.expectedRevision !== settings.revision) {
    return { ok: false, error: 'revision-conflict', settings: structuredClone(settings) };
  }
  const changed = Object.entries(patch).some(([key, value]) => JSON.stringify(settings[key]) !== JSON.stringify(value));
  if (changed) {
    job.settings = { ...settings, ...structuredClone(patch), revision: Number(settings.revision) + 1 };
    if (typeof patch.seedAfterComplete === 'boolean') job.mode = patch.seedAfterComplete ? 'download-and-seed' : 'download';
  }
  return { ok: true, settings: structuredClone(job.settings) };
}

function summary(job: RecordValue): RecordValue {
  const fields = ['jobId', 'state', 'mode', 'transport', 'hashes', 'progress', 'downloadRate', 'uploadRate', 'ratio', 'title', 'retention'];
  return Object.fromEntries(fields.filter((field) => job[field] !== undefined).map((field) => [field, job[field]]));
}

function jobReply(session: Session, type: string, envelope: RecordValue): RecordValue {
  const request = object(envelope.request);
  const jobId = String(envelope.jobId ?? request.jobId);
  const job = session.jobs.get(jobId);
  const payloadResult = ['torrent.metadata', 'torrent.read', 'torrent.exportMetainfo', 'torrent.saveFile', 'torrent.openFile', 'torrent.update'];
  if (type === 'torrent.remove') {
    if (!job) return { result: { ok: false, jobId, error: 'job-not-found' } };
    session.jobs.delete(jobId);
    return { result: { ok: true, jobId, deletedData: false } };
  }
  if (!job) return payloadResult.includes(type) ? { result: { ok: false, error: 'job-not-found' } } : { error: 'job-not-found' };
  if (type === 'torrent.update') return { result: updateJob(job, request) };
  if (type === 'torrent.saveFile' || type === 'torrent.openFile') return { result: { ok: false, error: 'unsupported' } };
  if (payloadResult.includes(type)) return { result: { ok: false, error: 'metadata-unavailable' } };
  if (type === 'torrent.files') return { files: [] };
  if (type === 'torrent.pause') job.state = 'paused';
  if (type === 'torrent.resume') job.state = 'metadata';
  return { status: structuredClone(job) };
}

/** Deterministic session jobs/settings only. This fixture has no network, verified metadata, or file backend. */
export function createTorrentHandlers() {
  const sessions = new Map<string, Session>();
  let sequence = 0;
  function sessionFor(endpoint: ReferenceEndpoint): Session {
    let session = sessions.get(endpoint.id);
    if (!session) { session = { jobs: new Map(), usedIds: new Set() }; sessions.set(endpoint.id, session); }
    return session;
  }
  function handle(endpoint: ReferenceEndpoint, envelope: RecordValue): unknown[] {
    const type = String(envelope.type);
    const respond = (fields: RecordValue) => [{ type: `${type}.result`, id: envelope.id, ...fields }];
    if (type === 'torrent.capabilities') return respond({ capabilities: structuredClone(CAPABILITIES) });
    if (type === 'torrent.pickFiles') return respond({ result: { ok: false, error: 'unsupported' } });
    // Every reference operation completes synchronously. No request remains cancellable after handle returns.
    if (type === 'torrent.cancel') return respond({ result: { ok: true, cancelled: false } });
    const session = sessionFor(endpoint);
    if (type === 'torrent.jobs') {
      const filter = object(envelope.filter);
      return respond({ jobs: structuredClone([...session.jobs.values()].filter((job) =>
        (!Array.isArray(filter.states) || filter.states.includes(job.state))
        && (!Array.isArray(filter.modes) || filter.modes.includes(job.mode))).map(summary)) });
    }
    if (type !== 'torrent.add') return respond(jobReply(session, type, envelope));
    const ack = addJob(session, object(envelope.request), () => `reference-torrent-${++sequence}`);
    const responses: unknown[] = respond({ ack });
    if (ack.ok) responses.push({ type: 'torrent.state', jobId: ack.jobId, state: ack.state, status: session.jobs.get(String(ack.jobId)) });
    return structuredClone(responses);
  }
  return { handle, reset() { sessions.clear(); sequence = 0; } };
}
