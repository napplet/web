/** Pure, local host policy for selecting implemented and authorized NAP candidates. */
import type { NapDomain } from './envelope.js';
import { NAP_IMPLEMENTATIONS } from './nap-catalog.js';
import type { NapImplementationMetadata, NapMaturity } from './nap-catalog.js';

/** Local selection policy. No option creates implementation support or permission. */
export interface NapMaturityPolicy {
  /** Defaults to supported only. Broad levels also admit future candidates at that level. */
  readonly allowedMaturities?: readonly NapMaturity[];
  /** Explicit exceptions, intersected with the candidate domains. */
  readonly optIn?: readonly NapDomain[];
}

/** The host supplies only domains it implements and authorizes for this napplet. */
export interface NapDomainSelectionOptions extends NapMaturityPolicy {
  readonly candidates: readonly string[];
}

/** One excluded candidate and the reason it was not selected. */
export interface NapDomainExclusion {
  readonly domain: string;
  readonly reason: 'unknown-domain' | 'unclassified' | 'maturity-not-allowed';
  readonly maturity?: NapMaturity;
}

/** Selected domains preserve candidate order and contain no duplicates. */
export interface NapDomainSelection {
  readonly domains: readonly NapDomain[];
  readonly excluded: readonly NapDomainExclusion[];
}

/**
 * Read the installed package's release-time metadata for a domain.
 * @param domain Bare domain name.
 * @returns Metadata, or undefined for an unknown domain. This does not inspect the host.
 * @example
 * ```ts
 * const metadata = getNapImplementation('llm');
 * ```
 */
export function getNapImplementation(domain: string): NapImplementationMetadata | undefined {
  return Object.hasOwn(NAP_IMPLEMENTATIONS, domain)
    ? NAP_IMPLEMENTATIONS[domain as NapDomain]
    : undefined;
}

/**
 * Select a subset of implemented, authorized host candidates by implementation maturity.
 * Unknown and unclassified candidates remain excluded even if explicitly opted in.
 * @param options Candidate domains, allowed maturity levels, and named exceptions.
 * @returns Selected domains and exclusions. The caller enforces the same set in host dispatch.
 * @example
 * ```ts
 * const selection = selectNapDomains({
 *   candidates: ['storage', 'llm'],
 *   optIn: ['llm'],
 * });
 * ```
 */
export function selectNapDomains(options: NapDomainSelectionOptions): NapDomainSelection {
  const allowed = new Set<NapMaturity>(options.allowedMaturities ?? ['supported']);
  const optIn = new Set<string>(options.optIn ?? []);
  const domains: NapDomain[] = [];
  const excluded: NapDomainExclusion[] = [];
  for (const domain of new Set(options.candidates)) {
    const metadata = getNapImplementation(domain);
    if (!metadata) {
      excluded.push({ domain, reason: 'unknown-domain' });
    } else if (!metadata.maturity || !['supported', 'experimental', 'exploratory'].includes(metadata.maturity)) {
      excluded.push({ domain, reason: 'unclassified' });
    } else if (allowed.has(metadata.maturity) || optIn.has(domain)) {
      domains.push(domain as NapDomain);
    } else {
      excluded.push({ domain, reason: 'maturity-not-allowed', maturity: metadata.maturity });
    }
  }
  return { domains, excluded };
}
