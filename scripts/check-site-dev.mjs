import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Run against pnpm dev:site to cover app launch, docs navigation, and hydration.
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const launches = page.locator('[data-launch]');
  assert.equal(await launches.count(), 3);
  for (let i = 0; i < 3; i++) {
    await launches.nth(i).click();
    await page.locator('#player-status').filter({ hasText: 'Ready to play' }).waitFor();
    const frame = page.frameLocator('#player-stage iframe');
    if (i === 0) await frame.getByRole('button', { name: /drop marble/i }).click();
    if (i === 1) await frame.getByRole('button', { name: /start run/i }).click();
    if (i === 2) await frame.locator('canvas').first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Close preview' }).click();
    await page.locator('#player-stage iframe').waitFor({ state: 'detached' });
  }
  for (const route of ['/', '/docs/', '/docs/guide/getting-started.html']) {
    const response = await page.goto(new URL(route, baseUrl).href);
    assert.equal(response.status(), 200, route);
    await page.locator('h1').first().waitFor({ state: 'visible' });
    assert.ok((await page.title()).includes('napplet'), route);
  }
  await page.getByRole('button', { name: 'Search', exact: false }).first().click();
  await page.getByRole('searchbox').fill('napplet');
  await page.locator('.VPLocalSearchBox .result').first().waitFor({ state: 'visible' });
  assert.deepEqual(errors, [], 'Development pages must hydrate without errors');
  console.log('Development homepage, three playable apps, docs navigation, and docs search passed.');
} finally {
  await browser.close();
}
