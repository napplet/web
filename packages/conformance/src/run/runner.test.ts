import { describe, it, expect } from 'vitest';
import { runConformance } from './runner.js';
import { makeContext } from './context.js';
import { validateEnvelope } from '../validators/envelope.js';
import { toJson } from '../report/reporters.js';

const HASH = 'c'.repeat(64);
const goodHtml = `<!doctype html><html><head><meta name="napplet-type" content="demo"><meta name="napplet-aggregate-hash" content="${HASH}"><script type="module" src="/app.js"></script></head><body></body></html>`;

describe('runConformance', () => {
  it('reports a conformant napplet as ok with the napplet name', () => {
    let t = 0;
    const ctx = makeContext({
      manifestHtml: goodHtml,
      emitted: [{ envelope: { type: 'storage.get', id: '1', key: 'k' }, verdict: validateEnvelope({ type: 'storage.get', id: '1', key: 'k' }), timestamp: 0 }],
      degraded: { bootError: null, emitted: [] },
    });
    const run = runConformance(ctx, { now: () => (t += 1) });
    expect(run.napplet).toBe('demo');
    expect(run.ok).toBe(true);
    expect(run.summary.errors).toBe(0);
    expect(run.startedAt).toBe(1);
    expect(run.finishedAt).toBeGreaterThan(run.startedAt);
    expect(run.checks.length).toBe(14);
  });

  it('is not ok when an error-severity check fails', () => {
    const ctx = makeContext({ manifestHtml: '<html><head></head><body></body></html>' }); // no napplet-type, no hash
    const run = runConformance(ctx);
    expect(run.ok).toBe(false);
    expect(run.summary.errors).toBeGreaterThan(0);
    expect(run.checks.find((c) => c.id === 'manifest/napplet-type')!.status).toBe('fail');
  });

  it('stays ok when only a warning fails', () => {
    const ctx = makeContext({
      manifestHtml: `<!doctype html><html><head><meta name="napplet-type" content="demo"><meta name="napplet-aggregate-hash" content="${HASH}"><meta name="napplet-requires" content="storage"></head><body></body></html>`,
      emitted: [{ envelope: { type: 'relay.query', id: '1', filters: [] }, verdict: validateEnvelope({ type: 'relay.query', id: '1', filters: [] }), timestamp: 0 }],
    });
    const run = runConformance(ctx);
    expect(run.summary.warnings).toBe(1);
    expect(run.ok).toBe(true); // warnings never fail a run
  });

  it('produces a JSON-serializable run', () => {
    const run = runConformance(makeContext({ manifestHtml: goodHtml }));
    const round = JSON.parse(toJson(run));
    expect(round.summary.total).toBe(run.summary.total);
    expect(round.ok).toBe(run.ok);
  });

  it('honors a custom check set', () => {
    const run = runConformance(makeContext(), {
      checks: [{ id: 'x/always', area: 'boot', severity: 'error', title: 'always', run: () => ({ status: 'pass' }) }],
    });
    expect(run.checks).toHaveLength(1);
    expect(run.ok).toBe(true);
  });
});
