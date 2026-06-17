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
