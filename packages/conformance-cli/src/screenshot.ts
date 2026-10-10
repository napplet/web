/** Capture a local build or an existing shell preview through its iframe. */
import { access, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { startScreenshotPreview } from './screenshot-preview.js';
import { resolveNappletDir } from './resolve-napplet.js';

/** Options for capturing a shell-hosted napplet. */
export interface ScreenshotOptions {
  url?: string;
  directory?: string;
  artifact?: string;
  output: string;
  selector: string;
  readySelector?: string;
  width: number;
  height: number;
  delay: number;
}

/**
 * Parse screenshot arguments without invoking a browser.
 * @param args CLI arguments after the screenshot command.
 * @returns Validated capture options.
 * @example parseScreenshotArgs(['http://localhost:5173', '--output', 'preview.png'])
 */
export function parseScreenshotArgs(args: readonly string[]): ScreenshotOptions {
  const hasTarget = args[0] && !args[0].startsWith('--');
  const target = hasTarget ? args[0] : '.';
  const rest = hasTarget ? args.slice(1) : args;
  const remote = /^https?:\/\//.test(target);
  if (remote) new URL(target);
  else if (/^[a-z][a-z0-9+.-]*:/i.test(target) && !/^[a-z]:[\\/]/i.test(target)) throw new Error('Preview URLs must use HTTP(S)');
  const options: ScreenshotOptions = { ...(remote ? { url: target } : { directory: target }), output: 'preview.png', selector: 'iframe', width: 1200, height: 750, delay: 1500 };
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    switch (flag) {
      case '--output': options.output = value; break;
      case '--artifact': options.artifact = value; break;
      case '--selector': options.selector = value; break;
      case '--ready-selector': options.readySelector = value; break;
      case '--width': options.width = integer(value, flag, 1, 4096); break;
      case '--height': options.height = integer(value, flag, 1, 4096); break;
      case '--delay': options.delay = integer(value, flag, 0, 30000); break;
      default: throw new Error(`Unknown screenshot option: ${flag}`);
    }
  }
  if (!options.output.toLowerCase().endsWith('.png')) throw new Error('--output must end in .png');
  if (options.artifact && hasTarget) throw new Error('Use a target or --artifact, not both');
  return options;
}

/**
 * Save a PNG of a napplet iframe, starting a local preview when needed.
 * @param options Local build or URL, output, dimensions and readiness settings.
 * @returns Resolves after capture and cleanup of Chromium and any local preview.
 * @example await captureScreenshot(parseScreenshotArgs(['http://localhost:5173']))
 */
export async function captureScreenshot(options: ScreenshotOptions): Promise<void> {
  await ensureChromium();
  const preview = options.url ? undefined : await startScreenshotPreview(
    options.artifact ?? (await resolveNappletDir(options.directory ?? '.')).indexHtml,
  );
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chromium' });
    const page = await browser.newPage({ viewport: { width: options.width, height: options.height } });
    page.setDefaultTimeout(30000);
    await page.goto(options.url ?? preview!.url, { waitUntil: 'domcontentloaded' });
    if (preview) {
      await page.waitForFunction(() => {
        const iframe = document.querySelector<HTMLIFrameElement>('#napplet-frame');
        return Boolean(iframe?.srcdoc);
      });
    }
    const frame = page.locator(options.selector);
    await frame.waitFor({ state: 'visible' });
    await frame.evaluate((element, size) => {
      if (!(element instanceof HTMLIFrameElement)) throw new Error('Screenshot selector must select one iframe');
      Object.assign(element.style, { width: `${size.width}px`, height: `${size.height}px`, maxWidth: 'none', maxHeight: 'none', boxSizing: 'border-box' });
    }, { width: options.width, height: options.height });
    const content = frame.contentFrame();
    await content.locator('body').waitFor({ state: 'visible' });
    if (options.readySelector) await content.locator(options.readySelector).waitFor({ state: 'visible' });
    await content.locator('body').evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(options.delay);
    const png = await frame.screenshot({ type: 'png', timeout: 30000 });
    await writeFile(options.output, png, { flag: 'wx' });
  } finally {
    try { await browser?.close(); } finally { await preview?.close(); }
  }
}

async function ensureChromium(): Promise<void> {
  try { await access(chromium.executablePath()); return; } catch { /* Install the matching browser on first use. */ }
  console.error('Installing Chromium for screenshot capture...');
  const require = createRequire(import.meta.url);
  const cli = join(dirname(require.resolve('playwright/package.json')), 'cli.js');
  await promisify(execFile)(process.execPath, [cli, 'install', 'chromium'], { timeout: 180000 });
}

function integer(value: string, flag: string, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${flag} must be an integer from ${min} to ${max}`);
  return number;
}
