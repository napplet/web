/** Authenticated live endpoints and the intent contracts their verified manifests advertise. */
import { NAP_DOMAINS, type IntentContract } from '@napplet/core';
import { catalogId, contractsFor, type CatalogManifest } from './intent-catalog.js';
import type { ReferenceEndpoint } from './reference-responses.js';

export interface LiveEndpoint {
  endpoint: ReferenceEndpoint;
  contracts: IntentContract[];
}

export function createEndpointRegistry(manifests: readonly CatalogManifest[], hostDomains?: readonly string[]) {
  const ceiling = hostDomains ? new Set(hostDomains) : null;
  const live = new Map<string, LiveEndpoint>();
  const terminated = new Set<string>();
  return {
    register(endpoint: ReferenceEndpoint): LiveEndpoint | undefined {
      if (terminated.has(endpoint.id)) return undefined;
      const existing = live.get(endpoint.id);
      if (existing) return existing;
      const manifest = endpoint.manifest ?? manifests.find((item) => catalogId(item) === endpoint.catalogId);
      const roles = manifest?.tags.filter((tag) => tag[0] === 'z').map((tag) => tag[1]) ?? [];
      const bound = { endpoint: structuredClone(endpoint), contracts: manifest ? roles.flatMap((role) => contractsFor(manifest, role)) : [] };
      live.set(endpoint.id, bound);
      return bound;
    },
    get: (id: string) => live.get(id),
    find: (catalog: string) => [...live.values()].find((item) => item.endpoint.catalogId === catalog),
    hasDomain(id: string, domain: string): boolean {
      const bound = live.get(id);
      return !!bound && (!ceiling || ceiling.has(domain)) && (bound.endpoint.domains ?? NAP_DOMAINS).includes(domain);
    },
    terminate(id: string): void { live.delete(id); terminated.add(id); },
  };
}
export type EndpointRegistry = ReturnType<typeof createEndpointRegistry>;
