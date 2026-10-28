// Verify paired development servers through their real browser navigation paths.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startSite } from './dev-site.mjs';

async function verifySite(browser, site) {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(site.webUrl, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('h1').first().isVisible());
    const launches = page.locator('[data-launch]');
    const launchCount = await launches.count();
    const starts = { 'freeze-frame-response': 'Begin inspection', 'stick-brawl': 'Fight!', 'poly-dogfight': 'Fly', 'impossible-machine': 'Drop marble', 'rail-game': 'Start run' };
    for (const link of await launches.all()) {
      const id = await link.getAttribute('data-launch');
      await link.click();
      await page.locator('#player-status').filter({ hasText: 'Ready to play' }).waitFor();
      const frame = page.frameLocator('#player-stage iframe');
      if (starts[id]) await frame.getByRole('button', { name: new RegExp(starts[id], 'i') }).click();
      await frame.locator('canvas').first().waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Close preview' }).click();
    }
    const response = await page.goto(new URL('/docs/guide/getting-started.html?dev-site=check', site.webUrl).href, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    assert.equal(new URL(page.url()).search, '?dev-site=check');
    await page.locator('h1').first().waitFor({ state: 'visible' });
    // Vite proxies docs; Astro redirects. Check the client at the browser's actual destination.
    if (site.docsUrl) {
      const client = await page.request.get(new URL('/docs/@vite/client', page.url()).href);
      assert.equal(client.status(), 200);
      assert.ok((await client.text()).includes(new URL(site.docsUrl).port), 'docs HMR uses this pair’s listening port');
    }
    await page.getByRole('button', { name: 'Search', exact: false }).first().click();
    await page.getByRole('searchbox').fill('napplet');
    await page.locator('.VPLocalSearchBox .result').first().waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
    console.log(`Verified ${site.webUrl}: docs navigation, HMR, hydrated search and ${launchCount} playable links`);
  } finally { await page.close(); }
}

const owned = [];
let browser;
try {
  const sites = process.argv[2] ? [{ webUrl: process.argv[2] }] : owned;
  if (!process.argv[2]) {
    owned.push(await startSite());
    owned.push(await startSite());
    const ports = owned.flatMap(site => [new URL(site.webUrl).port, new URL(site.docsUrl).port]);
    assert.equal(new Set(ports).size, 4, 'two launches select four distinct listening ports');
  }
  browser = await chromium.launch();
  for (const site of sites) await verifySite(browser, site);
  if (owned.length === 2) {
    await owned[0].stop();
    owned.shift();
    assert.equal((await fetch(owned[0].webUrl)).status, 200, 'stopping one pair leaves the other live');
  }
  console.log('Development server browser verification passed.');
} finally {
  await browser?.close();
  for (const site of owned) await site.stop();
}
