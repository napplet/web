import { Marked, TextRenderer } from 'marked';
import sanitizeHtml from 'sanitize-html';
import GithubSlugger from 'github-slugger';
import { decodeHTML } from 'entities';

interface SpecHeading { id: string; text: string; depth: number; }

/**
 * Render the complete upstream document as inert HTML at build time.
 * @param markdown - Unmodified upstream Markdown.
 * @param documentUrl - GitHub document URL pinned to the fetched revision.
 * @returns Sanitized HTML and a linked heading outline.
 * @example renderSpec('# NAP-IDENTITY', 'https://github.com/napplet/naps/blob/abc/naps/NAP-IDENTITY.md')
 */
export function renderSpec(markdown: string, documentUrl: string) {
  const headings: SpecHeading[] = [];
  const slugger = new GithubSlugger();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = decodeHTML(sanitizeHtml(this.parser.parseInline(tokens, new TextRenderer()), { allowedTags: [], allowedAttributes: {} }));
        const id = slugger.slug(text);
        headings.push({ id: `spec-${id}`, text, depth });
        const level = Math.min(depth + 1, 6);
        return `<h${level} id="${id}">${this.parser.parseInline(tokens)}</h${level}>\n`;
      },
    },
  });
  const rawUrl = documentUrl.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/');
  function resolve(value: string, image = false) {
    if (value.startsWith('#') && !image) return `#spec-${value.slice(1)}`;
    return new URL(value, image ? rawUrl : documentUrl).href;
  }
  const html = sanitizeHtml(marked.parse(markdown, { async: false }), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'details', 'summary', 'input'],
    allowedAttributes: {
      '*': ['id'], a: ['href', 'title'], img: ['src', 'alt', 'title'],
      code: ['class'], th: ['align', 'colspan', 'rowspan'], td: ['align', 'colspan', 'rowspan'],
      ol: ['start'], input: ['type', 'checked', 'disabled'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      '*': (tagName, attributes) => {
        const attribs = { ...attributes };
        if (attribs.id) attribs.id = `spec-${attribs.id}`;
        if (tagName === 'input') { attribs.type = 'checkbox'; attribs.disabled = ''; }
        const key = tagName === 'a' ? 'href' : tagName === 'img' ? 'src' : null;
        if (key && attribs[key]) {
          try { attribs[key] = resolve(attribs[key], tagName === 'img'); }
          catch { delete attribs[key]; }
        }
        return { tagName: tagName === 'h1' ? 'h2' : tagName, attribs };
      },
    },
  });
  return { html, headings };
}
