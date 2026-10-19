// Render the site's own typography and app glyph for link previews.
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><title>napplet social card</title><style>
    * { box-sizing: border-box; } body { margin: 0; background: #120820; color: #f1ecfb; font-family: Arial, sans-serif; }
    main { width: 1200px; height: 630px; padding: 64px 80px; position: relative; }
    .brand { font-size: 28px; font-weight: 700; letter-spacing: -1px; }
    h1 { font-size: 108px; font-weight: 500; line-height: .98; letter-spacing: -7px; margin: 66px 0 24px; }
    h1 span { color: #b06bff; } p { font-size: 22px; color: #b4a8cf; margin: 0; }
    .orbit { position: absolute; right: 90px; top: 175px; width: 300px; height: 300px; border: 1px solid #654781; border-radius: 50%; display: grid; place-items: center; }
    .app { width: 116px; height: 138px; border: 1px solid #c98bff; background: #241334; padding: 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; transform: rotate(-9deg); }
    i { border: 1px solid #b06bff; border-radius: 50%; } i:nth-child(2), i:nth-child(3) { background: #b06bff; }
    footer { position: absolute; bottom: 48px; color: #b4a8cf; font-size: 14px; letter-spacing: 1px; }
  </style><main><div class="brand">napplet.</div><h1>Apps that<br><span>travel.</span></h1><p>Build a web app. Give it more places to run.</p><div class="orbit"><div class="app"><i></i><i></i><i></i><i></i></div></div><footer>napplet.run</footer></main></html>`);
  await page.screenshot({ path: 'apps/web/public/og.png' });
} finally {
  await browser.close();
}
