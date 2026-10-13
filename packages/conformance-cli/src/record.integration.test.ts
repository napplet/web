/** Opt-in real browser proof: NAPPLET_TEST_RECORDING=1 pnpm test:unit. */
import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { captureRecording } from './record.js';
import { parseRecordArgs } from './record-options.js';

describe.runIf(process.env.NAPPLET_TEST_RECORDING === '1')('real gameplay recording', () => {
  it('records input-driven motion, correct crop, hashes, and no host controls', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'record-test-'));
    try {
      await copyFile(new URL('../test/fixtures/gameplay.html', import.meta.url), join(dir, 'index.html'));
      const recipe = join(dir, 'actions.json');
      await writeFile(recipe, JSON.stringify([{ type: 'click', atMs: 100, x: 20, y: 20 }, { type: 'keyDown', atMs: 1500, key: 'ArrowRight' }, { type: 'keyUp', atMs: 4000, key: 'ArrowRight' }]));
      const output = join(dir, 'preview.webm');
      const options = parseRecordArgs([dir, '--output', output, '--actions', recipe, '--width', '480', '--height', '320', '--delay', '0']);
      const info = await captureRecording(options);
      expect(info).toMatchObject({ width: 480, height: 320, file: output });
      expect(info.durationMs).toBeGreaterThanOrEqual(5900);
      expect(info.durationMs).toBeLessThan(8500);
      expect(JSON.parse(await readFile(`${output}.json`, 'utf8')).sha256).toBe(info.sha256);
      const bytes = await readFile(output);
      const browser = await chromium.launch({ channel: 'chromium' });
      try {
        const page = await browser.newPage();
        const positions = await page.evaluate(async (base64) => {
          const video = document.createElement('video');
          video.muted = true; video.src = `data:video/webm;base64,${base64}`;
          await new Promise<void>((done) => { video.onloadeddata = () => done(); });
          const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d')!;
          const result: number[] = [];
          for (const time of [0.5, 5]) {
            video.currentTime = time;
            await new Promise<void>((done) => { video.onseeked = () => done(); });
            ctx.drawImage(video, 0, 0);
            const pixels = ctx.getImageData(0, 110, canvas.width, 1).data;
            result.push(Array.from({ length: canvas.width }, (_, x) => x).find(x => pixels[x * 4] > 180 && pixels[x * 4 + 1] < 100) ?? -1);
          }
          return result;
        }, bytes.toString('base64'));
        expect(positions[0]).toBeGreaterThanOrEqual(0);
        expect(positions[1] - positions[0]).toBeGreaterThan(150);
      } finally { await browser.close(); }
      await expect(captureRecording(options)).rejects.toThrow();
      expect(await readFile(output)).toEqual(bytes);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 90000);

  it.runIf(process.env.NAPPLET_TEST_INTERACTIVE === '1')('lets the creator play first and removes controls before interactive capture', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'record-interactive-'));
    try {
      await copyFile(new URL('../test/fixtures/gameplay.html', import.meta.url), join(dir, 'index.html'));
      const options = parseRecordArgs([dir, '--output', join(dir, 'interactive.webm'), '--interactive', '--duration', '1000']);
      const info = await captureRecording(options, async (page) => {
        await page.mouse.click(20, 100);
        await page.keyboard.press('ArrowRight');
        await page.getByRole('button', { name: 'Record next 1 seconds' }).click();
      });
      expect(info.bytes).toBeGreaterThan(1000);
      await expect(captureRecording({ ...options, output: join(dir, 'cancelled.webm') }, async page => { await page.close(); })).rejects.toThrow();
      await expect(readFile(join(dir, 'cancelled.webm'))).rejects.toThrow();
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 60000);
});
