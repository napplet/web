import type { ReferenceEndpoint } from './reference-responses.js';

/**
 * Deterministic NAP-LLM reference handlers. Living proposal:
 * https://github.com/napplet/naps/pull/134 (Shell Behavior, Error Handling).
 *
 * This fixture has no provider, credentials, or consent dialog. It models one
 * user-configured connection and treats disclosure consent as granted, so napplets
 * can exercise endpoint-scoped handles, requirement matching, stateless
 * generation with one streamed delta, the cancellation race, and the error codes.
 * Fixture markers in the last user text part steer deterministic outcomes:
 * `[[stall]]` leaves the generation active until `llm.cancel`, `[[decline]]`
 * models a declined consent prompt, and `[[refuse]]` models a provider refusal.
 * Passing it proves protocol shape, not live inference support.
 */

type RecordValue = Record<string, unknown>;
type Failure = { code: string; message: string };
type Outcome = { model: unknown } | { result: unknown } | { cancelled: boolean } | { error: Failure };

interface Session {
  handles: Set<string>;
  /** Active generations by request id, with the queued envelopes released on cancel. */
  active: Map<string, RecordValue>;
  /** Request ids still active for any operation (only stalled generations persist here). */
  sequence: number;
}

/** The only connection this fixture offers. */
export const REFERENCE_LLM_CONNECTION = {
  name: 'Reference connection',
  model: 'reference-model',
  route: 'Reference shell → reference provider (no network)',
  images: true,
  json: true,
} as const;

const fail = (code: string, message: string): Outcome => ({ error: { code, message } });
const object = (value: unknown): RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as RecordValue : {};

function sessionFor(sessions: Map<string, Session>, endpoint: ReferenceEndpoint): Session {
  let session = sessions.get(endpoint.id);
  if (!session) {
    session = { handles: new Set(), active: new Map(), sequence: 0 };
    sessions.set(endpoint.id, session);
  }
  return session;
}

function modelFor(handle: string): RecordValue {
  return { handle, ...REFERENCE_LLM_CONNECTION };
}

function select(session: Session, envelope: RecordValue): Outcome {
  const requirements = object(envelope.requirements);
  if (requirements.model !== undefined && requirements.model !== REFERENCE_LLM_CONNECTION.model) {
    return fail('unsupported', 'No connection offers the requested model');
  }
  session.sequence += 1;
  const handle = `reference-llm-h${session.sequence}`;
  session.handles.add(handle);
  return { model: modelFor(handle) };
}

function describe(session: Session, envelope: RecordValue): Outcome {
  const handle = String(envelope.handle);
  if (!session.handles.has(handle)) return fail('selection-expired', 'Select a model again');
  return { model: modelFor(handle) };
}

function lastUserText(request: RecordValue): string {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  let text = '';
  for (const message of messages) {
    const record = object(message);
    if (record.role !== 'user' || !Array.isArray(record.content)) continue;
    for (const part of record.content) {
      const item = object(part);
      if (item.type === 'text' && typeof item.text === 'string') text = item.text;
    }
  }
  return text;
}

function generate(session: Session, id: string, envelope: RecordValue): unknown[] {
  const reply = (outcome: Outcome): unknown[] => [{ type: 'llm.generate.result', id, ...outcome }];
  if (session.active.has(id)) return reply(fail('invalid-request', 'Request id is still active'));
  const request = object(envelope.request);
  if (!session.handles.has(String(request.handle))) return reply(fail('selection-expired', 'Select a model again'));
  const prompt = lastUserText(request);
  if (prompt.includes('[[decline]]')) return reply(fail('user-cancelled', 'The user declined disclosure'));
  if (prompt.includes('[[stall]]')) {
    session.active.set(id, envelope);
    return [];
  }
  if (prompt.includes('[[refuse]]')) return reply({ result: { text: '', finish: 'refusal' } });
  const output = request.format === 'json' ? JSON.stringify({ echo: prompt }) : `Echo: ${prompt}`;
  const usage = { inputTokens: JSON.stringify(request.messages).length, outputTokens: output.length };
  // One streamed delta, then the authoritative terminal result (NAP-LLM Wire Protocol).
  return [
    { type: 'llm.delta', requestId: id, sequence: 0, text: output.slice(0, Math.ceil(output.length / 2)) },
    ...reply({ result: { text: output, finish: 'stop', usage } }),
  ];
}

function cancel(session: Session, id: string, envelope: RecordValue): unknown[] {
  const requestId = String(envelope.requestId);
  if (!session.active.delete(requestId)) return [{ type: 'llm.cancel.result', id, cancelled: false }];
  return [
    { type: 'llm.generate.result', id: requestId, error: { code: 'cancelled', message: 'Generation cancelled; provider charges may still apply.' } },
    { type: 'llm.cancel.result', id, cancelled: true },
  ];
}

function handle(sessions: Map<string, Session>, endpoint: ReferenceEndpoint, envelope: RecordValue): unknown[] {
  const type = String(envelope.type);
  const id = String(envelope.id);
  const session = sessionFor(sessions, endpoint);
  switch (type) {
    case 'llm.select': return [{ type: 'llm.select.result', id, ...select(session, envelope) }];
    case 'llm.describe': return [{ type: 'llm.describe.result', id, ...describe(session, envelope) }];
    case 'llm.generate': return structuredClone(generate(session, id, envelope));
    case 'llm.cancel': return cancel(session, id, envelope);
    default: return [{ type: `${type}.result`, id, error: { code: 'invalid-request', message: `Unknown operation ${type}` } }];
  }
}

/** Create per-endpoint LLM sessions for the reference shell. */
export function createLlmHandlers() {
  const sessions = new Map<string, Session>();
  return {
    handle: (endpoint: ReferenceEndpoint, envelope: RecordValue) => handle(sessions, endpoint, envelope),
    reset() { sessions.clear(); },
  };
}
