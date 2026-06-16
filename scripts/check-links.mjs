// scripts/check-links.mjs
//
// Crawls the assembled site (marketing SPA at /, VitePress docs at /docs) the
// way the static host serves it and fails if any internal link 404s.
//
// Why a browser: apps/web is a client-rendered Svelte SPA — its /docs/* links
// are injected at runtime and are NOT in the static HTML, so a static-HTML link
// checker can't see them (that's how the /docs/packages/<name> 404s shipped).
// Rendering each page with headless Chromium checks the SPA's real links and the
// static docs uniformly.
//
// Why python http.server in CI: it serves literal files + directory index.html
// with NO extensionless ".html" rewrite — matching Bunny CDN storage + nsite.
// That faithful emulation is what makes this catch the cleanUrls bug class.
//
// Usage: node scripts/check-links.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE = process.argv[2] || process.env.LINK_CHECK_BASE || 'http://localhost:8099';
const ORIGIN = new URL(BASE).origin;

const ASSET_EXT = /\.(?:js|mjs|cjs|css|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|map|json|xml|txt|webmanifest|pdf|zip|wasm)$/i;

/** Resolve an href to a same-origin, fragment-stripped URL, or null to skip. */
function normalize(href, fromUrl) {
  if (!href) return null;
  if (/^(?:mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  let u;
  try {
    u = new URL(href, fromUrl);
  } catch {
    return null;
  }
  if (u.origin !== ORIGIN) return null; // external — out of scope
  u.hash = '';
  return u.href;
}

const queued = new Set();
const queue = [];
function enqueue(url) {
  if (!url || queued.has(url)) return;
  queued.add(url);
  queue.push(url);
}

const browser = await chromium.launch();
const page = await browser.newPage();

const broken = [];
let checked = 0;

enqueue(new URL('/', BASE).href);

while (queue.length) {
  const url = queue.shift();
  checked += 1;

  let res;
  try {
    res = await fetch(url); // follows redirects; final status is what ships
  } catch (err) {
    broken.push({ url, status: 'fetch-error', detail: err.message });
    continue;
  }

  if (res.status >= 400) {
    broken.push({ url, status: res.status });
    continue;
  }

  const type = res.headers.get('content-type') || '';
  if (ASSET_EXT.test(new URL(url).pathname) || !/text\/html/i.test(type)) continue;

  // Render so client-injected links (the SPA) are discoverable.
  let hrefs = [];
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'), (a) => a.getAttribute('href')),
    );
  } catch (err) {
    broken.push({ url, status: 'render-error', detail: err.message });
    continue;
  }
  for (const h of hrefs) enqueue(normalize(h, url));
}

await browser.close();

console.log(`Checked ${checked} internal URL(s) from ${BASE}`);
if (broken.length) {
  console.error(`\n✖ ${broken.length} broken internal link(s):`);
  for (const b of broken) {
    console.error(`  [${b.status}] ${b.url}${b.detail ? ` — ${b.detail}` : ''}`);
  }
  process.exit(1);
}
console.log('✓ No broken internal links');
