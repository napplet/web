import type { ProbeResult } from '../probe-result';

/**
 * - baseline: browser-enforced sandbox + CSP boundaries, no shell cooperation needed.
 * - runtime-mediated: the NIP-5D namespace / NAP port is the only legitimate path.
 * - safe-adversarial: hostile-looking actions that a compliant shell survives.
 * - destructive: actions a compliant shell MUST answer by revoking this napplet.
 *   Never part of "run all"; each one has to be armed and run by hand.
 */
export type ProbeLevel = 'baseline' | 'runtime-mediated' | 'safe-adversarial' | 'destructive';

export type ExpectedResult =
  | 'denied'
  | 'absent'
  | 'present'
  | 'unusable'
  | 'opaque'
  | 'allowed'
  | 'allowed-via-runtime'
  | 'documented-gap'
  | 'revoked';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Who owns the boundary a probe exercises. */
export type OwnerArea = 'Runtime' | 'CSP' | 'sandbox' | 'SDK' | 'manifest' | 'spec-gap';

export interface ProbeDefinition {
  id: string;
  level: ProbeLevel;
  category: string;
  probe: string;
  /** The boundary NIP-5D (or the NAP) expects to hold, in one sentence. */
  expected: string;
  expectedResult: ExpectedResult;
  severity: Severity;
  ownerArea: OwnerArea;
  /** NIP-5D section the probe traces to. */
  spec: string;
  run: () => Promise<ProbeResult>;
}

/** Fields a probe group shares; every probe in the group may still override them. */
export type ProbeDefaults = Partial<Pick<ProbeDefinition, 'level' | 'category' | 'ownerArea' | 'spec' | 'severity' | 'expectedResult'>>;

/** The per-probe remainder once group defaults are applied. */
export type ProbeSpec = Omit<ProbeDefinition, keyof ProbeDefaults> & ProbeDefaults;

/**
 * Build a group of probes that share level/category/owner/spec defaults, so a
 * catalogue reads as "what differs" instead of repeating the same six fields.
 */
export function defineProbes(defaults: ProbeDefaults, probes: ProbeSpec[]): ProbeDefinition[] {
  return probes.map((probe) => ({ ...defaults, ...probe } as ProbeDefinition));
}
