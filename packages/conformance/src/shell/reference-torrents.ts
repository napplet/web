import type { ReferenceEndpoint } from './reference-responses.js';

type RecordValue = Record<string, unknown>;
const HASH = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;
const object = (value: unknown): RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as RecordValue : {};

function hasEventIdentity(event: RecordValue): boolean {
  return typeof event.id === 'string' && HEX64.test(event.id)
    && typeof event.pubkey === 'string' && HEX64.test(event.pubkey)
    && typeof event.sig === 'string' && HEX128.test(event.sig)
    && Number.isSafeInteger(event.created_at) && Number(event.created_at) >= 0;
}

/** NIP-35 conversion fixture. No relay lookup or signature verification is performed. */
function fromEvent(value: unknown): RecordValue {
  const event = object(value);
  const tags = event.tags;
  if (!hasEventIdentity(event) || event.kind !== 2003 || typeof event.content !== 'string' || !Array.isArray(tags)
    || !tags.every((tag) => Array.isArray(tag) && tag.every((entry) => typeof entry === 'string'))) {
    return { ok: false, error: 'invalid-event' };
  }
  const rows = tags as string[][];
  const infoHash = rows.find((tag) => tag[0] === 'x')?.[1];
  if (!infoHash || !HASH.test(infoHash)) return { ok: false, error: 'invalid-infohash' };
  const files = rows.filter((tag) => tag[0] === 'file' && tag[1] !== undefined).map((tag) => {
    const size = Number(tag[2]);
    return { path: tag[1], ...(tag[2] !== undefined && /^\d+$/.test(tag[2]) && Number.isSafeInteger(size) ? { size } : {}) };
  });
  const references = rows.filter((tag) => tag[0] === 'i' && tag[1]?.includes(':')).map((tag) => {
    const index = tag[1].indexOf(':');
    return { prefix: tag[1].slice(0, index), value: tag[1].slice(index + 1) };
  });
  const descriptor: RecordValue = {
    infoHash, description: event.content, files, references,
    trackers: rows.filter((tag) => tag[0] === 'tracker' && tag[1] !== undefined).map((tag) => tag[1]),
    tags: rows.filter((tag) => tag[0] === 't' && tag[1] !== undefined).map((tag) => tag[1]),
    result: { event },
  };
  const title = rows.find((tag) => tag[0] === 'title')?.[1];
  if (title !== undefined) descriptor.title = title;
  if (typeof event.id === 'string') descriptor.eventId = event.id;
  if (typeof event.pubkey === 'string') descriptor.author = event.pubkey;
  if (Number.isSafeInteger(event.created_at) && Number(event.created_at) >= 0) descriptor.createdAt = event.created_at;
  return { ok: true, descriptor };
}

function toMagnet(value: unknown): RecordValue {
  const descriptor = object(value);
  if (typeof descriptor.infoHash !== 'string' || !HASH.test(descriptor.infoHash)) return { ok: false, error: 'invalid-infohash' };
  let magnet = `magnet:?xt=urn:btih:${descriptor.infoHash}`;
  if (typeof descriptor.title === 'string') magnet += `&dn=${encodeURIComponent(descriptor.title)}`;
  for (const tracker of Array.isArray(descriptor.trackers) ? descriptor.trackers : []) {
    if (typeof tracker === 'string') magnet += `&tr=${encodeURIComponent(tracker)}`;
  }
  return { ok: true, magnet };
}

function sourceHash(source: RecordValue): string | undefined {
  if (source.sourceType === 'infohash') return typeof source.infoHash === 'string' ? source.infoHash : undefined;
  if (source.sourceType === 'nip35') {
    const descriptor = source.event === undefined ? object(source.descriptor) : object(fromEvent(source.event).descriptor);
    return typeof descriptor.infoHash === 'string' ? descriptor.infoHash : undefined;
  }
  if (source.sourceType === 'magnet' && typeof source.magnet === 'string') {
    try {
      const uri = new URL(source.magnet);
      if (uri.protocol !== 'magnet:') return undefined;
      return uri.searchParams.getAll('xt').find((value) => value.startsWith('urn:btih:'))?.slice(9);
    } catch { return undefined; }
  }
  return undefined;
}

function handleJob(
  jobs: Map<string, RecordValue>, type: string, envelope: RecordValue, respond: (fields: RecordValue) => unknown[],
): unknown[] {
  const jobId = String(envelope.jobId);
  const job = jobs.get(jobId);
  if (type === 'torrent.remove') {
    if (!job) return respond({ result: { ok: false, jobId, error: 'job-not-found' } });
    jobs.delete(jobId);
    return respond({ result: { ok: true, jobId, deletedData: false } });
  }
  if (!job) return respond({ error: 'job-not-found' });
  if (type === 'torrent.files') return respond({ files: [] });
  if (type === 'torrent.pause') job.state = 'paused';
  if (type === 'torrent.resume') job.state = 'metadata';
  return respond({ status: structuredClone(job) });
}

/** Deterministic reference jobs. This fixture never transfers bytes or signs events. */
export function createTorrentHandlers() {
  const jobsByEndpoint = new Map<string, Map<string, RecordValue>>();
  let sequence = 0;
  const jobsFor = (endpoint: ReferenceEndpoint) => {
    let jobs = jobsByEndpoint.get(endpoint.id);
    if (!jobs) { jobs = new Map(); jobsByEndpoint.set(endpoint.id, jobs); }
    return jobs;
  };

  function add(jobs: Map<string, RecordValue>, request: RecordValue): RecordValue {
    const source = object(request.source);
    const options = object(request.options);
    if (options.transport !== undefined && options.transport !== 'auto' && options.transport !== 'reference') {
      return { ok: false, error: 'unsupported-transport' };
    }
    if (options.mode !== undefined && options.mode !== 'download') return { ok: false, error: 'unsupported-mode' };
    if (source.sourceType === 'runtime-file-set' || source.sourceType === 'metainfo') return { ok: false, error: 'unsupported-source' };
    const infoHash = sourceHash(source);
    if (!infoHash || !HASH.test(infoHash)) return { ok: false, error: 'invalid-infohash' };
    const jobId = typeof request.jobId === 'string' ? request.jobId : `reference-torrent-${++sequence}`;
    if (jobs.has(jobId)) return { ok: false, error: 'policy-denied', reason: 'Job id is already in use' };
    const status = {
      ok: true, jobId, state: options.startPaused === true ? 'paused' : 'metadata', mode: 'download', transport: 'reference',
      infoHash, downloadedBytes: 0, uploadedBytes: 0, totalBytes: 0, progress: 0, downloadRate: 0, uploadRate: 0, ratio: 0,
      peers: { peers: 0, seeds: 0, leeches: 0 },
    };
    jobs.set(jobId, status);
    return { ok: true, jobId, state: status.state };
  }

  function handle(endpoint: ReferenceEndpoint, envelope: RecordValue): unknown[] {
    const type = String(envelope.type);
    const respond = (fields: RecordValue) => [{ type: `${type}.result`, id: envelope.id, ...fields }];
    const direct: Record<string, () => RecordValue> = {
      'torrent.capabilities': () => ({ capabilities: {
        transports: ['reference'], modes: ['download'], canPublishNip35: false, canComment: false, canSeedRuntimeFiles: false,
        canUseDht: false, canUseTrackers: false, canUseWebSeeds: false,
      } }),
      'torrent.fromEvent': () => ({ result: fromEvent(envelope.event) }),
      'torrent.toMagnet': () => ({ result: toMagnet(envelope.descriptor) }),
      'torrent.search': () => ({ results: [] }),
    };
    if (direct[type]) return respond(direct[type]());
    if (['torrent.publish', 'torrent.comment', 'torrent.pickFiles'].includes(type)) {
      return respond({ result: { ok: false, error: 'unsupported', reason: 'Reference shell has no signer or file picker' } });
    }
    const jobs = jobsFor(endpoint);
    if (type === 'torrent.jobs') {
      const filter = object(envelope.filter);
      return respond({ jobs: structuredClone([...jobs.values()].filter((job) =>
        (!Array.isArray(filter.states) || filter.states.includes(job.state))
        && (!Array.isArray(filter.modes) || filter.modes.includes(job.mode)))) });
    }
    if (type === 'torrent.add') {
      const ack = add(jobs, object(envelope.request));
      const responses: unknown[] = respond({ ack });
      if (ack.ok) responses.push({ type: 'torrent.state', jobId: ack.jobId, state: ack.state, status: jobs.get(String(ack.jobId)) });
      return structuredClone(responses);
    }
    return handleJob(jobs, type, envelope, respond);
  }

  return { handle, reset() { jobsByEndpoint.clear(); sequence = 0; } };
}
