/**
 * @napplet/conformance -- Manifest / meta-tag validator for built napplets.
 *
 * A napplet declares its NIP-5A manifest through `<meta>` tags that the
 * `@napplet/vite-plugin` reads and augments at build time:
 *
 * | Meta name                  | Content                                            |
 * |----------------------------|----------------------------------------------------|
 * | `napplet-type`             | the napplet type / `d` tag                          |
 * | `napplet-requires`         | comma-joined list of required NAP domains           |
 * | `napplet-config-schema`    | inline `JSON.stringify` of the config schema        |
 *
 * {@link validateManifest} reads a napplet's HTML and checks each declaration.
 *
 * Inline `<script>` elements are NOT a conformance failure: per NIP-5D a napplet
 * is a single self-contained `/index.html` loaded via `iframe.srcdoc` with
 * `sandbox="allow-scripts"` (opaque origin), so its executable JS lives inline.
 * A check that rejected inline scripts would fail every spec-faithful napplet.
 *
 * @packageDocumentation
 */

import { NAP_DOMAINS } from '@napplet/core';

/** A napplet type/d-tag: lowercase, starts alnum, then alnum or `._:-`. */
const NAPPLET_TYPE_RE = /^[a-z0-9][a-z0-9._:-]*$/;

/** A single manifest problem. */
export interface ManifestError {
  /** Machine-readable code. */
  code:
    | 'missing-napplet-type'
    | 'invalid-napplet-type'
    | 'unknown-required-nap'
    | 'invalid-config-schema';
  /** Human-readable explanation. */
  message: string;
}

/** Verdict returned by {@link validateManifest}. */
export interface ManifestVerdict {
  /** True when no `errors` were found. */
  ok: boolean;
  /** Parsed `napplet-type`, when present. */
  nappletType?: string;
  /** Parsed `napplet-requires` (domain names), empty when absent. */
  requires: string[];
  /** Hard failures. */
  errors: ManifestError[];
  /** Non-fatal advisories. */
  warnings: ManifestError[];
}

/** Options for {@link validateManifest}. Reserved for future knobs. */
export interface ValidateManifestOptions {}

/** Decode the HTML entities a serializer puts in attribute values (notably JSON). */
function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    return named[entity] ?? match;
  });
}

/**
 * Read the `content` of the first `<meta name="...">` in an HTML string, decoding
 * HTML entities so escaped attribute values (e.g. a JSON config schema serialized
 * with `&quot;`) parse the same way a real `getAttribute('content')` would.
 */
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
    return decodeHtmlEntities((contentMatch?.[1] ?? contentMatch?.[2] ?? '').trim());
  }
  return undefined;
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
export function validateManifest(html: string, _options: ValidateManifestOptions = {}): ManifestVerdict {
  const errors: ManifestError[] = [];
  const warnings: ManifestError[] = [];

  // ── napplet-type ──────────────────────────────────────────────────────────
  const nappletType = readMeta(html, 'napplet-type');
  if (!nappletType) {
    errors.push({ code: 'missing-napplet-type', message: 'No <meta name="napplet-type"> declared' });
  } else if (!NAPPLET_TYPE_RE.test(nappletType)) {
    errors.push({ code: 'invalid-napplet-type', message: `napplet-type "${nappletType}" must match ${NAPPLET_TYPE_RE}` });
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

  return {
    ok: errors.length === 0,
    nappletType,
    requires,
    errors,
    warnings,
  };
}
