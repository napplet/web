/** Reference INTENT acceptance and endpoint-bound delivery (NAP-INTENT #128). */
import type { IntentAvailability, IntentDelivery, IntentRequest } from '@napplet/core';
import { catalogAvailability, type CatalogManifest } from './intent-catalog.js';
import { REFERENCE_HANDLER, REFERENCE_MANIFEST, ok, type ReferenceEndpoint } from './reference-responses.js';
import type { EndpointRegistry } from './reference-endpoints.js';

export interface IntentHandlers {
  handleInvoke(endpoint: ReferenceEndpoint, env: Record<string, unknown>): unknown[];
  availability(archetype: unknown): IntentAvailability;
  handlers(): IntentAvailability[];
  deliver(endpointId: string, request: IntentRequest, sender?: string | null): IntentDelivery | undefined;
  emit(endpointId: string, delivery: IntentDelivery): void;
  retry(endpointId: string, deliveryId: string): boolean;
}

/** Create fixture handlers from installed verified metadata. */
export function createIntentHandlers(
  queueDelivery: (target: string, delivery: unknown) => void,
  endpoints: EndpointRegistry,
  manifests: readonly CatalogManifest[] = [REFERENCE_MANIFEST],
  defaults: Readonly<Record<string, string>> = { note: REFERENCE_HANDLER },
): IntentHandlers {
  const availability = (archetype: unknown): IntentAvailability =>
    catalogAvailability(manifests, String(archetype), defaults[String(archetype)]);
  const emit = (target: string, delivery: IntentDelivery): void => queueDelivery(target, { type: 'intent.deliver', delivery: structuredClone(delivery) });
  const deliver = (target: string, request: IntentRequest, sender: string | null = null): IntentDelivery | undefined => {
    const bound = endpoints.get(target);
    if (!bound || !endpoints.hasDomain(target, 'intent')) return undefined;
    const match = /^napplet:([^/?#]+)\/([^/?#]+)$/.exec(request.convention);
    if (!match || match[1] !== request.archetype || match[2] !== request.action) return undefined;
    if (!bound.contracts.some((contract) => contract.convention === request.convention)) return undefined;
    return endpoints.issue(target, {
      sender, archetype: request.archetype, action: request.action, convention: request.convention,
      ...('payload' in request ? { payload: request.payload } : {}),
    });
  };
  return {
    availability, deliver, emit,
    retry(target, id) {
      const delivery = endpoints.get(target)?.deliveries.get(id);
      if (!delivery || !endpoints.hasDomain(target, 'intent')) return false;
      emit(target, delivery);
      return true;
    },
    handlers: () => [...new Set(manifests.flatMap((manifest) => manifest.tags.filter((tag) => tag[0] === 'z').map((tag) => tag[1])))].map(availability),
    handleInvoke(endpoint, env) {
      const request = env.request as IntentRequest;
      const candidates = availability(request.archetype).candidates.filter((candidate) => candidate.conventions.includes(request.convention));
      const explicit = request.handler && !['default', 'choose'].includes(request.handler);
      const candidate = request.handler === 'choose' ? undefined : explicit
        ? candidates.find((item) => item.id === request.handler)
        : candidates.find((item) => item.isDefault) ?? candidates[0];
      const rejected = () => ok({ type: 'intent.invoke.result', id: env.id, result: { ok: false, error: 'no handler' } });
      if (!candidate) return rejected();
      // The canned catalog target is materialized only for ordinary invocation.
      const target = endpoints.find(candidate.id) ?? endpoints.register({ id: candidate.id, catalogId: candidate.id });
      if (!target) return rejected();
      const delivery = deliver(target.endpoint.id, request, endpoint.catalogId);
      if (!delivery) return rejected();
      emit(target.endpoint.id, delivery);
      const { archetype, action, convention } = request;
      return ok({ type: 'intent.invoke.result', id: env.id, result: { ok: true, archetype, action, convention, handler: candidate.id } });
    },
  };
}
