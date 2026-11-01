// Served-path to Markdown-copy mapping shared by the site build and the Bunny edge script; keep dependency-free.

/**
 * Map a served page path to the path of its Markdown copy.
 * @param {string} pathname Served path such as `/`, `/explainer/` or `/docs/guide/concepts.html`.
 * @returns {string} Markdown path such as `/index.md`, `/explainer/index.md` or `/docs/guide/concepts.md`.
 * @example
 * ```js
 * markdownPathFor('/docs/spec.html'); // '/docs/spec.md'
 * ```
 */
export function markdownPathFor(pathname) {
  if (pathname.endsWith('/')) return `${pathname}index.md`;
  if (pathname.endsWith('.html')) return pathname.replace(/\.html$/, '.md');
  if (pathname.endsWith('.md')) return pathname;
  return `${pathname}/index.md`;
}
