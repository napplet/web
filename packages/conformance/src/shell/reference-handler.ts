import { createLlmHandlers } from './reference-llm.js';
import { createTorrentHandlers } from './reference-torrents.js';
import { NAP_DOMAINS, type CatalogSnapshot } from '@napplet/core';
import { validateEnvelope, type EnvelopeVerdict } from '../validators/envelope.js';
import {
  REFERENCE_CONVENTION,
  REFERENCE_SUBSCRIBER,
  RESPONDERS,
  ok,
  type ReferenceEndpoint,
} from './reference-responses.js';
import type { IntentHandlers } from './reference-intents.js';

/** One recorded napplet envelope and its validation verdict. */
export interface RecordedEnvelope {
  /** Raw envelope posted by the napplet. */
  envelope: unknown;
  /** Result from the runtime envelope validator. */
  verdict: EnvelopeVerdict;
  /** Timestamp captured when the shell received the envelope. */
  timestamp: number;
}

export interface ReferenceHandlerOptions {
  now: () => number;
  records: RecordedEnvelope[];
  domains?: readonly string[];
  queueDelivery(target: string, delivery: unknown): void;
  intents: IntentHandlers;
  catalog(endpoint: ReferenceEndpoint): CatalogSnapshot;
  intentResolver: boolean;
}

/** Create the pure request handler for the reference shell. */
export function createReferenceHandler(options: ReferenceHandlerOptions) {
  const initialized = new Set<string>();
  const hostDomains = options.domains ? new Set(options.domains) : null;
  const llm = createLlmHandlers();
  const torrents = createTorrentHandlers();
  const handle = (endpoint: ReferenceEndpoint, envelope: unknown): unknown[] => {
    const type = getEnvelopeType(envelope);
    const verdict = validateEnvelope(envelope);
    options.records.push({ envelope, verdict, timestamp: options.now() });

    if (!type) return [];
    const candidates = (endpoint.domains ?? NAP_DOMAINS).filter(domain => domain !== 'intent' || options.intentResolver);
    const domains = hostDomains ? candidates.filter(domain => hostDomains.has(domain)) : candidates;
    if (!domains.includes(type.slice(0, type.indexOf('.')))) return [];
    if (!verdict.ok) {
      const env = envelope as Record<string, unknown>;
      return type.startsWith('blossom.') ? blossomInvalidRequest(type, env) : llmInvalidRequest(type, env, verdict);
    }
    if (type === 'shell.ready') {
      if (initialized.has(endpoint.id)) return [];
      initialized.add(endpoint.id);
      return ok({ type: 'shell.init', capabilities: { domains: [...domains] }, services: [] });
    }
    const env = envelope as Record<string, unknown>;
    if (type === 'catalog.get') {
      try {
        return ok({ type: 'catalog.get.result', id: env.id, snapshot: options.catalog(endpoint) });
      } catch {
        return ok({ type: 'catalog.get.result', id: env.id, error: 'catalog unavailable' });
      }
    }
    if (type.startsWith('intent.') && !options.intentResolver) return [];
    if (type.startsWith('llm.')) return llm.handle(endpoint, env);
    if (type.startsWith('torrent.')) return torrents.handle(endpoint, env);
    if (type === 'intent.invoke') return options.intents.handleInvoke(endpoint, env);
    if (type === 'intent.available') {
      return ok({ type: 'intent.available.result', id: env.id, availability: options.intents.availability(env.archetype) });
    }
    if (type === 'intent.handlers') {
      return ok({ type: 'intent.handlers.result', id: env.id, handlers: options.intents.handlers() });
    }
    if (type === 'inc.emit') return handleIncEmit(endpoint, env, options.queueDelivery);

    const responder = RESPONDERS[type];
    return responder ? responder(env) : [];
  };
  return Object.assign(handle, { reset() { llm.reset(); torrents.reset(); } });
}

/** NAP-LLM request types; each has a `.result` terminal type. */
const LLM_REQUESTS = new Set(['llm.select', 'llm.describe', 'llm.generate', 'llm.cancel']);

/**
 * NAP-LLM Wire Protocol: a routable, validly correlated request receives exactly
 * one terminal result, and malformed input is `invalid-request`
 * (https://github.com/napplet/naps/pull/134). Uncorrelated envelopes, napplet-emitted
 * results, and other domains' invalid envelopes stay discarded.
 */
function llmInvalidRequest(type: string, envelope: Record<string, unknown>, verdict: EnvelopeVerdict): unknown[] {
  if (!LLM_REQUESTS.has(type) || typeof envelope.id !== 'string' || !envelope.id) return [];
  const reason = verdict.errors[0]?.message ?? 'Malformed request';
  return [{ type: `${type}.result`, id: envelope.id, error: { code: 'invalid-request', message: reason } }];
}

/**
 * NAP-BLOSSOM Shell Behavior: the shell responds to every request with a result
 * carrying the same `id`; the top-level `error` is reserved for malformed envelopes
 * where no typed result can be constructed (https://github.com/napplet/naps/pull/71).
 * Uncorrelated envelopes and napplet-emitted results stay discarded.
 */
function blossomInvalidRequest(type: string, envelope: Record<string, unknown>): unknown[] {
  if (!RESPONDERS[type] || typeof envelope.id !== 'string' || !envelope.id) return [];
  return [{ type: `${type}.result`, id: envelope.id, error: 'invalid-request' }];
}

function getEnvelopeType(envelope: unknown): string | undefined {
  if (!envelope || typeof envelope !== 'object') return undefined;
  const type = (envelope as Record<string, unknown>).type;
  return typeof type === 'string' ? type : undefined;
}

function handleIncEmit(
  endpoint: ReferenceEndpoint,
  env: Record<string, unknown>,
  queueDelivery: (target: string, delivery: unknown) => void,
): unknown[] {
  if (env.topic !== REFERENCE_CONVENTION) return [];

  const event: Record<string, unknown> = {
    type: 'inc.event',
    topic: env.topic,
    sender: endpoint.id,
  };
  if ('payload' in env) event.payload = env.payload;
  queueDelivery(REFERENCE_SUBSCRIBER, event);
  return [];
}
