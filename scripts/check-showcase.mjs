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
    assert.equal((copy.match(/\bnostr\b/gi) ?? []).length, 1, 'one explanatory network mention');
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
  for (const selector of ['.hero-lab', '.collection-reveal', '.host-theatre', '.capability-stage', '.builder-stage']) {
    const illustration = motion.locator(selector);
    await illustration.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 130, behavior: 'instant' }));
    await motion.waitForTimeout(700);
    const traveler = await motion.locator('.journey-traveler').boundingBox();
    assert.ok(traveler && traveler.width > 100 && traveler.width < 240, 'the actual app participates at a useful size');
    assert.ok(traveler.x > 100 && traveler.x + traveler.width < 1440, 'app is inside the section, away from the page edge');
    await motion.screenshot({ path: `${screenshots}/${selector.slice(1)}.png` });
  }
  await motion.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await motion.waitForTimeout(800);
  const before = await motion.locator('.hero-dock').boundingBox();
  const app = await motion.locator('.journey-traveler').boundingBox();
  assert.ok(Math.abs(before.x - app.x) < 2 && Math.abs(before.y - app.y) < 2, 'reverse scrolling restores hero placement');
  await motion.screenshot({ path: `${screenshots}/desktop-hero.png` });
  await motion.setViewportSize({ width: 1000, height: 800 });
  await motion.waitForTimeout(700);
  const resized = await motion.locator('.hero-dock').boundingBox();
  const moved = await motion.locator('.journey-traveler').boundingBox();
  assert.ok(Math.abs(resized.x - moved.x) < 2, 'resizing refreshes the static anchors');
  await motion.goto(`${base}/#protocol`, { waitUntil: 'networkidle' });
  await motion.setViewportSize({ width: 1200, height: 900 });
  await motion.waitForFunction(() => {
    const destination = document.querySelector('.protocol-dock').getBoundingClientRect();
    const arrived = document.querySelector('.journey-traveler').getBoundingClientRect();
    const aligned = Math.abs(destination.x - arrived.x) < 2 && Math.abs(destination.y - arrived.y) < 2;
    const previous = window.appDockCheck;
    if (!aligned || !previous || previous.scroll !== scrollY) {
      window.appDockCheck = { since: performance.now(), scroll: scrollY };
      return false;
    }
    return performance.now() - previous.since > 450;
  }, undefined, { timeout: 5000 });
  await motion.emulateMedia({ reducedMotion: 'reduce' });
  await motion.locator('.journey-traveler').waitFor({ state: 'hidden' });
  assert.equal(await motion.locator('.hero-dock .app-window').evaluate(el => getComputedStyle(el).opacity), '1', 'changing motion preference restores static artwork');
  assert.deepEqual(errors, [], 'no page errors in homepage or playable apps');
  console.log(`Static SEO, no-JS, explainer, and motion checks passed. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}
