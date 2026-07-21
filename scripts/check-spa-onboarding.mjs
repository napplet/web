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

    const issues = await page.evaluate(() => {
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
      if (document.querySelector('.alpha-gate')) results.push('retired alpha gate is present');
      for (const [index, row] of [...document.querySelectorAll('.command-row')].entries()) {
        const code = row.querySelector('code')?.getBoundingClientRect();
        const button = row.querySelector('button')?.getBoundingClientRect();
        const bounds = row.getBoundingClientRect();
        if (!code || !button) {
          results.push(`command row ${index} is incomplete`);
          continue;
        }
        if (code.right > button.left + 0.5) results.push(`command row ${index} overlaps its copy button`);
        if (bounds.right > window.innerWidth + 0.5 || bounds.left < -0.5) {
          results.push(`command row ${index} leaves the viewport`);
        }
      }
      for (const [index, button] of [...document.querySelectorAll('#start button')].entries()) {
        const bounds = button.getBoundingClientRect();
        if (bounds.width < 1 || bounds.height < 1) results.push(`button ${index} has no stable size`);
      }
      return results;
    });
    assert.deepEqual(issues, [], `${viewport.name}: ${issues.join('; ')}`);

    const screenshot = path.join(outputDir, `napplet-onboarding-${viewport.name}.png`);
    await section.screenshot({ path: screenshot, animations: 'disabled' });

    if (viewport.name === 'desktop') {
      await page.getByRole('button', { name: 'Windows' }).click();
      await assertVisibleText(page, 'install-napplet-cli.ps1');
      await page.getByRole('button', { name: 'macOS' }).click();
      await assertVisibleText(page, 'install-napplet-cli.sh');
    }
    await page.close();
    console.log(`${viewport.name}: ${screenshot}`);
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
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
