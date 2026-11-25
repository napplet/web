// Check a built archetypes site: every page is indexable, accessible in its basics,
// carries valid JSON-LD, links only to pages that exist, and has its machine twins.
// Usage: node scripts/check-site.mjs [dist]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Collect problems in a built site directory.
 * @param {string} dist Build output directory.
 * @returns {{ pages: number, problems: string[] }}
 */
export function checkSite(dist) {
  const problems = [];
  const files = [];
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path); else files.push(relative(dist, path).split('\\').join('/'));
    }
  };
  walk(dist);
  const has = path => files.includes(path);
  for (const required of ['index.html', 'index.md', '404.html', 'llms.txt', 'llms-full.txt', 'archetypes.json', 'relays.json', 'robots.txt', 'sitemap-index.xml', 'favicon.svg']) {
    if (!has(required)) problems.push(`missing ${required}`);
  }
  const pages = files.filter(file => file.endsWith('.html'));
  for (const page of pages) {
    const html = readFileSync(join(dist, page), 'utf8');
    const where = `${page}:`;
    if (!/<html lang="en"/.test(html)) problems.push(`${where} missing lang`);
    if (!/<title>[^<]{5,}<\/title>/.test(html)) problems.push(`${where} missing title`);
    if (!/<meta name="description" content="[^"]{20,}"/.test(html)) problems.push(`${where} missing description`);
    if (page !== '404.html' && !/<link rel="canonical" href="https:\/\/[^"]+\/"/.test(html)) problems.push(`${where} missing canonical`);
    const h1 = html.match(/<h1[\s>]/g)?.length ?? 0;
    if (h1 !== 1) problems.push(`${where} has ${h1} h1 elements`);
    if (!/<main[\s>]/.test(html) || !/<nav[\s>]/.test(html)) problems.push(`${where} missing main or nav landmark`);
    for (const match of html.matchAll(/<input[^>]*id="([^"]+)"/g)) {
      if (!html.includes(`for="${match[1]}"`)) problems.push(`${where} input #${match[1]} has no label`);
    }
    for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try { const value = JSON.parse(match[1]); if (!value['@context'] || !value['@type']) problems.push(`${where} JSON-LD without @context/@type`); }
      catch { problems.push(`${where} invalid JSON-LD`); }
    }
    for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
      const target = match[1];
      if (target.startsWith('//')) continue;
      const path = target.replace(/^\//, '');
      const ok = has(path) || has(`${path}index.html`) || (path === '' && has('index.html'));
      if (!ok) problems.push(`${where} broken link ${target}`);
    }
    const md = html.match(/<link rel="alternate" type="text\/markdown" href="([^"]+)"/)?.[1];
    if (md && !has(md.replace(/^\//, ''))) problems.push(`${where} markdown twin ${md} missing`);
  }
  for (const page of pages.filter(file => /^archetypes\/[^/]+\/index\.html$/.test(file))) {
    const slug = page.split('/')[1];
    if (!has(`archetypes/${slug}.md`)) problems.push(`archetypes/${slug}.md missing`);
  }
  // Every page except the 404 has a Markdown copy where Accept: text/markdown negotiation looks for it.
  for (const page of pages.filter(file => file !== '404.html')) {
    const twin = page.replace(/\.html$/, '.md');
    if (!has(twin)) problems.push(`${twin} missing`);
  }
  const sitemap = files.filter(file => /^sitemap-\d+\.xml$/.test(file)).map(file => readFileSync(join(dist, file), 'utf8')).join('');
  const listed = (sitemap.match(/<loc>/g) ?? []).length;
  if (listed < pages.length - 1) problems.push(`sitemap lists ${listed} URLs for ${pages.length} pages`);
  if (has('robots.txt') && !/Sitemap: https:\/\//.test(readFileSync(join(dist, 'robots.txt'), 'utf8'))) problems.push('robots.txt has no Sitemap line');
  if (has('archetypes.json')) {
    try { JSON.parse(readFileSync(join(dist, 'archetypes.json'), 'utf8')); } catch { problems.push('archetypes.json is not JSON'); }
  }
  return { pages: pages.length, problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = process.argv[2] ?? 'dist';
  if (!existsSync(dist)) { console.error(`No build at ${dist}`); process.exit(1); }
  const { pages, problems } = checkSite(dist);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`Checked ${pages} pages: ok`);
}
