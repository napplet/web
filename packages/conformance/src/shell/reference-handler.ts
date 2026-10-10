import { NAP_DOMAINS } from '@napplet/core';
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
  queueDelivery(target: string, delivery: unknown): void;
  intents: IntentHandlers;
}

/** Create the pure request handler for the reference shell. */
export function createReferenceHandler(options: ReferenceHandlerOptions) {
  const initialized = new Set<string>();
  return (endpoint: ReferenceEndpoint, envelope: unknown): unknown[] => {
    const type = getEnvelopeType(envelope);
    const verdict = validateEnvelope(envelope);
    options.records.push({ envelope, verdict, timestamp: options.now() });

    if (!type || !verdict.ok) return [];
    const domains = endpoint.domains ?? NAP_DOMAINS;
    if (!domains.includes(type.slice(0, type.indexOf('.')))) return [];
    if (type === 'shell.ready') {
      if (initialized.has(endpoint.id)) return [];
      initialized.add(endpoint.id);
      return ok({ type: 'shell.init', capabilities: { domains: [...domains] }, services: [] });
    }
    const env = envelope as Record<string, unknown>;
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
