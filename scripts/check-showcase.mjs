// Exercise the actual static Bunny artifact, including its signed playable releases.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:8099';
const screenshots = process.env.NAPPLET_SHOWCASE_SCREENSHOTS ?? '/tmp/napplet-showcase-screenshots';
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('main > section').count(), 5);
    for (const section of await page.locator('main > section').all()) {
      await section.scrollIntoViewIfNeeded();
      const box = await section.boundingBox();
      assert.ok(box.height >= viewport.height - 1, 'sections fill at least one viewport');
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal page overflow');
    await page.goto(`${base}/#napplets`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshots}/${viewport.width}-page.png`, fullPage: true });
    const paths = page.locator('#build .build-path');
    assert.equal(await paths.count(), 4);
    const copy = await page.locator('body').innerText();
    assert.equal((copy.match(/nostr/gi) ?? []).length, 1, 'one explanatory network mention');
    assert.equal(await page.locator('#top').innerText().then(text => /nostr/i.test(text)), false);
    assert.equal(await page.locator('#build-napplets a').count(), 2, 'manual and agent routes');
    for (const heading of ['An app', 'A shell', 'A service', 'A tool']) {
      assert.ok(await page.getByRole('heading', { name: heading, exact: true }).count());
    }
    const appPath = await paths.nth(0).boundingBox();
    const shellPath = await paths.nth(1).boundingBox();
    assert.ok(viewport.width > 760 ? Math.abs(appPath.y - shellPath.y) < 1 : shellPath.y >= appPath.y + appPath.height, 'build paths share a row on desktop and stack on mobile');
    const runLinks = page.locator('[data-launch]');
    assert.equal(await runLinks.count(), 3);
    for (let i = 0; i < 3; i++) {
      await runLinks.nth(i).click();
      await page.locator('#player-status').filter({ hasText: 'Ready to play' }).waitFor();
      const frameElement = page.locator('#player-stage iframe');
      assert.equal(await frameElement.getAttribute('sandbox'), 'allow-scripts');
      assert.equal(await frameElement.getAttribute('src'), null);
      const frame = await (await frameElement.elementHandle()).contentFrame();
      assert.deepEqual(await frame.evaluate(() => Object.keys(window.napplet)), []);
      assert.equal(await frame.evaluate(() => { try { localStorage.getItem('probe'); return false; } catch { return true; } }), true);
      assert.equal(await frame.evaluate(() => typeof window.nostr), 'undefined');
      if (i === 0) await frame.getByRole('button', { name: /drop marble/i }).click();
      if (i === 1) await frame.getByRole('button', { name: /start run/i }).click();
      if (i === 2) assert.ok(await frame.locator('canvas').count() > 0);
      await page.screenshot({ path: `${screenshots}/${viewport.width}-player-${i}.png` });
      // Close button remains reachable even when the iframe has keyboard focus.
      await page.getByRole('button', { name: 'Close preview' }).click();
      await page.waitForSelector('#player-stage iframe', { state: 'detached' });
      assert.equal(await page.locator('#player-stage iframe').count(), 0);
      assert.equal(await runLinks.nth(i).evaluate(el => document.activeElement === el), true);
    }
    // Interrupted loads cannot reopen a dismissed preview.
    await page.route('**/showcase/manifests/**', route => route.abort());
    await runLinks.first().click();
    await page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
    assert.equal(await page.locator('#player-stage iframe').count(), 0);
    await page.unroute('**/showcase/manifests/**');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.locator('#player-status').filter({ hasText: 'Ready to play' }).waitFor();
    await page.getByRole('button', { name: 'Close preview' }).click();
    await page.close();
    console.log(`${viewport.width}×${viewport.height}: layout, 3 playable releases, close, focus, failure and retry passed`);
  }
  const noJs = await browser.newPage({ javaScriptEnabled: false });
  await noJs.goto(base);
  assert.equal(await noJs.locator('main > section').count(), 5);
  assert.equal(await noJs.locator('[data-launch]').count(), 3);
  assert.ok(await noJs.locator('h1').isVisible());
  assert.ok((await noJs.locator('[data-launch]').first().getAttribute('href')).startsWith('https://napplet.soy/'));
  const html = await (await noJs.request.get(base)).text();
  for (const token of ['rel="canonical"', 'name="description"', 'property="og:image"', 'application/ld+json']) assert.ok(html.includes(token));
  await noJs.goto(`${base}/explainer/`);
  assert.ok(await noJs.locator('h1').isVisible());
  await noJs.close();
  const motion = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await motion.goto(base, { waitUntil: 'networkidle' });
  for (const section of await motion.locator('main > section').all()) {
    await section.scrollIntoViewIfNeeded();
    await motion.waitForTimeout(1100);
    assert.ok(await section.locator('h1, h2').isVisible());
    assert.equal(await motion.locator('.journey-traveler').getAttribute('data-chapter'), await section.getAttribute('id'));
    const traveler = await motion.locator('.journey-traveler').boundingBox();
    assert.ok(traveler.x >= 0 && traveler.x + traveler.width <= 1440 && traveler.y >= 0 && traveler.y + traveler.height <= 900, 'persistent app remains inside viewport');
  }
  await motion.goto(`${base}/#top`);
  await motion.waitForTimeout(1200);
  await motion.screenshot({ path: `${screenshots}/desktop-hero.png` });
  await motion.emulateMedia({ reducedMotion: 'reduce' });
  await motion.locator('.journey-traveler').waitFor({ state: 'hidden' });
  assert.equal(await motion.locator('.object-app').evaluate(el => getComputedStyle(el).opacity), '1', 'changing motion preference restores static artwork');
  assert.deepEqual(errors, [], 'no page errors in homepage or playable apps');
  console.log(`Static SEO, no-JS, explainer, and motion checks passed. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}
