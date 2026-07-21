/**
 * @napplet/vite-plugin — HTML scanning and single-file artifact inlining.
 *
 * The `single-file` artifact pipeline inlines local JS/CSS references into
 * `index.html`, deletes the consumed assets, and asserts the HTML is the only
 * served artifact left in dist/.
 *
 * Inline `<script>` elements are deliberately NOT rejected. Per NIP-5D a
 * napplet is a single self-contained `/index.html` loaded via `iframe.srcdoc`
 * with `sandbox="allow-scripts"` and no `allow-same-origin` (an opaque origin),
 * so its executable JS lives inline — there is no served origin from which to
 * fetch an external `<script src>`. See the canonical NIP-5D text for the
 * loading model; this comment is non-normative.
 */

import type { UserConfig } from 'vite';
import * as fs from 'fs';
import * as path from 'path';
import { walkDir } from './hashing.js';

function getAttr(attrs: string, name: string): string | null {
  const attrRe = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = attrRe.exec(attrs);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '').trim() : null;
}

/** Escape a value for HTML element-text context (`&`, `<`, `>`). */
function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape a value for a double-quoted HTML attribute context (`&`, `"`). */
function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Insert `snippet` right after the opening `<head>` tag, or prepend it. */
function insertIntoHead(html: string, snippet: string): string {
  const headRe = /<head\b[^>]*>/i;
  if (headRe.test(html)) return html.replace(headRe, (open) => `${open}${snippet}`);
  return `${snippet}${html}`;
}

function setHtmlTitle(html: string, title: string): string {
  const escaped = escapeHtmlText(title);
  // Replace the inner text of the FIRST <title>…</title> (attributes preserved).
  const titleRe = /(<title\b[^>]*>)[\s\S]*?(<\/title>)/i;
  if (titleRe.test(html)) return html.replace(titleRe, (_m, open, close) => `${open}${escaped}${close}`);
  return insertIntoHead(html, `<title>${escaped}</title>`);
}

function setContentAttr(tag: string, escapedValue: string): string {
  const contentRe = /(\bcontent\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s>]+)/i;
  if (contentRe.test(tag)) return tag.replace(contentRe, `$1"${escapedValue}"`);
  return tag.replace(/\s*\/?>$/, ` content="${escapedValue}">`);
}

function setHtmlDescription(html: string, description: string): string {
  const escaped = escapeHtmlAttr(description);
  let replaced = false;
  const result = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (replaced) return tag;
    const name = getAttr(tag, 'name');
    if (name?.toLowerCase() !== 'description') return tag;
    replaced = true;
    return setContentAttr(tag, escaped);
  });
  if (replaced) return result;
  return insertIntoHead(html, `<meta name="description" content="${escaped}">`);
}

/**
 * Set/override the built HTML `<title>` and/or `<meta name="description">` from
 * the plugin's `title` / `description` options.
 *
 * OVERRIDE-when-set / untouched-when-absent: an option that is `undefined`
 * leaves the corresponding author HTML unmodified. When BOTH are absent the
 * input html is returned unchanged. Injected values are HTML-escaped for their
 * context (title → element text; description → double-quoted attribute) so a
 * value containing a quote or angle bracket cannot break out of the tag.
 *
 * These are PLAIN HTML elements, NOT `napplet-*` protocol meta tags. The napplet
 * CLI reads them back out of the built index.html to emit NIP-5A
 * `["title", …]` / `["description", …]` manifest tags at deploy time.
 *
 * @param html - the source index.html string.
 * @param options - `title` and/or `description` values to inject.
 * @returns the modified html (or the input unchanged when both options absent).
 * @example
 * applyHtmlMetadata('<head><title>Old</title></head>', { title: 'My Napp' });
 * // → '<head><title>My Napp</title></head>'
 */
export function applyHtmlMetadata(
  html: string,
  options: { title?: string; description?: string },
): string {
  let result = html;
  if (options.title !== undefined) result = setHtmlTitle(result, options.title);
  if (options.description !== undefined) result = setHtmlDescription(result, options.description);
  return result;
}

function stripAttrs(attrs: string, names: string[]): string {
  let cleaned = attrs;
  for (const name of names) {
    const attrRe = new RegExp(
      `\\s*\\b${name}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`,
      'gi',
    );
    cleaned = cleaned.replace(attrRe, '');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function hasRel(attrs: string, value: string): boolean {
  const rel = getAttr(attrs, 'rel');
  return rel?.split(/\s+/).some((token) => token.toLowerCase() === value) ?? false;
}

function isLocalAssetReference(reference: string): boolean {
  if (reference.length === 0) return false;
  if (reference.startsWith('#') || reference.startsWith('//')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) return false;
  return true;
}

function normalizeViteBase(base: string): string {
  if (base === '' || base === './') return '';
  if (!base.startsWith('/')) return base;
  return base.endsWith('/') ? base : `${base}/`;
}

function stripViteBase(reference: string, base: string): string {
  if (!reference.startsWith('/')) return reference.replace(/^\.\//, '');

  const rootRelative = reference.slice(1);
  const normalizedBase = normalizeViteBase(base);
  if (!normalizedBase.startsWith('/')) return rootRelative;

  const basePath = normalizedBase.slice(1);
  if (basePath.length > 0 && rootRelative.startsWith(basePath)) {
    return rootRelative.slice(basePath.length);
  }
  return rootRelative;
}

function resolveDistAsset(distPath: string, reference: string, base: string): string {
  const cleanReference = reference.split(/[?#]/, 1)[0];
  const relative = stripViteBase(cleanReference, base);
  const normalized = path.normalize(relative);
  if (
    normalized === '..' ||
    normalized.startsWith(`..${path.sep}`) ||
    path.isAbsolute(normalized)
  ) {
    throw new Error(
      `[nip5a-manifest] single-file artifact mode cannot inline asset outside dist/: ${reference}`,
    );
  }
  return path.join(distPath, normalized);
}

function escapeInlineScriptContent(source: string): string {
  return source.replace(/<\/script/gi, '<\\/script');
}

function removeEmptyParentDirs(filePath: string, stopDir: string): void {
  let current = path.dirname(filePath);
  const root = path.resolve(stopDir);
  while (current.startsWith(root) && current !== root) {
    try {
      if (fs.readdirSync(current).length > 0) return;
      fs.rmdirSync(current);
      current = path.dirname(current);
    } catch {
      return;
    }
  }
}

function listSingleFileArtifactViolations(html: string, distPath: string): string[] {
  const violations: string[] = [];

  html.replace(/<link\b([^>]*?)>/gi, (tag, attrs: string) => {
    const href = getAttr(attrs, 'href');
    if (
      href &&
      isLocalAssetReference(href) &&
      (hasRel(attrs, 'stylesheet') || hasRel(attrs, 'modulepreload'))
    ) {
      violations.push(tag);
    }
    return tag;
  });

  html.replace(/<script\b([^>]*?)>/gi, (tag, attrs: string) => {
    const src = getAttr(attrs, 'src');
    if (src && isLocalAssetReference(src)) {
      violations.push(tag);
    }
    return tag;
  });

  for (const relativePath of walkDir(distPath)) {
    if (relativePath === 'index.html' || relativePath === '.nip5a-manifest.json') {
      continue;
    }
    violations.push(relativePath);
  }

  return violations;
}

function assertSingleFileArtifact(html: string, distPath: string): void {
  const violations = listSingleFileArtifactViolations(html, distPath);
  if (violations.length === 0) return;

  const list = violations.map((violation) => `  - ${violation}`).join('\n');
  throw new Error(
    `[nip5a-manifest] single-file artifact mode expected dist/index.html to be the only served artifact, but local external assets remain:\n${list}\nSet artifactMode only on single-entry builds, inline static assets, or remove code splitting before building.`,
  );
}

export function inlineSingleFileBuildAssets(html: string, distPath: string, base: string): string {
  const inlinedFiles = new Set<string>();

  const withStyles = html.replace(/<link\b([^>]*?)>/gi, (tag, attrs: string) => {
    if (!hasRel(attrs, 'stylesheet')) {
      return tag;
    }
    const href = getAttr(attrs, 'href');
    if (!href || !isLocalAssetReference(href)) return tag;

    const assetPath = resolveDistAsset(distPath, href, base);
    if (!fs.existsSync(assetPath)) {
      throw new Error(
        `[nip5a-manifest] single-file artifact mode could not find stylesheet asset: ${href}`,
      );
    }
    inlinedFiles.add(assetPath);
    return `<style>${fs.readFileSync(assetPath, 'utf-8')}</style>`;
  });

  const withScripts = withStyles.replace(
    /<script\b([^>]*)\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>\s*<\/script>/gi,
    (tag, before: string, srcDouble: string, srcSingle: string, srcBare: string, after: string) => {
      const src = (srcDouble ?? srcSingle ?? srcBare ?? '').trim();
      if (!isLocalAssetReference(src)) return tag;

      const assetPath = resolveDistAsset(distPath, src, base);
      if (!fs.existsSync(assetPath)) {
        throw new Error(
          `[nip5a-manifest] single-file artifact mode could not find script asset: ${src}`,
        );
      }
      inlinedFiles.add(assetPath);

      const attrs = stripAttrs(`${before}${after}`, [
        'src',
        'crossorigin',
        'integrity',
        'async',
        'defer',
      ]);
      const attrText = attrs.length > 0 ? ` ${attrs}` : '';
      const script = escapeInlineScriptContent(fs.readFileSync(assetPath, 'utf-8'));
      return `<script${attrText}>${script}</script>`;
    },
  );

  for (const filePath of inlinedFiles) {
    fs.rmSync(filePath, { force: true });
    removeEmptyParentDirs(filePath, distPath);
  }

  assertSingleFileArtifact(withScripts, distPath);

  return withScripts;
}

export function singleFileBuildConfig(config: UserConfig): UserConfig {
  const output = config.build?.rollupOptions?.output;
  const inlineOutput = (entry: unknown): Record<string, unknown> => ({
    ...(typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {}),
    inlineDynamicImports: true,
  });

  return {
    build: {
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
      rollupOptions: {
        output: Array.isArray(output)
          ? output.map((entry) => inlineOutput(entry))
          : inlineOutput(output),
      },
    },
  };
}
