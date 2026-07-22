import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const port = Number(process.env.NAPPLET_SPA_TEST_PORT ?? 4176);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = process.env.NAPPLET_SPA_SCREENSHOT_DIR ?? os.tmpdir();
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow', width: 320, height: 568 },
];

const server = spawn(
  'pnpm',
  ['--filter', '@napplet/web', 'exec', 'vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
);
let serverOutput = '';
server.stdout.on('data', (chunk) => (serverOutput += chunk));
server.stderr.on('data', (chunk) => (serverOutput += chunk));

let browser;
try {
  await waitForServer(`${baseUrl}/`);
  browser = await chromium.launch({ headless: true });
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/#start`, { waitUntil: 'networkidle' });
    const section = page.locator('#start');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);

    await assertGateState(page);
    assert.equal(await page.locator('.burger').getAttribute('aria-expanded'), 'false');
    assert.deepEqual(await collectLayoutIssues(page), [], `${viewport.name}: gated layout`);
    await page.locator('header.nav').evaluate((element) => {
      element.style.visibility = 'hidden';
    });
    const warningScreenshot = path.join(
      outputDir,
      `napplet-onboarding-${viewport.name}-warning.png`,
    );
    await section.screenshot({ path: warningScreenshot, animations: 'disabled' });

    await page.getByRole('button', { name: 'I Understand' }).click();
    await assertMainState(page);
    const issues = await collectLayoutIssues(page);
    assert.deepEqual(issues, [], `${viewport.name}: ${issues.join('; ')}`);

    const screenshot = path.join(outputDir, `napplet-onboarding-${viewport.name}.png`);
    await section.screenshot({ path: screenshot, animations: 'disabled' });

    if (viewport.name === 'desktop') {
      await assertVisibleText(page, 'https://napplet.run/install.sh');
      await assertVisibleText(page, 'napplet guide');
      for (const label of ['Read the docs', 'NIP-5D spec', 'Group chat', 'GitHub']) {
        assert.ok(await section.getByRole('link', { name: new RegExp(label) }).isVisible());
      }
    }
    await page.close();
    console.log(`${viewport.name}: ${warningScreenshot}`);
    console.log(`${viewport.name}: ${screenshot}`);
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}

async function assertGateState(page) {
  assert.ok(await page.getByRole('dialog').isVisible());
  await assertVisibleText(page, 'Before you install');
  await assertVisibleText(page, 'could be broken or incomplete');
  assert.equal(await page.locator('.panel-content.locked').count(), 1);
}

async function assertMainState(page) {
  assert.equal(await page.locator('.alpha-gate').count(), 0);
  assert.equal(await page.locator('.panel-content.locked').count(), 0);
  assert.equal(await page.locator('.cmd').count(), 1);
  assert.equal(await page.locator('.command-row').count(), 0);
  assert.ok(await page.getByRole('button', { name: 'Copy install command' }).isVisible());
}

async function collectLayoutIssues(page) {
  return await page.evaluate(() => {
    const results = [];
    if (document.documentElement.scrollWidth > window.innerWidth) {
      const offenders = [...document.querySelectorAll('body *')]
        .map((element) => ({ element, bounds: element.getBoundingClientRect() }))
        .filter(({ bounds }) => bounds.right > window.innerWidth + 0.5 || bounds.left < -0.5)
        .slice(0, 6)
        .map(({ element, bounds }) =>
          `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}[${Math.round(bounds.left)},${Math.round(bounds.right)}]`
        );
      results.push(
        `page overflow ${document.documentElement.scrollWidth} > ${window.innerWidth}: ${offenders.join(', ')}`,
      );
    }

    const command = document.querySelector('.cmd');
    if (command) {
      const code = command.querySelector('code')?.getBoundingClientRect();
      const copy = command.querySelector('.copy')?.getBoundingClientRect();
      const bounds = command.getBoundingClientRect();
      if (!code || !copy) {
        results.push('install command is incomplete');
      } else if (code.right > copy.left + 0.5) {
        results.push('install command overlaps its copy label');
      }
      if (command.scrollWidth > command.clientWidth + 1) {
        results.push('install command has internal overflow');
      }
      if (bounds.right > window.innerWidth + 0.5 || bounds.left < -0.5) {
        results.push('install command leaves the viewport');
      }
    }

    for (const [index, button] of [...document.querySelectorAll('#start button')].entries()) {
      const bounds = button.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) results.push(`button ${index} has no stable size`);
    }
    return results;
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The Vite process is still starting.
    }
    if (server.exitCode !== null) throw new Error(`Vite exited early:\n${serverOutput}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}:\n${serverOutput}`);
}

async function assertVisibleText(page, text) {
  const count = await page.getByText(text, { exact: false }).count();
  assert.ok(count > 0, `Expected visible text containing ${text}`);
}
