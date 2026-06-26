import { describe, it, expect } from 'vitest';
import { CHECKS } from './catalog.js';
import { makeContext } from '../run/context.js';
import { validateEnvelope } from '../validators/envelope.js';
import type { RecordedEnvelope } from '../shell/reference-shell.js';

const HASH = 'b'.repeat(64);

function rec(envelope: unknown): RecordedEnvelope {
  return { envelope, verdict: validateEnvelope(envelope), timestamp: 0 };
}

function manifest(head: string, body = ''): string {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

const goodHead = `<meta name="napplet-type" content="demo"><meta name="napplet-aggregate-hash" content="${HASH}">`;

/** Run a single check by id against a context. */
function run(id: string, ctx: Parameters<(typeof CHECKS)[number]['run']>[0]) {
  const check = CHECKS.find((c) => c.id === id);
  if (!check) throw new Error(`no such check: ${id}`);
  return check.run(ctx);
}

describe('check catalog — shape', () => {
  it('has unique ids and only known areas/severities', () => {
    const ids = CHECKS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const areas = new Set(['manifest', 'boot', 'wire', 'degradation', 'lifecycle']);
    for (const c of CHECKS) {
      expect(areas.has(c.area)).toBe(true);
      expect(['error', 'warning']).toContain(c.severity);
    }
  });
});

describe('manifest checks', () => {
  it('passes napplet-type / aggregate-hash for a good manifest', () => {
    const ctx = makeContext({ manifestHtml: manifest(goodHead) });
    expect(run('manifest/napplet-type', ctx).status).toBe('pass');
  });

  it('fails a missing napplet-type', () => {
    const ctx = makeContext({ manifestHtml: manifest(`<meta name="napplet-aggregate-hash" content="${HASH}">`) });
    expect(run('manifest/napplet-type', ctx).status).toBe('fail');
  });

  it('skips optional metas when absent, fails them when invalid', () => {
    const absent = makeContext({ manifestHtml: manifest(goodHead) });
    expect(run('manifest/config-schema', absent).status).toBe('skip');
    expect(run('manifest/declared-naps', absent).status).toBe('skip');

    const badSchema = makeContext({
      manifestHtml: manifest(`${goodHead}<meta name="napplet-config-schema" content='{"type":"object","properties":{"x":{"type":"string","pattern":"^a"}}}'>`),
    });
    expect(run('manifest/config-schema', badSchema).status).toBe('fail');
  });
});

describe('boot checks', () => {
  it('passes a clean allow-scripts boot', () => {
    const ctx = makeContext({ manifestHtml: manifest(goodHead) });
    expect(run('boot/sandbox-allow-scripts', ctx).status).toBe('pass');
    expect(run('boot/installs-global', ctx).status).toBe('pass');
    expect(run('boot/no-boot-error', ctx).status).toBe('pass');
    expect(run('boot/no-forbidden-globals', ctx).status).toBe('pass');
  });

  it('fails when allow-same-origin was required', () => {
    const ctx = makeContext({ sandbox: { allowScripts: true, allowSameOrigin: true } });
    expect(run('boot/sandbox-allow-scripts', ctx).status).toBe('fail');
  });

  it('fails on missing global, boot error, or forbidden global access', () => {
    expect(run('boot/installs-global', makeContext({ installedGlobal: false })).status).toBe('fail');
    expect(run('boot/no-boot-error', makeContext({ bootError: 'ReferenceError: x' })).status).toBe('fail');
    expect(run('boot/no-forbidden-globals', makeContext({ forbiddenGlobals: ['window.nostr'] })).status).toBe('fail');
  });
});

describe('wire checks', () => {
  it('skips when nothing was emitted', () => {
    expect(run('wire/envelope-well-formed', makeContext()).status).toBe('skip');
  });

  it('passes when all emitted envelopes are valid', () => {
    const ctx = makeContext({ emitted: [rec({ type: 'storage.get', id: '1', key: 'k' })] });
    expect(run('wire/envelope-well-formed', ctx).status).toBe('pass');
  });

  it('fails when any emitted envelope is malformed', () => {
    const ctx = makeContext({
      emitted: [rec({ type: 'storage.get', id: '1', key: 'k' }), rec({ type: 'relay.event', subId: 's' })],
    });
    const r = run('wire/envelope-well-formed', ctx);
    expect(r.status).toBe('fail');
    expect(Array.isArray(r.diagnostics)).toBe(true);
  });

  it('warns when a napplet emits an undeclared NAP domain', () => {
    const ctx = makeContext({
      manifestHtml: manifest(`${goodHead}<meta name="napplet-requires" content="storage">`),
      emitted: [rec({ type: 'relay.query', id: '1', filters: [] })],
    });
    const check = CHECKS.find((c) => c.id === 'wire/declared-naps-only')!;
    expect(check.severity).toBe('warning');
    expect(check.run(ctx).status).toBe('fail');
  });
});

describe('degradation + lifecycle checks', () => {
  it('skips degradation when no degraded pass was run, passes when clean, fails on crash', () => {
    expect(run('degrade/domain-absence', makeContext()).status).toBe('skip');
    expect(run('degrade/domain-absence', makeContext({ degraded: { bootError: null, emitted: [] } })).status).toBe('pass');
    expect(run('degrade/domain-absence', makeContext({ degraded: { bootError: 'TypeError', emitted: [] } })).status).toBe('fail');
  });

  it('skips lifecycle when unmeasured, flags leaks as a warning', () => {
    expect(run('lifecycle/clean-teardown', makeContext()).status).toBe('skip');
    expect(run('lifecycle/clean-teardown', makeContext({ lifecycle: { listenerLeak: true } })).status).toBe('fail');
    expect(run('lifecycle/clean-teardown', makeContext({ lifecycle: { listenerLeak: false } })).status).toBe('pass');
  });
});
