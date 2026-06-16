/**
 * @napplet/conformance -- Manifest / meta-tag validator for built napplets.
 *
 * A napplet declares its NIP-5A manifest through `<meta>` tags that the
 * `@napplet/vite-plugin` reads and augments at build time:
 *
 * | Meta name                  | Content                                            |
 * |----------------------------|----------------------------------------------------|
 * | `napplet-type`             | the napplet type / `d` tag                          |
 * | `napplet-aggregate-hash`   | 64-char lowercase hex SHA-256, injected at build    |
 * | `napplet-requires`         | comma-joined list of required NAP domains           |
 * | `napplet-config-schema`    | inline `JSON.stringify` of the config schema        |
 * | `napplet-connect-requires` | space-joined connect origins (dev-only)             |
 *
 * {@link validateManifest} reads a napplet's HTML and checks each declaration
 * plus the no-inline-`<script>` rule the shell-as-CSP-authority model requires.
 *
 * The origin check reuses the canonical {@link normalizeConnectOrigin} so the
 * conformance verdict can never drift from what the build plugin and shell accept.
 *
 * @packageDocumentation
 */

import { NAP_DOMAINS } from '@napplet/core';
import { normalizeConnectOrigin } from '@napplet/nap/connect/types';

/** A napplet type/d-tag: lowercase, starts alnum, then alnum or `._:-`. */
const NAPPLET_TYPE_RE = /^[a-z0-9][a-z0-9._:-]*$/;
/** A 64-character lowercase hex SHA-256 digest. */
const AGGREGATE_HASH_RE = /^[0-9a-f]{64}$/;
/** `<script type="...">` values that are NOT executable inline JS. */
const NON_EXECUTING_SCRIPT_TYPES = new Set([
  'application/json',
  'application/ld+json',
  'importmap',
  'speculationrules',
]);

/** A single manifest problem. */
export interface ManifestError {
  /** Machine-readable code. */
  code:
    | 'missing-napplet-type'
    | 'invalid-napplet-type'
    | 'missing-aggregate-hash'
    | 'invalid-aggregate-hash'
    | 'unknown-required-nap'
    | 'invalid-config-schema'
    | 'invalid-connect-origin'
    | 'inline-script';
  /** Human-readable explanation. */
  message: string;
}

/** Verdict returned by {@link validateManifest}. */
export interface ManifestVerdict {
  /** True when no `errors` were found. */
  ok: boolean;
  /** Parsed `napplet-type`, when present. */
  nappletType?: string;
  /** Parsed `napplet-aggregate-hash`, when present. */
  aggregateHash?: string;
  /** Parsed `napplet-requires` (domain names), empty when absent. */
  requires: string[];
  /** Parsed `napplet-connect-requires` origins, empty when absent. */
  connectOrigins: string[];
  /** Hard failures. */
  errors: ManifestError[];
  /** Non-fatal advisories. */
  warnings: ManifestError[];
}

/** Options for {@link validateManifest}. */
export interface ValidateManifestOptions {
  /**
   * Treat a missing `napplet-aggregate-hash` as an error. Defaults to `true`
   * because the build plugin injects it — a built napplet without it is broken.
   * Set `false` when validating un-built author source.
   */
  requireAggregateHash?: boolean;
}

/** Read the `content` of the first `<meta name="...">` in an HTML string. */
function readMeta(html: string, name: string): string | undefined {
  // Match <meta ... name="<name>" ... content="..."> in either attribute order.
  const tagRe = /<meta\b[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(html)) !== null) {
    const block = tag[0];
    const nameMatch = /\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(block);
    const metaName = (nameMatch?.[1] ?? nameMatch?.[2] ?? '').trim();
    if (metaName !== name) continue;
    const contentMatch = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(block);
    return (contentMatch?.[1] ?? contentMatch?.[2] ?? '').trim();
  }
  return undefined;
}

/**
 * Find inline `<script>` offenders — ported from the build plugin's
 * `assertNoInlineScripts`. Returns the offending opening tags.
 */
export function findInlineScripts(html: string): string[] {
  // Strip HTML comments so commented-out scripts are not flagged.
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '');
  const scriptTagRe = /<script\b([\s\S]*?)>/gi;
  const offenders: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = scriptTagRe.exec(stripped)) !== null) {
    const tag = m[0];
    const attrs = m[1] ?? '';
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    if (srcMatch) {
      const srcValue = (srcMatch[1] ?? srcMatch[2] ?? '').trim();
      if (srcValue.length > 0) continue; // external load — allowed
      offenders.push(tag);
      continue; // src="" executes inline fallback — forbidden
    }
    const typeMatch = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    const typeValue = (typeMatch?.[1] ?? typeMatch?.[2] ?? '').trim().toLowerCase();
    if (typeValue && NON_EXECUTING_SCRIPT_TYPES.has(typeValue)) continue;
    offenders.push(tag);
  }
  return offenders;
}

/** Recursively test whether a JSON Schema fragment uses the forbidden `pattern` keyword. */
function usesPatternKeyword(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(usesPatternKeyword);
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if ('pattern' in record) return true;
    return Object.values(record).some(usesPatternKeyword);
  }
  return false;
}

/**
 * Validate a napplet's HTML manifest declarations.
 *
 * @param html - The napplet's `index.html` (ideally the built output).
 * @param options - See {@link ValidateManifestOptions}.
 * @returns A {@link ManifestVerdict}.
 *
 * @example
 * ```ts
 * const verdict = validateManifest(htmlString);
 * if (!verdict.ok) console.error(verdict.errors);
 * ```
 */
export function validateManifest(html: string, options: ValidateManifestOptions = {}): ManifestVerdict {
  const requireAggregateHash = options.requireAggregateHash ?? true;
  const errors: ManifestError[] = [];
  const warnings: ManifestError[] = [];

  // ── napplet-type ──────────────────────────────────────────────────────────
  const nappletType = readMeta(html, 'napplet-type');
  if (!nappletType) {
    errors.push({ code: 'missing-napplet-type', message: 'No <meta name="napplet-type"> declared' });
  } else if (!NAPPLET_TYPE_RE.test(nappletType)) {
    errors.push({ code: 'invalid-napplet-type', message: `napplet-type "${nappletType}" must match ${NAPPLET_TYPE_RE}` });
  }

  // ── napplet-aggregate-hash ─────────────────────────────────────────────────
  const aggregateHash = readMeta(html, 'napplet-aggregate-hash');
  if (!aggregateHash) {
    if (requireAggregateHash) {
      errors.push({ code: 'missing-aggregate-hash', message: 'No <meta name="napplet-aggregate-hash"> — the build plugin injects it; build before testing' });
    }
  } else if (!AGGREGATE_HASH_RE.test(aggregateHash)) {
    errors.push({ code: 'invalid-aggregate-hash', message: `napplet-aggregate-hash "${aggregateHash}" is not a 64-char lowercase hex digest` });
  }

  // ── napplet-requires ───────────────────────────────────────────────────────
  const requiresRaw = readMeta(html, 'napplet-requires');
  const requires = requiresRaw
    ? requiresRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  for (const req of requires) {
    const domain = req.startsWith('nap:') ? req.slice('nap:'.length) : req;
    if (!(NAP_DOMAINS as readonly string[]).includes(domain)) {
      errors.push({ code: 'unknown-required-nap', message: `napplet-requires lists "${req}" which is not a known NAP domain` });
    }
  }

  // ── napplet-config-schema ──────────────────────────────────────────────────
  const configSchemaRaw = readMeta(html, 'napplet-config-schema');
  if (configSchemaRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configSchemaRaw);
    } catch {
      parsed = undefined;
      errors.push({ code: 'invalid-config-schema', message: 'napplet-config-schema is not valid JSON' });
    }
    if (parsed !== undefined) {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        errors.push({ code: 'invalid-config-schema', message: 'napplet-config-schema must be a JSON Schema object' });
      } else if (usesPatternKeyword(parsed)) {
        errors.push({ code: 'invalid-config-schema', message: 'napplet-config-schema uses the `pattern` keyword, which the draft-07 core subset excludes (CVE-2025-69873)' });
      }
    }
  }

  // ── napplet-connect-requires (dev-only meta, validated when present) ────────
  const connectRaw = readMeta(html, 'napplet-connect-requires');
  const connectTokens = connectRaw ? connectRaw.split(/\s+/).map((s) => s.trim()).filter(Boolean) : [];
  const connectOrigins: string[] = [];
  for (const origin of connectTokens) {
    try {
      connectOrigins.push(normalizeConnectOrigin(origin));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push({ code: 'invalid-connect-origin', message: `connect origin "${origin}" is invalid: ${reason}` });
    }
  }

  // ── no inline scripts ───────────────────────────────────────────────────────
  for (const offender of findInlineScripts(html)) {
    errors.push({ code: 'inline-script', message: `Inline <script> is forbidden under script-src 'self': ${offender}` });
  }

  return {
    ok: errors.length === 0,
    nappletType,
    aggregateHash,
    requires,
    connectOrigins,
    errors,
    warnings,
  };
}
