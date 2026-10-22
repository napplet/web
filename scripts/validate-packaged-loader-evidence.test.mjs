import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, test } from 'node:test';
import { nip19 } from 'nostr-tools';
import { finalizeEvent } from 'nostr-tools/pure';

const VALIDATOR_URL = new URL('./validate-packaged-loader-evidence.mjs', import.meta.url);
const SCREENSHOT_STATES = ['initial', 'active-35s', 'partial', 'error', 'ready', 'cancelled', 'light', 'dark', 'reduced-motion', 'keyboard-retry'];
const SESSION_NAMES = ['packaged-loader-long', 'packaged-loader-retry', 'packaged-loader-cancel', 'packaged-loader-a11y'];
const H1 = 'a'.repeat(40);
const H2 = 'b'.repeat(40);
const SECRET = '11'.repeat(32);
const roots = [];

afterEach(() => {
  while (roots.length > 0) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clone(value) {
  return structuredClone(value);
}

function png(width = 1, height = 1) {
  const value = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(value, 0);
  value.writeUInt32BE(13, 8);
  value.write('IHDR', 12, 'ascii');
  value.writeUInt32BE(width, 16);
  value.writeUInt32BE(height, 20);
  value[24] = 8;
  value[25] = 6;
  return value;
}

function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const filename = Buffer.from(name);
    const data = Buffer.from(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, filename, data);
    centrals.push(central, filename);
    offset += local.length + filename.length + data.length;
  }
  const centralOffset = offset;
  const centralBytes = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([...locals, centralBytes, eocd]);
}

function aggregate(pathTags) {
  return sha256(Buffer.from(pathTags.map(({ path: file, sha256: digest }) => `${digest} ${file}\n`).sort().join('')));
}

function timelineEvents() {
  return [
    {
      name: 'packaged-loader-long', openedAt: 0, closedAt: 41_000, closed: true,
      events: [
        { at: 0, type: 'navigation' },
        { at: 1, type: 'state', state: 'initial' },
        { at: 2, type: 'request', source: 'asset-01.webp', attempt: 1 },
        { at: 3, type: 'state', state: 'active' },
        { at: 35_003, type: 'state', state: 'active-35s' },
        { at: 36_000, type: 'terminal', source: 'asset-01.webp', attempt: 1, outcome: 'success' },
        { at: 37_000, type: 'state', state: 'partial' },
        { at: 38_000, type: 'state', state: 'ready' },
        { at: 39_000, type: 'final-app' },
      ],
    },
    {
      name: 'packaged-loader-retry', openedAt: 0, closedAt: 20, closed: true,
      events: [
        { at: 0, type: 'navigation' },
        { at: 1, type: 'state', state: 'initial' },
        { at: 2, type: 'request', source: 'asset-02.webp', attempt: 1 },
        { at: 3, type: 'state', state: 'active' },
        { at: 4, type: 'terminal', source: 'asset-02.webp', attempt: 1, outcome: 'failure' },
        { at: 5, type: 'state', state: 'error' },
        { at: 6, type: 'retry', source: 'asset-02.webp' },
        { at: 7, type: 'request', source: 'asset-02.webp', attempt: 2 },
        { at: 8, type: 'terminal', source: 'asset-02.webp', attempt: 2, outcome: 'success' },
        { at: 9, type: 'state', state: 'keyboard-retry' },
        { at: 10, type: 'state', state: 'ready' },
        { at: 11, type: 'final-app' },
      ],
    },
    {
      name: 'packaged-loader-cancel', openedAt: 0, closedAt: 20, closed: true,
      events: [
        { at: 0, type: 'navigation' },
        { at: 1, type: 'state', state: 'initial' },
        { at: 2, type: 'request', source: 'asset-03.webp', attempt: 1 },
        { at: 3, type: 'state', state: 'active' },
        { at: 4, type: 'cancel', source: 'asset-03.webp' },
        { at: 5, type: 'terminal', source: 'asset-03.webp', attempt: 1, outcome: 'cancelled' },
        { at: 6, type: 'state', state: 'cancelled' },
        { at: 7, type: 'retry', source: 'asset-03.webp' },
        { at: 8, type: 'request', source: 'asset-03.webp', attempt: 2 },
        { at: 9, type: 'terminal', source: 'asset-03.webp', attempt: 2, outcome: 'success' },
        { at: 10, type: 'state', state: 'ready' },
        { at: 11, type: 'final-app' },
      ],
    },
    {
      name: 'packaged-loader-a11y', openedAt: 0, closedAt: 20, closed: true,
      events: [
        { at: 0, type: 'navigation' },
        { at: 1, type: 'state', state: 'initial' },
        { at: 2, type: 'state', state: 'light' },
        { at: 3, type: 'state', state: 'dark' },
        { at: 4, type: 'state', state: 'reduced-motion' },
        { at: 5, type: 'state', state: 'keyboard-retry' },
        { at: 6, type: 'final-app' },
      ],
    },
  ];
}

async function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'napplet-loader-evidence-'));
  roots.push(root);
  const evidenceDir = path.join(root, 'evidence');
  fs.mkdirSync(evidenceDir);
  const secretFile = path.join(root, 'secret');
  fs.writeFileSync(secretFile, `${SECRET}\n`, { mode: 0o600 });

  const server = 'https://blossom.fixture.test';
  const resources = ['asset-01.webp', 'asset-02.webp', 'asset-03.webp'].map((source, index) => {
    const value = Buffer.alloc(4, 49 + index);
    const digest = sha256(value);
    return { source, uri: `blossom:sha256:${digest}`, endpoint: `${server}/${digest}`, bytes: value.length, sha256: digest, value };
  });
  const table = resources.map(({ value: _value, ...entry }) => ({ source: entry.source, uri: entry.uri, sha256: entry.sha256, bytes: entry.bytes, mime: 'image/webp' }));
  const indexBytes = Buffer.from(`<html><head><script type="application/json" data-napplet-private-resource-table>${JSON.stringify(table)}</script></head><body></body></html>`);
  const indexHash = sha256(indexBytes);
  const otherHash = sha256(Buffer.from('secondary path'));
  const paths = [{ path: '/z.html', sha256: otherHash }, { path: '/index.html', sha256: indexHash }];
  const aggregateHash = aggregate(paths);
  const secretKey = new Uint8Array(32).fill(7);
  const dTag = 'loader-proof';
  const event = finalizeEvent({
    kind: 35_128,
    created_at: 1_700_000_000,
    content: '',
    tags: [
      ['d', dTag],
      ...paths.map((entry) => ['path', entry.path, entry.sha256]),
      ['x', aggregateHash, 'aggregate'],
      ['server', server],
    ],
  }, secretKey);
  const relays = ['wss://relay.fixture.test'];
  const naddr = nip19.naddrEncode({ kind: event.kind, pubkey: event.pubkey, identifier: dTag, relays });

  const screenshots = SCREENSHOT_STATES.map((state, index) => {
    const file = `${String(index + 1).padStart(2, '0')}-${state === 'active-35s' ? 'active-35s' : state}.png`;
    const value = png(1, 1);
    fs.writeFileSync(path.join(evidenceDir, file), value);
    const session = state === 'error' || state === 'keyboard-retry'
      ? 'packaged-loader-retry'
      : state === 'cancelled'
        ? 'packaged-loader-cancel'
        : ['light', 'dark', 'reduced-motion'].includes(state)
          ? 'packaged-loader-a11y'
          : 'packaged-loader-long';
    return { state, file, session, width: 1, height: 1, sha256: sha256(value) };
  });
  const traceBytes = zip([
    ['trace.trace', JSON.stringify({ type: 'context-options', browserName: 'chromium' })],
    ['trace.network', JSON.stringify({ type: 'resource-snapshot', url: resources[0].endpoint })],
  ]);
  fs.writeFileSync(path.join(evidenceDir, 'paja-loader-trace.zip'), traceBytes);
  const timeline = {
    schemaVersion: 1,
    manifest: {
      naddr,
      eventId: event.id,
      author: event.pubkey,
      kind: event.kind,
      dTag,
      relays,
      servers: [server],
      paths,
      aggregateHash,
      index: { path: '/index.html', endpoint: `${server}/${indexHash}`, bytes: indexBytes.length, sha256: indexHash },
    },
    resources: resources.map(({ value: _value, ...entry }) => entry),
    sessions: timelineEvents(),
    screenshots,
    trace: { file: 'paja-loader-trace.zip', sha256: sha256(traceBytes) },
    browser: { name: 'chromium', version: 'fixture-1' },
  };
  fs.writeFileSync(path.join(evidenceDir, 'paja-loader-timeline.json'), `${JSON.stringify(timeline, null, 2)}\n`);

  const fetches = new Map([[timeline.manifest.index.endpoint, indexBytes], ...resources.map((entry) => [entry.endpoint, entry.value])]);
  const reviewPath = path.join(root, '260904-nm7-REVIEW.md');
  const verificationPath = path.join(root, '260904-nm7-VERIFICATION.md');
  fs.writeFileSync(reviewPath, `---\nreviewed_sha: ${H1}\nstatus: passed\n---\n`);
  fs.writeFileSync(verificationPath, `---\nreviewed_sha: ${H1}\nstatus: gaps_found\nrequirements_failed: 0\npublication_pending: true\n---\n`);
  const planPrefix = reviewPath.replace('-REVIEW.md', '');
  const metadataPaths = [
    `${planPrefix}-PLAN.md`,
    `${planPrefix}-RESEARCH.md`,
    `${planPrefix}-VALIDATION.md`,
    reviewPath,
    verificationPath,
    `${planPrefix}-SUMMARY.md`,
    '.planning/STATE.md',
  ];
  const services = {
    queryRelay: async () => [clone(event)],
    fetchBytes: async (url) => {
      const value = fetches.get(url);
      if (!value) throw new Error(`fixture URL unavailable: ${url}`);
      return Buffer.from(value);
    },
    git: {
      localHead: async () => H2,
      remoteHead: async (ref) => ref === 'feat/packaged-loader-ux' ? H2 : 'c'.repeat(40),
      isAncestor: async () => true,
      diffPaths: async () => [...metadataPaths],
      treeHash: async () => 'source-evidence-tree',
      diffText: async () => '',
    },
    github: {
      pullRequest: async () => ({ number: 321, state: 'OPEN', merged: false, headSha: H2, head: 'feat/packaged-loader-ux', base: 'feat/vite-plugin-blossom-optimization', body: `Evidence H1 ${H1} H2 ${H2}` }),
      timeline: async () => [],
    },
  };
  const publication = {
    repo: 'napplet/web',
    head: 'feat/packaged-loader-ux',
    base: 'feat/vite-plugin-blossom-optimization',
    reviewPath,
    verificationPath,
  };
  return { root, evidenceDir, secretFile, timeline, event, resources, indexBytes, traceBytes, fetches, services, publication, metadataPaths };
}

function writeTimeline(fixture) {
  fs.writeFileSync(path.join(fixture.evidenceDir, 'paja-loader-timeline.json'), `${JSON.stringify(fixture.timeline, null, 2)}\n`);
}

function replaceTrace(fixture, value) {
  fs.writeFileSync(path.join(fixture.evidenceDir, fixture.timeline.trace.file), value);
  fixture.timeline.trace.sha256 = sha256(value);
  writeTimeline(fixture);
}

async function validator() {
  return import(VALIDATOR_URL.href);
}

async function expectInvalid(mutate, options = {}) {
  const { validateEvidence } = await validator();
  const fixture = await createFixture();
  await mutate(fixture);
  await assert.rejects(validateEvidence({
    evidenceDir: fixture.evidenceDir,
    secretFile: fixture.secretFile,
    services: fixture.services,
    ...(options.publication ? { publication: fixture.publication } : {}),
  }));
}

test('accepts a complete deterministic non-publication evidence fixture', async () => {
  const { validateEvidence } = await validator();
  const fixture = await createFixture();
  const result = await validateEvidence({ evidenceDir: fixture.evidenceDir, secretFile: fixture.secretFile, services: fixture.services });
  assert.deepEqual(result, { screenshots: 10, resources: 3, activeDurationMs: 35_000, publication: false });
});

test('non-publication mode does not require review, git, or pull-request state', async () => {
  const { validateEvidence } = await validator();
  const fixture = await createFixture();
  delete fixture.services.git;
  delete fixture.services.github;
  fs.rmSync(fixture.publication.reviewPath);
  fs.rmSync(fixture.publication.verificationPath);
  await assert.doesNotReject(validateEvidence({ evidenceDir: fixture.evidenceDir, secretFile: fixture.secretFile, services: fixture.services }));
});

for (const [name, mutate] of [
  ['rejects the wrong schema version', (fixture) => { fixture.timeline.schemaVersion = 2; writeTimeline(fixture); }],
  ['rejects unknown timeline fields', (fixture) => { fixture.timeline.untrusted = true; writeTimeline(fixture); }],
  ['rejects non-monotonic event timestamps', (fixture) => { fixture.timeline.sessions[0].events[2].at = 0; writeTimeline(fixture); }],
  ['rejects invalid navigation-to-final-app ordering', (fixture) => { fixture.timeline.sessions[0].events.reverse(); writeTimeline(fixture); }],
  ['rejects duplicate terminal events for one attempt', (fixture) => { fixture.timeline.sessions[1].events.splice(5, 0, clone(fixture.timeline.sessions[1].events[4])); writeTimeline(fixture); }],
  ['rejects a claimed long wait with only 34,999 derived milliseconds', (fixture) => { fixture.timeline.sessions[0].events.find((event) => event.state === 'active-35s').at = 35_002; fixture.timeline.longWaitPassed = true; writeTimeline(fixture); }],
  ['rejects a missing required session', (fixture) => { fixture.timeline.sessions.pop(); writeTimeline(fixture); }],
  ['rejects a renamed required session', (fixture) => { fixture.timeline.sessions[0].name = 'other'; writeTimeline(fixture); }],
  ['rejects an unclosed required session', (fixture) => { fixture.timeline.sessions[0].closed = false; writeTimeline(fixture); }],
  ['rejects a missing screenshot state', (fixture) => { fixture.timeline.screenshots.pop(); writeTimeline(fixture); }],
]) test(name, () => expectInvalid(mutate));

test('rejects a PNG with a bad signature', () => expectInvalid((fixture) => {
  const screenshot = fixture.timeline.screenshots[0];
  const value = fs.readFileSync(path.join(fixture.evidenceDir, screenshot.file));
  value[0] = 0;
  fs.writeFileSync(path.join(fixture.evidenceDir, screenshot.file), value);
  screenshot.sha256 = sha256(value);
  writeTimeline(fixture);
}));

test('rejects a PNG without a valid IHDR', () => expectInvalid((fixture) => {
  const screenshot = fixture.timeline.screenshots[0];
  const value = fs.readFileSync(path.join(fixture.evidenceDir, screenshot.file));
  value.write('NOPE', 12, 'ascii');
  fs.writeFileSync(path.join(fixture.evidenceDir, screenshot.file), value);
  screenshot.sha256 = sha256(value);
  writeTimeline(fixture);
}));

test('rejects zero PNG dimensions', () => expectInvalid((fixture) => {
  const screenshot = fixture.timeline.screenshots[0];
  const value = png(0, 1);
  fs.writeFileSync(path.join(fixture.evidenceDir, screenshot.file), value);
  screenshot.sha256 = sha256(value);
  screenshot.width = 0;
  writeTimeline(fixture);
}));

test('rejects PNG dimensions that differ from the timeline', () => expectInvalid((fixture) => {
  fixture.timeline.screenshots[0].width = 2;
  writeTimeline(fixture);
}));

test('rejects a PNG full-file hash mismatch', () => expectInvalid((fixture) => {
  fixture.timeline.screenshots[0].sha256 = '0'.repeat(64);
  writeTimeline(fixture);
}));

test('rejects a trace without an EOCD record', () => expectInvalid((fixture) => replaceTrace(fixture, fixture.traceBytes.subarray(0, -22))));

test('rejects a corrupt ZIP central directory', () => expectInvalid((fixture) => {
  const value = Buffer.from(fixture.traceBytes);
  value.writeUInt32LE(0, value.indexOf(Buffer.from('504b0102', 'hex')));
  replaceTrace(fixture, value);
}));

test('rejects unsafe ZIP entry paths', () => expectInvalid((fixture) => replaceTrace(fixture, zip([
  ['../trace.trace', '{}'], ['trace.network', '{}'],
]))));

test('rejects a trace missing required Playwright entries', () => expectInvalid((fixture) => replaceTrace(fixture, zip([
  ['trace.trace', '{}'],
]))));

test('rejects a trace full-file hash mismatch', () => expectInvalid((fixture) => {
  fixture.timeline.trace.sha256 = '0'.repeat(64);
  writeTimeline(fixture);
}));

for (const [name, mutate] of [
  ['rejects an naddr author mismatch', (fixture) => { fixture.timeline.manifest.author = 'f'.repeat(64); writeTimeline(fixture); }],
  ['rejects an naddr kind mismatch', (fixture) => { fixture.timeline.manifest.kind = 35_129; writeTimeline(fixture); }],
  ['rejects an naddr d-tag mismatch', (fixture) => { fixture.timeline.manifest.dTag = 'other'; writeTimeline(fixture); }],
  ['rejects an unresolved naddr manifest', (fixture) => { fixture.services.queryRelay = async () => []; }],
  ['rejects a manifest with an invalid signature', (fixture) => { fixture.services.queryRelay = async () => [{ ...clone(fixture.event), sig: '0'.repeat(128) }]; }],
  ['rejects a different recorded manifest event id', (fixture) => { fixture.timeline.manifest.eventId = '0'.repeat(64); writeTimeline(fixture); }],
]) test(name, () => expectInvalid(mutate));

test('rejects mismatched deployed index bytes', () => expectInvalid((fixture) => {
  fixture.fetches.set(fixture.timeline.manifest.index.endpoint, Buffer.from('wrong index'));
}));

test('rejects a deployed index length mismatch', () => expectInvalid((fixture) => {
  fixture.timeline.manifest.index.bytes += 1;
  writeTimeline(fixture);
}));

test('rejects a deployed index hash mismatch', () => expectInvalid((fixture) => {
  fixture.timeline.manifest.index.sha256 = '0'.repeat(64);
  writeTimeline(fixture);
}));

test('rejects a noncanonical deployed index endpoint association', () => expectInvalid((fixture) => {
  fixture.timeline.manifest.index.endpoint = 'https://other.invalid/index';
  writeTimeline(fixture);
}));

test('rejects a missing resource endpoint', () => expectInvalid((fixture) => {
  fixture.fetches.delete(fixture.timeline.resources[0].endpoint);
}));

test('rejects reordered resource-to-table associations', () => expectInvalid((fixture) => {
  fixture.timeline.resources.reverse();
  writeTimeline(fixture);
}));

test('rejects a resource length mismatch', () => expectInvalid((fixture) => {
  fixture.timeline.resources[0].bytes += 1;
  writeTimeline(fixture);
}));

test('rejects a resource hash mismatch', () => expectInvalid((fixture) => {
  fixture.timeline.resources[0].sha256 = '0'.repeat(64);
  writeTimeline(fixture);
}));

test('computes the NIP-5A aggregate from canonical sorted lines', async () => {
  const { computeAggregateHash } = await validator();
  const paths = [{ path: '/z.html', sha256: 'b'.repeat(64) }, { path: '/index.html', sha256: 'a'.repeat(64) }];
  assert.equal(computeAggregateHash(paths), sha256(Buffer.from(`${'a'.repeat(64)} /index.html\n${'b'.repeat(64)} /z.html\n`)));
});

test('rejects a manifest aggregate mismatch', () => expectInvalid((fixture) => {
  fixture.timeline.manifest.aggregateHash = '0'.repeat(64);
  writeTimeline(fixture);
}));

test('rejects manifest path cross-evidence drift', () => expectInvalid((fixture) => {
  fixture.timeline.manifest.paths[0].sha256 = '0'.repeat(64);
  writeTimeline(fixture);
}));

const secretVariants = [
  SECRET,
  Buffer.from(SECRET, 'utf8').toString('hex'),
  Buffer.from(SECRET, 'hex').toString('base64'),
  nip19.nsecEncode(Buffer.from(SECRET, 'hex')),
];

for (const [index, canary] of secretVariants.entries()) {
  test(`rejects secret canary encoding ${index + 1} without printing the secret`, async () => {
    const { validateEvidence } = await validator();
    const fixture = await createFixture();
    replaceTrace(fixture, zip([
      ['trace.trace', JSON.stringify({ canary })],
      ['trace.network', '{}'],
    ]));
    await assert.rejects(
      validateEvidence({ evidenceDir: fixture.evidenceDir, secretFile: fixture.secretFile, services: fixture.services }),
      (error) => error instanceof Error && !error.message.includes(SECRET),
    );
  });
}

test('accepts complete publication state with pending-aware H1 verification', async () => {
  const { validateEvidence } = await validator();
  const fixture = await createFixture();
  const result = await validateEvidence({ evidenceDir: fixture.evidenceDir, secretFile: fixture.secretFile, services: fixture.services, publication: fixture.publication });
  assert.deepEqual(result, { screenshots: 10, resources: 3, activeDurationMs: 35_000, publication: true, h1: H1, h2: H2, pr: 321 });
});

for (const [name, mutate] of [
  ['rejects different H1 review provenance', (fixture) => fs.writeFileSync(fixture.publication.reviewPath, `reviewed_sha: ${'d'.repeat(40)}\nstatus: passed\n`)],
  ['rejects a verifier that does not preserve pending-aware H1 semantics', (fixture) => fs.writeFileSync(fixture.publication.verificationPath, `reviewed_sha: ${H1}\nstatus: passed\nrequirements_failed: 0\npublication_pending: false\n`)],
  ['rejects a missing H1-to-H2 metadata path', (fixture) => { fixture.services.git.diffPaths = async () => fixture.metadataPaths.slice(1); }],
  ['rejects extra H1-to-H2 paths', (fixture) => { fixture.services.git.diffPaths = async () => [...fixture.metadataPaths, 'src/unexpected.ts']; }],
  ['rejects H1-to-H2 source or evidence drift', (fixture) => { fixture.services.git.treeHash = async (ref) => ref === H1 ? 'before' : 'after'; }],
  ['rejects a local and remote H2 mismatch', (fixture) => { fixture.services.git.remoteHead = async () => 'd'.repeat(40); }],
  ['rejects a base that is not an H2 ancestor', (fixture) => { fixture.services.git.isAncestor = async () => false; }],
  ['rejects pull-request head or ref mismatch', (fixture) => { fixture.services.github.pullRequest = async () => ({ number: 321, state: 'OPEN', merged: false, headSha: 'd'.repeat(40), head: 'wrong', base: fixture.publication.base, body: `H1 ${H1} H2 ${H2}` }); }],
  ['rejects a closed or merged pull request', (fixture) => { fixture.services.github.pullRequest = async () => ({ number: 321, state: 'CLOSED', merged: true, headSha: H2, head: fixture.publication.head, base: fixture.publication.base, body: `H1 ${H1} H2 ${H2}` }); }],
  ['rejects a stale pull-request evidence body', (fixture) => { fixture.services.github.pullRequest = async () => ({ number: 321, state: 'OPEN', merged: false, headSha: H2, head: fixture.publication.head, base: fixture.publication.base, body: 'stale' }); }],
  ['rejects a pull-request force-push event', (fixture) => { fixture.services.github.timeline = async () => [{ type: 'head_ref_force_pushed' }]; }],
]) test(name, () => expectInvalid(mutate, { publication: true }));

test('publication scanning covers review, diff, and pull-request text', () => expectInvalid((fixture) => {
  fixture.services.git.diffText = async () => Buffer.from(SECRET, 'hex').toString('base64');
}, { publication: true }));

test('parses non-publication CLI options without requiring review or PR flags', async () => {
  const { parseCliArgs } = await validator();
  assert.deepEqual(parseCliArgs(['/evidence', '--secret-file', '/secret']), { evidenceDir: '/evidence', secretFile: '/secret' });
});

test('requires every publication CLI option', async () => {
  const { parseCliArgs } = await validator();
  assert.throws(() => parseCliArgs(['/evidence', '--secret-file', '/secret', '--publication', '--repo', 'napplet/web']));
});
