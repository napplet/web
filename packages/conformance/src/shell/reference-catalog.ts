/** Non-normative NAP-CATALOG adapter for metadata already verified by the host. */
import type { CatalogSnapshot, NappletDescriptor, NappletIdentity } from '@napplet/core';
import { catalogId, contractsFor, type CatalogManifest } from './intent-catalog.js';
import type { IntentHandlers } from './reference-intents.js';
import type { ReferenceEndpoint } from './reference-responses.js';

const HASH = /^[0-9a-f]{64}$/;

function descriptor(manifest: CatalogManifest): NappletDescriptor | undefined {
  const hashes = manifest.tags.filter(tag => tag[0] === 'x');
  const names = manifest.tags.filter(tag => tag[0] === 'd');
  if (!HASH.test(manifest.pubkey) || !HASH.test(manifest.id)
    || hashes.length !== 1 || hashes[0].length !== 2 || !HASH.test(hashes[0][1])
    || !manifest.content?.trim()) return;
  let identity: NappletIdentity;
  const version = { pubkey: manifest.pubkey, eventId: manifest.id, artifactHash: hashes[0][1] };
  if (manifest.kind === 35129) {
    if (names.length !== 1 || names[0].length !== 2) return;
    identity = { ...version, kind: manifest.kind, dTag: names[0][1] };
  } else if (manifest.kind === 5129 || manifest.kind === 15129) {
    if (names.length) return;
    identity = { ...version, kind: manifest.kind };
  } else return;
  const title = manifest.tags.find(tag => tag[0] === 'title')?.[1];
  const roles = [...new Set(manifest.tags.filter(tag => tag[0] === 'z' && tag[1]).map(tag => tag[1]))];
  return {
    id: catalogId(manifest), identity,
    ...(title === undefined ? {} : { title }),
    description: manifest.content,
    requires: manifest.tags.filter(tag => tag[0] === 'R').map(tag => tag[1]),
    optional: manifest.tags.filter(tag => tag[0] === 'O').map(tag => tag[1]),
    archetypes: roles.map(archetype => ({
      archetype,
      intents: contractsFor(manifest, archetype).map(contract => ({
        intent: contract.convention.slice(contract.convention.indexOf('/') + 1),
        convention: contract.convention,
        parameters: [...contract.params],
      })),
    })),
  };
}

/** Build a complete caller-visible snapshot without changing resolver selection.
 * @param manifests Host-resolved, verified manifest metadata.
 * @param endpoint Authenticated caller used by the disclosure policy.
 * @param intents Optional runtime resolver, independent of the caller's grants.
 * @param filter Optional policy that omits an entire descriptor.
 * @returns A detached point-in-time catalog snapshot.
 * @example const snapshot = referenceCatalog(manifests, endpoint, intents);
 */
export function referenceCatalog(
  manifests: readonly CatalogManifest[],
  endpoint: ReferenceEndpoint,
  intents?: IntentHandlers,
  filter?: (napplet: NappletDescriptor, endpoint: ReferenceEndpoint) => boolean,
): CatalogSnapshot {
  const entries = new Map<string, NappletDescriptor>();
  for (const manifest of manifests) {
    const entry = descriptor(manifest);
    if (entry && !entries.has(entry.id)) entries.set(entry.id, entry);
  }
  const napplets = [...entries.values()].filter(entry => !filter || filter(entry, endpoint));
  const ids = new Set(napplets.map(entry => entry.id));
  const roles = [...new Set(napplets.flatMap(entry => entry.archetypes.map(role => role.archetype)))];
  const handlers = roles.map(archetype => {
    const selected = intents?.currentHandler(archetype);
    return { archetype, currentHandler: selected && ids.has(selected) ? selected : null };
  });
  return structuredClone({ napplets, handlers });
}
