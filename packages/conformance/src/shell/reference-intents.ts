/** Reference INTENT acceptance and lifecycle-independent delivery. */
import type { IntentAvailability } from '@napplet/core';
import { catalogAvailability, type CatalogManifest } from './intent-catalog.js';
import { REFERENCE_HANDLER, REFERENCE_MANIFEST, ok, type ReferenceEndpoint } from './reference-responses.js';

export interface IntentHandlers {
  handleInvoke(endpoint: ReferenceEndpoint, env: Record<string, unknown>): unknown[];
  availability(archetype: unknown): IntentAvailability;
  handlers(): IntentAvailability[];
}

/** Create fixture handlers from installed verified metadata. */
export function createIntentHandlers(
  queueDelivery: (target: string, delivery: unknown) => void,
  manifests: readonly CatalogManifest[] = [REFERENCE_MANIFEST],
  defaults: Readonly<Record<string, string>> = { note: REFERENCE_HANDLER },
): IntentHandlers {
  const availability = (archetype: unknown): IntentAvailability =>
    catalogAvailability(manifests, String(archetype), defaults[String(archetype)]);
  return {
    availability,
    handlers: () => [...new Set(manifests.flatMap((manifest) => manifest.tags.filter((tag) => tag[0] === 'z').map((tag) => tag[1])))].map(availability),
    handleInvoke(endpoint, env) {
      const request = env.request as { archetype: string; action: string; convention: string; payload?: unknown; handler?: string };
      const candidates = availability(request.archetype).candidates.filter((candidate) => candidate.conventions.includes(request.convention));
      const explicit = request.handler && !['default', 'choose'].includes(request.handler);
      // This fixture declines interactive selection and ignores optional recommendations under its policy.
      const candidate = request.handler === 'choose' ? undefined : explicit
        ? candidates.find((item) => item.id === request.handler)
        : candidates.find((item) => item.isDefault) ?? candidates[0];
      if (!candidate) return ok({ type: 'intent.invoke.result', id: env.id, result: { ok: false, error: 'no handler' } });
      const { archetype, action, convention } = request;
      queueDelivery(candidate.id, structuredClone({
        type: 'intent.deliver',
        delivery: {
          sender: endpoint.catalogId,
          archetype,
          action,
          convention,
          ...('payload' in request ? { payload: request.payload } : {}),
        },
      }));
      return ok({ type: 'intent.invoke.result', id: env.id, result: { ok: true, archetype, action, convention, handler: candidate.id } });
    },
  };
}
