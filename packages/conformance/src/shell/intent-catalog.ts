/** Non-normative reference catalog for manifests already verified by a runtime. */
import type { IntentAvailability, IntentCandidate, IntentContract } from '@napplet/core';

/** Installed verified metadata supplied to the reference fixture. */
export interface CatalogManifest {
  kind: 5129 | 15129 | 35129;
  pubkey: string;
  id: string;
  tags: string[][];
}

function catalogId(manifest: CatalogManifest): string {
  if (manifest.kind === 5129) return `snapshot:${manifest.id}`;
  if (manifest.kind === 15129) return `root:${manifest.pubkey}`;
  return `named:${manifest.pubkey}:${manifest.tags.find((tag) => tag[0] === 'd')?.[1] ?? ''}`;
}

function contractsFor(manifest: CatalogManifest, archetype: string): IntentContract[] {
  if (!manifest.tags.some((tag) => tag[0] === 'z' && tag[1] === archetype)) return [];
  const contracts: IntentContract[] = [];
  for (const tag of manifest.tags) {
    if (tag[0] !== 'i') continue;
    const match = /^napplet:([^/?#]+)\/([^/?#]+)$/.exec(tag[1] ?? '');
    if (match?.[1] !== archetype) continue;
    contracts.push({ convention: tag[1], params: tag.slice(2) });
  }
  return contracts;
}

/** Parse role contracts without interpreting payload semantics or granting domains. */
export function catalogAvailability(
  manifests: readonly CatalogManifest[],
  archetype: string,
  defaultId?: string,
): IntentAvailability {
  const candidates: IntentCandidate[] = [];
  for (const manifest of manifests) {
    const contracts = contractsFor(manifest, archetype);
    if (!contracts.length) continue;
    const title = manifest.tags.find((tag) => tag[0] === 'title')?.[1];
    const id = catalogId(manifest);
    candidates.push({
      id,
      ...(title ? { title } : {}),
      actions: [...new Set(contracts.map(({ convention }) => convention.slice(convention.indexOf('/') + 1)))],
      conventions: [...new Set(contracts.map(({ convention }) => convention))],
      contracts,
      ...(id === defaultId ? { isDefault: true } : {}),
    });
  }
  return { archetype, available: candidates.length > 0, candidates, hasDefault: candidates.some((item) => item.isDefault) };
}
