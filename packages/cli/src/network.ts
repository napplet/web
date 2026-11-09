/**
 * Optional HTTP or SOCKS5 proxy for the CLI's Blossom and relay connections.
 *
 * `--proxy` is CLI transport configuration, not napplet protocol surface: it changes how this tool reaches Blossom
 * servers and relays, never what it publishes. One Deno HTTP client carries every proxied connection: Blossom
 * `fetch` requests, relay WebSockets (nostr-tools and applesauce pools) and the relay NIP-11 documents applesauce
 * requests while connecting.
 *
 * @module
 */

import { AbstractSimplePool } from "nostr-tools/abstract-pool";
import { verifyEvent } from "nostr-tools/pure";

/** Proxy URL schemes Deno's HTTP client supports. `socks5h` resolves host names on the proxy. */
export const PROXY_SCHEMES = ["http:", "https:", "socks5:", "socks5h:"] as const;

/** Commands that reach Blossom servers or relays, and so accept `--proxy`. */
export const PROXY_COMMANDS = ["deploy", "init", "keys connect"] as const;

let active: { url: URL; client: Deno.HttpClient } | undefined;

/**
 * Validate a proxy URL.
 * @param value Proxy URL such as `http://127.0.0.1:8080` or `socks5h://127.0.0.1:9050`; credentials may be embedded.
 * @returns The parsed URL.
 * @example parseProxyUrl("socks5h://127.0.0.1:9050")
 */
export function parseProxyUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid --proxy URL. Use http://host:port, https://host:port, socks5://host:port or socks5h://host:port.`);
  }
  if (!(PROXY_SCHEMES as readonly string[]).includes(url.protocol)) {
    throw new Error(`Unsupported --proxy scheme ${url.protocol} in ${redactProxyUrl(url)}. Use http, https, socks5 or socks5h.`);
  }
  if (!url.hostname) throw new Error(`--proxy needs a host: ${redactProxyUrl(url)}`);
  if (url.pathname.replace(/^\/$/, "") || url.search || url.hash) {
    throw new Error(`--proxy takes only scheme, optional credentials, host and port: ${redactProxyUrl(url)}`);
  }
  return url;
}

/**
 * Render a proxy URL for messages without its credentials.
 * @param url Parsed proxy URL.
 * @returns `scheme://host:port`, with `***@` in place of any credentials.
 * @example redactProxyUrl(new URL("socks5://user:pass@127.0.0.1:1080")) // "socks5://***@127.0.0.1:1080"
 */
export function redactProxyUrl(url: URL): string {
  return `${url.protocol}//${url.username || url.password ? "***@" : ""}${url.host}`;
}

/**
 * Route this process's Blossom and relay connections through a proxy, or stop proxying.
 * @param value Proxy URL, or undefined to connect directly.
 * @returns The redacted proxy URL in use, or undefined.
 * @example configureProxy("socks5h://127.0.0.1:9050")
 */
export function configureProxy(value: string | undefined): string | undefined {
  closeProxy();
  if (value === undefined) return undefined;
  const url = parseProxyUrl(value);
  active = { url, client: Deno.createHttpClient({ proxy: { url: url.href } }) };
  return redactProxyUrl(url);
}

/**
 * Release the proxy client and return to direct connections.
 * @returns Nothing.
 * @example closeProxy()
 */
export function closeProxy(): void {
  active?.client.close();
  active = undefined;
}

/**
 * The redacted proxy currently in use.
 * @returns `scheme://host:port`, or undefined when connecting directly.
 * @example activeProxy()
 */
export function activeProxy(): string | undefined {
  return active ? redactProxyUrl(active.url) : undefined;
}

/**
 * `fetch` for Blossom and NIP-11 requests, through the configured proxy when there is one.
 * @param input Request URL or object.
 * @param init Request options.
 * @returns The response.
 * @example await networkFetch("https://blossom.example/upload", { method: "PUT", body })
 */
export function networkFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const proxy = active;
  return proxy ? fetch(input, { ...init, client: proxy.client }) : fetch(input, init);
}

/**
 * WebSocket constructor for relay pools, bound to the proxy configured when it is called.
 * @returns The global `WebSocket`, or a subclass that opens every socket through the proxy.
 * @example new SimplePool({ websocketImplementation: networkWebSocket() })
 */
export function networkWebSocket(): typeof WebSocket {
  const proxy = active;
  if (!proxy) return WebSocket;
  const client = proxy.client;
  // Deno's WebSocket takes `{ protocols, client }`; this package's type environment also loads the WHATWG
  // declaration without that option, so name Deno's documented constructor shape here.
  const DenoWebSocket = WebSocket as unknown as new (url: string | URL, options: { protocols?: string | string[]; client: Deno.HttpClient }) => WebSocket;
  class ProxiedWebSocket extends DenoWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, { protocols, client });
    }
  }
  // Static readyState constants are inherited from WebSocket at runtime.
  return ProxiedWebSocket as unknown as typeof WebSocket;
}

/**
 * A nostr-tools relay pool whose sockets follow the configured proxy.
 * @returns A pool equivalent to `new SimplePool()`, with the proxied WebSocket.
 * @example const pool = networkRelayPool(); await pool.querySync(relays, filter);
 */
export function networkRelayPool(): AbstractSimplePool {
  return new AbstractSimplePool({ verifyEvent, websocketImplementation: networkWebSocket(), maxWaitForConnection: 3_000 });
}
