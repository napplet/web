/** Capture a running napplet preview through its shell's iframe. */
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

/** Options for capturing a shell-hosted napplet. */
export interface ScreenshotOptions {
  url: string;
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
  const [url, ...rest] = args;
  if (!url || !/^https?:\/\//.test(url)) throw new Error('Provide the HTTP(S) URL of a running napplet preview');
  new URL(url);
  const options: ScreenshotOptions = { url, output: 'preview.png', selector: 'iframe', width: 1200, height: 750, delay: 1500 };
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    switch (flag) {
      case '--output': options.output = value; break;
      case '--selector': options.selector = value; break;
      case '--ready-selector': options.readySelector = value; break;
      case '--width': options.width = integer(value, flag, 1, 4096); break;
      case '--height': options.height = integer(value, flag, 1, 4096); break;
      case '--delay': options.delay = integer(value, flag, 0, 30000); break;
      default: throw new Error(`Unknown screenshot option: ${flag}`);
    }
  }
  if (!options.output.toLowerCase().endsWith('.png')) throw new Error('--output must end in .png');
  return options;
}

/**
 * Save a PNG of a running napplet iframe, preserving existing output files.
 * @param options URL, iframe selector, dimensions and readiness settings.
 * @returns Resolves after the PNG is written and Chromium is closed.
 * @example await captureScreenshot(parseScreenshotArgs(['http://localhost:5173']))
 */
export async function captureScreenshot(options: ScreenshotOptions): Promise<void> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: options.width, height: options.height } });
    page.setDefaultTimeout(30000);
    await page.goto(options.url, { waitUntil: 'domcontentloaded' });
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
    await browser.close();
  }
}

function integer(value: string, flag: string, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${flag} must be an integer from ${min} to ${max}`);
  return number;
}
