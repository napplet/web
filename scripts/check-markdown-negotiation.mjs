// Live check of napplet.run Accept: text/markdown negotiation, including cache separation (usage: node scripts/check-markdown-negotiation.mjs [base]).
import assert from 'node:assert/strict';

const base = (process.argv[2] ?? 'https://napplet.run').replace(/\/$/, '');
const PAGES = [['/', '/index.md'], ['/explainer/', '/explainer/index.md'], ['/docs/guide/getting-started.html', '/docs/guide/getting-started.md']];

async function get(pathname, accept) {
  const response = await fetch(`${base}${pathname}`, { headers: { accept }, redirect: 'manual' });
  const body = await response.text();
  return { status: response.status, type: response.headers.get('content-type') ?? '', vary: response.headers.get('vary') ?? '', link: response.headers.get('link') ?? '', cache: response.headers.get('cdn-cache') ?? '', body };
}

const varies = (vary) => vary.split(',').some((value) => value.trim().toLowerCase() === 'accept');

// Alternate the two representations twice so the second round is served from the CDN cache: a cache keyed only on the
// page URL would hand the first-cached representation to the other client.
for (const [page, copy] of PAGES) {
  for (const round of [1, 2]) {
    const markdown = await get(page, 'text/markdown, text/html;q=0.5');
    assert.equal(markdown.status, 200, `${page} Markdown round ${round}: status ${markdown.status}`);
    assert.match(markdown.type, /^text\/markdown/, `${page} Markdown round ${round}: content-type ${markdown.type} (cdn-cache ${markdown.cache})`);
    assert.ok(varies(markdown.vary), `${page} Markdown round ${round}: Vary is "${markdown.vary}"`);
    assert.doesNotMatch(markdown.body, /<html/i, `${page} Markdown round ${round}: body is HTML`);

    const html = await get(page, 'text/html,application/xhtml+xml');
    assert.equal(html.status, 200, `${page} HTML round ${round}: status ${html.status}`);
    assert.match(html.type, /^text\/html/, `${page} HTML round ${round}: content-type ${html.type} (cdn-cache ${html.cache})`);
    assert.ok(varies(html.vary), `${page} HTML round ${round}: Vary is "${html.vary}"`);
    assert.ok(html.link.includes(`<${copy}>`) && /type="text\/markdown"/.test(html.link), `${page} HTML round ${round}: Link is "${html.link}"`);
    console.log(`✓ ${page} round ${round}: markdown ${markdown.type} [${markdown.cache || 'no cdn-cache'}], html ${html.type} [${html.cache || 'no cdn-cache'}]`);
  }
}
console.log(`Markdown negotiation verified on ${base}`);
