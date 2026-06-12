/**
 * @napplet/vite-plugin — NIP-5A manifest generation plugin for Vite.
 *
 * - transformIndexHtml: injects <meta name="napplet-aggregate-hash"> into HTML
 * - closeBundle (build only): walks dist/, computes per-file SHA-256 hashes,
 *   computes aggregate hash, signs a kind 35128 manifest event, writes it to
 *   dist/.nip5a-manifest.json, and updates the meta tag in dist/index.html.
 *
 * Config:
 *   VITE_DEV_PRIVKEY_HEX — hex-encoded 32-byte private key for signing manifests.
 *   If not set, manifest generation is skipped; explicit artifact rewrites
 *   still run so local build shape matches the requested contract.
 */

import type { Plugin, IndexHtmlTransformResult, UserConfig } from 'vite';
import type { NappletConfigSchema } from '@napplet/nap/config/types';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeConnectOrigin } from '@napplet/nap/connect/types';

/**
 * Synthetic xTag paths — folded into `aggregateHash` but excluded from the
 * `['x', ...]` tag projection on the signed manifest. Each entry is a pseudo
 * path in `<nap>:<kind>` format; the colon prevents collision with real
 * dist-relative file paths on all platforms.
 *
 * Exported for testability and as the single extension point: future synthetic
 * xTags (new NAPs folding bytes into aggregateHash) MUST add their pseudo-path
 * here rather than adding a sibling hardcoded filter. (Mitigates BUILD-P3 drift.)
 */
export const SYNTHETIC_XTAG_PATHS: ReadonlySet<string> = new Set([
  'config:schema',
  'connect:origins',
]);

/** Configuration options for the NIP-5A manifest plugin. */
export type Nip5aArtifactMode = 'external-assets' | 'single-file';

export interface Nip5aManifestOptions {
  /** Napplet type/dtag identifier (e.g., 'feed', 'chat'). Used as the NIP-5A 'd' tag and injected as napplet-type meta attribute. */
  nappletType: string;
  /** Service dependencies this napplet requires (e.g., ['audio', 'notifications']). Optional. */
  requires?: string[];
  /**
   * Artifact output contract for production builds.
   *
   * - `external-assets` (default): preserves Vite's normal HTML + JS/CSS asset
   *   graph and rejects inline executable scripts.
   * - `single-file`: rewrites local build JS/CSS references into `index.html`
   *   before aggregateHash/manifest generation, then accepts those
   *   build-produced inline scripts as the explicit NIP-5A gateway artifact.
   */
  artifactMode?: Nip5aArtifactMode;
  /**
   * Napplet config schema (NAP-CONFIG). Either an inline JSON Schema (draft-07+)
   * object describing the napplet's settings surface, or a string path (relative
   * to the Vite project root) pointing to a JSON file to load.
   *
   * When omitted, the plugin falls back to (in order):
   * 1. `config.schema.json` at the Vite project root (convention file).
   * 2. `napplet.config.ts` / `.js` / `.mjs` exporting a `configSchema` named export.
   *
   * If no schema is found via any of these paths, the plugin emits NO config
   * tag on the NIP-5A manifest and NO `<meta name="napplet-config-schema">` tag
   * in index.html — fully backward compatible with napplets that declare no
   * config surface.
   *
   * Schemas are structurally validated at build time against the NAP-CONFIG
   * Core Subset; root must be `{ type: "object" }`; external `$ref` is forbidden;
   * `pattern` is forbidden (CVE-2025-69873 class / ReDoS); `x-napplet-secret: true`
   * combined with `default` is forbidden. Violating schemas fail the build.
   *
   * @see NAP-CONFIG spec (napplet/naps#13)
   */
  configSchema?: NappletConfigSchema | string;

  /**
   * @deprecated v0.29.0 — the shell is now the sole CSP authority. This option has NO effect
   * and will be hard-removed in a future milestone (tracked as REMOVE-STRICTCSP). The plugin emits a
   * one-shot `console.warn` per build when this field is set so existing v0.28.0 consumers
   * discover the deprecation on upgrade without their `vite.config.ts` breaking.
   *
   * Typed as `unknown` to remain assignment-compatible with the removed
   * `boolean | object` shape — any prior value parses cleanly; no branch reads it.
   */
  strictCsp?: unknown;

  /**
   * Direct-network-access origins this napplet intends to reach from the sandbox
   * (NAP-CONNECT). Each entry is an **origin** — scheme + host + optional
   * non-default port — validated against the NAP-CONNECT Origin Format rules
   * and emitted as one `['connect', <origin>]` tag per origin on the signed
   * NIP-5A manifest.
   *
   * **Origin format rules** (delegated to the shared
   * {@link normalizeConnectOrigin} validator from `@napplet/nap/connect/types`):
   * - Scheme MUST be one of `https:` / `wss:` / `http:` / `ws:` (lowercase).
   * - Host MUST be lowercase. Wildcards (`*`) are not permitted.
   * - Default ports MUST be omitted (`:443` on `https:`/`wss:`, `:80` on `http:`/`ws:`).
   * - IDN hosts MUST be Punycode-encoded before emission (`xn--` form, lowercase).
   *   IPv4 literals are accepted; IPv6 literals are out of v1 scope.
   * - Path / query / fragment MUST NOT appear.
   *
   * **Build-time behaviors:**
   * 1. Each origin is normalized through the shared validator in `configResolved`;
   *    violations throw a `[nip5a-manifest]`-prefixed error that chains the
   *    nap's diagnostic so authors see exactly which origin failed and why.
   * 2. Normalized origins are folded into `aggregateHash` via the NAP-CONNECT
   *    canonical fold (lowercase → ASCII-ascending sort → LF-join → UTF-8 →
   *    SHA-256 → lowercase hex) and pushed as the synthetic xTag entry
   *    `[<hash>, 'connect:origins']`. Any origin-list change flips
   *    `aggregateHash`, which auto-invalidates shell grants keyed on
   *    `(dTag, aggregateHash)`.
   * 3. One `['connect', <normalized-origin>]` manifest tag is emitted per
   *    origin in author-declared order, placed between `['x', ...]` tags and
   *    `['config', ...]` tags on the signed event.
   * 4. Cleartext origins (`http:` / `ws:`) trigger an informational
   *    `console.warn` describing browser mixed-content rules. Non-blocking.
   * 5. When Vite is running in dev mode (`vite serve`), an optional
   *    `<meta name="napplet-connect-requires" content="...">` tag is injected
   *    for shell-less local preview. This `requires` name is **distinct**
   *    from the shell-authoritative `...-granted` meta defined in NAP-CONNECT
   *    §Runtime API — the plugin MUST NEVER emit the `granted` variant; the
   *    shell is the sole writer of that name.
   *
   * When omitted or empty, the plugin emits no `connect` tags, performs no
   * fold, and the napplet is treated as NAP-CLASS-1 (strict / no-user-declared-
   * origins) by conformant shells.
   *
   * @see NAP-CONNECT spec — napplet/naps#NAP-CONNECT
   */
  connect?: string[];
}

/** Walk a directory recursively and return all file paths (relative to root). */
function walkDir(dir: string, root?: string): string[] {
  root = root ?? dir;
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, root));
    } else {
      results.push(path.relative(root, fullPath));
    }
  }
  return results;
}

/** Compute SHA-256 hash of a file's contents. */
function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** Compute aggregate hash from [sha256hex, relativePath] pairs. */
function computeAggregateHash(xTags: Array<[string, string]>): string {
  const lines = xTags.map(([hash, p]) => `${hash} ${p}\n`);
  lines.sort();
  const concatenated = lines.join('');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}

/**
 * Three-path schema discovery. Returns the resolved schema + source name, or
 * null/null when no schema is declared anywhere.
 *
 * Precedence (each step is strict — later steps run only when the earlier
 * step yielded no schema):
 *   1. `options.configSchema` is an object -> use it directly (source: 'inline option').
 *   2. `options.configSchema` is a string -> resolve relative to `root`, read+parse as JSON (source: 'inline option: <path>').
 *   3. `config.schema.json` exists at `root` -> read+parse as JSON (source: 'config.schema.json').
 *   4. `napplet.config.ts` / `.js` / `.mjs` exists at `root` -> dynamic import, read `configSchema` named export (source: 'napplet.config.<ext>').
 *   5. None -> return { schema: null, source: null }.
 *
 * Parse / import / missing-export failures throw with an explanatory message.
 * The "file does not exist" case is NOT an error — it advances to the next path.
 *
 * @param options - Nip5aManifestOptions (reads `configSchema` only).
 * @param root - Absolute Vite project root (from `configResolved(config).root`).
 * @returns Object with resolved schema (or null) and source name (or null).
 * @throws Error with `[nip5a-manifest]` prefix when a present-but-unreadable
 *         path is encountered (JSON parse failure, import failure, missing export).
 */
async function discoverConfigSchema(
  options: Nip5aManifestOptions,
  root: string,
): Promise<{ schema: NappletConfigSchema | null; source: string | null }> {
  // Step 1 + 2: inline option
  if (options.configSchema !== undefined) {
    if (typeof options.configSchema === 'object') {
      return { schema: options.configSchema, source: 'inline option' };
    }
    if (typeof options.configSchema === 'string') {
      const p = path.isAbsolute(options.configSchema)
        ? options.configSchema
        : path.resolve(root, options.configSchema);
      if (!fs.existsSync(p)) {
        throw new Error(
          `[nip5a-manifest] configSchema path does not exist: ${p}`,
        );
      }
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return { schema: JSON.parse(raw) as NappletConfigSchema, source: `inline option: ${p}` };
      } catch (err) {
        throw new Error(
          `[nip5a-manifest] failed to parse configSchema file ${p}: ${(err as Error).message}`,
        );
      }
    }
  }

  const conventionPath = path.resolve(root, 'config.schema.json');
  if (fs.existsSync(conventionPath)) {
    try {
      const raw = fs.readFileSync(conventionPath, 'utf-8');
      return { schema: JSON.parse(raw) as NappletConfigSchema, source: 'config.schema.json' };
    } catch (err) {
      throw new Error(
        `[nip5a-manifest] failed to parse config.schema.json at ${conventionPath}: ${(err as Error).message}`,
      );
    }
  }

  for (const ext of ['ts', 'js', 'mjs'] as const) {
    const cfgPath = path.resolve(root, `napplet.config.${ext}`);
    if (!fs.existsSync(cfgPath)) continue;
    try {
      // Convert to file:// URL for ESM dynamic import on Windows + Linux
      const url = new URL(`file://${cfgPath}`).href;
      const mod = await import(url);
      const schema = (mod.configSchema ?? mod.default?.configSchema) as NappletConfigSchema | undefined;
      if (schema === undefined) {
        throw new Error(
          `[nip5a-manifest] napplet.config.${ext} at ${cfgPath} does not export \`configSchema\` (neither as a named export nor on the default export)`,
        );
      }
      return { schema, source: `napplet.config.${ext}` };
    } catch (err) {
      throw new Error(
        `[nip5a-manifest] failed to load napplet.config.${ext} at ${cfgPath}: ${(err as Error).message}`,
      );
    }
  }

  return { schema: null, source: null };
}

/**
 * Structural guard for napplet config schemas at build time.
 *
 * NOT a full JSON Schema validator. Only checks the four rejection rules that
 * MUST fail the build early — full Core Subset enforcement lives in the shell
 * at `config.registerSchema` time. See NAP-CONFIG Schema Contract / Exclusions.
 *
 * Rejection rules:
 * 1. Root MUST be `{ type: "object", ... }`. Anything else -> 'invalid-schema'.
 * 2. `pattern` keyword anywhere in the tree -> 'pattern-not-allowed' (ReDoS,
 *    CVE-2025-69873 class).
 * 3. `$ref` whose value does not start with `#/` anywhere in the tree ->
 *    'ref-not-allowed' (external reference ban; same-document refs are still
 *    forbidden by the spec but are caught by the shell-side Core Subset
 *    enforcer at registerSchema time).
 * 4. Any property node where both `x-napplet-secret: true` and the `default`
 *    key are present -> 'secret-with-default'.
 *
 * Collects every violation; returns them all in one pass so the build log
 * surfaces every problem at once.
 *
 * @param schema - the unvalidated schema loaded from options / config.schema.json / napplet.config.*
 * @returns `{ ok: true }` on pass, `{ ok: false, errors }` on failure (errors is
 *          a string array with one entry per distinct violation discovered).
 */
function validateConfigSchema(
  schema: unknown,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  // Rule 1: root shape
  if (
    schema === null ||
    typeof schema !== 'object' ||
    Array.isArray(schema) ||
    (schema as Record<string, unknown>).type !== 'object'
  ) {
    const got =
      schema === null
        ? 'null'
        : Array.isArray(schema)
          ? 'array'
          : typeof schema === 'object'
            ? `type=${JSON.stringify((schema as Record<string, unknown>).type)}`
            : typeof schema;
    errors.push(
      `invalid-schema: schema root must be { type: "object", ... } (got ${got})`,
    );
    // Do not recurse when root is malformed — nothing meaningful to walk.
    return { ok: false, errors };
  }

  // Rules 2-4: recursive walk
  walk(schema as Record<string, unknown>, '$', errors);

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Internal: recursively walks a schema node, accumulating rule violations.
 *
 * Recurses into every JSON-Schema child-carrying keyword we care about so the
 * four build-time rejection rules apply at any depth. JSON Schema combinators
 * (`oneOf` / `anyOf` / `allOf` / `not`) and reference containers (`definitions`
 * / `$defs`) are walked — shell-side Core Subset enforcement rejects them
 * outright at `registerSchema` time, but the build-time guard stays narrower
 * and still surfaces nested `pattern` / `$ref` / `secret-with-default`
 * violations through them.
 *
 * @param node   - arbitrary schema sub-tree (may be object, array, or primitive)
 * @param path   - dot-joined JSON-Pointer-ish location used in error messages
 * @param errors - mutable accumulator to which violations are pushed
 */
function walk(node: unknown, path: string, errors: string[]): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walk(node[i], `${path}[${i}]`, errors);
    }
    return;
  }

  const obj = node as Record<string, unknown>;
  collectSchemaKeywordErrors(obj, path, errors);
  walkSchemaChildren(obj, path, errors);
}

function collectSchemaKeywordErrors(
  obj: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if ('pattern' in obj) {
    errors.push(
      `pattern-not-allowed: \`pattern\` keyword found at ${path} — the Core Subset excludes \`pattern\` due to ReDoS risk (CVE-2025-69873 class). Use \`enum\`, \`minLength\`, or \`maxLength\` for constrained strings.`,
    );
  }

  if ('$ref' in obj) {
    const ref = obj.$ref;
    if (typeof ref !== 'string' || !ref.startsWith('#/')) {
      errors.push(
        `ref-not-allowed: \`$ref\` at ${path} must start with \`#/\` (got ${JSON.stringify(ref)}). External $ref is forbidden per NAP-CONFIG Security Considerations.`,
      );
    }
  }

  if (obj['x-napplet-secret'] === true && 'default' in obj) {
    errors.push(
      `secret-with-default: property at ${path} declares both \`x-napplet-secret: true\` and a \`default\` value. A secret with a hardcoded default is not a secret.`,
    );
  }
}

function walkSchemaChildren(obj: Record<string, unknown>, path: string, errors: string[]): void {
  if (
    typeof obj.properties === 'object' &&
    obj.properties !== null &&
    !Array.isArray(obj.properties)
  ) {
    for (const [key, child] of Object.entries(obj.properties as Record<string, unknown>)) {
      walk(child, `${path}.properties.${key}`, errors);
    }
  }
  if ('items' in obj) {
    walk(obj.items, `${path}.items`, errors);
  }
  if ('additionalProperties' in obj && typeof obj.additionalProperties === 'object') {
    walk(obj.additionalProperties, `${path}.additionalProperties`, errors);
  }
  if (
    typeof obj.patternProperties === 'object' &&
    obj.patternProperties !== null &&
    !Array.isArray(obj.patternProperties)
  ) {
    for (const [key, child] of Object.entries(
      obj.patternProperties as Record<string, unknown>,
    )) {
      walk(child, `${path}.patternProperties.${key}`, errors);
    }
  }
  for (const combiner of ['oneOf', 'anyOf', 'allOf'] as const) {
    if (Array.isArray(obj[combiner])) {
      (obj[combiner] as unknown[]).forEach((child, i) =>
        walk(child, `${path}.${combiner}[${i}]`, errors),
      );
    }
  }
  if ('not' in obj) walk(obj.not, `${path}.not`, errors);
  for (const defs of ['definitions', '$defs'] as const) {
    if (
      typeof obj[defs] === 'object' &&
      obj[defs] !== null &&
      !Array.isArray(obj[defs])
    ) {
      for (const [key, child] of Object.entries(obj[defs] as Record<string, unknown>)) {
        walk(child, `${path}.${defs}.${key}`, errors);
      }
    }
  }
}

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
function assertNoInlineScripts(html: string): void {
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

function inlineSingleFileBuildAssets(html: string, distPath: string, base: string): string {
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

function singleFileBuildConfig(config: UserConfig): UserConfig {
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

/**
 * Build-time conformance self-check for the NAP-CONNECT `connect:origins`
 * aggregateHash fold.
 *
 * Re-invokes the fold logic (lowercase → ASCII sort → LF-join no trailing →
 * UTF-8 → SHA-256 → lowercase hex) on the three-origin normative fixture from
 * NAP-CONNECT.md §Conformance Fixture and asserts the output equals the spec's
 * expected digest. Any drift in the plugin's fold implementation (join
 * delimiter, sort order, encoding, hash algorithm) throws at module load,
 * giving napplet authors an immediate loud failure instead of a silent
 * grant-invalidation mismatch at shell-side later.
 *
 * Cost: one SHA-256 over 80 bytes per plugin-factory invocation. Negligible.
 *
 * Runs module-top-level so even plugins that never invoke the fold at runtime
 * (e.g. napplets with zero `connect` origins) still benefit from the guardrail.
 *
 * @see NAP-CONNECT.md §Canonical `connect:origins` aggregateHash Fold
 * @see NAP-CONNECT.md §Conformance Fixture
 * @see .planning/research/PITFALLS.md SPEC-P1 (hash-determinism drift)
 */
function assertConnectFoldMatchesSpecFixture(): void {
  // Fixture from NAP-CONNECT.md §Conformance Fixture — order intentionally
  // scrambled to exercise the sort step (api < xn-- < wss happens to be the
  // already-sorted form, but passing scrambled guards against someone removing
  // the sort).
  const fixtureOrigins = [
    'wss://events.example.com',
    'https://api.example.com',
    'https://xn--caf-dma.example.com',
  ];
  const EXPECTED = 'cc7c1b1903fb23ecb909d2427e1dccd7d398a5c63dd65160edb0bb8b231aa742';

  // Re-invoke the SAME fold logic used in closeBundle. If this logic and the
  // closeBundle logic ever diverge (e.g. one gets refactored, the other
  // forgotten), update BOTH — or refactor into a shared helper. For now the
  // 5-line fold is small enough that byte-identical duplication is clearer
  // than factoring.
  const sorted = [...fixtureOrigins].sort();
  const canonical = sorted.join('\n');
  const actual = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');

  if (actual !== EXPECTED) {
    throw new Error(
      `[nip5a-manifest] FATAL: connect:origins fold implementation drift detected. ` +
      `The plugin's fold on the NAP-CONNECT.md §Conformance Fixture inputs produced ` +
      `hash ${actual} but the spec requires ${EXPECTED}. This means a build-time ` +
      `change broke fold-determinism with shells — any napplet built with this plugin ` +
      `would produce grant-invalidation mismatches. Restore the canonical fold ` +
      `(lowercase → ASCII sort → LF-join no trailing → UTF-8 → SHA-256 → lowercase hex) ` +
      `or update NAP-CONNECT.md + all shell implementations in lockstep.`,
    );
  }
}

// Module-load self-check: fires once per process that imports this plugin.
// Throws at module load if the fold has drifted from NAP-CONNECT.md spec.
assertConnectFoldMatchesSpecFixture();

interface ManifestPluginState {
  outDir: string;
  projectRoot: string;
  base: string;
  artifactMode: Nip5aArtifactMode;
  resolvedSchema: NappletConfigSchema | null;
  resolvedSchemaSource: string | null;
  normalizedConnect: string[];
}

interface ManifestTemplate {
  kind: 35128;
  created_at: number;
  tags: string[][];
  content: '';
  aggregateHash: string;
}

async function resolvePluginConfig(
  options: Nip5aManifestOptions,
  state: ManifestPluginState,
  config: { build?: { outDir?: string }; root: string; base?: string },
): Promise<void> {
  state.outDir = config.build?.outDir ?? 'dist';
  state.projectRoot = config.root;
  state.base = config.base ?? '/';
  const result = await discoverConfigSchema(options, state.projectRoot);
  state.resolvedSchema = result.schema;
  state.resolvedSchemaSource = result.source;
  validateResolvedSchema(state.resolvedSchema, state.resolvedSchemaSource);
  warnDeprecatedStrictCsp(options);
  state.normalizedConnect = normalizeConnectOptions(options);
}

function validateResolvedSchema(schema: NappletConfigSchema | null, source: string | null): void {
  if (schema === null) return;

  const validation = validateConfigSchema(schema);
  if (!validation.ok) {
    const header = `[nip5a-manifest] configSchema validation failed (source: ${source ?? 'unknown'})`;
    const body = validation.errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(`${header}\n${body}`);
  }
}

function warnDeprecatedStrictCsp(options: Nip5aManifestOptions): void {
  if (options.strictCsp !== undefined) {
    console.warn(
      '[nip5a-manifest] strictCsp is deprecated in v0.29.0 and has no effect — the shell is now the sole CSP authority. Remove this option from your vite.config.ts. See v0.29.0 changelog for migration. (REMOVE-STRICTCSP tracks hard removal in a future milestone.)',
    );
  }
}

function normalizeConnectOptions(options: Nip5aManifestOptions): string[] {
  if (options.connect === undefined) return [];
  if (!Array.isArray(options.connect)) {
    throw new Error('[nip5a-manifest] connect option must be an array of origin strings');
  }

  const normalized = options.connect.map((origin) => {
    try {
      return normalizeConnectOrigin(origin);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[nip5a-manifest] invalid connect origin: ${msg}`);
    }
  });

  const cleartext = normalized.filter((o) => o.startsWith('http://') || o.startsWith('ws://'));
  if (cleartext.length > 0) {
    console.warn(
      `[@napplet/vite-plugin] connect includes cleartext origin(s): ${cleartext.join(', ')} — browser mixed-content rules will silently block http:/ws: fetches from HTTPS shells unless the origin is http://localhost or http://127.0.0.1. Some shells refuse cleartext entirely (check \`shell.supports('connect:scheme:http')\`). See NAP-CONNECT for details.`,
    );
  }

  return normalized;
}

function buildIndexHtmlTags(
  options: Nip5aManifestOptions,
  state: ManifestPluginState,
  isDev: boolean,
): IndexHtmlTransformResult {
  const tags: IndexHtmlTransformResult = [
    {
      tag: 'meta',
      attrs: { name: 'napplet-aggregate-hash', content: '' },
      injectTo: 'head' as const,
    },
    {
      tag: 'meta',
      attrs: { name: 'napplet-type', content: options.nappletType },
      injectTo: 'head' as const,
    },
  ];

  if (options.requires && options.requires.length > 0) {
    tags.push({
      tag: 'meta',
      attrs: { name: 'napplet-requires', content: options.requires.join(',') },
      injectTo: 'head' as const,
    });
  }

  if (state.resolvedSchema !== null) {
    tags.push({
      tag: 'meta',
      attrs: { name: 'napplet-config-schema', content: JSON.stringify(state.resolvedSchema) },
      injectTo: 'head' as const,
    });
  }

  if (isDev && state.normalizedConnect.length > 0) {
    tags.push({
      tag: 'meta',
      attrs: {
        name: 'napplet-connect-requires',
        content: state.normalizedConnect.join(' '),
      },
      injectTo: 'head' as const,
    });
  }

  return tags;
}

async function writeBundleManifest(options: Nip5aManifestOptions, state: ManifestPluginState): Promise<void> {
  const distPath = path.resolve(state.outDir);
  if (!fs.existsSync(distPath)) {
    console.error(`[nip5a-manifest] dist directory not found: ${distPath}`);
    return;
  }

  prepareDistIndexHtml(distPath, state);

  const privkeyHex = process.env.VITE_DEV_PRIVKEY_HEX;
  if (!privkeyHex) return;

  const manifest = buildManifestTemplate(options, distPath, state);
  await writeManifestFile(distPath, manifest, privkeyHex);
  injectAggregateHash(distPath, manifest.aggregateHash);
}

function prepareDistIndexHtml(distPath: string, state: ManifestPluginState): void {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  let html = fs.readFileSync(indexPath, 'utf-8');
  assertNoInlineScripts(html);
  if (state.artifactMode === 'single-file') {
    html = inlineSingleFileBuildAssets(html, distPath, state.base);
    fs.writeFileSync(indexPath, html);
  }
}

function buildManifestTemplate(
  options: Nip5aManifestOptions,
  distPath: string,
  state: ManifestPluginState,
): ManifestTemplate {
  const xTags = buildAggregateInputs(distPath, state);
  const aggregateHash = computeAggregateHash(xTags);
  const manifestXTags = xTags
    .filter(([, p]) => !SYNTHETIC_XTAG_PATHS.has(p))
    .map(([hash, p]) => ['x', hash, p]);
  const connectTags = state.normalizedConnect.map((origin) => ['connect', origin]);
  const configTags =
    state.resolvedSchema !== null ? [['config', JSON.stringify(state.resolvedSchema)]] : [];
  const requiresTags = (options.requires ?? []).map((name) => ['requires', name]);

  return {
    kind: 35128,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', options.nappletType],
      ...manifestXTags,
      ...connectTags,
      ...configTags,
      ...requiresTags,
    ],
    content: '',
    aggregateHash,
  };
}

function buildAggregateInputs(distPath: string, state: ManifestPluginState): Array<[string, string]> {
  const xTags: Array<[string, string]> = [];
  for (const relativePath of walkDir(distPath)) {
    if (relativePath === '.nip5a-manifest.json') continue;
    xTags.push([sha256File(path.join(distPath, relativePath)), relativePath]);
  }

  if (state.resolvedSchema !== null) {
    const schemaHash = crypto.createHash('sha256').update(JSON.stringify(state.resolvedSchema)).digest('hex');
    xTags.push([schemaHash, 'config:schema']);
  }
  if (state.normalizedConnect.length > 0) {
    const canonical = [...state.normalizedConnect].sort().join('\n');
    const originsHash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
    xTags.push([originsHash, 'connect:origins']);
  }

  return xTags;
}

async function writeManifestFile(
  distPath: string,
  manifest: ManifestTemplate,
  privkeyHex: string,
): Promise<void> {
  try {
    const { finalizeEvent, getPublicKey } = await import('nostr-tools/pure');
    const { hexToBytes } = await import('nostr-tools/utils');
    const privkeyBytes = hexToBytes(privkeyHex);
    const pubkey = getPublicKey(privkeyBytes);
    const signedEvent = finalizeEvent({
      kind: 35128,
      created_at: manifest.created_at,
      tags: manifest.tags,
      content: manifest.content,
    }, privkeyBytes);

    const manifestWithMeta = { ...signedEvent, aggregateHash: manifest.aggregateHash, pubkey };
    fs.writeFileSync(path.join(distPath, '.nip5a-manifest.json'), JSON.stringify(manifestWithMeta, null, 2));
  } catch {
    fs.writeFileSync(path.join(distPath, '.nip5a-manifest.json'), JSON.stringify(manifest, null, 2));
  }
}

function injectAggregateHash(distPath: string, aggregateHash: string): void {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  const html = fs
    .readFileSync(indexPath, 'utf-8')
    .replace(
      /<meta name="napplet-aggregate-hash" content="">/,
      `<meta name="napplet-aggregate-hash" content="${aggregateHash}">`,
    );
  fs.writeFileSync(indexPath, html);
}

export function nip5aManifest(options: Nip5aManifestOptions): Plugin {
  const state: ManifestPluginState = {
    outDir: 'dist',
    projectRoot: process.cwd(),
    base: '/',
    artifactMode: options.artifactMode ?? 'external-assets',
    resolvedSchema: null,
    resolvedSchemaSource: null,
    normalizedConnect: [],
  };

  return {
    name: 'vite-plugin-nip5a-manifest',

    config(config) {
      if (state.artifactMode !== 'single-file') return undefined;
      return singleFileBuildConfig(config);
    },

    async configResolved(config) {
      await resolvePluginConfig(options, state, config);
    },

    transformIndexHtml(_html: string, ctx?: { server?: unknown }): IndexHtmlTransformResult {
      return buildIndexHtmlTags(options, state, !!ctx?.server);
    },

    async closeBundle() {
      await writeBundleManifest(options, state);
    },
  };
}
