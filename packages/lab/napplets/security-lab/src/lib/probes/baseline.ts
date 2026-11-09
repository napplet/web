// Baseline probes: boundaries the browser enforces from the sandbox attribute
// and the shell-injected CSP, with no shell cooperation at run time.

import { sandboxProbes } from './baseline-sandbox';
import { cspProbes } from './baseline-csp';
import { storageProbes } from './baseline-storage';
import { networkProbes } from './baseline-network';
import type { ProbeDefinition } from './types';

export const baselineProbes: ProbeDefinition[] = [
  ...sandboxProbes,
  ...cspProbes,
  ...storageProbes,
  ...networkProbes,
];
