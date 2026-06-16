/**
 * @napplet/conformance -- The run orchestrator and serializable result model.
 *
 * {@link runConformance} evaluates the check catalog against a {@link ConformanceContext}
 * and returns a fully serializable {@link ConformanceRun}. A run is `ok` only when
 * no `error`-severity check failed (warnings never fail a run).
 *
 * The browser-side boot harness that assembles a context from a real iframe arrives
 * with the CLI/web hosts; this module is pure logic and runs anywhere.
 *
 * @packageDocumentation
 */

import { validateManifest } from '../validators/manifest.js';
import { CHECKS } from '../checks/catalog.js';
import type { Check, CheckArea, CheckSeverity, CheckStatus } from '../checks/types.js';
import type { ConformanceContext } from './context.js';

/** A single check's outcome within a run. */
export interface CheckOutcome {
  id: string;
  area: CheckArea;
  severity: CheckSeverity;
  title: string;
  status: CheckStatus;
  detail?: string;
  diagnostics?: unknown;
}

/** Aggregate counts for a run. */
export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  /** error-severity failures (these make `ok` false). */
  errors: number;
  /** warning-severity failures. */
  warnings: number;
}

/** The serializable result of a conformance run. */
export interface ConformanceRun {
  /** The napplet-type from the manifest, when known. */
  napplet?: string;
  /** Timestamp (ms) when the run started. */
  startedAt: number;
  /** Timestamp (ms) when the run finished. */
  finishedAt: number;
  /** Per-check outcomes in catalog order. */
  checks: CheckOutcome[];
  /** Aggregate counts. */
  summary: RunSummary;
  /** True when no error-severity check failed. */
  ok: boolean;
}

/** Options for {@link runConformance}. */
export interface RunOptions {
  /** Override the check set (defaults to the v1 {@link CHECKS} catalog). */
  checks?: Check[];
  /** Injectable clock for deterministic output. Defaults to `Date.now`. */
  now?: () => number;
}

/**
 * Run the conformance suite against a context.
 *
 * @example
 * ```ts
 * const run = runConformance(context);
 * process.exitCode = run.ok ? 0 : 1;
 * ```
 */
export function runConformance(context: ConformanceContext, options: RunOptions = {}): ConformanceRun {
  const now = options.now ?? (() => Date.now());
  const checks = options.checks ?? CHECKS;
  const startedAt = now();

  const outcomes: CheckOutcome[] = checks.map((check) => {
    const r = check.run(context);
    return {
      id: check.id,
      area: check.area,
      severity: check.severity,
      title: check.title,
      status: r.status,
      detail: r.detail,
      diagnostics: r.diagnostics,
    };
  });

  const summary: RunSummary = {
    total: outcomes.length,
    passed: outcomes.filter((o) => o.status === 'pass').length,
    failed: outcomes.filter((o) => o.status === 'fail').length,
    skipped: outcomes.filter((o) => o.status === 'skip').length,
    errors: outcomes.filter((o) => o.status === 'fail' && o.severity === 'error').length,
    warnings: outcomes.filter((o) => o.status === 'fail' && o.severity === 'warning').length,
  };

  const napplet = validateManifest(context.manifestHtml).nappletType;

  return {
    napplet,
    startedAt,
    finishedAt: now(),
    checks: outcomes,
    summary,
    ok: summary.errors === 0,
  };
}
