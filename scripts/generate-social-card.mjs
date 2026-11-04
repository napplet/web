// Render the site's own typography and actual app preview for link previews.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const preview = (await readFile(new URL('../apps/web/public/showcase/images/freeze-frame-response-480.webp', import.meta.url))).toString('base64');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><title>napplet social card</title><style>
    * { box-sizing: border-box; } body { margin: 0; background: #120820; color: #f1ecfb; font-family: Arial, sans-serif; }
    main { width: 1200px; height: 630px; padding: 64px 80px; position: relative; }
    .brand { font-size: 28px; font-weight: 700; letter-spacing: -1px; }
    h1 { font-size: 108px; font-weight: 500; line-height: .98; letter-spacing: -7px; margin: 66px 0 24px; }
    h1 span { color: #b06bff; } p { font-size: 22px; color: #b4a8cf; margin: 0; }
    .orbit { position: absolute; right: 80px; top: 170px; width: 300px; height: 280px; border: 1px solid #654781; border-radius: 22px; display: grid; place-items: center; transform: rotate(-10deg); }
    .app { width: 250px; border: 1px solid #c98bff; background: #241334; border-radius: 6px; overflow: hidden; transform: rotate(10deg); box-shadow: 0 20px 40px #05020955; }
    .app img { display: block; width: 100%; height: 160px; object-fit: cover; } .app-label { padding: 10px 12px; font: 10px monospace; color: #e7d6f7; }
    footer { position: absolute; bottom: 48px; color: #b4a8cf; font-size: 14px; letter-spacing: 1px; }
  </style><main><div class="brand">napplet.</div><h1>Apps that<br><span>travel.</span></h1><p>Build a web app. Give it more places to run.</p><div class="orbit"><div class="app"><div class="app-label">● Freeze Frame Response</div><img src="data:image/webp;base64,${preview}" alt=""><div class="app-label">Same app. Different surroundings.</div></div></div><footer>napplet.run</footer></main></html>`);
  await page.screenshot({ path: 'apps/web/public/og.png' });
} finally {
  await browser.close();
}
