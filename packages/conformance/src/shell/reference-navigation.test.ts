import { describe, expect, it } from 'vitest';
import { createReferenceShell } from './reference-shell.js';
import { REFERENCE_HANDLER, REFERENCE_MANIFEST } from './reference-responses.js';

const endpoint = { id: 'viewer', catalogId: REFERENCE_HANDLER };
const location = (event: unknown = 'alice') => ({ convention: 'napplet:note/open', payload: { event } });

function fixture() {
  const shell = createReferenceShell({ manifests: [REFERENCE_MANIFEST] });
  shell.registerEndpoint(endpoint);
  return shell;
}
function report(shell: ReturnType<typeof fixture>, revision: number, value: unknown = location(), extra = {}) {
  return (shell.handleFrom(endpoint, { type: 'navigation.report', id: `r${revision}`, report: { revision, location: value, ...extra } })[0] as { result: any }).result;
}

describe('runtime-owned navigation history', () => {
  it('starts unreported and records separate push visits', () => {
    const shell = fixture();
    expect(shell.navigationView(endpoint.id)).toEqual({ entries: [], index: null, reportRevision: null, status: 'unreported' });
    const first = report(shell, 1);
    const second = report(shell, 2);
    expect(second.view.entries).toHaveLength(2);
    expect(second.view.entries[0].id).toBe(first.view.entries[0].id);
    expect(second.view.entries[1].id).not.toBe(first.view.entries[0].id);
  });
  it('selects the exact retained visit only after a correlated report', () => {
    const shell = fixture();
    const first = report(shell, 1);
    report(shell, 2, location('bob'));
    const result = shell.revisit(endpoint.id, first.view.entries[0].id);
    expect(result.ok).toBe(true);
    expect(shell.navigationView(endpoint.id).index).toBe(1);
    const delivery = (shell.takeDeliveries(endpoint.id)[0] as any).delivery;
    expect(delivery.sender).toBeNull();
    const revisited = report(shell, 3, location(), { deliveryId: delivery.id });
    expect(revisited.view.index).toBe(0);
    expect(revisited.view.entries).toHaveLength(2);
  });
  it('correlates malformed report rejection and honors rejected revision high-water', () => {
    const shell = fixture();
    report(shell, 1);
    expect(report(shell, 4, location(), { index: 0 }).error.code).toBe('invalid');
    expect(report(shell, 3).error.code).toBe('stale');
    expect(report(shell, 4).ok).toBe(false);
    expect(report(shell, 5).view.status).toBe('current');
  });
});

import { afterEach, vi } from 'vitest';
import type { NavigationResult } from '@napplet/core';
import type { ReferenceShellOptions } from './reference-shell.js';

afterEach(() => vi.useRealTimers());

function setup(options: ReferenceShellOptions = {}) {
  const shell = createReferenceShell(options);
  shell.registerEndpoint(endpoint);
  return shell;
}
function back(shell: ReturnType<typeof fixture>) {
  const first = report(shell, 1);
  report(shell, 2, location('bob'));
  shell.revisit(endpoint.id, first.view.entries[0].id);
  return (shell.takeDeliveries(endpoint.id)[0] as { delivery: { id: string } }).delivery.id;
}

describe('NAVIGATION report conformance', () => {
  it('returns a correlated full view for get and ignores unusable envelope ids', () => {
    const shell = fixture();
    expect(shell.handleFrom(endpoint, { type: 'navigation.get', id: 'read' })).toEqual([{ type: 'navigation.get.result', id: 'read', result: { ok: true, view: shell.navigationView(endpoint.id) } }]);
    expect(shell.handleFrom(endpoint, { type: 'navigation.report', id: '', report: null })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'navigation.other', id: 'read' })).toEqual([]);
    expect(shell.handleFrom(endpoint, { type: 'navigation.report', id: 'bad', report: null })[0]).toMatchObject({ type: 'navigation.report.result', id: 'bad', result: { ok: false, error: { code: 'invalid' } } });
  });
  it('replaces a visit without changing identity and appends when nothing is selected', () => {
    const shell = fixture();
    const first = report(shell, 1);
    const replaced = report(shell, 2, location('bob'), { mode: 'replace' });
    expect(replaced.view.entries).toHaveLength(1);
    expect(replaced.view.entries[0].id).toBe(first.view.entries[0].id);
    expect(report(shell, 3, null).view.index).toBeNull();
    const appended = report(shell, 4, location(), { mode: 'replace' });
    expect(appended.view.entries).toHaveLength(2);
    expect(appended.view.index).toBe(1);
  });
  it('push discards forward history, while null preserves retained visits', () => {
    const shell = fixture();
    const id = back(shell);
    report(shell, 3, location(), { deliveryId: id });
    const pushed = report(shell, 4, location('charlie'));
    expect(pushed.view.entries.map((entry: { location: { payload: { event: string } } }) => entry.location.payload.event)).toEqual(['alice', 'charlie']);
    const detached = report(shell, 5, null);
    expect(detached.view.entries).toEqual(pushed.view.entries);
    expect(detached.view.index).toBeNull();
  });
  it.each([
    { convention: 'napplet:other/open' },
    { convention: 'napplet:note/open', payload: { unadvertised: 'value' } },
    { convention: 'napplet:note/Open' },
  ])('rejects unadvertised locations atomically: %j', (value) => {
    const shell = fixture();
    const first = report(shell, 1);
    const rejected = report(shell, 2, value);
    expect(rejected.error.code).toBe('unsupported');
    expect(rejected.view.entries).toEqual(first.view.entries);
    expect(rejected.view.status).toBe('uncertain');
  });
  it('does not union parameter lists or infer required names/types', () => {
    const manifest = { ...REFERENCE_MANIFEST, tags: [['d', 'reference-handler'], ['z', 'note'], ['i', 'napplet:note/open', 'a'], ['i', 'napplet:note/open', 'b']] };
    const shell = setup({ manifests: [manifest] });
    expect(report(shell, 1, { convention: 'napplet:note/open' }).ok).toBe(true);
    expect(report(shell, 2, { convention: 'napplet:note/open', payload: { a: { nested: [null, 2, true] } } }).ok).toBe(true);
    expect(report(shell, 3, { convention: 'napplet:note/open', payload: { a: 1, b: 2 } }).error.code).toBe('unsupported');
  });
  it('permits absent/empty payloads for empty advertisements, but no fields', () => {
    const manifest = { ...REFERENCE_MANIFEST, tags: [['d', 'reference-handler'], ['z', 'note'], ['i', 'napplet:note/open']] };
    const shell = setup({ manifests: [manifest] });
    expect(report(shell, 1, { convention: 'napplet:note/open' }).ok).toBe(true);
    expect(report(shell, 2, { convention: 'napplet:note/open', payload: {} }).ok).toBe(true);
    expect(report(shell, 3).error.code).toBe('unsupported');
  });
  it.each([
    { convention: 'napplet:note/open?event=alice' },
    { convention: 'napplet:note/open#fragment' },
    { convention: 'napplet:note/open', payload: [] },
    { convention: 'napplet:note/open', payload: 'alice' },
    { convention: 'napplet:note/open', payload: { event: Infinity } },
    { convention: 'napplet:note/open', payload: { event: undefined } },
    { convention: 'napplet:note/open', route: '/private' },
    { convention: 'napplet:note/open', title: 42 },
  ])('rejects malformed location: %j', (value) => {
    expect(report(fixture(), 1, value).error.code).toBe('invalid');
  });
  it.each([{ entries: [] }, { index: 0 }, { id: 'forged-visit' }, { mode: 'other' }])('rejects caller history controls: %j', (extra) => {
    expect(report(fixture(), 1, location(), extra).error.code).toBe('invalid');
  });
  it('rejects null mode, cyclic JSON, classes, and unusable revisions', () => {
    const shell = fixture();
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    expect(report(shell, 1, null, { mode: 'push' }).ok).toBe(false);
    expect(report(shell, 2, location(cycle)).ok).toBe(false);
    expect(report(shell, 3, location(new Date())).ok).toBe(false);
    for (const revision of [0, -1, 1.5, NaN, Infinity]) expect(report(shell, revision).error.code).toBe('invalid');
  });
  it('identical accepted retries preserve pending/uncertain status and ignore map key order', () => {
    const shell = fixture();
    report(shell, 1, location({ a: 1, b: [2, 3] }));
    const second = report(shell, 2, location('bob'));
    const target = shell.navigationView(endpoint.id).entries[0].id;
    shell.revisit(endpoint.id, target);
    expect(report(shell, 2, location('bob')).view.status).toBe('pending');
    expect(report(shell, 4, location(), { index: 0 }).view.status).toBe('uncertain');
    expect(report(shell, 2, location('bob')).view.status).toBe('uncertain');
    expect(report(shell, 5, location({ a: 1, b: [2, 3] })).ok).toBe(true);
    const retry = report(shell, 5, location({ b: [2, 3], a: 1 }));
    expect(retry.ok).toBe(true);
    expect(retry.view.entries).toHaveLength(second.view.entries.length + 1);
    expect(report(shell, 5, location({ b: [3, 2], a: 1 })).error.code).toBe('invalid');
  });
  it('distinguishes payload presence, value types, and explicit mode on accepted retries', () => {
    for (const [initial, changed] of [
      [{ convention: 'napplet:note/open' }, { convention: 'napplet:note/open', payload: {} }],
      [location(1), location('1')],
    ]) {
      const shell = fixture(); report(shell, 1, initial);
      expect(report(shell, 1, changed).error.code).toBe('invalid');
    }
    const shell = fixture(); report(shell, 1);
    expect(report(shell, 1, location(), { mode: 'push' }).error.code).toBe('invalid');
  });
  it('does not let older in-flight or rejected revisions recover current knowledge', () => {
    const shell = fixture(); report(shell, 1);
    const accepted = shell.navigationView(endpoint.id);
    expect(report(shell, 5, location(), { index: 0 }).error.code).toBe('invalid');
    for (const revision of [2, 4, 5]) {
      const rejection = report(shell, revision);
      expect(rejection.ok).toBe(false);
      expect(rejection.view.entries).toEqual(accepted.entries);
      expect(rejection.view.status).toBe('uncertain');
    }
    expect(report(shell, 6).view.status).toBe('current');
    expect(report(shell, 3).view.status).toBe('current');
  });
  it('rejects limits atomically, then recovers with a newer actual report', () => {
    const shell = setup({ navigation: { maxEntries: 1, maxLocationBytes: 200 } });
    const first = report(shell, 1);
    expect(report(shell, 2).error.code).toBe('limit');
    expect(report(shell, 3, location('x'.repeat(300)), { mode: 'replace' }).error.code).toBe('limit');
    const recovered = report(shell, 4, location('bob'), { mode: 'replace' });
    expect(recovered.view.entries[0].id).toBe(first.view.entries[0].id);
    expect(recovered.view.entries[0].location.payload.event).toBe('bob');
  });
  it('binds contracts once to the authenticated endpoint and keeps same-manifest instances independent', () => {
    const shell = fixture();
    const first = report(shell, 1);
    const other = { ...endpoint, id: 'viewer-2' };
    shell.registerEndpoint(other);
    expect(shell.navigationView(other.id).entries).toHaveLength(0);
    expect(shell.revisit(other.id, first.view.entries[0].id).ok).toBe(false);
    const foreign = { id: 'foreign', catalogId: 'different-manifest' };
    expect((shell.handleFrom(foreign, { type: 'navigation.report', id: 'r', report: { revision: 1, location: location() } })[0] as { result: NavigationResult }).result.ok).toBe(false);
    shell.registerEndpoint({ ...endpoint, catalogId: 'different-manifest' });
    expect(report(shell, 2).ok).toBe(true);
  });
});

describe('NAVIGATION traversal conformance', () => {
  it('keeps duplicate invocation visits distinct, using only the delivery association', () => {
    const shell = fixture();
    const first = report(shell, 1);
    report(shell, 2, location('bob'));
    report(shell, 3);
    report(shell, 4, location('charlie'));
    shell.revisit(endpoint.id, first.view.entries[0].id);
    const deliveryId = (shell.takeDeliveries(endpoint.id)[0] as { delivery: { id: string } }).delivery.id;
    const result = report(shell, 5, { ...location(), title: 'New title' }, { deliveryId, mode: 'push' });
    expect(result.view.index).toBe(0);
    expect(result.view.entries).toHaveLength(4);
    expect(result.view.entries[0].location.title).toBe('New title');
  });
  it('does not correlate equal invocations without the pending delivery id', () => {
    const shell = fixture(); back(shell);
    const result = report(shell, 3);
    expect(result.view.index).toBe(2);
    expect(result.view.entries).toHaveLength(3);
    expect(result.view.status).toBe('current');
  });
  it('declined guard may reaffirm current state with replace and no delivery id', () => {
    const shell = fixture(); back(shell);
    const before = shell.navigationView(endpoint.id);
    const reaffirmed = report(shell, 3, location('bob'), { mode: 'replace' });
    expect(reaffirmed.view.entries).toEqual(before.entries);
    expect(reaffirmed.view.index).toBe(1);
    expect(reaffirmed.view.status).toBe('current');
  });
  it.each([location('redirect'), null])('records correlated redirects normally: %j', (value) => {
    const shell = fixture(); const deliveryId = back(shell);
    const result = report(shell, 3, value, { deliveryId });
    expect(result.view.index).toBe(value === null ? null : 2);
    expect(result.view.entries).toHaveLength(value === null ? 2 : 3);
  });
  it('local navigation supersedes a revisit; a late report creates a new visit', () => {
    const shell = fixture(); const deliveryId = back(shell);
    report(shell, 3, location('charlie'));
    const late = report(shell, 4, location(), { deliveryId });
    expect(late.view.index).toBe(3);
    expect(late.view.entries).toHaveLength(4);
    expect(late.view.entries[3].id).not.toBe(late.view.entries[0].id);
  });
  it('finite timeout leaves uncertainty, and late handlers cannot complete old requests', () => {
    vi.useFakeTimers();
    const shell = setup({ navigation: { timeoutMs: 20 } });
    const deliveryId = back(shell);
    vi.advanceTimersByTime(21);
    expect(shell.navigationView(endpoint.id).status).toBe('uncertain');
    expect(shell.navigationView(endpoint.id).index).toBe(1);
    const late = report(shell, 3, location(), { deliveryId });
    expect(late.view.index).toBe(2);
    expect(late.view.entries).toHaveLength(3);
  });
  it('supports injected clock expiration and refuses overlapping/noncurrent revisits', () => {
    let now = 0;
    const shell = setup({ now: () => now, navigation: { timeoutMs: 20 } });
    back(shell);
    expect(shell.revisit(endpoint.id, shell.navigationView(endpoint.id).entries[0].id).ok).toBe(false);
    now = 21;
    expect(shell.navigationView(endpoint.id).status).toBe('uncertain');
    expect(shell.revisit(endpoint.id, shell.navigationView(endpoint.id).entries[0].id).ok).toBe(false);
  });
  it('distinguishes definite pre-delivery failure from ambiguous failure', () => {
    for (const definite of [true, false]) {
      const shell = fixture();
      report(shell, 1); report(shell, 2, location('bob'));
      shell.revisit(endpoint.id, shell.navigationView(endpoint.id).entries[0].id);
      const deliveryId = (shell.takeDeliveries(endpoint.id)[0] as { delivery: { id: string } }).delivery.id;
      shell.failNavigationDelivery(endpoint.id, deliveryId, definite);
      expect(shell.navigationView(endpoint.id).status).toBe(definite ? 'current' : 'uncertain');
      expect(report(shell, 3, location(), { deliveryId }).view.index).toBe(2);
    }
  });
  it('rejects unknown/foreign delivery ids without allowing cross-instance correlation', () => {
    const shell = fixture();
    const deliveryId = back(shell);
    expect(report(shell, 3, location(), { deliveryId: 'unknown' }).error.code).toBe('invalid');
    const other = { ...endpoint, id: 'other-viewer' };
    const rejected = shell.handleFrom(other, { type: 'navigation.report', id: 'other', report: { revision: 1, location: location(), deliveryId } })[0] as { result: NavigationResult };
    expect(rejected.result).toMatchObject({ ok: false, error: { code: 'invalid' }, view: { entries: [], status: 'unreported' } });
  });
  it('prunes unrelated history without changing revision or current/pending target identity', () => {
    const shell = fixture();
    report(shell, 1); report(shell, 2, location('bob')); report(shell, 3, location('charlie'));
    const before = shell.navigationView(endpoint.id);
    shell.revisit(endpoint.id, before.entries[0].id);
    const deliveryId = (shell.takeDeliveries(endpoint.id)[0] as { delivery: { id: string } }).delivery.id;
    const pruned = shell.pruneNavigation(endpoint.id, [before.entries[0].id, before.entries[2].id]);
    expect(pruned.reportRevision).toBe(3);
    expect(pruned.status).toBe('pending');
    expect(pruned.index).toBe(1);
    expect(report(shell, 4, location(), { deliveryId }).view.index).toBe(0);
  });
  it('explicitly clears current/pending references removed by shell retention policy', () => {
    const shell = fixture(); const deliveryId = back(shell);
    const view = shell.navigationView(endpoint.id);
    const pruned = shell.pruneNavigation(endpoint.id, [view.entries[1].id]);
    expect(pruned.status).toBe('uncertain');
    expect(report(shell, 3, location(), { deliveryId }).view.index).toBe(1);
    const empty = shell.pruneNavigation(endpoint.id, []);
    expect(empty.index).toBeNull();
    expect(empty.entries).toEqual([]);
    expect(empty.status).toBe('uncertain');
  });
  it('current-entry selection is a no-op; policy and domain absence prevent dispatch', () => {
    const shell = fixture(); const first = report(shell, 1);
    expect(shell.revisit(endpoint.id, first.view.entries[0].id).ok).toBe(true);
    expect(shell.takeDeliveries(endpoint.id)).toEqual([]);
    const denied = setup({ navigation: { canRevisit: () => false } });
    const deniedFirst = report(denied, 1); report(denied, 2, location('bob'));
    expect(denied.revisit(endpoint.id, deniedFirst.view.entries[0].id)).toMatchObject({ ok: false, error: { code: 'denied' }, view: { status: 'current' } });
    const noIntent = { ...endpoint, id: 'without-intent', domains: ['navigation'] };
    shell.registerEndpoint(noIntent);
    expect(shell.revisit(noIntent.id, 'visit')).toMatchObject({ ok: false, error: { code: 'denied' } });
  });
  it('terminates authority without revival or silent history transfer', () => {
    const shell = fixture(); const deliveryId = back(shell);
    shell.terminateEndpoint(endpoint.id);
    expect(shell.registerEndpoint(endpoint)).toBe(false);
    expect(shell.handleFrom(endpoint, { type: 'navigation.get', id: 'after-close' })).toEqual([]);
    expect(shell.retryIntent(endpoint.id, deliveryId)).toBe(false);
    expect(shell.revisit(endpoint.id, 'visit-1').ok).toBe(false);
    expect(shell.navigationView(endpoint.id).status).toBe('unreported');
    const replacement = { ...endpoint, id: 'replacement' };
    expect(shell.registerEndpoint(replacement)).toBe(true);
    expect(shell.navigationView(replacement.id).entries).toEqual([]);
  });
});

describe('INTENT delivery identity and provenance', () => {
  const request = { archetype: 'note', action: 'open', convention: 'napplet:note/open', payload: { event: 'alice' } };
  it('targets only the selected live instance, retaining ids/content on retry', () => {
    const shell = fixture();
    const other = { ...endpoint, id: 'other' }; shell.registerEndpoint(other);
    const first = shell.deliverIntent(other.id, request)!;
    expect(first.sender).toBeNull();
    expect(first.id).toBeTruthy();
    expect(shell.takeDeliveries(endpoint.id)).toEqual([]);
    expect(shell.takeDeliveries(other.id)).toEqual([{ type: 'intent.deliver', delivery: first }]);
    expect(shell.retryIntent(other.id, first.id)).toBe(true);
    expect(shell.takeDeliveries(other.id)).toEqual([{ type: 'intent.deliver', delivery: first }]);
    expect(shell.deliverIntent(other.id, request)!.id).not.toBe(first.id);
    expect(shell.retryIntent(endpoint.id, first.id)).toBe(false);
  });
  it('never substitutes unsupported, unavailable, terminated, or missing endpoints', () => {
    const shell = fixture();
    expect(shell.deliverIntent('missing', request)).toBeUndefined();
    expect(shell.deliverIntent(endpoint.id, { ...request, convention: 'napplet:other/open', archetype: 'other' })).toBeUndefined();
    shell.registerEndpoint({ ...endpoint, id: 'no-intent', domains: [] });
    expect(shell.deliverIntent('no-intent', request)).toBeUndefined();
    shell.terminateEndpoint(endpoint.id);
    expect(shell.deliverIntent(endpoint.id, request)).toBeUndefined();
  });
  it('ordinary invocation keeps authenticated provenance and exposes no delivery completion id', () => {
    const shell = fixture(); const first = report(shell, 1);
    const source = { id: 'source', catalogId: 'source-catalog' };
    const response = shell.handleFrom(source, { type: 'intent.invoke', id: 'invoke', request })[0] as { result: Record<string, unknown> };
    expect(response.result.ok).toBe(true);
    expect(response.result).not.toHaveProperty('id');
    const delivery = (shell.takeDeliveries(endpoint.id)[0] as { delivery: { sender: string; id: string } }).delivery;
    expect(delivery.sender).toBe(source.catalogId);
    expect(delivery.id).toBeTruthy();
    expect(shell.navigationView(endpoint.id)).toEqual(first.view);
    for (const forgery of [{ sender: null }, { deliveryId: 'forged' }, { instanceId: endpoint.id }]) {
      expect(shell.handleFrom(source, { type: 'intent.invoke', id: 'forged', request: { ...request, ...forgery } })).toEqual([]);
    }
    expect(report(shell, 2, location('bob'), { deliveryId: delivery.id }).ok).toBe(true);
  });
  it('does not narrow ordinary payloads to history parameter allowlists', () => {
    const shell = fixture();
    const delivery = shell.deliverIntent(endpoint.id, { ...request, payload: { arbitrary: 'intent-data' } });
    expect(delivery).toBeDefined();
    expect(report(shell, 1, { convention: request.convention, payload: { arbitrary: 'intent-data' } }, { deliveryId: delivery!.id }).error.code).toBe('unsupported');
  });
});

describe('reference recording reset', () => {
  it('preserves live endpoint authority/history and ends dropped pending deliveries uncertain', () => {
    const shell = fixture();
    const deliveryId = back(shell);
    const before = shell.navigationView(endpoint.id);
    shell.reset();
    expect(shell.records).toEqual([]);
    expect(shell.navigationView(endpoint.id)).toEqual({ ...before, status: 'uncertain' });
    expect(report(shell, 3, location('charlie')).ok).toBe(true);
    expect(shell.handle({ type: 'storage.get', id: 'before', key: 'setting' })).toHaveLength(1);
    shell.reset();
    expect(shell.handle({ type: 'storage.get', id: 'after', key: 'setting' })).toHaveLength(1);
    expect(shell.retryIntent(endpoint.id, deliveryId)).toBe(true);
    expect(report(shell, 4, location(), { deliveryId }).view.index).toBe(3);
  });
});
