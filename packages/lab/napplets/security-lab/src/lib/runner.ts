// Probe execution state, kept out of the Svelte component so the gating rules
// (what "run all" may touch, how destructive probes are armed) are unit-testable.

import { errorText, type ProbeResult, type ProbeStatus } from './probe-result';
import type { ProbeDefinition, ProbeLevel } from './probes/types';

export interface ProbeRow extends ProbeDefinition, ProbeResult {
  lastRun: string;
}

export const INITIAL_RESULT: ProbeResult = { observed: 'Not run', evidence: 'Click run, or run all', status: 'pending' };
export const DESTRUCTIVE_INITIAL_RESULT: ProbeResult = {
  observed: 'Not run',
  evidence: 'Never part of run all. Its run button fires immediately: a compliant shell revokes and removes this napplet, so no result will appear here. If a result does appear, the shell did not revoke.',
  status: 'pending',
};

export function initialResult(definition: Pick<ProbeDefinition, 'level'>): ProbeResult {
  return definition.level === 'destructive' ? DESTRUCTIVE_INITIAL_RESULT : INITIAL_RESULT;
}

export function createRows(definitions: readonly ProbeDefinition[]): ProbeRow[] {
  return definitions.map((definition) => ({ ...definition, ...initialResult(definition), lastRun: '-' }));
}

/** Destructive probes end the session on a compliant shell; "run all" never includes them. */
export function isRunAllEligible(definition: Pick<ProbeDefinition, 'level'>): boolean {
  return definition.level !== 'destructive';
}

export function runAllOrder(rows: readonly ProbeRow[]): string[] {
  return rows.filter(isRunAllEligible).map((row) => row.id);
}

export interface Clock {
  now(): number;
  timeLabel(): string;
}

export const wallClock: Clock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  timeLabel: () => new Date().toLocaleTimeString(),
};

/** Execute one probe and return the patch to merge into its row. Never throws. */
export async function executeProbe(row: Pick<ProbeRow, 'run'>, clock: Clock = wallClock): Promise<Partial<ProbeRow>> {
  const started = clock.now();
  const stamp = () => `${clock.timeLabel()} / ${(clock.now() - started).toFixed(0)}ms`;
  try {
    const result = await row.run();
    return { ...result, lastRun: stamp() };
  } catch (err) {
    return { observed: 'Probe error', evidence: errorText(err), status: 'warning', lastRun: stamp() };
  }
}

export type StatusCounts = Record<ProbeStatus, number>;

export function countStatuses(rows: readonly Pick<ProbeRow, 'status'>[]): StatusCounts {
  const counts: StatusCounts = { pending: 0, running: 0, pass: 0, fail: 0, warning: 0, skipped: 0, info: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

export function countLevels(rows: readonly Pick<ProbeRow, 'level'>[]): Record<ProbeLevel, number> {
  const counts: Record<ProbeLevel, number> = { 'baseline': 0, 'runtime-mediated': 0, 'safe-adversarial': 0, 'destructive': 0 };
  for (const row of rows) counts[row.level] += 1;
  return counts;
}

/** Ids must be unique and dotted (`area.detail`) so e2e selectors stay stable. */
export function validateCatalog(definitions: readonly ProbeDefinition[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const definition of definitions) {
    if (seen.has(definition.id)) problems.push(`duplicate id: ${definition.id}`);
    seen.add(definition.id);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(definition.id)) problems.push(`malformed id: ${definition.id}`);
    if (!definition.spec) problems.push(`${definition.id}: missing spec reference`);
    if (definition.level === 'destructive' && !['revoked', 'denied'].includes(definition.expectedResult)) problems.push(`${definition.id}: destructive probes must expect 'revoked' or 'denied'`);
    if (definition.level !== 'destructive' && definition.expectedResult === 'revoked') problems.push(`${definition.id}: only destructive probes may expect 'revoked'`);
  }
  return problems;
}
