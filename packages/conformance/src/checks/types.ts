/**
 * @napplet/conformance -- Check registry types.
 *
 * A conformance check is a small, named, self-contained assertion over a
 * {@link ConformanceContext}. Checks are grouped by {@link CheckArea} and carry a
 * {@link CheckSeverity}: an `error`-severity failure fails the whole run (and the
 * CLI exit code); a `warning` is reported but non-fatal.
 *
 * @packageDocumentation
 */

import type { ConformanceContext } from '../run/context.js';

/** Conformance areas in the v1 zero-config catalog. */
export type CheckArea = 'manifest' | 'boot' | 'wire' | 'degradation' | 'lifecycle';

/** Severity of a check. `error` failures fail the run; `warning` failures do not. */
export type CheckSeverity = 'error' | 'warning';

/** Outcome status of a single check. */
export type CheckStatus = 'pass' | 'fail' | 'skip';

/** The result a check's `run` returns. */
export interface CheckResult {
  /** pass | fail | skip. A check skips when it does not apply (e.g. a NAP the napplet never uses). */
  status: CheckStatus;
  /** Short human-readable explanation. */
  detail?: string;
  /** Optional structured evidence (offending envelopes, manifest errors, ...). */
  diagnostics?: unknown;
}

/** A single conformance check. */
export interface Check {
  /** Stable id, e.g. `wire/envelope-well-formed`. */
  id: string;
  /** Grouping area. */
  area: CheckArea;
  /** Severity. */
  severity: CheckSeverity;
  /** One-line human title. */
  title: string;
  /** Evaluate the check against a context. Must be synchronous and pure. */
  run(context: ConformanceContext): CheckResult;
}

const pass = (detail?: string): CheckResult => ({ status: 'pass', detail });
const fail = (detail: string, diagnostics?: unknown): CheckResult => ({ status: 'fail', detail, diagnostics });
const skip = (detail: string): CheckResult => ({ status: 'skip', detail });

export const result = { pass, fail, skip };
