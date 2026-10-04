import { execFileSync } from 'node:child_process';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProtocolData, napId } from './lib/protocol-data.mjs';

const repository = 'napplet/naps';

/** Read paginated GitHub data with a bounded timeout and explicit failure handling. */
export function githubClient(token, fetcher = fetch) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  async function get(endpoint) {
    const response = await fetcher(`https://api.github.com/repos/${endpoint}`, { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`GitHub ${response.status} while reading ${endpoint}. Check API access/rate limits; existing data is unchanged.`);
    return response.json();
  }
  async function list(endpoint) {
    const all = [];
    for (let page = 1; page <= 30; page++) {
      const batch = await get(`${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw new Error(`Expected a GitHub list: ${endpoint}`);
      all.push(...batch);
      if (batch.length < 100) return all;
    }
    throw new Error(`GitHub pagination limit reached: ${endpoint}; refusing partial data.`);
  }
  async function blob(repo, sha) {
    const data = await get(`${repo}/git/blobs/${sha}`);
    if (data.encoding !== 'base64' || typeof data.content !== 'string') throw new Error(`Unsupported GitHub blob: ${sha}`);
    return Buffer.from(data.content, 'base64').toString('utf8');
  }
  return { get, list, blob };
}

async function mapLimited(items, mapper) {
  const results = [];
  for (let i = 0; i < items.length; i += 4) results.push(...await Promise.all(items.slice(i, i + 4).map(mapper)));
  return results;
}

/** Fetch current merged specs and every open proposal, including fork PRs and amendments. */
export async function collectProtocol(client, checkedAt = new Date().toISOString()) {
  const { default_branch: branch } = await client.get(repository);
  const { sha: commit } = await client.get(`${repository}/commits/${encodeURIComponent(branch)}`);
  const tree = await client.get(`${repository}/git/trees/${commit}?recursive=1`);
  if (tree.truncated) throw new Error('GitHub tree is truncated; refusing partial protocol data.');
  const files = tree.tree.filter(entry => entry.type === 'blob');
  async function document(name) {
    const file = files.find(entry => entry.path === name);
    if (!file) throw new Error(`Missing upstream document: ${name}`);
    return client.blob(repository, file.sha);
  }
  const [readme, template, agents, merged, pulls] = await Promise.all([
    document('README.md'), document('NAP-WORD-TEMPLATE.md'), document('AGENTS.md'),
    mapLimited(files.filter(file => napId(file.path)), async file => ({ path: file.path, content: await client.blob(repository, file.sha) })),
    client.list(`${repository}/pulls?state=open`),
  ]);
  const proposals = await mapLimited(pulls, async pull => {
    const changed = (await client.list(`${repository}/pulls/${pull.number}/files`)).filter(file => napId(file.filename));
    const specs = await mapLimited(changed, async file => {
      if (file.status === 'removed') {
        // The diff's blob remains available even if the default branch has
        // already removed or changed the document since this PR was opened.
        if (!file.blob_url) throw new Error(`Missing original document URL for removed file: ${file.filename}`);
        return { path: file.filename, status: file.status, documentUrl: file.blob_url, content: await client.blob(repository, file.sha) };
      }
      if (!pull.head.repo) throw new Error(`Missing head repository for PR #${pull.number}`);
      const documentUrl = `https://github.com/${pull.head.repo.full_name}/blob/${pull.head.sha}/${file.filename}`;
      return { path: file.filename, status: file.status, documentUrl, content: await client.blob(pull.head.repo.full_name, file.sha) };
    });
    // Recheck the PR after reading file blobs so a concurrently updated/closed PR cannot silently mix revisions.
    if (specs.length) {
      const current = await client.get(`${repository}/pulls/${pull.number}`);
      if (current.state !== 'open' || current.head.sha !== pull.head.sha) throw new Error(`PR #${pull.number} changed during refresh; retry generation.`);
    }
    return { number: pull.number, title: pull.title, draft: pull.draft, updatedAt: pull.updated_at, revision: pull.head.sha, files: specs };
  });
  return buildProtocolData({ branch, commit, readme, template, agents, merged, proposals, checkedAt });
}

/** Replace the snapshot only after the entire upstream read and validation succeed. */
export async function generateProtocol({ client, output, checkedAt }) {
  const data = await collectProtocol(client, checkedAt);
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
  return data;
}

function localToken() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  try { return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return undefined; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = fileURLToPath(new URL('../apps/web/src/data/protocol.json', import.meta.url));
  const data = await generateProtocol({ client: githubClient(localToken()), output });
  console.log(`Generated ${data.entries.length} NAP entries from ${repository}@${data.commit.slice(0, 7)} (${data.checkedAt}).`);
}
