// Run the CLI's real Blossom and relay call sites through local HTTP and SOCKS5 proxies and report what each saw.
// The Blossom server and relay are addressed by reserved `.test` names that only the test proxies resolve, so any
// connection that bypasses the proxy fails instead of quietly succeeding. Driven by tests/proxy_test.ts; prints
// one JSON report on stdout.
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { uploadFilesToServers } from "../../src/blossom-upload.ts";
import { publishEventWithSimplePool } from "../../src/deploy-network.ts";
import { activeProxy, closeProxy, configureProxy, networkWebSocket } from "../../src/network.ts";
import { closeNostrConnectPool, ensureNostrConnectPool } from "../../src/nostr-connect-pool.ts";
import { getRelaySuggestions } from "../../src/suggestions.ts";
import type { NappletSigner } from "../../src/signing.ts";

const target: string[] = [];
const data = new TextEncoder().encode("x");
const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)), (byte) => byte.toString(16).padStart(2, "0")).join("");
const proxied: string[] = [];

// A local Blossom server and relay in one: PUT /upload, HEAD /<sha256>, NIP-11, and a relay socket.
const server = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (request) => {
  const url = new URL(request.url);
  if (request.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(request);
    target.push("relay socket");
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(String(data));
      if (message[0] === "EVENT") socket.send(JSON.stringify(["OK", message[1].id, true, ""]));
      if (message[0] === "REQ") socket.send(JSON.stringify(["EOSE", message[1]]));
    };
    return response;
  }
  if (request.headers.get("accept") === "application/nostr+json") {
    target.push("nip-11");
    return Response.json({ name: "probe relay" });
  }
  target.push(`${request.method} ${url.pathname}`);
  if (request.method === "HEAD") return new Response(null, { status: 404 });
  return Response.json({ url: `${url.origin}/${sha256}`, sha256, size: data.length, type: "text/html", uploaded: 0 });
});
const targetPort = server.addr.port;

async function pipe(a: Deno.Conn, b: Deno.Conn, head?: Uint8Array) {
  if (head?.length) await b.write(head);
  await Promise.allSettled([a.readable.pipeTo(b.writable), b.readable.pipeTo(a.writable)]);
}

async function readSome(conn: Deno.Conn, size = 8192): Promise<Uint8Array> {
  const buffer = new Uint8Array(size);
  const read = await conn.read(buffer);
  return buffer.subarray(0, read ?? 0);
}

// HTTP proxy: CONNECT tunnels, and absolute-form requests forwarded as-is.
const httpProxy = Deno.listen({ hostname: "127.0.0.1", port: 0 });
(async () => {
  for await (const conn of httpProxy) {
    (async () => {
      const head = await readSome(conn);
      const line = new TextDecoder().decode(head).split("\r\n")[0];
      const connect = line.match(/^CONNECT ([^:\s]+):(\d+)/);
      const absolute = line.match(/^[A-Z]+ http:\/\/([^:/\s]+):(\d+)/);
      const [, hostname, port] = connect ?? absolute ?? [];
      if (!hostname) return conn.close();
      proxied.push(`http ${connect ? "CONNECT" : "forward"} ${hostname}`);
      const upstream = await Deno.connect(resolve(hostname, Number(port)));
      if (connect) {
        await conn.write(new TextEncoder().encode("HTTP/1.1 200 Connection Established\r\n\r\n"));
        await pipe(conn, upstream);
      } else {
        await pipe(conn, upstream, head);
      }
    })().catch(() => {});
  }
})();

// SOCKS5 proxy without authentication: CONNECT by IPv4 or host name.
const socksProxy = Deno.listen({ hostname: "127.0.0.1", port: 0 });
(async () => {
  for await (const conn of socksProxy) {
    (async () => {
      await readSome(conn, 16);
      await conn.write(new Uint8Array([5, 0]));
      const request = await readSome(conn, 512);
      let hostname: string;
      let offset: number;
      if (request[3] === 3) {
        hostname = new TextDecoder().decode(request.subarray(5, 5 + request[4]));
        offset = 5 + request[4];
      } else {
        hostname = [...request.subarray(4, 8)].join(".");
        offset = 8;
      }
      const port = (request[offset] << 8) | request[offset + 1];
      proxied.push(`socks5 CONNECT ${hostname}`);
      const upstream = await Deno.connect(resolve(hostname, port));
      await conn.write(new Uint8Array([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
      await pipe(conn, upstream);
    })().catch(() => {});
  }
})();

/** Only the proxies know where the `.test` services live. */
function resolve(hostname: string, port: number): Deno.ConnectOptions {
  if (!hostname.endsWith(".proxy.test")) throw new Error(`unexpected proxy target ${hostname}`);
  return { hostname: "127.0.0.1", port };
}

const secret = generateSecretKey();
const signer: NappletSigner = {
  pubkey: getPublicKey(secret),
  sign: (template) => Promise.resolve(finalizeEvent(template, secret)),
};
const relay = `ws://relay.proxy.test:${targetPort}/`;
const blossom = `http://blossom.proxy.test:${targetPort}`;

/** Exercise every Blossom and relay call site once, with whatever proxy is configured; failures are reported, not thrown. */
async function exercise() {
  const settle = async <T>(work: () => Promise<T>) => { try { return await work(); } catch { return undefined; } };
  const event = () => finalizeEvent({ kind: 1, created_at: Math.floor(Date.now() / 1000), tags: [], content: "proxy probe" }, secret);
  const uploads = await settle(() => uploadFilesToServers([{ candidateDir: ".", path: "/index.html", sha256, data, contentType: "text/html" }], [blossom], signer));
  const published = await settle(() => publishEventWithSimplePool([relay], event()));
  await settle(() => getRelaySuggestions({ relays: [relay], maxWait: 1_000 }));
  // The NIP-46 signer pool: a publish opens its socket, and applesauce fetches NIP-11 as it connects.
  const signerRelay = ensureNostrConnectPool().relay(relay);
  const signerPublish = await settle(() => signerRelay.publish(event(), { timeout: 3_000 }));
  const information = await settle(() => signerRelay.getInformation());
  closeNostrConnectPool();
  return {
    uploaded: uploads?.every((result) => result.success) ?? false,
    published: published?.every((result) => result.success) ?? false,
    signerPublished: signerPublish?.ok ?? false,
    information: information?.name ?? null,
  };
}

const lifecycle = {
  configured: configureProxy("socks5h://user:secret@127.0.0.1:9050"),
  active: activeProxy(),
  proxiedSocket: networkWebSocket() !== WebSocket,
  sameConstants: networkWebSocket().OPEN === WebSocket.OPEN,
  afterClose: (closeProxy(), activeProxy() ?? null),
  directSocket: networkWebSocket() === WebSocket,
};

const report: Record<string, unknown> = {};
for (const [label, url] of [
  ["direct", undefined],
  ["http", `http://127.0.0.1:${(httpProxy.addr as Deno.NetAddr).port}`],
  ["socks5h", `socks5h://127.0.0.1:${(socksProxy.addr as Deno.NetAddr).port}`],
] as const) {
  target.length = 0;
  proxied.length = 0;
  configureProxy(url);
  const result = await exercise();
  closeProxy();
  report[label] = { ...result, target: [...target].sort(), proxied: [...new Set(proxied)].sort() };
}
console.log(JSON.stringify({ targetPort, lifecycle, report }));
Deno.exit(0);
