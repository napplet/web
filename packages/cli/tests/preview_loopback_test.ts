/** Real HTTP uploads and WebSocket publication; exclusively bound to loopback. */
import { decodeBase64Url } from "@std/encoding/base64url";
import { verifyEvent } from "nostr-tools";
import { main } from "../src/cli.ts";
import { defaultConfig } from "../src/config.ts";
import { previewDigest } from "../src/preview-video.ts";
import type { SignedNostrEvent } from "../src/types.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

Deno.test({
  name: "gameplay publication uploads exact bytes and signed NIP-92 metadata to loopback",
  ignore: Deno.env.get("NAPPLET_TEST_LOCAL_PUBLICATION") !== "1",
  fn: async () => {
    await withTempDir(async (dir) => {
      const uploads = new Map<string, Uint8Array>();
      const events: SignedNostrEvent[] = [];
      const sockets = new Set<WebSocket>();
      const errors: unknown[] = [];
      const server = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, async (request) => {
        try {
          if (request.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(request);
            sockets.add(socket);
            socket.onclose = () => sockets.delete(socket);
            socket.onmessage = ({ data }) => {
              const [type, event] = JSON.parse(data);
              if (type === "EVENT") {
                const valid = verifyEvent(event);
                if (valid) events.push(event);
                socket.send(JSON.stringify(["OK", event.id, valid, valid ? "" : "invalid signature"]));
              }
            };
            return response;
          }
          if (request.method === "HEAD") return new Response(null, { status: 404 });
          assertEquals(request.method, "PUT");
          assertEquals(new URL(request.url).pathname, "/upload");
          const bytes = new Uint8Array(await request.arrayBuffer());
          const hash = await previewDigest(bytes);
          assertEquals(request.headers.get("x-sha-256"), hash);
          const auth = JSON.parse(new TextDecoder().decode(decodeBase64Url(request.headers.get("authorization")!.slice(6))));
          assert(verifyEvent(auth));
          assert(auth.tags.some((tag: string[]) => tag[0] === "x" && tag[1] === hash));
          uploads.set(hash, bytes);
          return Response.json({ sha256: hash, size: bytes.length, type: request.headers.get("content-type"), url: `${new URL(request.url).origin}/${hash}` });
        } catch (error) { errors.push(error); return new Response("invalid upload", { status: 400 }); }
      });
      const origin = `http://127.0.0.1:${server.addr.port}`;
      const log = console.log;
      try {
        const html = await Deno.readFile(new URL("../../conformance-cli/test/fixtures/gameplay.html", import.meta.url));
        const clip = await Deno.readFile(new URL("./fixtures/gameplay-preview.webm", import.meta.url));
        const thumb = await Deno.readFile(new URL("./fixtures/gameplay-preview.png", import.meta.url));
        await Deno.mkdir(`${dir}/dist`);
        await Deno.writeFile(`${dir}/dist/index.html`, html);
        await Deno.writeFile(`${dir}/clip.webm`, clip);
        await Deno.writeFile(`${dir}/clip.png`, thumb);
        const hash = await previewDigest(clip);
        const config = defaultConfig({ sourceDir: `${dir}/dist`, relays: [origin.replace("http:", "ws:")], blossomServers: [origin], zapstore: {
          id: "org.example.recording-proof", name: "Recording proof", images: ["https://example.org/static-cover.png"],
          video: { file: `${dir}/clip.webm`, thumbnail: `${dir}/clip.png`, sha256: hash, artifactHash: await previewDigest(html), width: 480, height: 320, durationMs: 1920 },
        } });
        await Deno.writeTextFile(`${dir}/config.json`, JSON.stringify(config));
        console.log = () => {};
        const args = ["deploy", "--config", `${dir}/config.json`, "--zapstore", "--json", "--sec", "01".padStart(64, "0")];
        assertEquals(await main(args), 0);
        assertEquals(errors, []);
        assertEquals(uploads.get(hash), clip);
        assertEquals(uploads.get(await previewDigest(thumb)), thumb);
        assertEquals(uploads.get(await previewDigest(html)), html);
        assertEquals(events.length, 2);
        const [app, manifest] = events;
        assertEquals(app.kind, 32267);
        assert(app.content.includes(`${origin}/${hash}`));
        assert(app.tags.find(tag => tag[0] === "imeta")!.includes(`size ${clip.length}`));
        assert(app.tags.some(tag => tag[0] === "image" && tag[1] === "https://example.org/static-cover.png"));
        assert(manifest.tags.some(tag => tag[0] === "app" && tag[1] === `32267:${app.pubkey}:org.example.recording-proof`));
        await Deno.writeTextFile(`${dir}/dist/index.html`, new TextDecoder().decode(html) + "<!-- rebuilt -->");
        assertEquals(await main(args), 1);
        assertEquals(events.length, 2);
        assertEquals(uploads.size, 3);
      } finally {
        console.log = log;
        for (const socket of sockets) socket.close();
        await server.shutdown();
      }
    });
  },
});
