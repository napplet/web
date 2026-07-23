import { describe, it, expect } from 'vitest';
import { CHECKS } from './catalog.js';
import { makeContext } from '../run/context.js';
import { validateEnvelope } from '../validators/envelope.js';
import { NAPPLET_KIND_NAMED, type NappletManifestEvent } from '../validators/manifest.js';
import type { RecordedEnvelope } from '../shell/reference-shell.js';

const HASH = 'b'.repeat(64);

function rec(envelope: unknown): RecordedEnvelope {
  return { envelope, verdict: validateEnvelope(envelope), timestamp: 0 };
}

function manifest(head = '', body = ''): string {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

const goodEvent: NappletManifestEvent = {
  kind: NAPPLET_KIND_NAMED,
  tags: [
    ['d', 'demo'],
    ['path', '/index.html', HASH],
    ['requires', 'storage'],
  ],
};

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
  it('passes event-kind, index, and requires checks for a good manifest event', () => {
    const ctx = makeContext({ manifestEvent: goodEvent });
    expect(run('manifest/event-kind', ctx).status).toBe('pass');
    expect(run('manifest/index-html', ctx).status).toBe('pass');
    expect(run('manifest/requires', ctx).status).toBe('pass');
  });

  it('skips manifest-event checks when no event was resolved', () => {
    const ctx = makeContext({ manifestHtml: manifest() });
    expect(run('manifest/event-kind', ctx).status).toBe('skip');
    expect(run('manifest/index-html', ctx).status).toBe('skip');
    expect(run('manifest/requires', ctx).status).toBe('skip');
  });

  it('fails invalid manifest event shape', () => {
    const badKind = makeContext({ manifestEvent: { ...goodEvent, kind: 35128 } });
    expect(run('manifest/event-kind', badKind).status).toBe('fail');
    const badPath = makeContext({
      manifestEvent: { ...goodEvent, tags: [['d', 'demo'], ['path', '/index.html', 'nope']] },
    });
    expect(run('manifest/index-html', badPath).status).toBe('fail');
    const badRequire = makeContext({
      manifestEvent: { ...goodEvent, tags: [...goodEvent.tags, ['requires', 'nap:relay']] },
    });
    expect(run('manifest/requires', badRequire).status).toBe('fail');
  });
});

describe('boot checks', () => {
  it('passes a clean allow-scripts boot', () => {
    const ctx = makeContext({ manifestHtml: manifest() });
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

  it('fails when an emitted intent request forges its sender', () => {
    const r = run('wire/envelope-well-formed', makeContext({
      emitted: [rec({
        type: 'intent.invoke',
        id: 'intent-1',
        request: {
          archetype: 'note',
          action: 'open',
          convention: 'napplet:note/open',
          sender: 'forged-source',
        },
      })],
    }));
    expect(r.status).toBe('fail');
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
