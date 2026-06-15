/**
 * @napplet/vite-plugin — HTML scanning and single-file artifact inlining.
 *
 * Two concerns live here: the inline-`<script>` guard enforced in the default
 * `external-assets` mode, and the `single-file` artifact pipeline that inlines
 * local JS/CSS into `index.html`, deletes the consumed assets, and asserts the
 * HTML is the only served artifact left in dist/.
 */

import type { UserConfig } from 'vite';
import * as fs from 'fs';
import * as path from 'path';
import { walkDir } from './hashing.js';

/**
 * Scan production HTML for forbidden inline `<script>` elements.
 *
 * Under the v0.29.0 shell-as-CSP-authority model, shells emit
 * `script-src 'self'` which blocks inline scripts at runtime. We fail the
 * build here so authors discover the violation at `pnpm build` rather than
 * as a silent runtime CSP block. (Locked decision Q4 — hard error.)
 *
 * Allow-list (accepted as NOT inline):
 *   - `<script src="...">` with any non-empty `src` (externally-loaded)
 *   - `<script type="application/json">...</script>` (non-executing data)
 *   - `<script type="application/ld+json">...</script>` (non-executing JSON-LD)
 *   - `<script type="importmap">...</script>` (browser-recognized, non-executing-JS)
 *   - `<script type="speculationrules">...</script>` (browser-recognized, non-executing-JS)
 *   - Content inside HTML comments — stripped before scanning
 *
 * Rejected (throws):
 *   - `<script>inline content</script>`
 *   - `<script src="">...</script>` (empty src = inline fallback per W3C)
 *   - `<script type="module">inline</script>`
 *   - `<script type="text/javascript">inline</script>`
 *
 * @param html - Contents of `dist/index.html` to scan.
 * @throws Error with `[nip5a-manifest]` prefix listing every offending tag.
 */
export function assertNoInlineScripts(html: string): void {
  // Strip HTML comments (non-greedy, multi-line) so commented-out scripts
  // don't produce false positives.
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '');

  // Find every <script ...> opening tag. Attribute section may contain
  // whitespace and newlines; [\s\S]*? handles both, non-greedy halts at
  // the first >.
  const scriptTagRe = /<script\b([\s\S]*?)>/gi;
  const offenders: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = scriptTagRe.exec(stripped)) !== null) {
    const attrsBlob = m[1];

    // src="..." with at least one non-whitespace char — valid external load.
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrsBlob);
    if (srcMatch) {
      const srcValue = (srcMatch[1] ?? srcMatch[2] ?? '').trim();
      if (srcValue.length > 0) continue;
      // src="" — treat as inline (empty src executes inline fallback per W3C).
      const tag = m[0].length > 80 ? m[0].slice(0, 80) + '...' : m[0];
      offenders.push(`${tag}  (empty src attribute)`);
      continue;
    }

    // No src — check type= for allow-listed non-executing values.
    const typeMatch = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrsBlob);
    if (typeMatch) {
      const typeValue = (typeMatch[1] ?? typeMatch[2] ?? '').trim().toLowerCase();
      const NON_EXECUTING_TYPES = new Set([
        'application/json',
        'application/ld+json',
        'importmap',
        'speculationrules',
      ]);
      if (NON_EXECUTING_TYPES.has(typeValue)) continue;
    }

    const tag = m[0].length > 80 ? m[0].slice(0, 80) + '...' : m[0];
    offenders.push(`${tag}  (inline <script> without src)`);
  }

  if (offenders.length > 0) {
    const list = offenders.map((o) => `  - ${o}`).join('\n');
    throw new Error(
      `[nip5a-manifest] Inline <script> elements are not allowed in napplet HTML under the v0.29.0 shell-as-CSP-authority model. The shell emits \`script-src 'self'\` which blocks inline scripts at runtime. Move inline JS to a file and reference it via \`<script src="..."></script>\`. Offending elements (${offenders.length}):\n${list}`,
    );
  }
}

function getAttr(attrs: string, name: string): string | null {
  const attrRe = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = attrRe.exec(attrs);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '').trim() : null;
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
