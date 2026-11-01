// Build-time Markdown, llms.txt and Agent Skills discovery output for napplet.run agents.
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { markdownPathFor } from './markdown-paths.mjs';

export { markdownPathFor };

export const SITE_URL = 'https://napplet.run';
export const SKILLS_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

// ─── Paths ──────────────────────────────────────────────────────────────────

/**
 * Map a built HTML file (relative to the site root) to the URL path it is served at.
 * @param {string} file Relative path such as `explainer/index.html` or `docs/spec.html`.
 * @returns {string} Served path such as `/explainer/` or `/docs/spec.html`.
 * @example
 * ```js
 * servedPathFor('index.html'); // '/'
 * ```
 */
export function servedPathFor(file) {
  const posix = file.split('\\').join('/');
  if (posix === 'index.html') return '/';
  if (posix.endsWith('/index.html')) return `/${posix.slice(0, -'index.html'.length)}`;
  return `/${posix}`;
}

/**
 * Build the alternate-representation link tag a page carries for its Markdown copy.
 * @param {string} pathname Served path of the HTML page.
 * @returns {string} A `<link rel="alternate" type="text/markdown">` element.
 * @example
 * ```js
 * alternateLinkTag('/'); // '<link rel="alternate" type="text/markdown" href="/index.md" />'
 * ```
 */
export function alternateLinkTag(pathname) {
  return `<link rel="alternate" type="text/markdown" href="${markdownPathFor(pathname)}" />`;
}

/**
 * Read the Markdown alternate href from an HTML document, if any.
 * @param {string} html HTML source.
 * @returns {string | null} The href, or null when the page has no Markdown alternate.
 * @example
 * ```js
 * readAlternateHref('<link rel="alternate" type="text/markdown" href="/index.md">'); // '/index.md'
 * ```
 */
export function readAlternateHref(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel=["']?alternate/i.test(tag) || !/type=["']?text\/markdown/i.test(tag)) continue;
    return tag.match(/href=["']?([^"'\s>]+)/i)?.[1] ?? null;
  }
  return null;
}

// ─── HTML pages ─────────────────────────────────────────────────────────────

const STRIP = 'script, style, noscript, template, svg, canvas, iframe, video, audio, form, button, input, select, textarea, dialog, nav, [aria-hidden="true"], [hidden], .skip-link';

function turndown() {
  const service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
  service.use(gfm);
  return service;
}

/**
 * Convert a built HTML page to Markdown: the `<main>` content without navigation, controls or decoration, with absolute links.
 * @param {string} html Built HTML page.
 * @param {string} pathname Served path, used to resolve relative links.
 * @returns {string} Markdown ending in a newline.
 * @example
 * ```js
 * htmlPageMarkdown('<title>Home</title><main><p>Hi</p></main>', '/'); // '# Home\n\nHi\n'
 * ```
 */
export function htmlPageMarkdown(html, pathname) {
  const { document } = parseHTML(html);
  const root = document.querySelector('main') ?? document.body;
  for (const node of root.querySelectorAll(STRIP)) node.remove();
  for (const br of root.querySelectorAll('h1 br, h2 br, h3 br, h4 br, h5 br, h6 br')) br.replaceWith(document.createTextNode(' '));
  for (const img of root.querySelectorAll('img')) if (!img.getAttribute('alt')?.trim()) img.remove();
  const base = new URL(pathname, SITE_URL);
  for (const [selector, attribute] of [['a[href]', 'href'], ['img[src]', 'src']]) {
    for (const node of root.querySelectorAll(selector)) {
      try { node.setAttribute(attribute, new URL(node.getAttribute(attribute), base).href); } catch { /* leave malformed URLs as written */ }
    }
  }
  let body = turndown().turndown(root.innerHTML).replace(/\n{3,}/g, '\n\n').trim();
  if (!/^# /m.test(body)) {
    const title = document.querySelector('title')?.textContent?.trim();
    if (title) body = `# ${title}\n\n${body}`;
  }
  return `${body}\n`;
}

// ─── VitePress docs pages ───────────────────────────────────────────────────

function rewriteTarget(target, relativePath) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) return target;
  const [rawPath, hash = ''] = target.split('#');
  if (!rawPath) return target;
  const dir = rawPath.startsWith('/') ? '' : relativePath.slice(0, relativePath.lastIndexOf('/') + 1);
  const url = new URL(rawPath.replace(/^\//, ''), `${SITE_URL}/docs/${dir}`);
  const ext = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (ext === 'html' || ext === 'md') url.pathname = url.pathname.replace(/\.[a-z]+$/i, '.md');
  else if (!ext) url.pathname = url.pathname.endsWith('/') ? `${url.pathname}index.md` : `${url.pathname}.md`;
  return `${url.href}${hash ? `#${hash}` : ''}`;
}

function rewriteLinks(markdown, relativePath) {
  return markdown.replace(/(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (_, open, target, close) => `${open}${rewriteTarget(target, relativePath)}${close}`);
}

function convertContainers(markdown) {
  const out = [];
  let fence = null;
  let inContainer = false;
  for (const line of markdown.split('\n')) {
    const fenceMatch = line.match(/^(`{3,}|~{3,})/);
    if (fenceMatch && !fence) fence = fenceMatch[1];
    else if (fence && line.startsWith(fence)) fence = null;
    else if (!fence) {
      const open = line.match(/^:::\s*([a-z]+)(?:\s+(.*))?$/i);
      if (open && !inContainer) {
        inContainer = true;
        const label = open[1].toUpperCase();
        out.push(`> **${open[2]?.trim() || label}**`, '>');
        continue;
      }
      if (inContainer && /^:::\s*$/.test(line)) { inContainer = false; continue; }
    }
    out.push(inContainer ? (line ? `> ${line}` : '>') : line);
  }
  return out.join('\n');
}

function homeMarkdown(frontmatter) {
  const hero = frontmatter.hero ?? {};
  const parts = [`# ${[hero.name, hero.text].filter(Boolean).join(': ')}`];
  if (hero.tagline) parts.push(hero.tagline);
  const actions = (hero.actions ?? []).map((action) => `- [${action.text}](${action.link})`);
  if (actions.length) parts.push(actions.join('\n'));
  for (const feature of frontmatter.features ?? []) parts.push(`## ${feature.title}\n\n${feature.details}`);
  return parts.join('\n\n');
}

/**
 * Turn a VitePress source page into standalone Markdown for agents.
 * @param {{ relativePath: string, source: string, frontmatter?: Record<string, any> }} page Source path relative to the docs root, its Markdown (generated notices already applied) and parsed frontmatter.
 * @returns {string} Markdown with frontmatter removed, containers as blockquotes and internal links pointing at absolute `.md` URLs.
 * @example
 * ```js
 * docsPageMarkdown({ relativePath: 'guide/index.md', source: '# Guide\n\nSee [spec](/spec).\n' });
 * // '# Guide\n\nSee [spec](https://napplet.run/docs/spec.md).\n'
 * ```
 */
export function docsPageMarkdown({ relativePath, source, frontmatter = {} }) {
  let body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  if (frontmatter.layout === 'home') body = `${homeMarkdown(frontmatter)}\n\n${body}`;
  body = rewriteLinks(convertContainers(body), relativePath);
  return `${body.replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

// ─── llms.txt ───────────────────────────────────────────────────────────────

/**
 * Render an llms.txt document (https://llmstxt.org/): H1, blockquote summary, optional notes, then H2 link sections.
 * @param {{ title: string, summary: string, notes?: string, sections: { name: string, links: { title: string, url: string, description?: string }[] }[] }} input Document content.
 * @returns {string} llms.txt Markdown.
 * @example
 * ```js
 * renderLlmsTxt({ title: 'napplet', summary: 'Apps that travel.', sections: [] });
 * ```
 */
export function renderLlmsTxt({ title, summary, notes, sections }) {
  const parts = [`# ${title}`, `> ${summary}`];
  if (notes) parts.push(notes.trim());
  for (const section of sections) {
    if (!section.links.length) continue;
    const links = section.links.map((link) => `- [${link.title}](${link.url})${link.description ? `: ${link.description}` : ''}`);
    parts.push(`## ${section.name}\n\n${links.join('\n')}`);
  }
  return `${parts.join('\n\n')}\n`;
}

/**
 * Parse the H2 link sections back out of an llms.txt document.
 * @param {string} text llms.txt Markdown.
 * @returns {{ name: string, links: { title: string, url: string, description?: string }[] }[]} Sections in document order.
 * @example
 * ```js
 * parseLlmsSections('## Guide\n\n- [Intro](https://x/intro.md): Start here\n');
 * ```
 */
export function parseLlmsSections(text) {
  const sections = [];
  for (const line of text.split('\n')) {
    const heading = line.match(/^## (.+)$/);
    if (heading) { sections.push({ name: heading[1].trim(), links: [] }); continue; }
    const link = line.match(/^- \[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/);
    if (link && sections.length) sections.at(-1).links.push({ title: link[1], url: link[2], ...(link[3] ? { description: link[3] } : {}) });
  }
  return sections;
}

// ─── Agent Skills discovery ─────────────────────────────────────────────────

/**
 * Compute an Agent Skills discovery digest over exact artifact bytes.
 * @param {Uint8Array} bytes Served artifact bytes.
 * @returns {string} `sha256:` followed by 64 lowercase hex characters.
 * @example
 * ```js
 * sha256Digest(new TextEncoder().encode('x'));
 * ```
 */
export function sha256Digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function tarHeader(name, size) {
  const header = Buffer.alloc(512);
  const field = (value, offset, length) => header.write(value, offset, length, 'utf8');
  const octal = (value, offset, length) => field(`${value.toString(8).padStart(length - 1, '0')}\0`, offset, length);
  if (Buffer.byteLength(name) > 100) throw new Error(`Archive path too long for ustar: ${name}`);
  field(name, 0, 100);
  octal(0o644, 100, 8);
  octal(0, 108, 8);
  octal(0, 116, 8);
  octal(size, 124, 12);
  octal(0, 136, 12);
  header.fill(' ', 148, 156);
  field('0', 156, 1);
  field('ustar\0', 257, 6);
  field('00', 263, 2);
  let sum = 0;
  for (const byte of header) sum += byte;
  field(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8);
  return header;
}

/**
 * Pack files into a reproducible `.tar.gz`: sorted paths at the archive root, zero mtimes and owners, fixed modes.
 * @param {{ path: string, bytes: Uint8Array }[]} files Archive-relative POSIX paths and contents.
 * @returns {Buffer} Gzip-compressed ustar archive.
 * @example
 * ```js
 * tarGz([{ path: 'SKILL.md', bytes: Buffer.from('# Skill\n') }]);
 * ```
 */
export function tarGz(files) {
  const blocks = [];
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    if (file.path.startsWith('/') || file.path.split('/').includes('..')) throw new Error(`Unsafe archive path: ${file.path}`);
    const bytes = Buffer.from(file.bytes);
    blocks.push(tarHeader(file.path, bytes.length), bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks), { level: 9 });
}

/**
 * Read `name` and `description` from SKILL.md YAML frontmatter (single-line or quoted scalars).
 * @param {string} text SKILL.md contents.
 * @returns {{ name: string, description: string }} Frontmatter fields.
 * @example
 * ```js
 * skillFrontmatter('---\nname: a\ndescription: b\n---\n'); // { name: 'a', description: 'b' }
 * ```
 */
export function skillFrontmatter(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const read = (key) => {
    const raw = block.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
    return raw.replace(/^(['"])(.*)\1$/, '$2');
  };
  return { name: read('name'), description: read('description') };
}

/**
 * Plan the Agent Skills discovery artifacts for a set of skills.
 * @param {{ dir: string, files: { path: string, bytes: Uint8Array }[] }[]} skills Each skill directory name and its files (POSIX paths relative to the skill directory).
 * @returns {{ index: object, artifacts: { path: string, bytes: Uint8Array }[] }} The index document and the files to serve, with paths relative to the site root.
 * @example
 * ```js
 * buildSkillsDiscovery([{ dir: 'demo', files: [{ path: 'SKILL.md', bytes: Buffer.from('---\nname: demo\ndescription: d\n---\n') }] }]);
 * ```
 */
export function buildSkillsDiscovery(skills) {
  const artifacts = [];
  const entries = [];
  for (const skill of [...skills].sort((a, b) => a.dir.localeCompare(b.dir))) {
    const skillMd = skill.files.find((file) => file.path === 'SKILL.md');
    if (!skillMd) throw new Error(`Skill ${skill.dir} has no SKILL.md`);
    const { name, description } = skillFrontmatter(Buffer.from(skillMd.bytes).toString('utf8'));
    if (name !== skill.dir || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) throw new Error(`Skill ${skill.dir} has an invalid name: ${name}`);
    if (!description || description.length > 1024) throw new Error(`Skill ${name} needs a description of 1 to 1024 characters`);
    const single = skill.files.length === 1;
    const path = single ? `.well-known/agent-skills/${name}/SKILL.md` : `.well-known/agent-skills/${name}.tar.gz`;
    const bytes = single ? skillMd.bytes : tarGz(skill.files);
    artifacts.push({ path, bytes });
    entries.push({ name, type: single ? 'skill-md' : 'archive', description, url: `/${path}`, digest: sha256Digest(bytes) });
  }
  return { index: { $schema: SKILLS_SCHEMA, skills: entries }, artifacts };
}
