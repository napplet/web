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
    assert.equal(await paths.count(), 2);
    assert.equal(await page.locator('#build a').count(), 2);
    assert.equal(await page.getByRole('link', { name: 'Explore the skills' }).getAttribute('href'), '/docs/guide/agent-skills.html');
    assert.equal(await page.getByRole('link', { name: 'Kehto on GitHub' }).getAttribute('href'), 'https://github.com/kehto/web');
    const buildBox = await page.locator('#build').boundingBox();
    assert.ok(Math.abs(buildBox.height - viewport.height) <= 1, 'develop section fits one viewport');
    await page.goto(`${base}/#build`, { waitUntil: 'networkidle' });
    for (const link of await page.locator('#build a').all()) {
      const box = await link.boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= viewport.height, 'both develop links fit in the viewport after anchor navigation');
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
  }
  await motion.goto(`${base}/#top`);
  await motion.waitForTimeout(1200);
  await motion.screenshot({ path: `${screenshots}/desktop-hero.png` });
  assert.deepEqual(errors, [], 'no page errors in homepage or playable apps');
  console.log(`Static SEO, no-JS, explainer, and motion checks passed. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}
