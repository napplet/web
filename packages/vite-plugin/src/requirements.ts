/**
 * @napplet/vite-plugin — best-effort NAP requirement inference.
 *
 * This scanner is intentionally narrow: it recognizes static package imports
 * and direct `window.napplet.<domain>` property reads only. Dynamic access is
 * not inferred, and explicit plugin configuration remains the override.
 */

import type { ManifestPluginState, Nip5aRequiresOption } from './types.js';

const NAP_DOMAINS = [
  'shell',
  'relay',
  'identity',
  'storage',
  'inc',
  'theme',
  'keys',
  'media',
  'notify',
  'config',
  'resource',
  'cvm',
  'outbox',
  'upload',
  'blossom',
  'intent',
  'navigation',
  'ble',
  'webrtc',
  'link',
  'count',
  'lists',
  'serial',
  'fs',
  'common',
  'dm',
  'gamepad',
  'llm',
  'catalog',
  'torrent',
  'soulseek',
] as const;

const NAP_DOMAIN_SET = new Set<string>(NAP_DOMAINS);
const IMPORT_RE = /\bimport\s+(type\s+)?(?:(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"])/g;
const WINDOW_DOMAIN_RE = /\bwindow\s*\.\s*napplet\s*\.\s*([A-Za-z_$][\w$]*)/g;

export function inferRequirementsFromSource(
  code: string,
  id: string,
  experimentalDomains: ReadonlySet<string> = new Set(),
): string[] {
  if (!isSourceFile(id)) return [];

  const domains = new Set<string>();
  for (const match of code.matchAll(IMPORT_RE)) {
    if (match[1]) continue;
    const domain = domainFromSpecifier(match[2]);
    if (domain) domains.add(domain);
  }
  for (const match of code.matchAll(WINDOW_DOMAIN_RE)) {
    const domain = match[1];
    if (NAP_DOMAIN_SET.has(domain) || experimentalDomains.has(domain)) domains.add(domain);
  }
  return [...domains].sort();
}

export function addInferredRequirements(state: ManifestPluginState, domains: readonly string[]): void {
  for (const domain of domains) state.inferredRequires.add(domain);
}

export function resolvedRequirements(
  option: Nip5aRequiresOption | undefined,
  state: ManifestPluginState,
): string[] {
  const explicit = explicitRequirements(option);
  const inferred = shouldInfer(option) ? [...state.inferredRequires] : [];
  return dedupeRequirements([...explicit, ...inferred]);
}

export function reportRequirementDiagnostics(
  option: Nip5aRequiresOption | undefined,
  state: ManifestPluginState,
  warn: (message: string) => void,
  optional: readonly string[] = [],
): void {
  // Explicit requirements are the author's declaration and are emitted as
  // written. The shell decides at load whether it provides each domain, so a
  // domain this plugin does not know (a drafted or runtime-specific NAP) is
  // passed through with a warning rather than dropped.
  const unknown = dedupeRequirements(explicitRequirements(option))
    .filter((domain) => !NAP_DOMAIN_SET.has(domain) && !state.experimentalDomains.has(domain));
  if (unknown.length > 0) {
    warnOnce(state, warn, `[nip5a-manifest] requires domain(s) not in the known NAP list, emitted as declared: ${unknown.join(', ')}`);
  }

  if (!option || Array.isArray(option) || !option.infer || !option.explicit) return;

  const explicit = new Set(dedupeRequirements(option.explicit));
  const missing = [...state.inferredRequires].filter((domain) => !explicit.has(domain) && !optional.includes(domain)).sort();
  if (missing.length === 0) return;

  const message = `[nip5a-manifest] missing explicit requires for inferred NAP domain(s): ${missing.join(', ')}`;
  if (option.mode === 'error') throw new Error(message);
  warnOnce(state, warn, message);
}

/**
 * Warn once when experimental domains end up in the manifest's R/O tags.
 *
 * @param state Plugin state holding the experimental allowlist.
 * @param declared Domains emitted as R or O.
 * @param warn Build warning sink.
 */
export function reportExperimentalDomains(
  state: ManifestPluginState,
  declared: readonly string[],
  warn: (message: string) => void,
): void {
  const used = [...new Set(declared.filter((domain) => state.experimentalDomains.has(domain)))].sort();
  if (used.length === 0) return;
  warnOnce(state, warn, `[nip5a-manifest] experimental domain(s) declared in R/O are not defined by any NAP: ${used.join(', ')}. Propose them on the NAPs track (https://github.com/napplet/naps) before relying on them.`);
}

/**
 * Validate the experimental domain allowlist from the plugin options.
 *
 * @param names Experimental domain names.
 * @returns The trimmed, deduplicated allowlist.
 * @throws Error for a non-bare name, a NAP domain, or an `Object.prototype` member.
 */
export function normalizeExperimentalDomains(names: readonly string[] | undefined): ReadonlySet<string> {
  const result = new Set<string>();
  for (const raw of names ?? []) {
    const name = String(raw).trim();
    assertBareNapDomain(name);
    if (NAP_DOMAIN_SET.has(name)) throw new Error(`[nip5a-manifest] experimentalDomains: "${name}" is a NAP domain`);
    if (Object.getOwnPropertyNames(Object.prototype).includes(name)) {
      throw new Error(`[nip5a-manifest] experimentalDomains: "${name}" cannot be used as a domain name`);
    }
    result.add(name);
  }
  return result;
}

/** The NAP domain names this plugin recognizes, for drift tests against `@napplet/core`. */
export const KNOWN_NAP_DOMAINS: readonly string[] = NAP_DOMAINS;

function warnOnce(state: ManifestPluginState, warn: (message: string) => void, message: string): void {
  if (state.reportedRequirementWarnings.has(message)) return;
  state.reportedRequirementWarnings.add(message);
  warn(message);
}

function explicitRequirements(option: Nip5aRequiresOption | undefined): string[] {
  if (!option) return [];
  return Array.isArray(option) ? option : option.explicit ?? [];
}

function shouldInfer(option: Nip5aRequiresOption | undefined): boolean {
  return !Array.isArray(option) && option?.infer === true;
}

function dedupeRequirements(domains: readonly string[]): string[] {
  const trimmed = domains.map((domain) => domain.trim());
  for (const domain of trimmed) assertBareNapDomain(domain);
  return [...new Set(trimmed)].sort();
}

function domainFromSpecifier(specifier: string | undefined): string | null {
  if (!specifier) return null;
  const napMatch = specifier.match(/^@napplet\/nap\/([^/]+)/);
  if (napMatch && NAP_DOMAIN_SET.has(napMatch[1])) return napMatch[1];
  const sdkMatch = specifier.match(/^@napplet\/sdk\/([^/]+)/);
  if (sdkMatch && NAP_DOMAIN_SET.has(sdkMatch[1])) return sdkMatch[1];
  return null;
}

function assertBareNapDomain(domain: string): void {
  if (!domain || /[.:\s]/.test(domain) || domain.startsWith("NAP-")) throw new Error(`NAP requirement must be a bare domain: ${domain}`);
}

function isSourceFile(id: string): boolean {
  if (id.includes('node_modules') || id.startsWith('\0')) return false;
  return /\.[cm]?[jt]sx?$/.test(id);
}
