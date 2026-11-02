import { baselineProbes } from './baseline';
import { runtimeProbes } from './runtime';
import { adversarialProbes } from './adversarial';
import { destructiveProbes } from './destructive';
import type { ProbeDefinition, ProbeLevel } from './types';

export * from './types';
export { baselineProbes, runtimeProbes, adversarialProbes, destructiveProbes };

export const probeCatalog: ProbeDefinition[] = [
  ...baselineProbes,
  ...runtimeProbes,
  ...adversarialProbes,
  ...destructiveProbes,
];

export const LEVEL_ORDER: ProbeLevel[] = ['baseline', 'runtime-mediated', 'safe-adversarial', 'destructive'];

export const levelLabels: Record<ProbeLevel, string> = {
  'baseline': 'Baseline',
  'runtime-mediated': 'Runtime mediated',
  'safe-adversarial': 'Safe adversarial',
  'destructive': 'Destructive',
};
