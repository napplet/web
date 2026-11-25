import { isIP } from 'node:net';

export interface NormalizeOptions {
  /** Accept `ws://`, loopback, LAN, `.local` and `.onion` hosts (tests and private deployments). */
  allowPrivateHosts?: boolean;
}

function privateIpv4(host: string): boolean {
  const [a, b] = host.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function privateHost(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, '');
  if (bare === 'localhost' || bare.endsWith('.localhost') || bare.endsWith('.local') || bare.endsWith('.onion') || bare.endsWith('.internal')) return true;
  if (!bare.includes('.') && !isIP(bare)) return true;
  const family = isIP(bare);
  if (family === 4) return privateIpv4(bare);
  if (family === 6) return bare === '::1' || bare === '::' || /^f[cd]/i.test(bare) || /^fe80/i.test(bare);
  return false;
}

/**
 * Canonicalise a relay URL: lower-case scheme and host, no default port, no trailing slash, no query or fragment.
 * @param input Untrusted relay URL.
 * @param options Whether private and plaintext relays are acceptable.
 * @returns The canonical URL, or null when the input is not a usable public relay.
 * @example normalizeRelayUrl('WSS://Relay.Example:443/') // 'wss://relay.example'
 */
export function normalizeRelayUrl(input: unknown, options: NormalizeOptions = {}): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 512) return null;
  let url: URL;
  try { url = new URL(trimmed); } catch { return null; }
  if (url.protocol !== 'wss:' && !(url.protocol === 'ws:' && options.allowPrivateHosts)) return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return null;
  if (!options.allowPrivateHosts && privateHost(host)) return null;
  const defaultPort = url.protocol === 'wss:' ? '443' : '80';
  const port = url.port && url.port !== defaultPort ? `:${url.port}` : '';
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${host}${port}${path}`;
}

/**
 * Normalise and de-duplicate a list of relay URLs, preserving first-seen order.
 * @param inputs Untrusted relay URLs.
 * @param options Whether private and plaintext relays are acceptable.
 * @returns Unique canonical relay URLs.
 * @example dedupeRelays(['wss://a.example/', 'wss://A.example']) // ['wss://a.example']
 */
export function dedupeRelays(inputs: Iterable<unknown>, options: NormalizeOptions = {}): string[] {
  const seen = new Set<string>();
  for (const input of inputs) {
    const url = normalizeRelayUrl(input, options);
    if (url) seen.add(url);
  }
  return [...seen];
}
