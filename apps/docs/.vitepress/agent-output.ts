// Agent-readable docs output: per-page Markdown copies, llms.txt and llms-full.txt written after the VitePress build.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { HeadConfig, PageData, SiteConfig } from 'vitepress';
import { docsPageMarkdown, renderLlmsTxt, SITE_URL } from '../../../scripts/lib/agent-markdown.mjs';
import { renderNapMaturityMarkdown } from '../../../scripts/lib/nap-maturity-docs';

interface SidebarItem { text: string; link?: string; items?: SidebarItem[] }
interface SidebarGroup { text: string; items: SidebarItem[] }
interface DocsPage { relativePath: string; title: string; markdown: string }

const pages = new Map<string, PageData>();

/** Remember rendered page data so `buildEnd` can use parsed frontmatter and titles. */
export function collectPage(pageData: PageData): void {
  pages.set(pageData.relativePath, pageData);
}

/** `<link rel="alternate" type="text/markdown">` for every docs page except the 404 page. */
export function markdownAlternate(pageData: PageData): HeadConfig[] {
  if (pageData.isNotFound || pageData.relativePath === '404.md') return [];
  return [['link', { rel: 'alternate', type: 'text/markdown', href: `/docs/${pageData.relativePath}` }]];
}

function summaryOf(markdown: string): string | undefined {
  // A lead blockquote counts; admonitions converted from `:::` containers start with a bold label and do not.
  const blocks = markdown.split(/\n{2,}/).map((block) => block.trim());
  const lead = blocks.find((block) => /^[A-Za-z*`[]/.test(block) || (block.startsWith('> ') && !block.startsWith('> **')));
  if (!lead) return undefined;
  const paragraph = lead.replace(/^> ?/gm, '');
  const text = paragraph.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
  const sentence = text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;
  return sentence.length > 200 ? `${sentence.slice(0, 197)}…` : sentence;
}

function sourcePathFor(link: string): string {
  const clean = link.replace(/^\//, '').replace(/\.html$/, '');
  return clean === '' || clean.endsWith('/') ? `${clean}index.md` : `${clean}.md`;
}

const linksOf = (items: SidebarItem[]): string[] => items.flatMap((item) => [...(item.link ? [item.link] : []), ...linksOf(item.items ?? [])]);

function sectionsFor(docs: DocsPage[], sidebar: SidebarGroup[]) {
  const byPath = new Map(docs.map((page) => [page.relativePath, page]));
  const used = new Set<string>();
  const link = (page: DocsPage) => ({ title: page.title, url: `${SITE_URL}/docs/${page.relativePath}`, description: summaryOf(page.markdown) });
  const sections = [{ name: 'Overview', links: byPath.has('index.md') ? [link(byPath.get('index.md')!)] : [] }];
  used.add('index.md');
  for (const group of sidebar) {
    const links = [];
    for (const target of linksOf(group.items)) {
      const page = byPath.get(sourcePathFor(target));
      if (page && !used.has(page.relativePath)) { used.add(page.relativePath); links.push(link(page)); }
    }
    sections.push({ name: group.text, links });
  }
  for (const page of docs) {
    if (used.has(page.relativePath)) continue;
    const dir = page.relativePath.split('/')[0];
    const home = sidebar.findIndex((group) => linksOf(group.items).some((target) => sourcePathFor(target).startsWith(`${dir}/`)));
    (sections[home + 1] ?? sections[0]).links.push(link(page));
  }
  return sections;
}

/**
 * Write `.md` copies next to each built page, then `llms.txt` and `llms-full.txt` at the docs root.
 * @param siteConfig Resolved VitePress site config from `buildEnd`.
 * @param sidebar Sidebar groups, used to order llms.txt sections.
 */
export async function writeAgentOutput(siteConfig: SiteConfig, sidebar: SidebarGroup[]): Promise<void> {
  const docs: DocsPage[] = [];
  for (const relativePath of [...siteConfig.pages].sort()) {
    if (relativePath === '404.md') continue;
    const source = renderNapMaturityMarkdown(await readFile(path.join(siteConfig.srcDir, relativePath), 'utf8'), relativePath);
    const data = pages.get(relativePath);
    const markdown = docsPageMarkdown({ relativePath, source, frontmatter: data?.frontmatter ?? {} });
    const target = path.join(siteConfig.outDir, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, markdown);
    const heading = markdown.match(/^# (.+)$/m)?.[1];
    docs.push({ relativePath, title: data?.title || heading || relativePath, markdown });
  }
  const summary = siteConfig.site.description;
  const notes = `Markdown copies of every docs page. Each page is also served as HTML at the same path with \`.html\`. These docs are non-normative: NIP-5D (https://github.com/nostr-protocol/nips/pull/2303) and the NAPs (https://github.com/napplet/naps) are the canonical protocol sources.`;
  await writeFile(path.join(siteConfig.outDir, 'llms.txt'), renderLlmsTxt({ title: 'napplet docs', summary, notes, sections: sectionsFor(docs, sidebar) }));
  const full = docs.map((page) => `<!-- ${SITE_URL}/docs/${page.relativePath} -->\n\n${page.markdown}`).join('\n---\n\n');
  await writeFile(path.join(siteConfig.outDir, 'llms-full.txt'), `# napplet docs\n\n> ${summary}\n\n${full}`);
}
