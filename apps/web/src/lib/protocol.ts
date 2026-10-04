import data from '../data/protocol.json';

export type NapEntry = (typeof data.entries)[number];

/** Describe repository state without claiming specification maturity or adoption. */
export function entryState(entry: NapEntry): string {
  return entry.state === 'merged' ? 'Merged' : entry.state === 'draft' ? 'Draft PR' : 'Open PR';
}

/** Prefer the merged capability; otherwise link to its first open proposal. */
export function domainPath(domain: string): string | undefined {
  const candidates = data.entries.filter(entry => entry.domain === domain);
  const entry = candidates.find(entry => entry.state === 'merged') ?? candidates[0];
  return entry ? `/protocol/${entry.slug}/` : undefined;
}
