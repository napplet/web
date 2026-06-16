import { describe, it, expect } from 'vitest';
import { toPretty, toJUnit, toJson, report } from './reporters.js';
import type { ConformanceRun } from '../run/runner.js';

function makeRun(overrides: Partial<ConformanceRun> = {}): ConformanceRun {
  const base: ConformanceRun = {
    napplet: 'demo',
    startedAt: 0,
    finishedAt: 1000,
    checks: [
      { id: 'manifest/napplet-type', area: 'manifest', severity: 'error', title: 'type', status: 'pass' },
      { id: 'wire/envelope-well-formed', area: 'wire', severity: 'error', title: 'wire', status: 'skip', detail: 'no envelopes' },
      { id: 'wire/declared-naps-only', area: 'wire', severity: 'warning', title: 'declared', status: 'fail', detail: 'emitted relay' },
    ],
    summary: { total: 3, passed: 1, failed: 1, skipped: 1, errors: 0, warnings: 1 },
    ok: true,
  };
  return { ...base, ...overrides };
}

describe('toJson', () => {
  it('round-trips', () => {
    const run = makeRun();
    expect(JSON.parse(toJson(run))).toEqual(run);
  });
});

describe('toPretty', () => {
  it('renders the napplet name, statuses, and a conformant result', () => {
    const text = toPretty(makeRun());
    expect(text).toContain('napplet "demo"');
    expect(text).toContain('[PASS] manifest/napplet-type');
    expect(text).toContain('[SKIP] wire/envelope-well-formed');
    expect(text).toContain('(warning)');
    expect(text).toContain('RESULT: CONFORMANT');
  });

  it('renders a non-conformant result with the error count', () => {
    const run = makeRun({
      ok: false,
      summary: { total: 3, passed: 0, failed: 2, skipped: 1, errors: 1, warnings: 1 },
      checks: [
        { id: 'manifest/napplet-type', area: 'manifest', severity: 'error', title: 'type', status: 'fail', detail: 'missing' },
        { id: 'wire/declared-naps-only', area: 'wire', severity: 'warning', title: 'd', status: 'fail' },
        { id: 'boot/installs-global', area: 'boot', severity: 'error', title: 'g', status: 'skip' },
      ],
    });
    const text = toPretty(run);
    expect(text).toContain('RESULT: NON-CONFORMANT (1 error-severity failure(s))');
  });
});

describe('toJUnit', () => {
  it('emits well-formed XML where only error failures are <failure>', () => {
    const run = makeRun({
      ok: false,
      summary: { total: 3, passed: 1, failed: 2, skipped: 0, errors: 1, warnings: 1 },
      checks: [
        { id: 'manifest/napplet-type', area: 'manifest', severity: 'error', title: 't', status: 'pass' },
        { id: 'boot/installs-global', area: 'boot', severity: 'error', title: 'g', status: 'fail', detail: 'no global' },
        { id: 'wire/declared-naps-only', area: 'wire', severity: 'warning', title: 'd', status: 'fail', detail: 'undeclared <relay>' },
      ],
    });
    const xml = toJUnit(run);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('failures="1"');
    expect((xml.match(/<failure /g) ?? [])).toHaveLength(1); // only the error-severity fail
    expect(xml).toContain('<system-out>'); // the warning fail
    expect(xml).toContain('&lt;relay&gt;'); // escaped
  });

  it('emits skipped elements', () => {
    expect(toJUnit(makeRun())).toContain('<skipped');
  });
});

describe('report dispatcher', () => {
  it('selects the right reporter', () => {
    const run = makeRun();
    expect(report(run, 'json')).toBe(toJson(run));
    expect(report(run, 'junit')).toBe(toJUnit(run));
    expect(report(run, 'pretty')).toBe(toPretty(run));
  });
});
