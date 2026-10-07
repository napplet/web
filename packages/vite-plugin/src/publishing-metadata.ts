/** Build-time head metadata. Mapping authority: NIP-5D §HTML Metadata for Publishing. */
import { parse, type DefaultTreeAdapterMap } from 'parse5';

type Element = DefaultTreeAdapterMap['element'];
const names: Record<string, string> = {
  description: 'description', 'napplet-id': 'd', 'napplet-archetype': 'z',
  'napplet-intent': 'i', 'napplet-requires': 'R', 'napplet-optional': 'O',
  'napplet-source': 'source', 'napplet-server': 'server',
  'napplet-parent': 'a', 'napplet-root': 'A',
};
const words = (value: string): string[] => value.split(/[\t\n\f\r ]+/).filter(Boolean);
const attr = (node: Element, name: string): string | undefined => node.attrs.find((a) => a.name === name)?.value;

function headNodes(html: string): { head: Element; root: Element; document: DefaultTreeAdapterMap['document'] } {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const root = document.childNodes.find((n): n is Element => 'tagName' in n && n.tagName === 'html')!;
  const head = root.childNodes.find((n): n is Element => 'tagName' in n && n.tagName === 'head')!;
  return { head, root, document };
}

function key(node: Element): string | undefined {
  if (node.tagName === 'title') return 'title';
  if (node.tagName === 'meta') return names[attr(node, 'name')?.toLowerCase() ?? ''];
  if (node.tagName === 'link' && words(attr(node, 'rel')?.toLowerCase() ?? '').includes('icon')) return 'icon';
  return undefined;
}

export function readPublishingMetadata(html: string): { tags: string[][]; icons: Array<{ href: string; type?: string }> } {
  const { head } = headNodes(html);
  const tags: string[][] = [];
  const icons: Array<{ href: string; type?: string }> = [];
  for (const node of head.childNodes) {
    if (!('tagName' in node)) continue;
    const name = key(node);
    if (!name) continue;
    if (name === 'icon') {
      icons.push({ href: attr(node, 'href') ?? '', type: attr(node, 'type') });
      continue;
    }
    const value = name === 'title'
      ? node.childNodes.map((n) => 'value' in n ? n.value : '').join('')
      : attr(node, 'content') ?? '';
    if (!value.trim()) continue;
    if (name === 'R' || name === 'O') tags.push(...words(value).map((domain) => [name, domain]));
    else tags.push(name === 'i' ? [name, ...words(value)] : [name, value]);
  }
  // First singleton wins in author HTML; explicit plugin options override it later.
  const singletons = new Set(['title', 'description', 'd', 'source', 'a', 'A']);
  return { tags: tags.filter((tag, i) => !singletons.has(tag[0]) || tags.findIndex((t) => t[0] === tag[0]) === i), icons };
}

function escape(value: string, attribute = true): string {
  const text = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;');
  return attribute ? text.replace(/"/g, '&quot;') : text;
}

/** Replace only owned head elements, retaining all other original source bytes. */
export function replaceHeadMetadata(html: string, snippet: string, owned?: Set<string>): string {
  const { head, root, document } = headNodes(html);
  const removals = head.childNodes.flatMap((node) => {
    if (!('tagName' in node) || !node.sourceCodeLocation) return [];
    const name = key(node);
    return name && (!owned || owned.has(name)) ? [{ ...node.sourceCodeLocation, replacement: '' }] : [];
  });
  const headLocation = head.sourceCodeLocation;
  const childLocations = head.childNodes.flatMap((node) => node.sourceCodeLocation ? [node.sourceCodeLocation] : []);
  const start = headLocation?.startTag?.endOffset ?? childLocations[0]?.startOffset ??
    root.sourceCodeLocation?.startTag?.endOffset ?? document.childNodes.find((n) => n.nodeName === '#documentType')?.sourceCodeLocation?.endOffset ?? 0;
  const end = headLocation?.endOffset ?? childLocations.at(-1)?.endOffset ?? start;
  // Keep an existing encoding declaration early, even when the icon data URL is large.
  const charset = head.childNodes.find((node): node is Element => 'tagName' in node && node.tagName === 'meta' &&
    (attr(node, 'charset') !== undefined || attr(node, 'http-equiv')?.toLowerCase() === 'content-type'));
  const insertion = charset?.sourceCodeLocation?.endOffset ?? start;
  const edits = [...removals, { startOffset: insertion, endOffset: insertion, replacement: snippet }];
  let inside = html.slice(start, end);
  for (const edit of edits.sort((a, b) => b.startOffset - a.startOffset || b.endOffset - a.endOffset)) {
    inside = inside.slice(0, edit.startOffset - start) + edit.replacement + inside.slice(edit.endOffset - start);
  }
  return html.slice(0, start) + (headLocation ? inside : `<head>${inside}</head>`) + html.slice(end);
}

export function renderPublishingMetadata(tags: string[][], description: string, icon?: { url: string; mimeType: string }): string {
  const meta = (name: string, value: string): string => `<meta name="${name}" content="${escape(value)}">`;
  const title = tags.find((t) => t[0] === 'title')?.[1];
  let html = (title === undefined ? '' : `<title>${escape(title, false)}</title>`) + meta('description', description);
  const byTag = Object.fromEntries(Object.entries(names).map(([name, tag]) => [tag, name]));
  for (const tag of tags) {
    if (['d', 'z', 'i', 'source', 'server'].includes(tag[0])) html += meta(byTag[tag[0]], tag.slice(1).join(' '));
  }
  for (const name of ['R', 'O']) {
    const domains = tags.filter((t) => t[0] === name).map((t) => t[1]);
    if (domains.length) html += meta(byTag[name], domains.join(' '));
  }
  if (icon) html += `<link rel="icon" href="${escape(icon.url)}" type="${escape(icon.mimeType)}">`;
  return html;
}

export function replaceDisplayMetadata(html: string, options: { title?: string; description?: string }): string {
  const owned = new Set<string>();
  let snippet = '';
  if (options.title !== undefined) { owned.add('title'); snippet += `<title>${escape(options.title, false)}</title>`; }
  if (options.description !== undefined) { owned.add('description'); snippet += `<meta name="description" content="${escape(options.description)}">`; }
  return owned.size ? replaceHeadMetadata(html, snippet, owned) : html;
}
