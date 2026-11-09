import type { ReferenceEndpoint } from './reference-responses.js';
import { decimalText } from '../validators/soulseek.js';

/**
 * Deterministic NAP-SOULSEEK reference handlers. Living proposal:
 * https://github.com/napplet/naps/pull/135 (Shell Behavior, Error Handling).
 *
 * This fixture has no Soulseek account, peers, network, or export backend. It
 * models an online account with one canned peer so napplets can exercise
 * endpoint-owned handles, immutable paginated snapshots, transfer transitions,
 * bounded reads, release, and the error codes. Searches and browses are admitted
 * as `collecting` and settle on the next results poll; queued transfers settle
 * on the next status or transfers poll, so reads require an observed `complete`. `save` is unsupported. Passing it proves protocol shape, not
 * live Soulseek support.
 */

type RecordValue = Record<string, unknown>;
type Failure = { code: string; message: string };
type Outcome = { value: unknown } | { error: Failure };

interface Share { path: string; bytes: string; locked: boolean; extension: string }
interface FileHandle { fileId: string; queryId: string; share: Share }
interface QueryRecord {
  snapshot: RecordValue;
  entries: RecordValue[];
  pending: { files: RecordValue[]; terminal: RecordValue } | null;
}
interface TransferRecord { snapshot: RecordValue; share: Share; bytes: string }
interface Session {
  queries: Map<string, QueryRecord>;
  files: Map<string, FileHandle>;
  transfers: Map<string, TransferRecord>;
  replies: Map<string, unknown[]>;
  sequence: number;
}

const LIMITS = {
  maxQueries: 4, maxTransfers: 8, maxResults: 500, maxPageSize: 100,
  maxReadBytes: 65536, maxTextBytes: 1024, queryTimeoutMs: 30000, pollIntervalMs: 1000,
};
/** The only peer this fixture can reach. */
export const REFERENCE_SOULSEEK_PEER = 'reference-peer';
const SHARES: readonly Share[] = [
  { path: 'Recordings\\rain.txt', bytes: 'abc', locked: false, extension: 'txt' },
  { path: 'Recordings\\wind.txt', bytes: 'wind', locked: false, extension: 'txt' },
  { path: 'Private\\locked.txt', bytes: 'secret', locked: true, extension: 'txt' },
];
const TERMINAL_TRANSFER = new Set(['complete', 'cancelled', 'failed']);

const fail = (code: string, message: string): Outcome => ({ error: { code, message } });
const object = (value: unknown): RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as RecordValue : {};
const byteLength = (text: string): number => new TextEncoder().encode(text).length;
const base64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));

function fileRecord(handle: FileHandle): RecordValue {
  return {
    fileId: handle.fileId, username: REFERENCE_SOULSEEK_PEER, path: handle.share.path,
    size: String(byteLength(handle.share.bytes)), locked: handle.share.locked, extension: handle.share.extension,
  };
}

function matches(share: Share, text: string): boolean {
  const haystack = share.path.toLowerCase();
  return text.toLowerCase().split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

function sessionFor(sessions: Map<string, Session>, endpoint: ReferenceEndpoint): Session {
  let session = sessions.get(endpoint.id);
  if (!session) {
    session = { queries: new Map(), files: new Map(), transfers: new Map(), replies: new Map(), sequence: 0 };
    sessions.set(endpoint.id, session);
  }
  return session;
}

function nextHandle(session: Session, prefix: string): string {
  session.sequence += 1;
  return `reference-soulseek-${prefix}${session.sequence}`;
}

function admitQuery(session: Session, kind: 'search' | 'browse', shares: readonly Share[], terminal: RecordValue): Outcome {
  if (session.queries.size >= LIMITS.maxQueries) return fail('limit_exceeded', 'Query capacity is exhausted');
  const queryId = nextHandle(session, 'q');
  const files = shares.map((share) => {
    const handle: FileHandle = { fileId: nextHandle(session, 'f'), queryId, share };
    session.files.set(handle.fileId, handle);
    return fileRecord(handle);
  });
  const snapshot: RecordValue = {
    queryId, kind, state: 'collecting', count: 0,
    maxResults: LIMITS.maxResults, maxPageSize: LIMITS.maxPageSize, timeoutMs: LIMITS.queryTimeoutMs,
  };
  session.queries.set(queryId, { snapshot, entries: [], pending: { files, terminal } });
  return { value: structuredClone(snapshot) };
}

/** Apply the peer replies that "arrived" since admission. Late replies after a terminal state are discarded. */
function settleQuery(query: QueryRecord): void {
  if (!query.pending || query.snapshot.state !== 'collecting') { query.pending = null; return; }
  const { files, terminal } = query.pending;
  query.pending = null;
  const retained = files.slice(0, LIMITS.maxResults);
  query.entries.push(...retained);
  query.snapshot.count = query.entries.length;
  Object.assign(query.snapshot, retained.length < files.length ? { state: 'complete', reason: 'limit' } : terminal);
}

function settleTransfer(transfer: TransferRecord): void {
  if (transfer.snapshot.state !== 'queued') return;
  if (transfer.share.locked) {
    Object.assign(transfer.snapshot, { state: 'failed', error: { code: 'peer_denied', message: 'Peer refused the transfer' } });
    return;
  }
  Object.assign(transfer.snapshot, { state: 'complete', received: String(byteLength(transfer.bytes)) });
}

function query(session: Session, type: string, envelope: RecordValue): Outcome {
  const record = session.queries.get(String(envelope.queryId));
  if (!record) return fail('not_found', 'Query handle is unavailable');
  if (type === 'soulseek.stop') {
    if (record.snapshot.state === 'collecting') {
      record.pending = null;
      Object.assign(record.snapshot, { state: 'stopped', reason: 'cancelled' });
    }
    return { value: structuredClone(record.snapshot) };
  }
  settleQuery(record);
  const after = envelope.after === undefined ? 0 : Number(envelope.after);
  const limit = envelope.limit === undefined ? Number(record.snapshot.maxPageSize) : Number(envelope.limit);
  if (limit > Number(record.snapshot.maxPageSize)) return fail('invalid_request', 'Limit exceeds the captured page bound');
  if (after > record.entries.length) return fail('invalid_request', 'Offset exceeds the current count');
  const files = record.entries.slice(after, after + limit);
  return { value: structuredClone({ query: record.snapshot, files, next: after + files.length }) };
}

function download(session: Session, envelope: RecordValue): Outcome {
  const handle = session.files.get(String(envelope.fileId));
  if (!handle) return fail('not_found', 'File handle is unavailable');
  for (const transfer of session.transfers.values()) {
    if ((transfer.snapshot.file as RecordValue).fileId === handle.fileId) return { value: structuredClone(transfer.snapshot) };
  }
  if (session.transfers.size >= LIMITS.maxTransfers) return fail('limit_exceeded', 'Transfer capacity is exhausted');
  const transferId = nextHandle(session, 't');
  const snapshot: RecordValue = {
    transferId, file: fileRecord(handle), state: 'queued', maxReadBytes: LIMITS.maxReadBytes, received: '0',
  };
  session.transfers.set(transferId, { snapshot, share: handle.share, bytes: handle.share.bytes });
  return { value: structuredClone(snapshot) };
}

function transfer(session: Session, type: string, envelope: RecordValue): Outcome {
  const record = session.transfers.get(String(envelope.transferId));
  if (!record) return fail('not_found', 'Transfer handle is unavailable');
  const state = String(record.snapshot.state);
  const terminal = TERMINAL_TRANSFER.has(state);
  if (type === 'soulseek.pause') {
    if (terminal) return fail('invalid_state', 'Transfer is terminal');
    record.snapshot.state = 'paused';
  } else if (type === 'soulseek.resume') {
    if (terminal) return fail('invalid_state', 'Transfer is terminal');
    if (state === 'paused') record.snapshot.state = 'queued';
  } else if (type === 'soulseek.cancel') {
    if (!terminal) Object.assign(record.snapshot, { state: 'cancelled', received: '0' });
  } else if (type === 'soulseek.save') {
    return fail('unsupported', 'The reference shell does not implement save');
  } else if (type === 'soulseek.read') {
    return read(record, envelope);
  } else {
    settleTransfer(record);
  }
  return { value: structuredClone(record.snapshot) };
}

function read(record: TransferRecord, envelope: RecordValue): Outcome {
  if (record.snapshot.state !== 'complete') return fail('invalid_state', 'Transfer is not complete');
  const length = Number(envelope.length);
  if (length > Number(record.snapshot.maxReadBytes)) return fail('invalid_request', 'Length exceeds the captured read bound');
  if (!decimalText(envelope.offset)) return fail('invalid_request', 'Offset is not canonical decimal text');
  const bytes = new TextEncoder().encode(record.bytes);
  const offset = BigInt(String(envelope.offset));
  if (offset > BigInt(bytes.length)) return fail('invalid_request', 'Offset exceeds the file size');
  const start = Number(offset);
  const slice = bytes.slice(start, start + length);
  return { value: { offset: String(envelope.offset), data: base64(slice), length: slice.length, eof: start + slice.length === bytes.length } };
}

function release(session: Session, envelope: RecordValue): Outcome {
  const handle = String(envelope.handle);
  if (envelope.kind === 'query') {
    if (!session.queries.delete(handle)) return { value: { released: false } };
    for (const [fileId, file] of session.files) if (file.queryId === handle) session.files.delete(fileId);
    return { value: { released: true } };
  }
  return { value: { released: session.transfers.delete(handle) } };
}

function perform(session: Session, type: string, envelope: RecordValue): Outcome {
  switch (type) {
    case 'soulseek.info': return { value: { state: 'online', canSave: false, ...LIMITS } };
    case 'soulseek.search': {
      const request = object(envelope.request);
      const targeted = request.username !== undefined && request.username !== REFERENCE_SOULSEEK_PEER;
      const shares = targeted ? [] : SHARES.filter((share) => matches(share, String(request.text)));
      return admitQuery(session, 'search', shares, { state: 'complete', reason: 'deadline' });
    }
    case 'soulseek.browse':
      return envelope.username === REFERENCE_SOULSEEK_PEER
        ? admitQuery(session, 'browse', SHARES, { state: 'complete', reason: 'peer_complete' })
        : admitQuery(session, 'browse', [], { state: 'failed', error: { code: 'peer_unavailable', message: 'Peer cannot be reached' } });
    case 'soulseek.results':
    case 'soulseek.stop':
      return query(session, type, envelope);
    case 'soulseek.download':
      return download(session, envelope);
    case 'soulseek.transfers':
      for (const record of session.transfers.values()) settleTransfer(record);
      return { value: structuredClone([...session.transfers.values()].map((record) => record.snapshot)) };
    case 'soulseek.status':
    case 'soulseek.pause':
    case 'soulseek.resume':
    case 'soulseek.cancel':
    case 'soulseek.read':
    case 'soulseek.save':
      return transfer(session, type, envelope);
    case 'soulseek.release':
      return release(session, envelope);
    default:
      return fail('invalid_request', `Unknown operation ${type}`);
  }
}

function handle(sessions: Map<string, Session>, endpoint: ReferenceEndpoint, envelope: RecordValue): unknown[] {
  const type = String(envelope.type);
  const id = String(envelope.id);
  const session = sessionFor(sessions, endpoint);
  // Repeated request ids are never executed again; the original result is replayed.
  const replay = session.replies.get(id);
  if (replay) return structuredClone(replay);
  const responses = [{ type: `${type}.result`, id, ...perform(session, type, envelope) }];
  session.replies.set(id, responses);
  return structuredClone(responses);
}

/** Create per-endpoint Soulseek sessions for the reference shell. */
export function createSoulseekHandlers() {
  const sessions = new Map<string, Session>();
  return {
    handle: (endpoint: ReferenceEndpoint, envelope: RecordValue) => handle(sessions, endpoint, envelope),
    reset() { sessions.clear(); },
  };
}
