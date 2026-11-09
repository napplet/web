import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { catalogPath, prepareRefresh, readCatalog, refresh } from './refresh-nap-maturity.mjs';

const sha = character => character.repeat(40);
const source = `export const NAP_IMPLEMENTATIONS = {
  storage: {
    proposal: { url: 'https://github.com/napplet/naps/pull/3', status: 'in-review', checkedAt: '2026-10-01' },
    maturity: 'supported', rationale: 'Maintained tests.', evidence: ['test.ts'],
    implementationReference: { revision: '${sha('a')}', evidence: 'audit.md', scope: 'Past tests only.' },
  },
};`;

function fixture({ state = 'open', draft = false, merged = false, head = sha('a'), document = sha('b'), removed = false, registryStatus = 'draft', fail = false, race = false } = {}) {
  let reads = 0;
  return {
    async get(endpoint) {
      if (endpoint === 'napplet/naps') return { default_branch: 'main' };
      if (endpoint.includes('/commits/')) return { sha: sha('c') };
      if (endpoint.includes('/git/trees/')) return { tree: [{ type: 'blob', path: 'README.md', sha: sha('d') }, ...removed ? [] : [{ type: 'blob', path: 'NAP-STORAGE.md', sha: document }]] };
      if (fail) throw new Error('GitHub 403 rate limit');
      reads++;
      return { state, draft, merged_at: merged ? '2026-10-01' : null, head: { sha: race && reads > 1 ? sha('e') : head } };
    },
    async list() { return [{ filename: 'NAP-STORAGE.md', sha: document, status: 'modified' }]; },
    async blob() { return `| NAP ID | Status | Domain |\n| --- | --- | --- |\n| NAP-STORAGE | ${registryStatus} | storage |`; },
  };
}

test('status refresh edits only proposal status/date, preserving all implementation assessment bytes', async () => {
  const result = await prepareRefresh({ source, client: fixture({ draft: true }), checkedAt: '2026-10-31' });
  assert.equal(result.catalog, source.replace("status: 'in-review'", 'status: "draft"').replace("checkedAt: '2026-10-01'", 'checkedAt: "2026-10-31"'));
  assert.equal(result.snapshot.observations.storage.headRevision, sha('a'));
  assert.match(result.report, /not verified implementation revisions/);
});

test('unchanged daily checks produce no date churn, files, or release changes', async () => {
  const first = await prepareRefresh({ source, client: fixture(), checkedAt: '2026-10-31' });
  const second = await prepareRefresh({ source: first.catalog, previous: first.snapshot, client: fixture(), checkedAt: '2026-11-01' });
  assert.equal(second.changed, false);
  assert.equal(second.catalog, first.catalog);
});

test('draft, review, merged, and closed-unmerged proposal states remain independent of maturity', async () => {
  for (const [options, expected] of [[{ draft: true }, 'draft'], [{}, 'in-review'], [{ merged: true, state: 'closed' }, 'merged'], [{ state: 'closed' }, 'unknown']]) {
    const result = await prepareRefresh({ source, client: fixture(options) });
    assert.equal(readCatalog(result.catalog)[0].status, expected);
    assert.match(result.catalog, /maturity: 'supported'/);
    if (expected === 'unknown') assert.match(result.report, /RETIREMENT REVIEW/);
  }
});

test('open head changes and later changes to merged documents raise review alerts', async () => {
  const first = await prepareRefresh({ source, client: fixture() });
  const head = await prepareRefresh({ source: first.catalog, previous: first.snapshot, client: fixture({ head: sha('e') }) });
  assert.match(head.report, /proposal head changed/);
  const merged = await prepareRefresh({ source, client: fixture({ merged: true }) });
  const amendment = await prepareRefresh({ source: merged.catalog, previous: merged.snapshot, client: fixture({ merged: true, document: sha('f') }) });
  assert.match(amendment.report, /NAP document changed/);
  assert.equal(amendment.snapshot.observations.storage.headRevision, sha('a'));
});

test('removed merged documents and definite registry retirement require explicit review', async () => {
  const removed = await prepareRefresh({ source, client: fixture({ merged: true, removed: true }) });
  assert.match(removed.report, /RETIREMENT REVIEW/);
  const deferred = await prepareRefresh({ source, client: fixture({ registryStatus: 'deferred' }) });
  assert.match(deferred.report, /RETIREMENT REVIEW/);
  const tentative = await prepareRefresh({ source, client: fixture({ registryStatus: 'MAY DEFER' }) });
  assert.doesNotMatch(tentative.report, /RETIREMENT REVIEW:/);
});

test('a moving PR, bad URL, or malformed catalog fails closed', async () => {
  await assert.rejects(prepareRefresh({ source, client: fixture({ race: true }) }), /changed during refresh/);
  await assert.rejects(prepareRefresh({ source: source.replace('/pull/3', '/issues/3'), client: fixture() }), /Unsupported proposal URL/);
  assert.throws(() => readCatalog('export const unrelated = {};'), /Expected an object-literal/);
});

test('partial fetch failure leaves every local file untouched; successful run writes a review and changeset', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nap-refresh-'));
  try {
    await mkdir(path.join(directory, 'packages/core/src'), { recursive: true });
    await writeFile(path.join(directory, catalogPath), source);
    await assert.rejects(refresh({ directory, client: fixture({ fail: true }) }), /403/);
    assert.equal(await readFile(path.join(directory, catalogPath), 'utf8'), source);
    await assert.rejects(readFile(path.join(directory, 'scripts/data/nap-proposal-observations.json')), /ENOENT/);
    await refresh({ directory, client: fixture({ draft: true }), checkedAt: '2026-10-31' });
    assert.match(await readFile(path.join(directory, '.changeset/nap-proposal-refresh.md'), 'utf8'), /"@napplet\/core": patch/);
    assert.match(await readFile(path.join(directory, 'scripts/data/nap-proposal-review.md'), 'utf8'), /proposal in-review → draft/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
