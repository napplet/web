import { afterEach, describe, expect, it } from 'vitest';
import { createServer as createNetServer, connect, type Server as NetServer, type Socket } from 'node:net';
import { createServer as createHttpServer, type Server as HttpServer } from 'node:http';
import { proxiedFetch, proxiedWebSocket, proxyAgent, proxyReachable } from '../src/proxy.ts';
import { queryRelay } from '../src/relay-client.ts';
import { fakeRelay, manifest, type FakeRelay } from './helpers.ts';

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of closers.splice(0)) await close(); });

const listen = async <T extends NetServer | HttpServer>(server: T) => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  const sockets = new Set<Socket>();
  server.on('connection', (socket: Socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  closers.push(() => new Promise(resolve => { for (const socket of sockets) socket.destroy(); server.close(() => resolve()); }));
  return (server.address() as { port: number }).port;
};

/** A minimal SOCKS5 server: no auth, CONNECT, IPv4 and domain addresses. Counts tunnels. */
async function socks5(): Promise<{ port: number; tunnels: string[] }> {
  const tunnels: string[] = [];
  const server = createNetServer(client => {
    client.once('data', () => {
      client.write(Buffer.from([5, 0]));
      client.once('data', request => {
        const type = request[3];
        let host: string;
        let offset: number;
        if (type === 1) { host = [...request.subarray(4, 8)].join('.'); offset = 8; }
        else { const length = request[4]; host = request.subarray(5, 5 + length).toString(); offset = 5 + length; }
        const port = request.readUInt16BE(offset);
        tunnels.push(`${host}:${port}`);
        const upstream = connect(port, host, () => {
          client.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
          upstream.pipe(client);
          client.pipe(upstream);
        });
        upstream.on('error', () => client.destroy());
        client.on('error', () => upstream.destroy());
      });
    });
  });
  return { port: await listen(server), tunnels };
}

/** A minimal HTTP CONNECT proxy. */
async function connectProxy(): Promise<{ port: number; tunnels: string[] }> {
  const tunnels: string[] = [];
  const server = createHttpServer();
  server.on('connect', (req, client, head) => {
    tunnels.push(String(req.url));
    const [host, port] = String(req.url).split(':');
    const upstream = connect(Number(port), host, () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    upstream.on('error', () => client.destroy());
  });
  return { port: await listen(server), tunnels };
}

describe('proxied relay WebSockets', () => {
  let relay: FakeRelay;
  afterEach(async () => { await relay?.close(); });

  it('reaches a relay through SOCKS5', async () => {
    relay = await fakeRelay([manifest(35129, 'via-socks')]);
    const proxy = await socks5();
    const result = await queryRelay(relay.url, { kinds: [35129] }, { timeoutMs: 3000, maxFrameBytes: 512 * 1024, WebSocketImpl: proxiedWebSocket(proxyAgent(`socks5h://127.0.0.1:${proxy.port}`)) });
    expect(result).toMatchObject({ ok: true, connected: true });
    expect(result.events).toHaveLength(1);
    expect(proxy.tunnels).toEqual([relay.url.replace('ws://', '')]);
  });

  it('reaches a relay through an HTTP CONNECT proxy', async () => {
    relay = await fakeRelay([manifest(35129, 'via-http')]);
    const proxy = await connectProxy();
    const result = await queryRelay(relay.url, { kinds: [35129] }, { timeoutMs: 3000, maxFrameBytes: 512 * 1024, WebSocketImpl: proxiedWebSocket(proxyAgent(`http://127.0.0.1:${proxy.port}`)) });
    expect(result.events).toHaveLength(1);
    expect(proxy.tunnels).toHaveLength(1);
  });

  it('reports a dead proxy as not connected', async () => {
    relay = await fakeRelay([]);
    const result = await queryRelay(relay.url, { kinds: [35129] }, { timeoutMs: 3000, maxFrameBytes: 512 * 1024, WebSocketImpl: proxiedWebSocket(proxyAgent('socks5h://127.0.0.1:1')) });
    expect(result.connected).toBe(false);
  });
});

describe('proxiedFetch', () => {
  it('sends method, headers and body through SOCKS5 and returns the response', async () => {
    const seen: Array<{ method?: string; key?: string; body: string }> = [];
    const target = createHttpServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        seen.push({ method: req.method, key: req.headers.accesskey as string, body });
        res.writeHead(201, { 'content-type': 'application/json' });
        res.end('{"ok":true}');
      });
    });
    const port = await listen(target);
    const proxy = await socks5();
    const response = await proxiedFetch(proxyAgent(`socks5h://127.0.0.1:${proxy.port}`))(`http://127.0.0.1:${port}/zone/file.txt`, { method: 'PUT', headers: { AccessKey: 'pw' }, body: new Uint8Array([104, 105]) });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(seen).toEqual([{ method: 'PUT', key: 'pw', body: 'hi' }]);
    expect(proxy.tunnels).toEqual([`127.0.0.1:${port}`]);
  });
});

describe('proxyReachable', () => {
  it('detects whether the proxy accepts connections', async () => {
    const proxy = await socks5();
    expect(await proxyReachable(`socks5h://127.0.0.1:${proxy.port}`, 1000)).toBe(true);
    expect(await proxyReachable('socks5h://127.0.0.1:1', 1000)).toBe(false);
  });
});
