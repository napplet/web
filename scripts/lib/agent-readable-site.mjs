// Assemble-time agent output for the whole site: web Markdown copies, root llms.txt, Agent Skills discovery and their checks.
import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildSkillsDiscovery, htmlPageMarkdown, markdownPathFor, parseLlmsSections, readAlternateHref,
  renderLlmsTxt, servedPathFor, sha256Digest, SITE_URL, SKILLS_SCHEMA,
} from './agent-markdown.mjs';

// Not documents: the conformance app is an interactive runtime, and 404 pages have no canonical URL.
const EXCLUDED = [/^conformance\//, /(^|\/)404\.html$/];

async function listFiles(dir, prefix = '') {
  const files = [];
  for (const entry of await readdir(path.join(dir, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(dir, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files.sort();
}

/**
 * List the HTML documents that must have Markdown copies.
 * @param {string} site Assembled site directory.
 * @returns {Promise<string[]>} Site-relative HTML paths.
 */
export async function documentPages(site) {
  return (await listFiles(site)).filter((file) => file.endsWith('.html') && !EXCLUDED.some((pattern) => pattern.test(file)));
}

function pageMeta(html) {
  const decode = (text) => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return {
    title: decode(html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? ''),
    description: decode(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim() ?? ''),
  };
}

/**
 * Write a Markdown copy next to every web (non-docs) HTML page; docs copies come from the VitePress build.
 * @param {string} site Assembled site directory.
 * @returns {Promise<{ file: string, pathname: string, title: string, description: string, markdown: string }[]>} The web pages written.
 */
export async function writeWebMarkdown(site) {
  const pages = [];
  for (const file of (await documentPages(site)).filter((page) => !page.startsWith('docs/'))) {
    const html = await readFile(path.join(site, file), 'utf8');
    const pathname = servedPathFor(file);
    const markdown = htmlPageMarkdown(html, pathname);
    await writeFile(path.join(site, markdownPathFor(pathname).slice(1)), markdown);
    pages.push({ file, pathname, ...pageMeta(html), markdown });
  }
  return pages;
}

/**
 * Publish `/.well-known/agent-skills/` from the repository `skills/` directory.
 * @param {string} skillsDir Directory holding one folder per skill.
 * @param {string} site Assembled site directory.
 * @returns {Promise<object>} The discovery index written to `index.json`.
 */
export async function writeSkillsDiscovery(skillsDir, site) {
  const skills = [];
  for (const entry of await readdir(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(skillsDir, entry.name);
    const files = await Promise.all((await listFiles(dir)).map(async (file) => ({ path: file, bytes: await readFile(path.join(dir, file)) })));
    skills.push({ dir: entry.name, files });
  }
  const { index, artifacts } = buildSkillsDiscovery(skills);
  for (const artifact of artifacts) {
    await mkdir(path.dirname(path.join(site, artifact.path)), { recursive: true });
    await writeFile(path.join(site, artifact.path), artifact.bytes);
  }
  await writeFile(path.join(site, '.well-known/agent-skills/index.json'), `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

// Reading order for the top-level pages in llms.txt; other pages follow alphabetically.
const SITE_ORDER = ['/', '/explainer/', '/apps/', '/protocol/', '/protocol/contribute/'];
const siteRank = (page) => (SITE_ORDER.includes(page.pathname) ? SITE_ORDER.indexOf(page.pathname) : SITE_ORDER.length);

const firstSentence = (text) => text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;

/**
 * Write the root `/llms.txt` and `/llms-full.txt` covering the web pages, the docs index and the skills.
 * @param {string} site Assembled site directory (docs already contains `llms.txt` and `llms-full.txt`).
 * @param {Awaited<ReturnType<typeof writeWebMarkdown>>} webPages Pages returned by `writeWebMarkdown`.
 * @param {object} skillsIndex Index returned by `writeSkillsDiscovery`.
 */
export async function writeRootLlms(site, webPages, skillsIndex) {
  const link = (page) => ({ title: page.title.replace(/ · napplet$/, ''), url: `${SITE_URL}${markdownPathFor(page.pathname)}`, description: page.description || undefined });
  const protocol = webPages.filter((page) => /^\/protocol\/[^/]+\/$/.test(page.pathname) && page.pathname !== '/protocol/contribute/');
  const docsSections = parseLlmsSections(await readFile(path.join(site, 'docs/llms.txt'), 'utf8'));
  const sections = [
    { name: 'Site', links: webPages.filter((page) => !protocol.includes(page)).sort((a, b) => siteRank(a) - siteRank(b)).map(link) },
    ...docsSections.map((section) => ({ name: `Docs: ${section.name}`, links: section.links })),
    { name: 'NAP directory', links: protocol.map(link) },
    { name: 'Agent skills', links: [
      { title: 'Agent Skills discovery index', url: `${SITE_URL}/.well-known/agent-skills/index.json`, description: 'Agent Skills Discovery RFC v0.2.0 index with sha256 digests' },
      ...skillsIndex.skills.map((skill) => ({ title: skill.name, url: `${SITE_URL}${skill.url}`, description: firstSentence(skill.description) })),
    ] },
    { name: 'Optional', links: [
      { title: 'Full site text', url: `${SITE_URL}/llms-full.txt` },
      { title: 'Full docs text', url: `${SITE_URL}/docs/llms-full.txt` },
    ] },
  ];
  const notes = [
    'napplets are sandboxed Nostr web applets that run inside a host shell and reach signing, storage and relays only through it, over the NIP-5D JSON envelope. This site is the napplet showcase, explainer, NAP directory and SDK documentation.',
    `Every HTML page has a Markdown copy: \`/path/\` → \`/path/index.md\`, \`/docs/page.html\` → \`/docs/page.md\`. On napplet.run, sending \`Accept: text/markdown\` returns the copy at the page's own URL. See [Agent access to napplet.run](${SITE_URL}/docs/guide/agent-access.md).`,
    'Everything here is non-normative. NIP-5D (https://github.com/nostr-protocol/nips/pull/2303) and the NAPs (https://github.com/napplet/naps) are the canonical protocol sources.',
  ].join('\n\n');
  await writeFile(path.join(site, 'llms.txt'), renderLlmsTxt({ title: 'napplet', summary: 'Apps that travel: small sandboxed Nostr apps, the shells that host them, and the open NIP-5D protocol between them.', notes, sections }));
  const docsFull = (await readFile(path.join(site, 'docs/llms-full.txt'), 'utf8')).replace(/^# .*\n\n> .*\n\n/, '');
  const webFull = webPages.map((page) => `<!-- ${SITE_URL}${markdownPathFor(page.pathname)} -->\n\n${page.markdown}`).join('\n---\n\n');
  await writeFile(path.join(site, 'llms-full.txt'), `# napplet\n\n> Full text of napplet.run: site pages, then docs.\n\n${webFull}\n---\n\n${docsFull}`);
}

async function assertNonEmptyFile(file, label) {
  const info = await stat(file).catch(() => null);
  assert.ok(info?.isFile() && info.size > 0, `${label} is missing or empty: ${file}`);
}

/**
 * Fail the build unless every document page names a non-empty Markdown copy, the llms.txt files exist and link only to
 * files that exist, and every skills index entry matches the bytes it points at.
 * @param {string} site Assembled site directory.
 */
export async function assertAgentReadable(site) {
  const pages = await documentPages(site);
  assert.ok(pages.length > 0, 'No HTML pages found to check for Markdown copies');
  for (const file of pages) {
    const expected = markdownPathFor(servedPathFor(file));
    const href = readAlternateHref(await readFile(path.join(site, file), 'utf8'));
    assert.equal(href, expected, `${file} must carry <link rel="alternate" type="text/markdown" href="${expected}">`);
    await assertNonEmptyFile(path.join(site, expected.slice(1)), `Markdown copy for ${file}`);
  }
  for (const file of ['llms.txt', 'llms-full.txt', 'docs/llms.txt', 'docs/llms-full.txt']) await assertNonEmptyFile(path.join(site, file), file);
  for (const file of ['llms.txt', 'docs/llms.txt']) {
    for (const section of parseLlmsSections(await readFile(path.join(site, file), 'utf8'))) {
      for (const { url } of section.links) {
        if (!url.startsWith(`${SITE_URL}/`)) continue;
        await assertNonEmptyFile(path.join(site, decodeURIComponent(new URL(url).pathname).slice(1)), `${file} link ${url}`);
      }
    }
  }
  const index = JSON.parse(await readFile(path.join(site, '.well-known/agent-skills/index.json'), 'utf8'));
  assert.equal(index.$schema, SKILLS_SCHEMA, 'Agent skills index must declare the v0.2.0 schema');
  assert.ok(Array.isArray(index.skills) && index.skills.length > 0, 'Agent skills index must list skills');
  for (const skill of index.skills) {
    assert.ok(['skill-md', 'archive'].includes(skill.type), `Skill ${skill.name} has an unknown type`);
    const bytes = await readFile(path.join(site, skill.url.slice(1)));
    assert.equal(sha256Digest(bytes), skill.digest, `Skill ${skill.name} digest does not match ${skill.url}`);
  }
}
