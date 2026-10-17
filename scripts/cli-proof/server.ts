/** Loopback-only Blossom/relay fixture for reproducible CLI visual evidence. */
const uploads: Array<{ server: number; bytes: number; sha256: string }> = [];
const events: Array<{ id: string; kind: number }> = [];
const blobs = [new Set<string>(), new Set<string>()];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const handler = (server: number) => async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  if (url.pathname === '/stats') return Response.json({ uploads, events });
  if (request.headers.get('upgrade') === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(request);
    socket.onmessage = async ({ data }) => {
      const message = JSON.parse(String(data));
      if (message[0] === 'EVENT') {
        const event = message[1];
        events.push({ id: event.id, kind: event.kind });
        await delay(700);
        socket.send(JSON.stringify(['OK', event.id, true, 'stored by local visual-proof fixture']));
      }
    };
    return response;
  }
  if (request.method === 'HEAD') return new Response(null, { status: blobs[server].has(url.pathname.slice(1)) ? 200 : 404 });
  if (request.method === 'PUT' && url.pathname === '/upload') {
    const bytes = new Uint8Array(await request.arrayBuffer());
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const sha256 = Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
    await delay(server === 0 ? 600 : 2400);
    blobs[server].add(sha256);
    uploads.push({ server, bytes: bytes.length, sha256 });
    return Response.json({ sha256, size: bytes.length, type: request.headers.get('content-type'), uploaded: Math.floor(Date.now() / 1000), url: `${url.origin}/${sha256}` });
  }
  return new Response('Local visual-proof fixture', { status: 404 });
};
const first = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, handler(0));
const second = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, handler(1));
console.log(JSON.stringify({ servers: [`http://127.0.0.1:${first.addr.port}`, `http://127.0.0.1:${second.addr.port}`], relay: `ws://127.0.0.1:${first.addr.port}/relay` }));
