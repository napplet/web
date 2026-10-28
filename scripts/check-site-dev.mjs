import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Run against pnpm dev:site to cover app launch, docs navigation, and hydration.
const baseUrl = process.argv[2];
assert.ok(baseUrl, 'Usage: node scripts/check-site-dev.mjs <website-url printed by pnpm dev:site>');
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
    if (i === 0) await frame.getByRole('button', { name: /begin inspection/i }).click();
    if (i === 1) await frame.getByRole('button', { name: 'Fight!', exact: true }).click();
    if (i === 2) await frame.getByRole('button', { name: 'Fly', exact: true }).click();
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
