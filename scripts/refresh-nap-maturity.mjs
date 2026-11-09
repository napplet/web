import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { githubClient } from './generate-protocol.mjs';
import { napId, parseRegistry } from './lib/protocol-data.mjs';

const repository = 'napplet/naps';
const root = fileURLToPath(new URL('../', import.meta.url));
export const catalogPath = 'packages/core/src/nap-catalog.ts';
export const snapshotPath = 'scripts/data/nap-proposal-observations.json';

/** Read proposal fields structurally, without evaluating catalog code or importing built packages. */
export function readCatalog(source) {
  const file = ts.createSourceFile(catalogPath, source, ts.ScriptTarget.Latest, true);
  if (file.parseDiagnostics.length) throw new Error('Cannot parse NAP catalog.');
  let catalog;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'NAP_IMPLEMENTATIONS') catalog = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!catalog || !ts.isObjectLiteralExpression(catalog)) throw new Error('Expected an object-literal NAP_IMPLEMENTATIONS catalog.');
  const property = (node, name) => node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(file).replace(/['"]/g, '') === name)?.initializer;
  const literal = node => {
    if (!node || !ts.isStringLiteral(node)) throw new Error('Expected literal proposal metadata.');
    return node.text;
  };
  return catalog.properties.map(entry => {
    if (!ts.isPropertyAssignment(entry)) throw new Error('Unsupported catalog entry.');
    const proposal = property(entry.initializer, 'proposal');
    if (!proposal || !ts.isObjectLiteralExpression(proposal)) throw new Error('Missing proposal metadata.');
    const statusNode = property(proposal, 'status');
    const dateNode = property(proposal, 'checkedAt');
    return {
      domain: entry.name.getText(file).replace(/['"]/g, ''),
      url: literal(property(proposal, 'url')), status: literal(statusNode), checkedAt: literal(dateNode),
      statusRange: [statusNode.getStart(file), statusNode.end], dateRange: [dateNode.getStart(file), dateNode.end],
    };
  });
}

function proposalState(pull) {
  if (pull.merged_at) return 'merged';
  if (pull.state === 'closed') return 'unknown';
  if (pull.state !== 'open' || typeof pull.draft !== 'boolean') throw new Error('Invalid GitHub proposal state.');
  return pull.draft ? 'draft' : 'in-review';
}

/** Collect a complete observation before preparing any changes. Revisions record observation, never verification. */
export async function collectObservations(entries, client) {
  const repo = await client.get(repository);
  const commit = await client.get(`${repository}/commits/${encodeURIComponent(repo.default_branch)}`);
  const tree = await client.get(`${repository}/git/trees/${commit.sha}?recursive=1`);
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete upstream tree.');
  const blobs = new Map(tree.tree.filter(item => item.type === 'blob').map(item => [item.path, item.sha]));
  const readme = blobs.get('README.md');
  if (!readme) throw new Error('Missing upstream registry.');
  const registry = parseRegistry(await client.blob(repository, readme));
  if (!registry.size) throw new Error('Cannot read upstream registry; refusing an incomplete refresh.');
  const observations = {};
  for (const entry of entries) {
    const number = entry.url.match(/^https:\/\/github\.com\/napplet\/naps\/pull\/(\d+)$/)?.[1];
    if (!number) throw new Error(`Unsupported proposal URL for ${entry.domain}; review its source mapping.`);
    const endpoint = `${repository}/pulls/${number}`;
    const pull = await client.get(endpoint);
    const status = proposalState(pull);
    if (!/^[a-f0-9]{40}$/.test(pull.head?.sha)) throw new Error(`Missing revision for ${entry.domain}.`);
    const files = (await client.list(`${endpoint}/files`)).filter(item => napId(item.filename));
    if (!files.length) throw new Error(`No NAP files found for ${entry.domain}.`);
    const specFiles = files.map(item => {
      const revision = status === 'merged' ? blobs.get(item.filename) ?? null : item.status === 'removed' ? null : item.sha;
      if (revision !== null && !/^[a-f0-9]{40}$/.test(revision ?? '')) throw new Error(`Invalid file revision for ${entry.domain}.`);
      return { path: item.filename, revision };
    }).sort((a, b) => a.path.localeCompare(b.path));
    const current = await client.get(endpoint);
    if (current.head?.sha !== pull.head.sha || proposalState(current) !== status) throw new Error(`Proposal ${entry.domain} changed during refresh; retry.`);
    const registryStatuses = [...registry.entries()]
      .filter(([id, row]) => row.domain.replace(/`/g, '') === entry.domain || files.some(item => napId(item.filename) === id))
      .map(([id, row]) => ({ id, status: row.status })).sort((a, b) => a.id.localeCompare(b.id));
    observations[entry.domain] = { url: entry.url, status, headRevision: pull.head.sha, specFiles, registryStatuses };
  }
  return { version: 1, observations };
}

/** Prepare deterministic edits restricted to proposal status and date; implementation assessments stay untouched. */
export async function prepareRefresh({ source, previous, client, checkedAt = new Date().toISOString().slice(0, 10) }) {
  const entries = readCatalog(source);
  const snapshot = await collectObservations(entries, client);
  const changes = [];
  const edits = [];
  for (const entry of entries) {
    const observed = snapshot.observations[entry.domain];
    const before = previous?.observations?.[entry.domain];
    if (JSON.stringify(before) === JSON.stringify(observed) && entry.status === observed.status) continue;
    const reasons = [];
    if (!before) reasons.push('first observation (not implementation verification)');
    if (before && before.url !== observed.url) reasons.push('canonical proposal link changed');
    if (entry.status !== observed.status) reasons.push(`proposal ${entry.status} → ${observed.status}`);
    if (before && before.headRevision !== observed.headRevision) reasons.push('proposal head changed');
    if (before && JSON.stringify(before.specFiles) !== JSON.stringify(observed.specFiles)) reasons.push('NAP document changed or was removed');
    if (before && JSON.stringify(before.registryStatuses) !== JSON.stringify(observed.registryStatuses)) reasons.push('registry status changed');
    if (observed.status === 'unknown' || observed.specFiles.some(file => file.revision === null)
      || observed.registryStatuses.some(row => /\b(deferred|rejected|withdrawn)\b/i.test(row.status) && !/\bmay\b/i.test(row.status))) {
      reasons.push('RETIREMENT REVIEW: closed, removed, or retired proposal; inspect dependent code, validators and docs under AGENTS.md');
    }
    changes.push({ domain: entry.domain, url: entry.url, reasons });
    edits.push({ range: entry.statusRange, value: JSON.stringify(observed.status) }, { range: entry.dateRange, value: JSON.stringify(checkedAt) });
  }
  // Removed local domains are pruned from the observation file as well.
  const changed = JSON.stringify(previous) !== JSON.stringify(snapshot) || edits.length > 0;
  let catalog = source;
  for (const edit of edits.sort((a, b) => b.range[0] - a.range[0])) catalog = catalog.slice(0, edit.range[0]) + edit.value + catalog.slice(edit.range[1]);
  const report = [
    '# NAP proposal refresh', '',
    'Non-normative upstream observations. Review upstream changes against our implementation before merging. No maturity, rationale, evidence, or implementation-reference revision was changed.', '',
    '| Domain | Change requiring review |', '| --- | --- |',
    ...changes.map(change => `| [${change.domain}](${change.url}) | ${change.reasons.join('; ')} |`), '',
    'Observed revisions in scripts/data/nap-proposal-observations.json are change-detection baselines, not verified implementation revisions or pinned specifications. Merging acknowledges this observation; it does not certify conformance. Retirement warnings require the dependent-surface sweep prescribed by AGENTS.md.', '',
  ].join('\n');
  return { changed, catalog, snapshot, report, changes };
}

/** Refresh local files only after all upstream reads succeed; CI publishes them solely through a review PR. */
export async function refresh({ directory = root, client = githubClient(process.env.GH_TOKEN || process.env.GITHUB_TOKEN), checkedAt } = {}) {
  const source = await readFile(path.join(directory, catalogPath), 'utf8');
  let previous;
  try { previous = JSON.parse(await readFile(path.join(directory, snapshotPath), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous && (previous.version !== 1 || !previous.observations)) throw new Error('Unsupported observation snapshot.');
  const result = await prepareRefresh({ source, previous, client, checkedAt });
  if (result.changed) {
    await mkdir(path.join(directory, 'scripts/data'), { recursive: true });
    await writeFile(path.join(directory, catalogPath), result.catalog);
    await writeFile(path.join(directory, snapshotPath), `${JSON.stringify(result.snapshot, null, 2)}\n`);
    await writeFile(path.join(directory, 'scripts/data/nap-proposal-review.md'), result.report);
    if (result.catalog !== source) {
      await mkdir(path.join(directory, '.changeset'), { recursive: true });
      await writeFile(path.join(directory, '.changeset/nap-proposal-refresh.md'), '---\n"@napplet/core": patch\n---\n\nRefresh observed upstream proposal status and provenance. Implementation maturity and verification references are unchanged.\n');
    }
  }
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, result.changed ? result.report : 'NAP proposal check succeeded; no changes.\n', { flag: 'a' });
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await refresh();
  console.log(result.changed ? `Prepared ${result.changes.length} domain observations for review.` : 'NAP observations unchanged.');
}
