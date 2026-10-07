/**
 * @napplet/vite-plugin — best-effort NAP requirement inference.
 *
 * This scanner is intentionally narrow: it recognizes static package imports
 * and direct `window.napplet.<domain>` property reads only. Dynamic access is
 * not inferred, and explicit plugin configuration remains the override.
 */

import type { ManifestPluginState, Nip5aRequiresOption } from './types.js';

const NAP_DOMAINS = [
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
  'intent',
  'ble',
  'webrtc',
  'link',
  'count',
  'lists',
  'serial',
  'fs',
  'common',
  'dm',
] as const;

const NAP_DOMAIN_SET = new Set<string>(NAP_DOMAINS);
const IMPORT_RE = /\bimport\s+(type\s+)?(?:(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"])/g;
const WINDOW_DOMAIN_RE = /\bwindow\s*\.\s*napplet\s*\.\s*([A-Za-z_$][\w$]*)/g;

export function inferRequirementsFromSource(code: string, id: string): string[] {
  if (!isSourceFile(id)) return [];

  const domains = new Set<string>();
  for (const match of code.matchAll(IMPORT_RE)) {
    if (match[1]) continue;
    const domain = domainFromSpecifier(match[2]);
    if (domain) domains.add(domain);
  }
  for (const match of code.matchAll(WINDOW_DOMAIN_RE)) {
    const domain = match[1];
    if (NAP_DOMAIN_SET.has(domain)) domains.add(domain);
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
  return normalizeRequirements([...explicit, ...inferred]);
}

export function reportRequirementDiagnostics(
  option: Nip5aRequiresOption | undefined,
  state: ManifestPluginState,
  warn: (message: string) => void,
): void {
  // Explicit requirements are the author's declaration and are emitted as
  // written. The shell decides at load whether it provides each domain, so a
  // domain this plugin does not know (a drafted or runtime-specific NAP) is
  // passed through with a warning rather than dropped.
  const unknown = normalizeRequirements(explicitRequirements(option)).filter((domain) => !isNapDomain(domain));
  if (unknown.length > 0) {
    warnOnce(state, warn, `[nip5a-manifest] requires domain(s) not in the known NAP list, emitted as declared: ${unknown.join(', ')}`);
  }

  if (!option || Array.isArray(option) || !option.infer || !option.explicit) return;

  const explicit = new Set(normalizeRequirements(option.explicit));
  const missing = [...state.inferredRequires].filter((domain) => !explicit.has(domain)).sort();
  if (missing.length === 0) return;

  const message = `[nip5a-manifest] missing explicit requires for inferred NAP domain(s): ${missing.join(', ')}`;
  if (option.mode === 'error') throw new Error(message);
  warnOnce(state, warn, message);
}

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

function normalizeRequirements(domains: readonly string[]): string[] {
  return [...new Set(domains.map((domain) => domain.trim()).filter((domain) => domain.length > 0))].sort();
}

function domainFromSpecifier(specifier: string | undefined): string | null {
  if (!specifier) return null;
  const napMatch = specifier.match(/^@napplet\/nap\/([^/]+)/);
  if (napMatch && NAP_DOMAIN_SET.has(napMatch[1])) return napMatch[1];
  const sdkMatch = specifier.match(/^@napplet\/sdk\/([^/]+)/);
  if (sdkMatch && NAP_DOMAIN_SET.has(sdkMatch[1])) return sdkMatch[1];
  return null;
}

function isNapDomain(domain: string): boolean {
  return NAP_DOMAIN_SET.has(domain);
}

function isSourceFile(id: string): boolean {
  if (id.includes('node_modules') || id.startsWith('\0')) return false;
  return /\.[cm]?[jt]sx?$/.test(id);
}
