/** Authenticated live endpoints and target-scoped intent delivery identities. */
import { NAP_DOMAINS, type IntentContract, type IntentDelivery } from '@napplet/core';
import { catalogId, contractsFor, type CatalogManifest } from './intent-catalog.js';
import type { ReferenceEndpoint } from './reference-responses.js';

export interface LiveEndpoint {
  endpoint: ReferenceEndpoint;
  contracts: IntentContract[];
  deliveries: Map<string, IntentDelivery>;
}

export function createEndpointRegistry(manifests: readonly CatalogManifest[]) {
  const live = new Map<string, LiveEndpoint>();
  const terminated = new Set<string>();
  let nextDelivery = 0;
  return {
    register(endpoint: ReferenceEndpoint): LiveEndpoint | undefined {
      if (terminated.has(endpoint.id)) return undefined;
      const existing = live.get(endpoint.id);
      if (existing) return existing;
      const manifest = endpoint.manifest ?? manifests.find((item) => catalogId(item) === endpoint.catalogId);
      const roles = manifest?.tags.filter((tag) => tag[0] === 'z').map((tag) => tag[1]) ?? [];
      const bound = { endpoint: structuredClone(endpoint), contracts: manifest ? roles.flatMap((role) => contractsFor(manifest, role)) : [], deliveries: new Map<string, IntentDelivery>() };
      live.set(endpoint.id, bound);
      return bound;
    },
    get: (id: string) => live.get(id),
    find: (catalog: string) => [...live.values()].find((item) => item.endpoint.catalogId === catalog),
    hasDomain(id: string, domain: string): boolean {
      const bound = live.get(id);
      return !!bound && (bound.endpoint.domains ?? NAP_DOMAINS).includes(domain);
    },
    issue(id: string, invocation: Omit<IntentDelivery, 'id'>): IntentDelivery | undefined {
      const bound = live.get(id);
      if (!bound || bound.deliveries.size >= 10_000) return undefined;
      const delivery: IntentDelivery = structuredClone({ ...invocation, id: `delivery-${++nextDelivery}` });
      bound.deliveries.set(delivery.id, delivery);
      return structuredClone(delivery);
    },
    terminate(id: string): void { live.delete(id); terminated.add(id); },
  };
}
export type EndpointRegistry = ReturnType<typeof createEndpointRegistry>;
