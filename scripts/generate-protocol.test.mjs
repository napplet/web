import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildProtocolData, napId, parseNap, parseRegistry, plainText } from './lib/protocol-data.mjs';
import { collectProtocol, generateProtocol, githubClient } from './generate-protocol.mjs';

// Metadata excerpts from napplet/naps, observed 2026-10-03. These are parser
// fixtures, not locally maintained specifications or protocol requirements.
const readme = `## Boundary rule
A NAP is runtime-provided AND defines an API surface.
## Governance
- Fork this repo, add a markdown file under naps/, open a PR.
## Registry
| NAP ID | Domain | Description | Status |
|--------|--------|-------------|--------|
| [NAP-IDENTITY](naps/NAP-IDENTITY.md) | \`identity\` | Read-only user identity queries | Draft |
| [NAP-INTENT](naps/NAP-INTENT.md) | \`intent\` | Invoke a napplet by archetype | Active |
| *[NAP-CLASS](https://github.com/napplet/naps/pull/16)* | *\`class\`* | *Napplet class authority* | *Deferred* |`;
const identity = `NAP-IDENTITY
============
Read-Only User Identity Queries
------------------------------
\`draft\`
**NAP ID:** NAP-IDENTITY
**Domain:** \`identity\`
**Depends:**
- \`resource\` — wire · optional — resource metadata
## Description
Read-only user identity queries.
## API Surface
| Operation | Parameters | Result | Wire |
|-----------|------------|--------|------|
| \`getPublicKey\` | — | public key | identity.getPublicKey |
### Schemas
| \`pubkey\` | yes | text |
## Security Considerations
See the living specification.`;
const ble = `# NAP-BLE
## Runtime-Mediated Bluetooth Low Energy
\`draft\`
**NAP ID:** NAP-BLE
**Domain:** \`ble\`
## Description
NAP-BLE lets a napplet communicate with user-approved Bluetooth Low Energy devices through GATT.
## API Surface
| Operation | Parameters | Result | Wire |
|-----------|------------|--------|------|
| \`requestDevice\` | options | device | ble.requestDevice |
## Security Considerations
See the living specification.`;
const template = '# NAP-{NAME}\n## Description\n## API Surface\n### Schemas\n## Security Considerations';
const agents = '## PR format — identical every time\n    ## Summary\n    ## Changes\n    ## Downstream';
const checkedAt = '2026-10-04T00:00:00.000Z';
const base = { branch: 'master', commit: 'a040914', readme, template, agents, checkedAt,
  merged: [{ path: 'naps/NAP-IDENTITY.md', content: identity }], proposals: [] };

test('parses both Markdown title formats, preambles, dependencies and operation names', () => {
  const registry = parseRegistry(readme);
  const entry = parseNap(identity, 'naps/NAP-IDENTITY.md', registry);
  assert.equal(entry.domain, 'identity');
  assert.equal(entry.declaredStatus, 'draft');
  assert.deepEqual(entry.dependencies, ['resource']);
  assert.deepEqual(entry.operations, ['getPublicKey']);
  assert.equal(parseNap(ble, 'naps/NAP-BLE.md', registry).domain, 'ble');
  assert.equal(napId('NAP-BLE.md'), 'NAP-BLE');
  assert.equal(napId('NAP-WORD-TEMPLATE.md'), null);
  assert.equal(napId('README.md'), null);
});

test('repository merge state, document marker and registry status remain independent', () => {
  const data = buildProtocolData(base);
  assert.equal(data.entries[0].state, 'merged');
  assert.equal(data.entries[0].declaredStatus, 'draft');
  assert.equal(data.entries[0].registryStatus, 'Draft');
  assert.equal(data.entries[0].sourceUrl, 'https://github.com/napplet/naps/blob/master/naps/NAP-IDENTITY.md');
  assert.equal(data.entries[0].markdown, identity);
  assert.equal(data.entries[0].documentUrl, 'https://github.com/napplet/naps/blob/a040914/naps/NAP-IDENTITY.md');
  assert.deepEqual(data.contribution.prSections, ['Summary', 'Changes', 'Downstream']);
});

test('open proposals absent from README, amendments and proposed removals get distinct routes', () => {
  const proposals = [
    { number: 62, draft: false, revision: 'ble-head', files: [{ path: 'naps/NAP-BLE.md', content: ble, status: 'added' }] },
    { number: 12, draft: true, revision: 'identity-head', files: [{ path: 'naps/NAP-IDENTITY.md', content: identity, status: 'modified' }] },
    { number: 98, draft: false, revision: 'removal-head', files: [{ path: 'naps/NAP-IDENTITY.md', content: identity, status: 'removed' }] },
  ];
  const data = buildProtocolData({ ...base, proposals });
  assert.equal(data.entries.length, 4);
  assert.equal(data.entries.find(entry => entry.pr === 62).registryStatus, null);
  assert.equal(data.entries.find(entry => entry.pr === 12).change, 'amendment');
  assert.equal(data.entries.find(entry => entry.pr === 98).change, 'removal');
  assert.equal(data.entries.find(entry => entry.pr === 62).discussionUrl, 'https://github.com/napplet/naps/pull/62');
  assert.equal(buildProtocolData(base).entries.some(entry => entry.pr), false, 'closed proposals disappear on refresh');
});

test('deferred parent tracks stay deferred even when their PRs are open', () => {
  const entry = parseNap('# NAP-CLASS-1\n## Strict Baseline Class', 'NAP-CLASS-1.md', parseRegistry(readme));
  assert.equal(entry.registryStatus, 'Deferred');
  assert.equal(entry.statusSource, 'NAP-CLASS');
});

test('data is deterministic and upstream text stays inert', () => {
  assert.deepEqual(buildProtocolData(base), buildProtocolData(base));
  assert.equal(plainText('<script>alert(1)</script> [link](javascript:bad) **text**'), 'alert(1) link text');
  assert.throws(() => buildProtocolData({ ...base, readme: '# Reorganized registry' }), /format changed/);
  assert.throws(() => buildProtocolData({ ...base, template: '# New template' }), /template changed/);
  assert.throws(() => buildProtocolData({ ...base, merged: [] }), /No merged NAPs/);
});

function upstream({ truncated = false, moved = false, failed = false, removed = false } = {}) {
  const pull = { number: 62, title: 'NAP-BLE: Define portable BLE GATT access', draft: false, updated_at: checkedAt,
    head: { sha: 'ble-head', repo: { full_name: 'contributor/naps' } } };
  const documents = { readme, template, agents, identity, ble };
  const requested = [];
  return {
    requested,
    async get(endpoint) {
      if (endpoint === 'napplet/naps') return { default_branch: 'master' };
      if (endpoint.includes('/commits/')) return { sha: 'a040914' };
      if (endpoint.includes('/git/trees/')) return { truncated, tree: [
        { path: 'README.md', sha: 'readme', type: 'blob' },
        { path: 'NAP-WORD-TEMPLATE.md', sha: 'template', type: 'blob' },
        { path: 'AGENTS.md', sha: 'agents', type: 'blob' },
        { path: 'naps/NAP-IDENTITY.md', sha: 'identity', type: 'blob' },
      ] };
      return { ...pull, state: moved ? 'closed' : 'open' };
    },
    async list(endpoint) {
      return endpoint.includes('/files') ? [{ filename: 'naps/NAP-BLE.md', sha: 'ble', blob_url: 'https://github.com/napplet/naps/blob/old-base/naps/NAP-BLE.md', status: removed ? 'removed' : 'added' }] : [pull];
    },
    async blob(repo, sha) {
      requested.push(`${repo}/${sha}`);
      if (failed && sha === 'ble') throw new Error('Upstream unavailable');
      return documents[sha];
    },
  };
}

test('reads fork blobs and rechecks proposal state; rejects truncated or moving sources', async () => {
  const client = upstream();
  const data = await collectProtocol(client, checkedAt);
  assert.equal(data.entries.length, 2);
  assert.ok(client.requested.includes('contributor/naps/ble'));
  assert.equal(data.entries.find(entry => entry.pr === 62).markdown, ble);
  assert.equal(data.entries.find(entry => entry.pr === 62).documentUrl, 'https://github.com/contributor/naps/blob/ble-head/naps/NAP-BLE.md');
  await assert.rejects(collectProtocol(upstream({ truncated: true })), /truncated/);
  await assert.rejects(collectProtocol(upstream({ moved: true })), /changed during refresh/);
});

test('paginates past 100 results and fails explicitly on GitHub API errors', async () => {
  const calls = [];
  const client = githubClient(undefined, async url => {
    calls.push(url);
    return { ok: true, json: async () => url.endsWith('page=1') ? Array.from({ length: 100 }, (_, number) => ({ number })) : [{ number: 101 }] };
  });
  assert.equal((await client.list('napplet/naps/pulls?state=open')).length, 101);
  assert.ok(calls[1].includes('&per_page=100&page=2'));
  const denied = githubClient(undefined, async () => ({ ok: false, status: 403 }));
  await assert.rejects(denied.get('napplet/naps'), /GitHub 403/);
});

test('a removal proposal uses its diff blob even when the file no longer exists on the default branch', async () => {
  const client = upstream({ removed: true });
  const data = await collectProtocol(client, checkedAt);
  assert.equal(data.entries.find(entry => entry.pr === 62).change, 'removal');
  assert.equal(data.entries.find(entry => entry.pr === 62).documentUrl, 'https://github.com/napplet/naps/blob/old-base/naps/NAP-BLE.md');
  assert.equal(data.entries.find(entry => entry.pr === 62).markdown, ble);
  assert.ok(client.requested.includes('napplet/naps/ble'));
});

test('failed refresh preserves the last good snapshot; successful refresh atomically replaces it', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'napplet-protocol-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'protocol.json');
  await writeFile(output, 'previous snapshot');
  await assert.rejects(generateProtocol({ client: upstream({ failed: true }), output, checkedAt }), /unavailable/);
  assert.equal(await readFile(output, 'utf8'), 'previous snapshot');
  const data = await generateProtocol({ client: upstream(), output, checkedAt });
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), data);
});
