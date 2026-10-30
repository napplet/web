import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:8100';
const data = JSON.parse(await readFile(new URL('../apps/web/src/data/protocol.json', import.meta.url), 'utf8'));
const merged = data.entries.find(entry => entry.state === 'merged');
const deferred = data.entries.find(entry => entry.registryStatus?.toLowerCase() === 'deferred');
const longSpec = data.entries.find(entry => entry.id === 'NAP-BLOSSOM') ?? data.entries.reduce((a, b) => a.markdown.length > b.markdown.length ? a : b);
const screenshots = '/tmp/napplet-protocol-screenshots';
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/protocol/`, { waitUntil: 'networkidle' });
    const rows = page.locator('[data-nap-row]:visible');
    assert.equal(await rows.count(), data.entries.length);
    await page.screenshot({ path: `${screenshots}/${width}-directory.png`, fullPage: true });
    await page.locator('#nap-state').selectOption('merged');
    assert.equal(await rows.count(), data.entries.filter(entry => entry.state === 'merged').length);
    await page.locator('#nap-state').selectOption('all');
    await page.getByLabel('Find a capability').fill('zz-no-such-domain');
    assert.equal(await rows.count(), 0);
    assert.ok(await page.locator('#nap-empty').isVisible());
    await page.getByLabel('Find a capability').fill(merged.id);
    await page.locator(`a[href="/protocol/${merged.slug}/"]`).first().click();
    assert.ok(await page.getByRole('link', { name: 'Read specification on GitHub' }).isVisible());
    assert.ok(await page.locator('.state-merged').isVisible());
    await page.screenshot({ path: `${screenshots}/${width}-detail.png`, fullPage: true });
    await page.goto(`${base}/protocol/${longSpec.slug}/`, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('.spec-body table').count() > 0);
    assert.ok(await page.locator('.spec-body pre').count() > 0);
    await page.locator('.spec-contents a').last().click();
    const target = await page.locator('.spec-contents a').last().getAttribute('href');
    await page.waitForFunction(selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return rect.top >= 0 && rect.top < innerHeight; }, target);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: long specification overflow`);
    await page.screenshot({ path: `${screenshots}/${width}-specification.png`, fullPage: true });
    for (const route of ['/protocol/', ...(deferred ? [`/protocol/${deferred.slug}/`] : []), '/protocol/contribute/']) {
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: ${route} page overflow`);
    }
    await page.screenshot({ path: `${screenshots}/${width}-contribute.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${width}px: directory, filters, detail links and contribution guide passed.`);
  }
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto(`${base}/protocol/`);
  assert.equal(await page.locator('[data-nap-row]').count(), data.entries.length);
  assert.equal(await page.locator('#nap-filters').isVisible(), false);
  const proposal = data.entries.find(entry => entry.state !== 'merged');
  if (proposal) {
    await page.locator(`a[href="/protocol/${proposal.slug}/"]`).first().click();
    assert.equal(await page.getByRole('link', { name: /Join the discussion/ }).getAttribute('href'), proposal.discussionUrl);
  }
  await page.getByRole('link', { name: 'Propose a NAP', exact: true }).click();
  assert.ok(await page.getByRole('heading', { name: 'Does this need a NAP?' }).isVisible());
  console.log('No-JavaScript directory, proposal navigation and contribution guide passed.');
} finally {
  await browser.close();
}
