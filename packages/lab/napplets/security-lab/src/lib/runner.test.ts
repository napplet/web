import { describe, expect, it } from 'vitest';
import { pass, fail } from './probe-result';
import type { ProbeDefinition } from './probes/types';
import {
  createRows,
  isRunAllEligible,
  runAllOrder,
  executeProbe,
  countStatuses,
  countLevels,
  validateCatalog,
  type Clock,
} from './runner';

function definition(overrides: Partial<ProbeDefinition>): ProbeDefinition {
  return {
    id: 'test.probe',
    level: 'baseline',
    category: 'Test',
    probe: 'probe',
    expected: 'expected',
    expectedResult: 'denied',
    severity: 'low',
    ownerArea: 'sandbox',
    spec: 'Transport',
    run: async () => pass('ok', 'ok'),
    ...overrides,
  };
}

const fixedClock: Clock = {
  now: (() => { let t = 0; return () => (t += 25); })(),
  timeLabel: () => '12:00:00',
};

describe('createRows', () => {
  it('starts every probe pending with a placeholder result', () => {
    const rows = createRows([definition({ id: 'a.b' }), definition({ id: 'c.d', level: 'destructive', expectedResult: 'revoked' })]);
    expect(rows.map((row) => row.status)).toEqual(['pending', 'pending']);
    expect(rows.every((row) => row.lastRun === '-')).toBe(true);
    expect(rows[0].evidence).toBe('Click run, or run all');
    expect(rows[1].evidence).toMatch(/Never part of run all/);
  });
});

describe('run-all gating', () => {
  it('excludes destructive probes and preserves catalog order', () => {
    const rows = createRows([
      definition({ id: 'base.one' }),
      definition({ id: 'kill.me', level: 'destructive', expectedResult: 'revoked' }),
      definition({ id: 'runtime.two', level: 'runtime-mediated' }),
      definition({ id: 'adv.three', level: 'safe-adversarial' }),
    ]);
    expect(runAllOrder(rows)).toEqual(['base.one', 'runtime.two', 'adv.three']);
    expect(isRunAllEligible({ level: 'destructive' })).toBe(false);
    expect(isRunAllEligible({ level: 'baseline' })).toBe(true);
  });
});

describe('executeProbe', () => {
  it('merges the probe result and stamps timing', async () => {
    const patch = await executeProbe({ run: async () => fail('bad', 'leaked') }, fixedClock);
    expect(patch.status).toBe('fail');
    expect(patch.observed).toBe('bad');
    expect(patch.lastRun).toMatch(/^12:00:00 \/ \d+ms$/);
  });

  it('turns a throwing probe into a warning instead of propagating', async () => {
    const patch = await executeProbe({ run: async () => { throw new TypeError('kaboom'); } }, fixedClock);
    expect(patch.status).toBe('warning');
    expect(patch.observed).toBe('Probe error');
    expect(patch.evidence).toBe('TypeError: kaboom');
  });
});

describe('counts', () => {
  it('tallies statuses and levels', () => {
    const counts = countStatuses([{ status: 'pass' }, { status: 'pass' }, { status: 'info' }, { status: 'fail' }]);
    expect(counts).toMatchObject({ pass: 2, info: 1, fail: 1, pending: 0, running: 0, warning: 0, skipped: 0 });
    expect(countLevels([{ level: 'baseline' }, { level: 'destructive' }, { level: 'destructive' }]))
      .toEqual({ 'baseline': 1, 'runtime-mediated': 0, 'safe-adversarial': 0, 'destructive': 2 });
  });
});

describe('validateCatalog', () => {
  it('accepts well-formed definitions', () => {
    expect(validateCatalog([definition({ id: 'a.b' }), definition({ id: 'kill.x', level: 'destructive', expectedResult: 'revoked' })])).toEqual([]);
  });

  it('rejects duplicate or malformed ids and revoked/destructive mismatches', () => {
    const problems = validateCatalog([
      definition({ id: 'a.b' }),
      definition({ id: 'a.b' }),
      definition({ id: 'NoDots' }),
      definition({ id: 'kill.x', level: 'destructive', expectedResult: 'allowed' }),
      definition({ id: 'base.y', expectedResult: 'revoked' }),
      definition({ id: 'spec.less', spec: '' }),
    ]);
    expect(problems).toEqual([
      'duplicate id: a.b',
      'malformed id: NoDots',
      "kill.x: destructive probes must expect 'revoked' or 'denied'",
      "base.y: only destructive probes may expect 'revoked'",
      'spec.less: missing spec reference',
    ]);
  });
});
