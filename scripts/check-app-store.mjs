// Exercise the production catalog, signed previews, and opt-in discovery boundaries.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { finalizeEvent, generateSecretKey } = require('nostr-tools/pure');
const base = process.argv[2] ?? 'http://127.0.0.1:8107';
const config = JSON.parse(await readFile(new URL('../apps/web/src/data/discovery.json', import.meta.url)));
const apps = JSON.parse(await readFile(new URL('../apps/web/src/data/apps.json', import.meta.url)));
const injected = finalizeEvent({ kind: 35129, created_at: Math.floor(Date.now() / 1000), content: '<img src=x onerror="window.catalogXss=true"> is publisher text', tags: [['d', 'catalog-browser-vector'], ['title', '<script>not markup</script>'], ['x', 'a'.repeat(64)]] }, generateSecretKey());
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  let requests = 0;
  for (const relay of config.relays) await page.routeWebSocket(relay, socket => {
    requests++;
    socket.onMessage(data => {
      const [type, id, filter] = JSON.parse(data);
      assert.equal(type, 'REQ');
      assert.deepEqual(filter.kinds, [5129, 15129, 35129]);
      socket.send(JSON.stringify(['EVENT', id, { ...injected, content: 'invalid signature' }]));
      socket.send(JSON.stringify(['EVENT', id, injected]));
      socket.send(JSON.stringify(['EOSE', id]));
    });
  });
  await page.goto(`${base}/apps/`, { waitUntil: 'networkidle' });
  assert.equal(requests, 0, 'visiting the catalog does not contact relays');
  assert.equal(await page.locator('[data-launch]').count(), apps.length);
  assert.ok(await page.locator('#discovered-grid article').count() > 20, 'real saved discoveries are present');
  assert.equal(await page.locator('#discovered-grid a[href*="napplet.soy/n/nevent"]').count(), 0, 'snapshot pointers do not use a shell route that rejects them');
  for (const app of apps) {
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
  await page.getByRole('button', { name: 'Check for new apps' }).click();
  await page.locator('#discovery-status').filter({ hasText: /Checked 2\/2/ }).waitFor();
  assert.equal(requests, 2);
  const card = page.locator('.discovered-card').filter({ hasText: '<script>not markup</script>' });
  assert.equal(await card.count(), 1, 'duplicate signed addresses deduplicate');
  assert.equal(await card.locator('script, img').count(), 0, 'publisher metadata remains plain text');
  assert.equal(await page.evaluate(() => window.catalogXss), undefined);
  assert.equal(await page.locator('text=invalid signature').count(), 0);
  await page.screenshot({ path: '/tmp/napplet-store-desktop.png', fullPage: true });
  await page.close();

  const offline = await browser.newPage();
  for (const relay of config.relays) await offline.routeWebSocket(relay, socket => socket.close());
  await offline.goto(`${base}/apps/`);
  await offline.getByRole('button', { name: 'Check for new apps' }).click();
  await offline.locator('#discovery-status').filter({ hasText: 'saved collection is still here' }).waitFor();
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
  assert.equal(await noJs.locator('#discover-apps').isVisible(), false);
  assert.deepEqual(errors, []);
  console.log('App store: six previews, gameplay, filters, signed discovery, XSS, opt-in network, offline retry, mobile and no-JS passed.');
} finally { await browser.close(); }
