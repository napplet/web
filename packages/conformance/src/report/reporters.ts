/**
 * @napplet/conformance -- Reporters over a {@link ConformanceRun}.
 *
 * Three serializers, zero dependencies:
 *  - {@link toJson} — machine-readable, the canonical interchange format.
 *  - {@link toPretty} — human-readable plain text for terminals and logs.
 *  - {@link toJUnit} — JUnit XML for CI consumers. Only error-severity failures
 *    become `<failure>` elements, matching `run.ok` (warnings do not fail a run).
 *
 * @packageDocumentation
 */

import type { ConformanceRun, CheckOutcome } from '../run/runner.js';

/** Serialize a run to pretty-printed JSON. */
export function toJson(run: ConformanceRun): string {
  return JSON.stringify(run, null, 2);
}

const GLYPH: Record<CheckOutcome['status'], string> = {
  pass: 'PASS',
  fail: 'FAIL',
  skip: 'SKIP',
};

/** Serialize a run to human-readable plain text. */
export function toPretty(run: ConformanceRun): string {
  const lines: string[] = [];
  const subject = run.napplet ? `napplet "${run.napplet}"` : 'napplet';
  lines.push(`Conformance report for ${subject}`);
  lines.push('');

  let currentArea = '';
  for (const c of run.checks) {
    if (c.area !== currentArea) {
      currentArea = c.area;
      lines.push(`  ${currentArea}`);
    }
    const sev = c.severity === 'warning' && c.status === 'fail' ? ' (warning)' : '';
    const detail = c.detail ? ` — ${c.detail}` : '';
    lines.push(`    [${GLYPH[c.status]}] ${c.id}${sev}${detail}`);
  }

  const s = run.summary;
  lines.push('');
  lines.push(`  ${s.passed} passed, ${s.failed} failed, ${s.skipped} skipped (${s.total} checks)`);
  if (s.warnings > 0) lines.push(`  ${s.warnings} warning(s)`);
  lines.push('');
  lines.push(run.ok ? '  RESULT: CONFORMANT' : `  RESULT: NON-CONFORMANT (${s.errors} error-severity failure(s))`);
  return lines.join('\n');
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Serialize a run to JUnit XML. */
export function toJUnit(run: ConformanceRun): string {
  const name = run.napplet ? `napplet-conformance:${run.napplet}` : 'napplet-conformance';
  const timeSec = ((run.finishedAt - run.startedAt) / 1000).toFixed(3);
  const failures = run.summary.errors;
  const skipped = run.summary.skipped;

  const cases = run.checks.map((c) => {
    const classname = xmlEscape(c.area);
    const caseName = xmlEscape(c.id);
    if (c.status === 'skip') {
      return `    <testcase classname="${classname}" name="${caseName}"><skipped message="${xmlEscape(c.detail ?? 'skipped')}"/></testcase>`;
    }
    if (c.status === 'fail' && c.severity === 'error') {
      return `    <testcase classname="${classname}" name="${caseName}"><failure message="${xmlEscape(c.detail ?? 'failed')}"/></testcase>`;
    }
    if (c.status === 'fail') {
      // warning-severity failure: non-fatal, recorded as system-out so JUnit
      // pass/fail stays aligned with run.ok.
      return `    <testcase classname="${classname}" name="${caseName}"><system-out>${xmlEscape(`warning: ${c.detail ?? ''}`)}</system-out></testcase>`;
    }
    return `    <testcase classname="${classname}" name="${caseName}"/>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites tests="${run.summary.total}" failures="${failures}" skipped="${skipped}">`,
    `  <testsuite name="${xmlEscape(name)}" tests="${run.summary.total}" failures="${failures}" skipped="${skipped}" time="${timeSec}">`,
    ...cases,
    '  </testsuite>',
    '</testsuites>',
  ].join('\n');
}

/** Reporter format identifiers accepted by the CLI. */
export type ReporterFormat = 'pretty' | 'json' | 'junit';

/** Serialize a run in the requested format. */
export function report(run: ConformanceRun, format: ReporterFormat): string {
  switch (format) {
    case 'json':
      return toJson(run);
    case 'junit':
      return toJUnit(run);
    case 'pretty':
    default:
      return toPretty(run);
  }
}
