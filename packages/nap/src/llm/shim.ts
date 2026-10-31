/** NAP-LLM request correlation and delta routing for the runtime-injected `llm` domain. @module */
import { postToShell } from '../boundary.js';
import type {
  LlmDelta,
  LlmErrorCode,
  LlmFailure,
  LlmGenerateOptions,
  LlmGeneration,
  LlmGenerationRequest,
  LlmModel,
  LlmOutboundMessage,
  LlmPendingGeneration,
  LlmRequirements,
} from './types.js';

/** Local transport deadline for operations the runtime answers from retained state. */
const REQUEST_TIMEOUT_MS = 30_000;
/** Local transport deadline for `select`, which the runtime may gate behind a chooser. */
const SELECT_TIMEOUT_MS = 120_000;
/**
 * Local safety net for a lost `llm.generate.result`. The runtime bounds generation
 * time itself (NAP-LLM Cancellation and deadlines); this only settles a request
 * whose terminal result never arrives, as a plain `Error` rather than a failure.
 */
const GENERATE_TIMEOUT_MS = 1_800_000;

/** The success field each result type carries when it does not carry `error`. */
const RESULT_FIELDS: Record<string, string> = {
  'llm.select.result': 'model',
  'llm.describe.result': 'model',
  'llm.generate.result': 'result',
  'llm.cancel.result': 'cancelled',
};

interface PendingRequest {
  type: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  onDelta?: (delta: LlmDelta) => void;
  nextSequence: number;
  cleanup?: () => void;
}
const pending = new Map<string, PendingRequest>();
let installed = false;

/**
 * A NAP-LLM `Error` record surfaced as a rejection. `code` is the specification
 * failure category; `message` is the runtime's diagnostic for people.
 */
export class LlmError extends Error implements LlmFailure {
  /** NAP-LLM error code; unknown codes are still failures. */
  readonly code: LlmErrorCode;

  /**
   * @param failure The `error` record from a result envelope.
   * @example throw new LlmError({ code: 'selection-expired', message: 'Select a model again.' });
   */
  constructor(failure: LlmFailure) {
    super(failure.message);
    this.name = 'LlmError';
    this.code = failure.code;
  }
}

function isFailure(value: unknown): value is LlmFailure {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === 'string' && record.code.length > 0 && typeof record.message === 'string';
}

function settle(id: string, entry: PendingRequest): void {
  pending.delete(id);
  clearTimeout(entry.timeout);
  entry.cleanup?.();
}

function sendRequest<T>(type: LlmOutboundMessage['type'], payload: Record<string, unknown>, timeoutMs: number, id = crypto.randomUUID()): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      const entry = pending.get(id);
      if (entry) { settle(id, entry); reject(new Error(`${type} timed out`)); }
    }, timeoutMs);
    pending.set(id, { type: `${type}.result`, resolve: resolve as (value: unknown) => void, reject, timeout, nextSequence: 0 });
    try {
      postToShell({ type, id, ...payload });
    } catch (error) {
      settle(id, pending.get(id)!);
      reject(error as Error);
    }
  });
}

function handleDelta(message: { type: string; [key: string]: unknown }): void {
  if ('id' in message || typeof message.requestId !== 'string' || typeof message.sequence !== 'number' || typeof message.text !== 'string') return;
  const entry = pending.get(message.requestId);
  if (!entry || entry.type !== 'llm.generate.result') return;
  // A gap means text was lost; the terminal result is authoritative, so stop provisional delivery.
  if (message.sequence !== entry.nextSequence) { entry.nextSequence = Number.POSITIVE_INFINITY; return; }
  entry.nextSequence += 1;
  entry.onDelta?.({ requestId: message.requestId, sequence: message.sequence, text: message.text });
}

/** Route a trusted runtime envelope to its pending request or delta listener.
 * @param message Envelope received through the central shell message listener.
 * @example handleLlmMessage({ type: 'llm.select.result', id: 's1', model });
 */
export function handleLlmMessage(message: { type: string; [key: string]: unknown }): void {
  if (message.type === 'llm.delta') { handleDelta(message); return; }
  if (typeof message.id !== 'string') return;
  const entry = pending.get(message.id);
  if (!entry || entry.type !== message.type) return;
  settle(message.id, entry);
  const field = RESULT_FIELDS[message.type];
  const hasValue = message[field] !== undefined && message[field] !== null;
  const hasError = message.error !== undefined && message.error !== null;
  if (hasValue === hasError) {
    entry.reject(new Error(`${message.type} must carry exactly one of ${field} or error`));
  } else if (hasError) {
    entry.reject(isFailure(message.error) ? new LlmError(message.error) : new Error(`${message.type} returned a malformed error`));
  } else {
    entry.resolve(message[field]);
  }
}

/** Ask the user, through the runtime, to choose a connection.
 * @param requirements Optional capability constraints; omitted from the wire when undefined.
 * @returns The selected Model; selection does not authorize sending a prompt.
 * @example const model = await select({ json: true });
 */
export function select(requirements?: LlmRequirements): Promise<LlmModel> {
  return sendRequest<LlmModel>('llm.select', requirements === undefined ? {} : { requirements }, SELECT_TIMEOUT_MS);
}

/** Revalidate a selection without generating or showing a chooser.
 * @param handle A Model handle issued to this endpoint.
 * @returns The current Model, or a `selection-expired` rejection.
 * @example const model = await describe(handle);
 */
export function describe(handle: string): Promise<LlmModel> {
  return sendRequest<LlmModel>('llm.describe', { handle }, REQUEST_TIMEOUT_MS);
}

/** Submit one stateless generation. The runtime obtains disclosure consent before any provider submission.
 * @param request The complete conversation, handle, and optional format.
 * @param options Optional abort signal (maps to `llm.cancel`) and delta listener.
 * @returns The terminal Generation, with the request id exposed as `requestId`.
 * @example const pending = generate({ handle, messages }, { onDelta: (d) => show(d.text) }); await pending;
 */
export function generate(request: LlmGenerationRequest, options: LlmGenerateOptions = {}): LlmPendingGeneration {
  const id = crypto.randomUUID();
  const promise = sendRequest<LlmGeneration>('llm.generate', { request }, GENERATE_TIMEOUT_MS, id);
  const entry = pending.get(id);
  if (entry) {
    entry.onDelta = options.onDelta;
    const signal = options.signal;
    if (signal) {
      const abort = (): void => { void cancel(id).catch(() => undefined); };
      if (signal.aborted) abort();
      else {
        signal.addEventListener('abort', abort, { once: true });
        entry.cleanup = () => signal.removeEventListener('abort', abort);
      }
    }
  }
  return Object.assign(promise, { requestId: id });
}

/** Cancel an active generation owned by this endpoint.
 * @param requestId The generation's request id.
 * @returns `true` when an active generation was terminated; `false` for unknown or terminal ids.
 * @example const cancelled = await cancel(pending.requestId);
 */
export function cancel(requestId: string): Promise<boolean> {
  return sendRequest<boolean>('llm.cancel', { requestId }, REQUEST_TIMEOUT_MS);
}

/** Install the llm transport without issuing requests.
 * @returns Cleanup that rejects outstanding requests.
 * @example const dispose = installLlmShim();
 */
export function installLlmShim(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const [id, entry] of pending) {
      settle(id, entry);
      entry.reject(new Error('llm shim disposed'));
    }
    installed = false;
  };
}
