import { describe, it, expect } from 'vitest';
import { runConformance } from './runner.js';
import { makeContext } from './context.js';
import { validateEnvelope } from '../validators/envelope.js';
import { NAPPLET_KIND_NAMED, type NappletManifestEvent } from '../validators/manifest.js';
import { toJson } from '../report/reporters.js';

const HASH = 'c'.repeat(64);
const goodHtml = '<!doctype html><html><head><script type="module" src="/app.js"></script></head><body></body></html>';
const goodEvent: NappletManifestEvent = {
  kind: NAPPLET_KIND_NAMED,
  id: 'event-id',
  tags: [
    ['d', 'demo'],
    ['path', '/index.html', HASH],
  ],
};

describe('runConformance', () => {
  it('reports a conformant napplet as ok with the napplet name', () => {
    let t = 0;
    const ctx = makeContext({
      manifestHtml: goodHtml,
      manifestEvent: goodEvent,
      emitted: [{ envelope: { type: 'storage.get', id: '1', key: 'k' }, verdict: validateEnvelope({ type: 'storage.get', id: '1', key: 'k' }), timestamp: 0 }],
      degraded: { bootError: null, emitted: [] },
    });
    const run = runConformance(ctx, { now: () => (t += 1) });
    expect(run.napplet).toBe('demo');
    expect(run.ok).toBe(true);
    expect(run.summary.errors).toBe(0);
    expect(run.startedAt).toBe(1);
    expect(run.finishedAt).toBeGreaterThan(run.startedAt);
    expect(run.checks.length).toBe(10);
  });

  it('is not ok when an error-severity check fails', () => {
    const ctx = makeContext({ manifestEvent: { ...goodEvent, kind: 35128 } });
    const run = runConformance(ctx);
    expect(run.ok).toBe(false);
    expect(run.summary.errors).toBeGreaterThan(0);
    expect(run.checks.find((c) => c.id === 'manifest/event-kind')!.status).toBe('fail');
  });

  it('produces a JSON-serializable run', () => {
    const run = runConformance(makeContext({ manifestHtml: goodHtml, manifestEvent: goodEvent }));
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
