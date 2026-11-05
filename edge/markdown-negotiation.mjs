// Accept: text/markdown negotiation for napplet.run, shared by the Bunny middleware and its tests (web Request/Response only).
import { markdownPathFor } from '../scripts/lib/markdown-paths.mjs';

const MARKDOWN = 'text/markdown; charset=utf-8';
// Paths without build-time Markdown copies: the conformance runtime and well-known documents (including ACME).
const NO_COPY = [/^\/conformance(\/|$)/, /^\/\.well-known\//];

/**
 * Decide whether an Accept header asks for Markdown (`text/markdown` with a non-zero quality).
 * @param {string | null} accept Request `Accept` header.
 * @returns {boolean} True when Markdown is acceptable.
 * @example
 * ```js
 * acceptsMarkdown('text/markdown, text/html;q=0.9'); // true
 * ```
 */
export function acceptsMarkdown(accept) {
  if (!accept) return false;
  return accept.split(',').some((range) => {
    const [type, ...params] = range.trim().toLowerCase().split(';').map((part) => part.trim());
    if (type !== 'text/markdown') return false;
    const q = params.find((param) => param.startsWith('q='));
    return !q || Number(q.slice(2)) > 0;
  });
}

/**
 * Find the Markdown copy for a page path, or null when the path is not an HTML page with a copy.
 * @param {string} pathname Request path.
 * @returns {string | null} Markdown path such as `/explainer/index.md`.
 * @example
 * ```js
 * markdownTarget('/docs/spec.html'); // '/docs/spec.md'
 * ```
 */
export function markdownTarget(pathname) {
  if (NO_COPY.some((pattern) => pattern.test(pathname))) return null;
  const last = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (last.includes('.') && !/\.(html|md)$/.test(last)) return null;
  return markdownPathFor(pathname);
}

function appendVary(headers) {
  const vary = headers.get('vary');
  if (!vary) headers.set('vary', 'Accept');
  else if (!vary.split(',').some((value) => value.trim().toLowerCase() === 'accept')) headers.set('vary', `${vary}, Accept`);
}

/**
 * Before the cache lookup, send a Markdown-preferring GET/HEAD for a page to its `.md` copy, so the CDN caches the two
 * representations under different URLs.
 * @param {Request} request Incoming client request.
 * @returns {Request} The rewritten request, or the original one unchanged.
 * @example
 * ```js
 * rewriteRequest(new Request('https://napplet.run/', { headers: { accept: 'text/markdown' } })).url; // 'https://napplet.run/index.md'
 * ```
 */
export function rewriteRequest(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return request;
  if (!acceptsMarkdown(request.headers.get('accept'))) return request;
  const url = new URL(request.url);
  const target = markdownTarget(url.pathname);
  if (!target || target === url.pathname) return request;
  url.pathname = target;
  return new Request(url, request);
}

/**
 * Label Markdown responses and advertise the Markdown copy on HTML responses (`Vary: Accept` on both).
 * @param {Request} request The client request (original or rewritten).
 * @param {Response} response The response about to be sent.
 * @returns {Response} The response with adjusted headers; other responses pass through unchanged.
 * @example
 * ```js
 * decorateResponse(new Request('https://napplet.run/'), new Response('<p>', { headers: { 'content-type': 'text/html' } }));
 * ```
 */
export function decorateResponse(request, response) {
  const url = new URL(request.url);
  const target = markdownTarget(url.pathname);
  if (!target) return response;
  const type = response.headers.get('content-type') ?? '';
  const isCopy = url.pathname.endsWith('.md') || (acceptsMarkdown(request.headers.get('accept')) && !type.includes('text/html'));
  if (!isCopy && !type.includes('text/html')) return response;
  const headers = new Headers(response.headers);
  appendVary(headers);
  if (isCopy && response.ok) headers.set('content-type', MARKDOWN);
  if (!isCopy) headers.append('link', `<${target}>; rel="alternate"; type="text/markdown"`);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
