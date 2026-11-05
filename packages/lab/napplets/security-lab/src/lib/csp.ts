// Content-Security-Policy inspection for the NIP-5D "CSP advisory":
// a shell SHOULD inject a meta CSP as the first element in head, and MUST NOT
// substitute 'unsafe-eval' for 'wasm-unsafe-eval'. Pure functions; the only
// DOM touch point is `inspectCspMeta`, which takes a Document.

export type CspPolicy = Map<string, string[]>;

/** Parse a serialized policy. Per CSP3, the first occurrence of a directive wins. */
export function parseCsp(content: string): CspPolicy {
  const policy: CspPolicy = new Map();
  for (const raw of content.split(';')) {
    const tokens = raw.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const [name, ...sources] = tokens;
    const key = name.toLowerCase();
    if (!policy.has(key)) policy.set(key, sources);
  }
  return policy;
}

/** The conservative baseline from NIP-5D §Security Considerations. */
export const NIP5D_BASELINE_CSP: Readonly<Record<string, readonly string[]>> = {
  'default-src': ["'none'"],
  'script-src': ["'unsafe-inline'", "'wasm-unsafe-eval'"],
  'style-src': ["'unsafe-inline'"],
  'img-src': ['data:', 'blob:'],
  'font-src': ['data:'],
  'connect-src': ["'none'"],
  'worker-src': ["'none'"],
  'child-src': ["'none'"],
  'frame-src': ["'none'"],
  'media-src': ["'none'"],
  'object-src': ["'none'"],
  'manifest-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
};

/** CSP3 fallback chains for fetch directives that are absent from a policy. */
const FALLBACK: Readonly<Record<string, readonly string[]>> = {
  'script-src': ['default-src'],
  'style-src': ['default-src'],
  'img-src': ['default-src'],
  'font-src': ['default-src'],
  'connect-src': ['default-src'],
  'media-src': ['default-src'],
  'object-src': ['default-src'],
  'manifest-src': ['default-src'],
  'child-src': ['default-src'],
  'frame-src': ['child-src', 'default-src'],
  'worker-src': ['child-src', 'script-src', 'default-src'],
};

/** Resolve the source list that governs `directive`, following CSP fallbacks. */
export function effectiveSources(policy: CspPolicy, directive: string): { sources: string[]; via: string } | null {
  const direct = policy.get(directive);
  if (direct) return { sources: direct, via: directive };
  for (const parent of FALLBACK[directive] ?? []) {
    const sources = policy.get(parent);
    if (sources) return { sources, via: parent };
  }
  return null;
}

export type CspFindingLevel = 'ok' | 'deviation' | 'violation';

export interface CspFinding {
  directive: string;
  level: CspFindingLevel;
  detail: string;
}

function isNone(sources: readonly string[]): boolean {
  return sources.length === 1 && sources[0].toLowerCase() === "'none'";
}

function isExactOrigin(source: string): boolean {
  try {
    const url = new URL(source);
    return /^(https?|wss?):$/.test(url.protocol)
      && !source.includes('*')
      && (url.pathname === '/' || url.pathname === '')
      && !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Compare a policy against the NIP-5D baseline.
 * - `violation`: a MUST NOT (only `'unsafe-eval'`) was breached.
 * - `deviation`: the policy is looser than the SHOULD baseline.
 * - `ok`: matches or is stricter than the baseline.
 */
export function evaluateCsp(policy: CspPolicy): CspFinding[] {
  const findings: CspFinding[] = [];

  for (const [directive, sources] of policy) {
    if (sources.some((source) => source.toLowerCase() === "'unsafe-eval'")) {
      findings.push({ directive, level: 'violation', detail: "'unsafe-eval' present; NIP-5D forbids substituting it for 'wasm-unsafe-eval'" });
    }
  }

  for (const directive of Object.keys(NIP5D_BASELINE_CSP)) {
    if (directive === 'connect-src') continue;
    const effective = effectiveSources(policy, directive);
    const expectNone = isNone(NIP5D_BASELINE_CSP[directive]);
    if (!effective) {
      findings.push({ directive, level: 'deviation', detail: 'not set and no fallback; browser default is unrestricted' });
      continue;
    }
    if (expectNone && !isNone(effective.sources)) {
      findings.push({ directive, level: 'deviation', detail: `expected 'none', got ${effective.sources.join(' ')} (via ${effective.via})` });
      continue;
    }
    if (directive === 'script-src' && !effective.sources.some((source) => source.toLowerCase() === "'wasm-unsafe-eval'")) {
      findings.push({ directive, level: 'ok', detail: `stricter than baseline: WebAssembly compilation not allowed (${effective.sources.join(' ')})` });
      continue;
    }
    findings.push({ directive, level: 'ok', detail: `${effective.sources.join(' ')} (via ${effective.via})` });
  }

  const connect = effectiveSources(policy, 'connect-src');
  if (!connect) {
    findings.push({ directive: 'connect-src', level: 'deviation', detail: 'not set; direct network access is unrestricted' });
  } else if (isNone(connect.sources)) {
    findings.push({ directive: 'connect-src', level: 'ok', detail: `'none' (via ${connect.via})` });
  } else if (connect.sources.every(isExactOrigin)) {
    findings.push({ directive: 'connect-src', level: 'ok', detail: `exact origins granted by host policy: ${connect.sources.join(' ')}` });
  } else {
    findings.push({ directive: 'connect-src', level: 'deviation', detail: `wildcard, scheme-wide or keyword sources SHOULD NOT be used: ${connect.sources.join(' ')}` });
  }

  return findings;
}

export interface CspSummary {
  violations: CspFinding[];
  deviations: CspFinding[];
  ok: CspFinding[];
}

export function summarizeCsp(findings: CspFinding[]): CspSummary {
  return {
    violations: findings.filter((finding) => finding.level === 'violation'),
    deviations: findings.filter((finding) => finding.level === 'deviation'),
    ok: findings.filter((finding) => finding.level === 'ok'),
  };
}

export function describeFindings(findings: CspFinding[]): string {
  return findings.map((finding) => `${finding.directive}: ${finding.detail}`).join('; ');
}

export interface CspMetaInspection {
  /** A `<meta http-equiv="Content-Security-Policy">` exists in the document. */
  present: boolean;
  /** That meta is the first element child of `<head>` (NIP-5D SHOULD). */
  first: boolean;
  /** Number of CSP meta elements; browsers enforce the union of all of them. */
  count: number;
  content: string;
  policy: CspPolicy;
}

export function isCspMeta(element: Element | null | undefined): element is HTMLMetaElement {
  return !!element
    && element.tagName.toLowerCase() === 'meta'
    && (element.getAttribute('http-equiv') ?? '').toLowerCase() === 'content-security-policy';
}

export function inspectCspMeta(doc: Document): CspMetaInspection {
  const metas = Array.from(doc.querySelectorAll('meta[http-equiv]')).filter(isCspMeta);
  const first = isCspMeta(doc.head?.firstElementChild);
  const content = metas.map((meta) => meta.getAttribute('content') ?? '').join('; ');
  return {
    present: metas.length > 0,
    first,
    count: metas.length,
    content,
    policy: parseCsp(content),
  };
}
