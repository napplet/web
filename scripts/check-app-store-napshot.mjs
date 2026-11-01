// Deterministic Napshot preview fixtures: rebuild /apps/ from generated fixture data (a fixture
// signer in discovery.json, signed fixture manifests and labels, generated PNG captures), serve
// the fixture build, and exercise the label-driven card path offline. Nothing here is pinned to
// the production snapshot: a refresh cannot change these results. The source data files are
// restored in `finally`; the dist output of this run contains fixtures until the next real build.
import assert from 'node:assert/strict';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { execFileSync } from 'node:child_process';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import zlib from 'node:zlib';
import { chromium } from 'playwright';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { finalizeEvent, generateSecretKey, getPublicKey } = require('nostr-tools/pure');

const discoveryUrl = new URL('../apps/web/src/data/discovery.json', import.meta.url);
const snapshotUrl = new URL('../apps/web/src/data/discovered-apps.json', import.meta.url);
// Persistent backups: a run that dies before its `finally` (an unhandled rejection, SIGKILL) must not
// leave fixture data as the next run's "original". Existing backups are treated as the real source.
const backups = { discovery: join(tmpdir(), 'napplet-check-app-store-napshot-discovery.json'), snapshot: join(tmpdir(), 'napplet-check-app-store-napshot-snapshot.json') };
let originalDiscovery;
let originalSnapshot;
if (existsSync(backups.discovery) && existsSync(backups.snapshot)) {
  // A previous run crashed after writing fixtures; restore the real data before anything else.
  [originalDiscovery, originalSnapshot] = await Promise.all([readFile(backups.discovery), readFile(backups.snapshot)]);
  await Promise.all([writeFile(discoveryUrl, originalDiscovery), writeFile(snapshotUrl, originalSnapshot)]);
} else {
  [originalDiscovery, originalSnapshot] = await Promise.all([readFile(discoveryUrl), readFile(snapshotUrl)]);
  await Promise.all([writeFile(backups.discovery, originalDiscovery), writeFile(backups.snapshot, originalSnapshot)]);
}

// ─── Generated PNG captures ─────────────────────────────────────────────────
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buffer) => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8); out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out; };
/** Encode a solid-color PNG, so every fixture capture is generated instead of shipped. */
function pngImage(width, height, [r, g, b]) {
  const row = Buffer.alloc(1 + width * 4);
  for (let x = 0; x < width; x++) { const o = 1 + x * 4; row[o] = r; row[o + 1] = g; row[o + 2] = b; row[o + 3] = 0xff; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const capture = pngImage(1200, 750, [24, 78, 104]);
const detail = pngImage(320, 200, [116, 42, 62]);
const captureHash = sha256(capture);
const detailHash = sha256(detail);
const otherPng = pngImage(2, 2, [1, 2, 3]);

// ─── Fixture events ─────────────────────────────────────────────────────────
const fixtureRelays = ['wss://napshot-relay-one.example', 'wss://napshot-relay-two.example'];
const artMirror = 'https://napshot-blossom.example';
const authorKey = generateSecretKey();
const publisher = getPublicKey(authorKey);
const labelerKey = generateSecretKey();
const labeler = getPublicKey(labelerKey);
const manifest = (identifier, title, created, tags = [], kind = 35129) => finalizeEvent({ kind, created_at: created, content: `Fixture release ${identifier}`, tags: [['d', identifier], ['title', title], ['x', sha256(Buffer.from(identifier))], ['server', artMirror], ...tags] }, authorKey);
const shotTag = (hash, mime) => ['screenshot', `x ${hash}`, `m ${mime}`, 'dim 320x200', `size ${detail.length}`];
const fixtures = {
  plain: manifest('napshot-plain', 'Plain fixture', 1_000),
  identity: manifest('napshot-identity', 'Identity fixture', 1_000),
  svg: manifest('napshot-svg', 'Svg fixture', 1_000, [shotTag(detailHash, 'image/svg+xml')]),
  shot: manifest('napshot-shot', 'Shot fixture', 1_000, [shotTag(sha256(detail), 'image/png')]),
  listed: manifest('napshot-listed', 'Listed fixture', 1_000),
  pinned: manifest('napshot-pinned', 'Pinned fixture', 1_000, [], 5129),
  stale1: manifest('napshot-stale', 'Stale fixture', 900),
  stale: manifest('napshot-stale', 'Stale fixture', 1_000),
  late: manifest('napshot-late', 'Late fixture', 950),
  broken: manifest('napshot-broken', 'Broken fixture', 1_000),
  overflow: Array.from({ length: 56 }, (_, index) => manifest(`napshot-overflow-${index}`, `Overflow fixture ${index}`, 900 + index)),
};
const listing = finalizeEvent({ kind: 32267, created_at: 1_000, content: '', tags: [['d', 'napshot-listed-0123456789abcdef'], ['name', 'Listed fixture'], ['latest', `35129:${publisher}:napshot-listed`], ['image', 'https://napshot-listing.example/art.png']] }, authorKey);

/** A label exactly as Napshot publishes it, with the capture mode in its signed content. */
const label = (target, { mode = 'signed-out', hash: imageHash = detailHash, dim = '320x200', size = detail.length, mirrors = [artMirror], created = 800 } = {}) => finalizeEvent({
  kind: 1985, created_at: created,
  content: mode === 'preview-identity' ? 'Napplet preview captured by Napshot with a read-only preview identity.' : mode === 'signed-out' ? 'Signed-out napplet preview captured by Napshot.' : 'Captured by Napshot.',
  tags: [['L', '#screenshot'], ['l', imageHash, '#screenshot'], ['e', target.id, fixtureRelays[0]], ['a', `35129:${target.pubkey}:${target.tags.find(tag => tag[0] === 'd')[1]}`], ['p', target.pubkey], ['screenshot', `x ${imageHash}`, 'm image/png', `dim ${dim}`, `size ${size}`], ...mirrors.map(server => ['server', server])],
}, labelerKey);
// Published only after the snapshot was saved: the live pass must still discover it, because
// unchanged saved releases are included in label discovery.
const lateLabel = label(fixtures.late);

/** The redirect mirror: a real HTTPS server, because route-fulfilled 3xx responses are never followed by the browser. */
async function startRedirectMirror() {
  const certDir = join(tmpdir(), 'napplet-check-app-store-napshot');
  await rm(certDir, { recursive: true, force: true });
  await mkdir(certDir, { recursive: true });
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(certDir, 'key.pem'), '-out', join(certDir, 'cert.pem'), '-days', '1', '-subj', '/CN=napshot-redirect.example']);
  const serverHits = [];
  const allowCors = { 'access-control-allow-origin': '*' };
  const secure = createSecureServer({ key: await readFile(join(certDir, 'key.pem')), cert: await readFile(join(certDir, 'cert.pem')) }, (request, response) => {
    serverHits.push(request.url);
    // The redirect carries CORS headers so a follow-mode fetch may actually follow it; with
    // `redirect: 'error'` the fetch rejects on the spot and `/steal` is never requested.
    if (request.url === `/${captureHash}`) { response.writeHead(302, { ...allowCors, location: `https://napshot-private.example:${secure.address()?.port}/steal` }).end(); return; }
    if (request.url === '/steal') { response.writeHead(200, { ...allowCors, 'content-type': 'text/plain' }).end('private'); return; }
    response.writeHead(404, allowCors).end();
  });
  await new Promise(resolve => secure.listen(0, '127.0.0.1', resolve));
  return { serverHits, redirectMirror: `https://napshot-redirect.example:${secure.address().port}`, close: () => new Promise(resolve => { secure.close(() => { rm(certDir, { recursive: true, force: true }).then(resolve, resolve); }); }) };
}

/** Serve the fixture site's static build; like CI's `python3 -m http.server`, but on an OS-assigned port. */
async function startStaticServer() {
  const dist = fileURLToPath(new URL('../apps/web/dist', import.meta.url));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
    const file = join(dist, (pathname.endsWith('/') ? `${pathname}index.html` : pathname).replace(/^\/+/, ''));
    readFile(file).then(body => { response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }); response.end(body); }, () => { response.writeHead(404); response.end('not found'); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

/** Mirror routes for wrong bytes, good bytes, and the failing pair; the redirect mirror stays unrouted. */
async function routeMirrors(page) {
  const cors = { 'access-control-allow-origin': '*' };
  const goodBytes = { [captureHash]: capture, [detailHash]: detail };
  const mirrorRequests = [];
  await page.route('https://napshot-wrong.example/**', route => { mirrorRequests.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: otherPng }); });
  await page.route('https://napshot-blossom.example/**', route => {
    mirrorRequests.push(route.request().url());
    const hash = new URL(route.request().url()).pathname.replace(/^\/+/, '').replace(/\.png$/, '');
    return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: goodBytes[hash] ?? Buffer.alloc(0) });
  });
  await page.route('https://napshot-oversize.example/**', route => { mirrorRequests.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'image/png', headers: cors, body: Buffer.alloc(9_000_000) }); });
  await page.route('https://napshot-fail.example/**', route => { mirrorRequests.push(route.request().url()); return route.fulfill({ status: 500, headers: cors }); });
  await page.route('https://napshot-listing.example/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: otherPng }));
  return { mirrorRequests };
}

/** Fixture relays over WebSockets: no NIP-77, filler labels from an untrusted key, and the late trusted label. */
async function routeFixtureRelays(page) {
  const cors = { 'access-control-allow-origin': '*' };
  const fillerKey = generateSecretKey();
  const fillers = Array.from({ length: 80 }, (_, index) => finalizeEvent({ kind: 1985, created_at: 40 + index, content: 'filler', tags: [['L', '#screenshot'], ['l', 'd'.repeat(64), '#screenshot'], ['e', 'e'.repeat(64)], ['p', publisher], ['screenshot', `x ${'d'.repeat(64)}`, 'm image/png', 'dim 1x1', 'size 10'], ['server', artMirror]] }, fillerKey));
  for (const relay of fixtureRelays) {
    const origin = new URL(relay).origin.replace(/^ws/, 'http');
    await page.route(url => url.origin === origin, route => route.fulfill({ status: 200, contentType: 'application/nostr+json', headers: cors, body: JSON.stringify({ name: 'fixture relay', supported_nips: [1] }) }));
  }
  const state = { sockets: 0, requested: [] };
  const servedPages = new Map();
  for (const relay of fixtureRelays) await page.routeWebSocket(relay, socket => {
    state.sockets++;
    socket.onMessage(data => {
      const [type, id, filter] = JSON.parse(data);
      if (type === 'NEG-OPEN') return socket.send(JSON.stringify(['NEG-ERR', id, 'blocked: fixture relay']));
      if (type !== 'REQ') return;
      state.requested.push(filter);
      if (filter.kinds.length === 1 && filter.kinds[0] === 1985) {
        assert.deepEqual(filter.authors, [labeler], 'labels are requested only from the configured fixture signer');
        assert.deepEqual(filter['#L'], ['#screenshot']);
        assert.ok(filter['#e'].length <= 50, 'label targets are batched');
        assert.ok(!filter['#e'].includes(fixtures.shot.id), 'a release with a usable screenshot is never a label target');
        assert.ok(!filter['#e'].includes(fixtures.pinned.id), 'a snapshot is never a label target');
        const key = `${relay}|${JSON.stringify(filter['#e'])}`;
        const pages = servedPages.get(key) ?? 0;
        servedPages.set(key, pages + 1);
        // The first page comes back full so `until` paging is exercised; the next one is short.
        for (const event of pages === 0 ? [...fillers, lateLabel] : [lateLabel]) socket.send(JSON.stringify(['EVENT', id, event]));
      }
      socket.send(JSON.stringify(['EOSE', id]));
    });
  });
  return state;
}

/** Saved-label rendering: modes, mirror fall-through, redirect refusal, and placeholder fallback. */
async function savedLabelScenarios(page, { mirrorRequests, serverHits }) {
  const search = page.getByRole('searchbox', { name: 'Search apps' });
  const card = (title) => page.locator('.discovered-card').filter({ hasText: title }).first();
  const previewOf = (title) => card(title).locator('img[data-napshot]');
  const titleOf = (title) => card(title).locator('[data-art-source]').getAttribute('title');
  await search.fill('Plain fixture');
  await previewOf('Plain fixture').waitFor();
  assert.equal(await previewOf('Plain fixture').getAttribute('alt'), 'Automated signed-out preview of Plain fixture');
  assert.match(await previewOf('Plain fixture').getAttribute('src'), /^blob:/);
  assert.equal(await card('Plain fixture').locator('[data-art-source]').textContent(), 'Napshot preview');
  assert.equal(await titleOf('Plain fixture'), 'Captured automatically in a signed-out shell and signed by a trusted Napshot labeler; not an endorsement.');
  assert.equal(await previewOf('Plain fixture').evaluate(element => element.naturalWidth), 1200);
  assert.deepEqual(mirrorRequests.filter(url => url.endsWith(captureHash)), [`https://napshot-wrong.example/${captureHash}`, `${artMirror}/${captureHash}`], 'a wrong mirror falls through to the good one');
  assert.ok(serverHits.includes(`/${captureHash}`), 'the redirecting mirror was asked for the capture');
  assert.deepEqual(serverHits.filter(url => url === '/steal'), [], 'a redirect to a private local service is refused before the browser follows it');
  await search.fill('Identity fixture');
  await previewOf('Identity fixture').waitFor();
  assert.equal(await previewOf('Identity fixture').getAttribute('alt'), 'Automated preview of Identity fixture captured with a read-only preview identity');
  assert.equal(await titleOf('Identity fixture'), 'Captured automatically with a read-only preview identity and signed by a trusted Napshot labeler; not an endorsement.');
}

/** Eligibility: an undecodable screenshot yields to the preview; usable screenshots and listing art never do. */
async function eligibilityScenarios(page) {
  const search = page.getByRole('searchbox', { name: 'Search apps' });
  const card = (title) => page.locator('.discovered-card').filter({ hasText: title }).first();
  const previewOf = (title) => card(title).locator('img[data-napshot]');
  await search.fill('Svg fixture');
  await previewOf('Svg fixture').waitFor();
  await search.fill('Shot fixture');
  await page.waitForTimeout(300);
  assert.equal(await previewOf('Shot fixture').count(), 0, 'a usable author screenshot is never replaced by a preview');
  await search.fill('Listed fixture');
  await page.waitForTimeout(300);
  assert.equal(await card('Listed fixture').locator('[data-listing-art]').count(), 1);
  assert.equal(await previewOf('Listed fixture').count(), 0, 'listing art wins; no preview is fetched');
}

/** Exclusions: failed mirrors keep the placeholder, and stale revisions and snapshots never carry a preview. */
async function exclusionScenarios(page, { mirrorRequests }) {
  const search = page.getByRole('searchbox', { name: 'Search apps' });
  const card = (title) => page.locator('.discovered-card').filter({ hasText: title }).first();
  const previewOf = (title) => card(title).locator('img[data-napshot]');
  await search.fill('Broken fixture');
  await page.waitForTimeout(1_000);
  assert.deepEqual(mirrorRequests.filter(url => url.endsWith(sha256(otherPng))), [`https://napshot-oversize.example/${sha256(otherPng)}`, `https://napshot-fail.example/${sha256(otherPng)}`], 'every mirror is tried before giving up');
  assert.equal(await previewOf('Broken fixture').count(), 0, 'oversized and failing mirrors leave the placeholder');
  assert.equal(await card('Broken fixture').locator('.art-monogram').count(), 1);
  await search.fill('Stale fixture');
  await page.waitForTimeout(300);
  assert.equal(await previewOf('Stale fixture').count(), 0, 'a label for the previous revision is ignored after an update');
  await search.fill('Pinned fixture');
  await page.waitForTimeout(300);
  assert.equal(await previewOf('Pinned fixture').count(), 0, 'a snapshot never carries a preview');
  await search.fill('Overflow fixture');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('img[data-napshot]').count(), 3, 'only the three verified fixture previews are on the page');
  await search.fill('');
}

/** Live discovery: the label published after the snapshot was saved still appears, batched and paged. */
async function liveLabelScenarios(page, { requested }) {
  const search = page.getByRole('searchbox', { name: 'Search apps' });
  const previewOf = (title) => page.locator('.discovered-card').filter({ hasText: title }).first().locator('img[data-napshot]');
  await page.getByRole('button', { name: /Check for new apps/ }).click();
  await page.locator('#discovery-status').filter({ hasText: /Checked 2\/2/ }).waitFor({ timeout: 20_000 });
  await search.fill('Late fixture');
  await previewOf('Late fixture').waitFor();
  const labelFilters = requested.filter(filter => filter.kinds?.length === 1 && filter.kinds[0] === 1985);
  const covered = new Set(labelFilters.flatMap(filter => filter['#e']));
  const eligible = [fixtures.plain, fixtures.identity, fixtures.svg, fixtures.stale, fixtures.late, fixtures.broken, fixtures.listed, ...fixtures.overflow].map(event => event.id);
  for (const id of eligible) assert.ok(covered.has(id), `every eligible fixture release is a label target: ${id.slice(0, 12)}`);
  assert.equal(covered.size, eligible.length);
  assert.ok(labelFilters.length >= 2, 'the targets are split into batches');
  assert.ok(labelFilters.some(filter => typeof filter.until === 'number'), 'a full relay page is paged with until');
}

// ─── Run ─────────────────────────────────────────────────────────────────────
// The redirect mirror starts first so its port can label the saved fixtures; the data files are
// written before the build, because the build bundles the snapshot into the page.
const redirectMirror = await startRedirectMirror();
const savedLabels = [
  label(fixtures.plain, { hash: captureHash, dim: '1200x750', size: capture.length, mirrors: ['https://napshot-wrong.example', redirectMirror.redirectMirror, artMirror] }),
  label(fixtures.identity, { mode: 'preview-identity' }),
  label(fixtures.svg),
  label(fixtures.stale1),
  label(fixtures.broken, { hash: sha256(otherPng), dim: '1200x750', size: 8_000_000, mirrors: ['https://napshot-oversize.example', 'https://napshot-fail.example'] }),
];
await writeFile(discoveryUrl, `${JSON.stringify({ relays: fixtureRelays, limit: 80, timeoutMs: 5_000, screenshotLabelers: [labeler] }, null, 2)}\n`);
await writeFile(snapshotUrl, `${JSON.stringify({ checkedAt: new Date().toISOString(), relays: fixtureRelays, events: Object.values(fixtures).flat(), applications: [listing], labels: savedLabels }, null, 2)}\n`);
const mirrorHosts = 'MAP napshot-redirect.example 127.0.0.1, MAP napshot-private.example 127.0.0.1';
const browser = await chromium.launch({ args: [`--host-resolver-rules=${mirrorHosts}`] });
const errors = [];
let page;
let staticServer;
const restore = async () => { await Promise.all([writeFile(discoveryUrl, originalDiscovery), writeFile(snapshotUrl, originalSnapshot)]); };
try {
  execFileSync('pnpm', ['--filter', '@napplet/web', 'build'], { stdio: 'inherit' });
  staticServer = await startStaticServer();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ignoreHTTPSErrors: true });
  page.on('pageerror', error => errors.push(error.message));
  const mirrors = await routeMirrors(page);
  const relays = await routeFixtureRelays(page);
  await page.goto(`${staticServer.base}/apps/`, { waitUntil: 'networkidle' });
  assert.equal(relays.sockets, 0, 'visiting the fixture catalog does not contact relays');
  await savedLabelScenarios(page, { mirrorRequests: mirrors.mirrorRequests, serverHits: redirectMirror.serverHits });
  await eligibilityScenarios(page);
  await exclusionScenarios(page, { mirrorRequests: mirrors.mirrorRequests });
  await liveLabelScenarios(page, { requested: relays.requested });
  await page.screenshot({ path: '/tmp/napplet-store-napshot-fixtures.png' });
  assert.deepEqual(errors, []);
  console.log('Napshot fixtures: saved and live labels, both capture modes, wrong-bytes fall-through, refused private redirect, oversized and failing mirrors, screenshot and listing-art precedence, snapshot and stale-revision exclusion, untrusted-signer rejection, batching and until paging passed.');
} finally {
  await restore().catch(error => console.error(error));
  await rm(backups.discovery, { force: true }).catch(() => {});
  await rm(backups.snapshot, { force: true }).catch(() => {});
  await redirectMirror.close();
  staticServer?.server.close();
  await browser.close();
}