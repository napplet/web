import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { finalizeEvent, generateSecretKey, verifyEvent } from "nostr-tools";

const THRESHOLD_BYTES = 2 * 1024 * 1024;
const SPIKE_DIR = dirname(fileURLToPath(import.meta.url));
const ASSETS = [
  ["world-map.bin", 32 * 1024 * 1024],
  ["voice-pack.bin", 12 * 1024 * 1024],
  ["textures.bin", 5.25 * 1024 * 1024],
  ["level-index.bin", 512 * 1024],
  ["shader-cache.bin", 256 * 1024],
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAssetReferences(html, assetPath, replacement) {
  const fileName = basename(assetPath);
  const variants = [`./${assetPath}`, `/${assetPath}`, assetPath, `./${fileName}`, fileName]
    .sort((a, b) => b.length - a.length);
  let next = html;
  for (const variant of variants) {
    next = next.replace(new RegExp(escapeRegex(variant), "g"), replacement);
  }
  return next;
}

function manifestScript(resources) {
  const json = JSON.stringify({ resources }).replace(/</g, "\\u003c");
  return `<script type="application/json" data-napplet-resource-manifest>${json}</script>`;
}

function injectManifest(html, resources) {
  const script = manifestScript(resources);
  return html.includes("</head>") ? html.replace("</head>", `${script}</head>`) : `${script}${html}`;
}

async function inlineEntryFiles(distDir, html) {
  const styles = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
  for (const match of styles) {
    const path = match[1].replace(/^\.\//, "").replace(/^\//, "");
    html = html.replace(match[0], `<style>${await readFile(join(distDir, path), "utf8")}</style>`);
  }
  const scripts = [...html.matchAll(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi)];
  for (const match of scripts) {
    const path = match[2].replace(/^\.\//, "").replace(/^\//, "");
    const attrs = `${match[1]}${match[3]}`.replace(/\s+/g, " ").trim();
    html = html.replace(match[0], `<script${attrs ? ` ${attrs}` : ""}>${await readFile(join(distDir, path), "utf8")}</script>`);
  }
  return html;
}

async function listFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else files.push({ absolutePath: path, relativePath: relative(root, path).replaceAll("\\", "/") });
  }
  return files;
}

async function buildFixture(root) {
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "assets"), { recursive: true });
  await writeFile(join(root, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/src/style.css"></head><body><main id="app">optimization spike</main><script type="module" src="/src/main.js"></script></body></html>`);
  const imports = ASSETS.map(([name], index) => `import asset${index} from "../assets/${name}?url";`).join("\n");
  await writeFile(join(root, "src/main.js"), `${imports}\nwindow.__spikeAssetUrls = [${ASSETS.map((_, index) => `asset${index}`).join(", ")}];\n`);
  await writeFile(join(root, "src/style.css"), `body { background-image: url("../assets/shader-cache.bin"); }`);
  for (let index = 0; index < ASSETS.length; index += 1) {
    const [name, size] = ASSETS[index];
    const block = Buffer.alloc(1024 * 1024, 31 + index);
    const pieces = [];
    let remaining = size;
    while (remaining > 0) {
      const piece = block.subarray(0, Math.min(block.length, remaining));
      pieces.push(piece);
      remaining -= piece.length;
    }
    await writeFile(join(root, "assets", name), Buffer.concat(pieces));
  }
  await build({
    root,
    base: "./",
    logLevel: "silent",
    build: {
      assetsInlineLimit: 0,
      emptyOutDir: true,
      outDir: "dist",
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
}

async function optimizeFixture(distDir) {
  let html = await readFile(join(distDir, "index.html"), "utf8");
  html = await inlineEntryFiles(distDir, html);
  const files = await listFiles(distDir);
  const candidates = [];
  for (const file of files) {
    if (file.relativePath === "index.html" || /\.(?:js|css)$/.test(file.relativePath)) continue;
    const bytes = await readFile(file.absolutePath);
    const hash = sha256(bytes);
    candidates.push({
      path: file.relativePath,
      bytes,
      hash,
      uri: `blossom:sha256:${hash}`,
      dataUri: `data:application/octet-stream;base64,${bytes.toString("base64")}`,
    });
  }
  candidates.sort((a, b) => b.bytes.length - a.bytes.length || a.path.localeCompare(b.path));

  const render = (offloaded) => {
    let rendered = html;
    const resources = [];
    for (const candidate of candidates) {
      const external = offloaded.has(candidate.hash);
      rendered = replaceAssetReferences(rendered, candidate.path, external ? candidate.uri : candidate.dataUri);
      if (external) {
        resources.push({
          uri: candidate.uri,
          sha256: candidate.hash,
          bytes: candidate.bytes.length,
          source: candidate.path,
        });
      }
    }
    return { html: injectManifest(rendered, resources), resources };
  };

  const allInline = render(new Set());
  const beforeBytes = Buffer.byteLength(allInline.html);
  const offloaded = new Set();
  let optimized = allInline;
  if (beforeBytes > THRESHOLD_BYTES) {
    for (const candidate of candidates) {
      offloaded.add(candidate.hash);
      optimized = render(offloaded);
      if (Buffer.byteLength(optimized.html) < THRESHOLD_BYTES) break;
    }
  }
  return {
    ...optimized,
    beforeBytes,
    afterBytes: Buffer.byteLength(optimized.html),
    candidates,
    offloaded: candidates.filter((candidate) => offloaded.has(candidate.hash)),
  };
}

function newestEvent(events, kind, pubkey) {
  return events
    .filter((event) => event.kind === kind && event.pubkey === pubkey)
    .sort((a, b) => b.created_at - a.created_at || b.id.localeCompare(a.id))[0];
}

function discoverUserServers(directoryEvents, relayEvents, pubkey) {
  const relayList = newestEvent(directoryEvents, 10002, pubkey);
  assert(relayList, "newest kind 10002 relay list must be found");
  const relays = relayList.tags
    .filter((tag) => tag[0] === "r" && tag[2] !== "write")
    .map((tag) => tag[1]);
  const blossomList = newestEvent(relayEvents.filter((event) => relays.includes(event.relay)), 10063, pubkey);
  assert(blossomList, "newest kind 10063 Blossom list must be found");
  return {
    relays,
    servers: blossomList.tags.filter((tag) => tag[0] === "server").map((tag) => tag[1]),
    relayListCreatedAt: relayList.created_at,
    blossomListCreatedAt: blossomList.created_at,
  };
}

async function startBlossomServer(expectedHashes) {
  const uploads = new Map();
  const server = createServer(async (request, response) => {
    if (request.method !== "PUT" || request.url !== "/upload") {
      response.writeHead(404).end();
      return;
    }
    const authorization = request.headers.authorization ?? "";
    const encoded = authorization.startsWith("Nostr ") ? authorization.slice(6) : "";
    const event = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    assert.equal(verifyEvent(event), true);
    assert.equal(event.kind, 24242);
    assert(event.tags.some((tag) => tag[0] === "t" && tag[1] === "upload"));
    for (const hash of expectedHashes) assert(event.tags.some((tag) => tag[0] === "x" && tag[1] === hash));
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    const hash = sha256(bytes);
    assert(expectedHashes.includes(hash));
    uploads.set(hash, bytes);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ sha256: hash, size: bytes.length }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return { server, uploads, url: `http://127.0.0.1:${address.port}` };
}

async function uploadOffloaded(offloaded) {
  const secretKey = generateSecretKey();
  const hashes = offloaded.map((asset) => asset.hash);
  const blossom = await startBlossomServer(hashes);
  const now = Math.floor(Date.now() / 1000);
  const event = finalizeEvent({
    kind: 24242,
    created_at: now,
    content: "Upload optimization blobs via napplet",
    tags: [["t", "upload"], ...hashes.map((hash) => ["x", hash]), ["expiration", String(now + 300)]],
  }, secretKey);
  const authorization = `Nostr ${Buffer.from(JSON.stringify(event)).toString("base64url")}`;
  try {
    for (const asset of offloaded) {
      const response = await fetch(`${blossom.url}/upload`, {
        method: "PUT",
        headers: { authorization, "content-type": "application/octet-stream" },
        body: asset.bytes,
      });
      assert.equal(response.ok, true);
      assert.equal((await response.json()).sha256, asset.hash);
    }
  } finally {
    await new Promise((resolve, reject) => blossom.server.close((error) => error ? reject(error) : resolve()));
  }
  return blossom.uploads;
}

async function resolveThroughNapResource(resources, uploaded) {
  const requested = [];
  const resource = {
    async bytesMany(urls) {
      requested.push(...urls);
      return urls.map((url) => {
        const hash = url.slice("blossom:sha256:".length);
        const bytes = uploaded.get(hash);
        return bytes
          ? { url, ok: true, blob: new Blob([bytes]), mime: "application/octet-stream" }
          : { url, ok: false, error: "not-found" };
      });
    },
  };
  const items = await resource.bytesMany(resources.map((entry) => entry.uri));
  assert.deepEqual(requested, resources.map((entry) => entry.uri));
  for (const item of items) {
    assert.equal(item.ok, true);
    assert.equal(sha256(Buffer.from(await item.blob.arrayBuffer())), item.url.slice("blossom:sha256:".length));
  }
  return items.length;
}

function renderReport(result) {
  const rows = result.candidates.map((asset) => {
    const external = result.offloaded.some((item) => item.hash === asset.hash);
    return `<tr><td>${asset.path}</td><td>${(asset.bytes.length / 1024 / 1024).toFixed(2)} MiB</td><td>${external ? "Blossom" : "inline"}</td><td><code>${asset.hash.slice(0, 16)}…</code></td></tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Napplet optimization proof</title><style>body{font:16px system-ui;max-width:960px;margin:3rem auto;padding:0 1rem;color:#17202a}h1{color:#117a65}.metric{display:inline-block;padding:1rem;margin:.5rem;background:#e8f8f5;border-radius:.5rem}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #ddd;padding:.65rem}code{font-size:.8rem}</style></head><body><h1>✓ 50 MiB napplet optimization proof</h1><div class="metric"><strong>Before</strong><br>${(result.beforeBytes / 1024 / 1024).toFixed(2)} MiB</div><div class="metric"><strong>After</strong><br>${(result.afterBytes / 1024 / 1024).toFixed(2)} MiB</div><div class="metric"><strong>Offloaded</strong><br>${result.offloaded.length} blobs</div><p>The build crossed the 2 MiB threshold, externalized assets largest-first, uploaded hash-addressed bytes to a validating local Blossom server, and resolved every embedded <code>blossom:sha256:</code> reference through NAP-RESOURCE-equivalent <code>bytesMany</code> semantics.</p><table><thead><tr><th>Asset</th><th>Size</th><th>Result</th><th>SHA-256</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

async function main() {
  const root = await mkdtemp(join(SPIKE_DIR, ".tmp-"));
  try {
    await buildFixture(root);
    const result = await optimizeFixture(join(root, "dist"));
    assert(result.beforeBytes > THRESHOLD_BYTES);
    assert(result.afterBytes < THRESHOLD_BYTES);
    assert.deepEqual(result.offloaded.map((asset) => asset.bytes.length), [...result.offloaded].map((asset) => asset.bytes.length).sort((a, b) => b - a));
    assert(result.resources.every((entry) => entry.uri === `blossom:sha256:${entry.sha256}`));
    assert(result.resources.every((entry) => result.html.includes(entry.uri)));
    const uploaded = await uploadOffloaded(result.offloaded);
    assert.equal(uploaded.size, result.offloaded.length);
    const resolved = await resolveThroughNapResource(result.resources, uploaded);
    assert.equal(resolved, result.resources.length);

    const pubkey = "ab".repeat(32);
    const discovery = discoverUserServers([
      { id: "old", kind: 10002, pubkey, created_at: 10, tags: [["r", "wss://old.example"]] },
      { id: "new", kind: 10002, pubkey, created_at: 20, tags: [["r", "wss://one.example"], ["r", "wss://write.example", "write"], ["r", "wss://two.example", "read"]] },
    ], [
      { id: "b-old", relay: "wss://one.example", kind: 10063, pubkey, created_at: 30, tags: [["server", "https://old.example"]] },
      { id: "b-new", relay: "wss://two.example", kind: 10063, pubkey, created_at: 40, tags: [["server", "https://blossom.one"], ["server", "https://blossom.two"]] },
    ], pubkey);
    assert.deepEqual(discovery.relays, ["wss://one.example", "wss://two.example"]);
    assert.deepEqual(discovery.servers, ["https://blossom.one", "https://blossom.two"]);

    await writeFile(join(SPIKE_DIR, "report.html"), renderReport(result));
    console.log(JSON.stringify({
      thresholdBytes: THRESHOLD_BYTES,
      wouldBeSingleFileBytes: result.beforeBytes,
      optimizedIndexBytes: result.afterBytes,
      offloaded: result.offloaded.map((asset) => ({ path: asset.path, bytes: asset.bytes.length, uri: asset.uri })),
      napResourceResolved: resolved,
      discovery,
      report: join(SPIKE_DIR, "report.html"),
    }, null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await main();
