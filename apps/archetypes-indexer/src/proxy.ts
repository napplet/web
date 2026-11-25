/** Outbound proxy support: relay WebSockets and Bunny uploads through a SOCKS or HTTP proxy. */

import { request as httpsRequest } from 'node:https';
import { request as httpRequest, type Agent } from 'node:http';
import { connect } from 'node:net';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { WebSocket as WsWebSocket } from 'ws';
import type { SocketConstructor } from './relay-client.ts';

/**
 * An agent that tunnels connections through the proxy.
 * @param url Proxy URL (`socks5h://`, `socks5://`, `socks4://`, `http://`, `https://`).
 * @returns A Node agent for `http`, `https` and `ws`.
 * @example proxyAgent('socks5h://127.0.0.1:1080')
 */
export function proxyAgent(url: string): Agent {
  return url.startsWith('socks') ? new SocksProxyAgent(url) : new HttpsProxyAgent(url);
}

/**
 * A WebSocket class with the browser API that connects through `agent`.
 * @param agent Proxy agent.
 * @returns Constructor usable wherever the platform WebSocket is.
 * @example const Impl = proxiedWebSocket(proxyAgent(url)); new Impl('wss://relay.example');
 */
export function proxiedWebSocket(agent: Agent): SocketConstructor {
  return class ProxiedWebSocket extends WsWebSocket {
    constructor(address: string) {
      super(address, { agent, handshakeTimeout: 15_000 });
    }
  };
}

/**
 * A minimal `fetch` (method, headers, string or byte body) that sends requests through `agent`.
 * @param agent Proxy agent.
 * @returns A fetch-compatible function.
 * @example const fetchImpl = proxiedFetch(proxyAgent(url));
 */
export function proxiedFetch(agent: Agent): typeof fetch {
  return ((input: string | URL, init: RequestInit = {}) => new Promise<Response>((resolve, reject) => {
    const url = new URL(String(input));
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const req = send(url, { method: init.method ?? 'GET', headers, agent }, res => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        const body = status === 204 || status === 304 ? null : Buffer.concat(chunks);
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) if (value !== undefined) responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
        resolve(new Response(body, { status, headers: responseHeaders }));
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60_000, () => req.destroy(new Error('proxied request timed out')));
    const body = init.body;
    if (body === undefined || body === null) req.end();
    else if (typeof body === 'string' || body instanceof Uint8Array) req.end(body);
    else reject(new Error('proxiedFetch supports string and byte bodies only'));
  })) as typeof fetch;
}

/**
 * Whether the proxy accepts a TCP connection.
 * @param url Proxy URL.
 * @param timeoutMs How long to wait.
 * @returns True when a connection opened.
 * @example await proxyReachable('socks5h://127.0.0.1:1080', 5000)
 */
export function proxyReachable(url: string, timeoutMs: number): Promise<boolean> {
  const { hostname, port, protocol } = new URL(url);
  const fallback = protocol === 'https:' ? 443 : protocol === 'http:' ? 80 : 1080;
  return new Promise(resolve => {
    const socket = connect({ host: hostname.replace(/^\[|\]$/g, ''), port: Number(port) || fallback });
    const done = (ok: boolean) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}
