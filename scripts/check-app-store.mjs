// Exercise the production catalog, signed previews, and discovery boundaries.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { finalizeEvent, generateSecretKey } = require('nostr-tools/pure');
const base = process.argv[2] ?? 'http://127.0.0.1:8107';
const config = JSON.parse(await readFile(new URL('../apps/web/src/data/discovery.json', import.meta.url)));
const apps = JSON.parse(await readFile(new URL('../apps/web/src/data/apps.json', import.meta.url)));
const secret = generateSecretKey();
const injected = finalizeEvent({ kind: 35129, created_at: Math.floor(Date.now() / 1000), content: '<img src=x onerror="window.catalogXss=true"> is publisher text', tags: [['d', 'catalog-browser-vector'], ['title', '<script>not markup</script>'], ['x', 'a'.repeat(64)]] }, secret);
// A Software Applications listing from the same publisher that names the release supplies fallback art by URL.
const listing = finalizeEvent({ kind: 32267, created_at: Math.floor(Date.now() / 1000), content: '# markdown stays out', tags: [['d', 'catalog-browser-vector-0123456789abcdef'], ['name', 'Listing name'], ['latest', `35129:${injected.pubkey}:catalog-browser-vector`], ['image', 'https://listing.example/art.png'], ['icon', 'javascript:alert(1)']] }, secret);
const manifestKinds = [5129, 15129, 35129];
const [negentropyRelay] = config.relays;
const browser = await chromium.launch();
const errors = [];

/** Serve deterministic NIP-11 documents: the first relay advertises NIP-77, the second does not. */
async function routeInformation(page) {
  for (const relay of config.relays) {
    const origin = new URL(relay).origin.replace(/^ws/, 'http');
    await page.route(url => url.origin === origin, route => route.fulfill({ status: 200, contentType: 'application/nostr+json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ name: 'test relay', supported_nips: relay === negentropyRelay ? [1, 77] : [1] }) }));
  }
}

const shown = page => page.evaluate(() => document.querySelectorAll('#discovered-grid article:not([hidden])').length);
/** Scroll to the end until the note says the collection is complete; relays are reached on the way. */
async function scrollToTheEnd(page) {
  for (let step = 0; step < 60 && !/everything we found/.test(await page.locator('#store-more-note').textContent()); step++) {
    const count = await shown(page);
    await page.locator('#store-more').scrollIntoViewIfNeeded();
    await page.waitForFunction(previous => document.querySelectorAll('#discovered-grid article:not([hidden])').length > previous || /everything we found|did not finish|Looking on/.test(document.querySelector('#store-more-note')?.textContent ?? ''), count, { timeout: 15000 });
    await page.waitForFunction(() => !/Looking on/.test(document.querySelector('#store-more-note')?.textContent ?? ''), undefined, { timeout: config.timeoutMs * 4 });
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://listing.example/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64') }));
  await routeInformation(page);
  const contacted = new Set();
  let sockets = 0;
  let negotiations = 0;
  const requested = [];
  for (const relay of config.relays) await page.routeWebSocket(relay, socket => {
    sockets++;
    contacted.add(relay);
    socket.onMessage(data => {
      const [type, id, filter] = JSON.parse(data);
      if (type === 'NEG-OPEN') {
        // The negotiation is declined so the request fallback can be exercised with plain frames.
        negotiations++;
        assert.equal(relay, negentropyRelay, 'negentropy is only attempted on relays that advertise NIP-77');
        socket.send(JSON.stringify(['NEG-ERR', id, 'blocked: test relay']));
        return;
      }
      if (type !== 'REQ') return;
      requested.push(filter);
      if (filter.kinds.length === 1 && filter.kinds[0] === 32267) {
        assert.ok(filter.authors?.includes(injected.pubkey), 'listings are requested for discovered publishers');
        socket.send(JSON.stringify(['EVENT', id, listing]));
      } else {
        assert.deepEqual(filter.kinds, manifestKinds);
        if (filter.until === undefined) {
          socket.send(JSON.stringify(['EVENT', id, { ...injected, content: 'invalid signature' }]));
          socket.send(JSON.stringify(['EVENT', id, injected]));
        }
      }
      socket.send(JSON.stringify(['EOSE', id]));
    });
  });
  await page.goto(`${base}/apps/`, { waitUntil: 'networkidle' });
  assert.equal(sockets, 0, 'visiting the catalog does not contact relays');
  assert.equal(await page.locator('[data-launch]').count(), apps.length);
  const cards = page.locator('#discovered-grid article');
  const saved = await cards.count();
  assert.ok(saved > 20, 'real saved discoveries are present');
  assert.equal(await page.locator('#discovered-grid a[href*="napplet.soy/n/nevent"]').count(), 0, 'snapshot pointers do not use a shell route that rejects them');
  assert.ok(await page.locator('#discovered-grid [data-listing-art]').count() > 5, 'saved listings supply fallback art without JavaScript verification');
  assert.equal(await page.locator('#discovered-grid img[src^="http:"], #discovered-grid img[src^="javascript:"]').count(), 0);
  assert.equal(await page.locator('#store-more button').count(), 0, 'paging has no button; scrolling drives it');
  // Infinite scroll: twelve cards at first, then another page each time the end comes into view.
  assert.equal(await shown(page), 12);
  await page.locator('#store-more').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('#discovered-grid article:not([hidden])').length >= 24);
  assert.equal(sockets, 0, 'paging the saved collection still contacts no relay');
  for (const app of apps) {
    await page.locator(`[data-launch="${app.id}"]`).scrollIntoViewIfNeeded();
    await page.locator(`[data-launch="${app.id}"]`).click();
    await page.locator('#player-status').filter({ hasText: 'Ready to play' }).waitFor();
    const iframe = page.locator('#player-stage iframe');
    const frame = await (await iframe.elementHandle()).contentFrame();
    assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts');
    assert.deepEqual(await frame.evaluate(() => Object.keys(window.napplet)), []);
    if (app.id === 'stick-brawl') await frame.getByRole('button', { name: 'Fight!', exact: true }).click();
    if (app.id === 'freeze-frame-response') await frame.getByRole('button', { name: 'Begin inspection', exact: true }).click();
    if (app.id === 'poly-dogfight') await frame.getByRole('button', { name: 'Fly', exact: true }).click();
    assert.ok(await frame.locator('canvas').count() > 0);
    await page.getByRole('button', { name: 'Close preview' }).click();
    assert.equal(await page.locator(`[data-launch="${app.id}"]`).evaluate(el => el === document.activeElement), true);
  }
  await page.getByRole('searchbox', { name: 'Search apps' }).fill('no-app-matches-this-vector');
  assert.equal(await page.locator('[data-app-card]:visible').count(), 0);
  assert.ok(await page.locator('#store-empty').isVisible());
  await page.getByLabel('Curated', { exact: true }).check();
  assert.ok(await page.locator('#store-empty').isVisible(), 'empty state survives collection changes');
  await page.getByRole('searchbox', { name: 'Search apps' }).fill('');
  assert.equal(await page.locator('[data-app-card]:visible').count(), apps.length);
  await page.getByLabel('Discovered', { exact: true }).check();
  // Scrolling past the saved collection reconciles with NIP-77 where offered, falls back to requests elsewhere, and pages on.
  await scrollToTheEnd(page);
  assert.deepEqual([...contacted].sort(), [...config.relays].sort(), 'both relays were contacted once the saved collection ran out');
  assert.ok(negotiations >= 1, 'NIP-77 negotiation was attempted on the relay that advertises it');
  assert.ok(requested.some(filter => filter.kinds[0] === 32267), 'listings were requested after new publishers appeared');
  assert.ok(requested.some(filter => typeof filter.until === 'number'), 'relays on the request path were paged with until');
  const card = page.locator('.discovered-card').filter({ hasText: '<script>not markup</script>' });
  assert.equal(await card.count(), 1, 'duplicate signed addresses deduplicate');
  assert.equal(await card.locator('script').count(), 0, 'publisher metadata remains plain text');
  assert.equal(await card.locator('[data-listing-art]').getAttribute('src'), 'https://listing.example/art.png', 'the matching listing supplies art');
  assert.equal(await card.locator('[data-listing-icon]').count(), 0, 'non-https listing icons are dropped');
  assert.equal(await page.evaluate(() => window.catalogXss), undefined);
  assert.equal(await page.locator('text=invalid signature').count(), 0);
  assert.equal(await shown(page), await cards.count(), 'every release was revealed by scrolling');
  assert.ok(await cards.count() > saved, 'the discovered release joined the collection');
  await page.getByRole('button', { name: 'Check again' }).click();
  await page.locator('#discovery-status').filter({ hasText: /Checked 2\/2/ }).waitFor();
  await page.screenshot({ path: '/tmp/napplet-store-desktop.png', fullPage: true });
  await page.close();

  const offline = await browser.newPage();
  await routeInformation(offline);
  for (const relay of config.relays) await offline.routeWebSocket(relay, socket => socket.close());
  await offline.goto(`${base}/apps/`);
  await offline.getByRole('button', { name: 'Check for new apps' }).click();
  await offline.locator('#discovery-status').filter({ hasText: 'saved collection is still here' }).waitFor({ timeout: config.timeoutMs * 4 });
  assert.ok(await offline.locator('#discovered-grid article').count() > 20);
  assert.ok(await offline.getByRole('button', { name: /Try again/ }).isEnabled());
  await offline.close();

  for (const width of [390, 320]) {
    const mobile = await browser.newPage({ viewport: { width, height: 844 } });
    await mobile.goto(`${base}/apps/`);
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mobile.getByLabel('Discovered', { exact: true }).check();
    assert.ok(await mobile.locator('#discovered-title').isVisible());
    await mobile.screenshot({ path: `/tmp/napplet-store-${width}.png` });
    await mobile.close();
  }
  const noJs = await browser.newPage({ javaScriptEnabled: false });
  await noJs.goto(`${base}/apps/`);
  assert.equal(await noJs.locator('[data-launch]').count(), apps.length);
  assert.ok(await noJs.locator('#discovered-grid a').count() > 20);
  assert.equal(await noJs.locator('#discovered-grid article:visible').count(), await noJs.locator('#discovered-grid article').count(), 'the whole saved collection is readable without JavaScript');
  assert.equal(await noJs.locator('#discover-apps').isVisible(), false);
  assert.deepEqual(errors, []);
  console.log('App store: six previews, gameplay, filters, scroll paging, NIP-77 attempt with request fallback, listing art, XSS, no relay contact before the end, offline retry, mobile and no-JS passed.');
} finally { await browser.close(); }
