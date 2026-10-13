/** Record an exact local build through Paja, with optional author interaction. */
import { createHash } from 'node:crypto';
import { access, lstat, readFile, writeFile, mkdtemp, rm, copyFile, constants } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, type Page } from 'playwright';
import { startScreenshotPreview } from './screenshot-preview.js';
import { resolveNappletDir } from './resolve-napplet.js';
import { parseRecordActions, type RecordOptions } from './record-options.js';

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/**
 * Save a video, cover, and metadata without replacing existing files.
 * @param options Validated capture settings and optional input recipe.
 * @param onPage Optional browser observer for integration tests.
 * @returns Clip metadata, including the exact build and encoded byte hashes.
 * @example await captureRecording(parseRecordArgs(['.', '--output', 'game.webm']))
 */
export async function captureRecording(options: RecordOptions, onPage?: (page: Page) => Promise<void>) {
  const artifact = resolve(options.artifact ?? (await resolveNappletDir(options.directory)).indexHtml);
  const html = await readFile(artifact);
  const artifactHash = digest(html);
  const actions = parseRecordActions(options.actions ? JSON.parse(await readFile(options.actions, 'utf8')) : [], options);
  const output = resolve(options.output);
  const thumbnail = `${output}.png`;
  const metadataPath = `${output}.json`;
  for (const path of [output, thumbnail, metadataPath]) {
    const exists = await lstat(path).then(() => true, (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return false;
      throw error;
    });
    if (exists) throw new Error(`Recording output already exists: ${path}. Choose another --output.`);
  }
  // Playwright installs only missing, version-matched tools into its managed cache.
  const require = createRequire(import.meta.url);
  const installed = await access(chromium.executablePath()).then(() => true, () => false);
  await promisify(execFile)(process.execPath, [join(dirname(require.resolve('playwright/package.json')), 'cli.js'), 'install', ...(installed ? [] : ['chromium']), 'ffmpeg'], { timeout: 180000 });
  const temporary = await mkdtemp(join(tmpdir(), 'napplet-record-'));
  const created: string[] = [];
  let preview: Awaited<ReturnType<typeof startScreenshotPreview>> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    preview = await startScreenshotPreview(artifact, html);
    browser = await chromium.launch({ channel: 'chromium', headless: !options.interactive });
    const context = await browser.newContext({ viewport: { width: options.width, height: options.height } });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(preview.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(document.querySelector<HTMLIFrameElement>('#napplet-frame')?.srcdoc));
    const iframe = page.locator('#napplet-frame');
    await iframe.evaluate((element) => {
      Object.assign(element.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', maxWidth: 'none', maxHeight: 'none', border: '0', margin: '0', zIndex: '2147483646' });
    });
    const frame = iframe.contentFrame();
    await frame.locator('body').waitFor({ state: 'visible' });
    if (options.readySelector) await frame.locator(options.readySelector).waitFor({ state: 'visible' });
    await frame.locator('body').evaluate(async () => { await document.fonts.ready; });
    if (options.interactive) await addRecordButton(page, options.duration);
    await onPage?.(page);
    if (options.interactive) {
      await page.waitForFunction(() => document.documentElement.dataset.nappletRecord === 'start', undefined, { timeout: 300000 });
      await page.locator('#napplet-record-controls').evaluate((element) => element.remove());
    } else await page.waitForTimeout(options.delay);
    await iframe.evaluate((element) => (element as HTMLIFrameElement).focus());
    const clip = join(temporary, 'clip.webm');
    await page.screencast.start({ path: clip, size: { width: options.width, height: options.height } });
    const held = new Set<string>();
    try {
      const start = Date.now();
      for (const action of actions) {
        await page.waitForTimeout(Math.max(0, start + action.atMs - Date.now()));
        if (action.type === 'click') await page.mouse.click(action.x!, action.y!);
        else if (action.type === 'keyDown') { held.add(action.key!); await page.keyboard.down(action.key!); }
        else { held.delete(action.key!); await page.keyboard.up(action.key!); }
      }
      await page.waitForTimeout(Math.max(0, start + options.duration - Date.now()));
    } finally {
      for (const key of held) await page.keyboard.up(key).catch(() => {});
      await page.screencast.stop();
    }
    const png = await iframe.screenshot({ type: 'png' });
    const bytes = await readFile(clip);
    if (bytes.length > 20 * 1024 * 1024) throw new Error('Recording exceeds the 20 MiB authoring limit; shorten the clip or reduce dimensions');
    const info = await inspectRecordedVideo(page, bytes);
    if (digest(await readFile(artifact)) !== artifactHash) throw new Error('Build changed during recording; record again');
    const metadata = { file: output, thumbnail, artifactHash, sha256: digest(bytes), bytes: bytes.length, mimeType: 'video/webm', ...info };
    await copyFile(clip, output, constants.COPYFILE_EXCL); created.push(output);
    await writeFile(thumbnail, png, { flag: 'wx' }); created.push(thumbnail);
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' }); created.push(metadataPath);
    return metadata;
  } catch (error) {
    await Promise.all(created.map((path) => rm(path, { force: true })));
    throw error;
  } finally {
    try { await browser?.close(); } finally {
      try { await preview?.close(); } finally { await rm(temporary, { recursive: true, force: true }); }
    }
  }
}

async function addRecordButton(page: Page, duration: number): Promise<void> {
  await page.evaluate((seconds) => {
    const controls = document.createElement('div');
    controls.id = 'napplet-record-controls';
    controls.style.cssText = 'position:fixed;top:8px;right:8px;z-index:2147483647;background:#111;color:white;padding:12px;border-radius:8px;font:14px system-ui';
    const button = document.createElement('button');
    button.textContent = `Record next ${seconds} seconds`;
    button.onclick = () => { document.documentElement.dataset.nappletRecord = 'start'; };
    controls.append(button, document.createTextNode(' Play first. Close window to cancel.'));
    document.body.append(controls);
  }, duration / 1000);
}

async function inspectRecordedVideo(page: Page, bytes: Uint8Array) {
  const inspector = await page.context().newPage();
  try {
    return await inspector.evaluate(async (base64) => {
      const video = document.createElement('video');
      video.muted = true;
      video.src = `data:video/webm;base64,${base64}`;
      document.body.append(video);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Recorded video did not decode')), 10000);
        video.onloadeddata = () => { clearTimeout(timer); resolve(); };
        video.onerror = () => { clearTimeout(timer); reject(new Error('Recorded video is invalid')); };
      });
      if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth || !video.videoHeight) throw new Error('Recorded video metadata is invalid');
      return { width: video.videoWidth, height: video.videoHeight, durationMs: Math.round(video.duration * 1000) };
    }, Buffer.from(bytes).toString('base64'));
  } finally { await inspector.close(); }
}
