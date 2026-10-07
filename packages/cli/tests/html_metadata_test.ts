import { finalizeEvent, getPublicKey } from "nostr-tools";
import { defaultConfig } from "../src/config.ts";
import { discoverNapplets } from "../src/discover.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { createDeployManifestTemplates } from "../src/manifest.ts";
import { readManifestMetadataTags } from "../src/manifest-metadata.ts";
import { readHtmlPublishingMetadata } from "../src/html-metadata.ts";
import { collectDeployFilePayloads, executeNetworkDeploy } from "../src/deploy-network.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

Deno.test("supported PNG, JPEG and WebP icon fixtures recover exact bytes and hashes", async () => {
  const icons = JSON.parse(
    await Deno.readTextFile(
      new URL("../../../tests/fixtures/publishing-icons.json", import.meta.url),
    ),
  ) as Array<{ mimeType: string; base64: string; sha256: string }>;
  for (const icon of icons) {
    const result = await readHtmlPublishingMetadata(
      `<head><link rel="icon" href="data:${icon.mimeType};base64,${icon.base64}" type="${icon.mimeType}"></head>`,
    );
    assertEquals(result.icon?.sha256, icon.sha256);
    assertEquals(result.icon?.mimeType, icon.mimeType);
    assertEquals([...result.icon!.data], [
      ...Uint8Array.from(atob(icon.base64), (c) => c.charCodeAt(0)),
    ]);
  }
});

const html = await Deno.readTextFile(
  new URL("../../../tests/fixtures/publishing-metadata.html", import.meta.url),
);
const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOZkAAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);
async function hash(data: Uint8Array): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(data)))].map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

Deno.test("standalone HTML recovers named metadata, final-byte hash and identical icon upload bytes", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, html);
    const config = defaultConfig({ sourceDir: dir });
    const candidates = await discoverNapplets(config);
    const plan = createDeployPlan(config, candidates);
    assertEquals(plan.items[0].dTag, "portable-notes");
    assertEquals(createDeployPlan(config, candidates, { root: true }).items.map((item) => item.target), ["root"]);
    const manifests = await createDeployManifestTemplates(plan, config);
    const template = manifests[0].template!;
    assertEquals(template.kind, 35129);
    assertEquals(template.content, 'Notes with "quotes" & <tags>');
    for (
      const tag of [
        ["d", "portable-notes"],
        ["title", "Read & write 📝"],
        ["z", "note"],
        ["z", "feed"],
        ["i", "napplet:feed/edit", "filters", "relays"],
        ["R", "relay"],
        ["R", "storage"],
        ["O", "theme"],
        ["source", "https://example.com/source?a=1&b=2"],
        ["server", "https://blossom.example.com"],
        ["icon", await hash(png), "image/png"],
        ["x", await hash(new TextEncoder().encode(html))],
      ]
    ) {
      assert(
        template.tags.some((t) => JSON.stringify(t) === JSON.stringify(tag)),
        `Missing ${JSON.stringify(tag)}`,
      );
    }
    assert(!JSON.stringify(template).includes("-fake"));
    const payloads = await collectDeployFilePayloads(manifests);
    assertEquals(payloads.length, 2);
    const icon = payloads.find((p) => p.contentType === "image/png")!;
    assertEquals([...icon.data], [...png]);
    assertEquals(icon.sha256, await hash(icon.data));
    assertEquals(await Deno.readTextFile(`${dir}/index.html`), html);
    const entries = [];
    for await (const entry of Deno.readDir(dir)) entries.push(entry.name);
    assertEquals(entries, ["index.html"]);

    const signer = {
      pubkey: getPublicKey(new Uint8Array(32).fill(1)),
      sign: (event: Parameters<typeof finalizeEvent>[0]) =>
        Promise.resolve(finalizeEvent(event, new Uint8Array(32).fill(1))),
    };
    manifests[0].signedEvent = await signer.sign(template);
    const uploaded: Uint8Array[] = [];
    await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: [] },
      signer,
      {
        fetch: async (_url, init) => {
          if (init?.method === "HEAD") return new Response(null, { status: 404 });
          const bytes = new Uint8Array(await (init?.body as Blob).arrayBuffer());
          uploaded.push(bytes);
          return Response.json({ sha256: await hash(bytes) });
        },
        publish: async (relays, event) =>
          relays.map((relay) => ({ relay, eventId: event.id, success: true })),
      },
    );
    assertEquals(uploaded.filter((data) => data.length === png.length).length, 2);
    for (const data of uploaded.filter((data) => data.length === png.length)) {
      assertEquals([...data], [...png]);
    }
  });
});

Deno.test("config and selection override sidecar and head; absent categories fall back to HTML", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, html);
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({
        content: "Sidecar",
        tags: [["title", "Sidecar title"], ["R", "identity"], ["z", "profile"]],
      }),
    );
    const config = defaultConfig({
      sourceDir: dir,
      named: ["configured"],
      blossomServers: ["https://configured.example"],
      metadata: { description: "Configured", optional: ["identity"] },
    });
    const candidates = await discoverNapplets(config);
    const tags = await readManifestMetadataTags(
      candidates[0].indexHtml,
      candidates[0].manifestPath,
      config,
    );
    assertEquals(tags.filter((t) => t[0] === "description"), [["description", "Configured"]]);
    assertEquals(tags.filter((t) => t[0] === "R"), []);
    assertEquals(tags.filter((t) => t[0] === "z"), [["z", "profile"]]);
    assertEquals(tags.filter((t) => t[0] === "title"), [["title", "Sidecar title"]]);
    const manifests = await createDeployManifestTemplates(
      createDeployPlan(config, candidates, { names: ["selected"] }),
      config,
    );
    assertEquals(manifests[0].template!.tags.filter((t) => t[0] === "d"), [["d", "selected"]]);
    assertEquals(manifests[0].template!.tags.filter((t) => t[0] === "server"), [[
      "server",
      "https://configured.example",
    ]]);
  });
});

Deno.test("root and named output omit HTML lineage; snapshots retain explicit source provenance", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(
      `${dir}/index.html`,
      html.replace(
        "</head>",
        '<meta name="napplet-parent" content="untrusted-parent"><meta name="napplet-root" content="untrusted-root"></head>',
      ),
    );
    const config = defaultConfig({ sourceDir: dir });
    const candidates = await discoverNapplets(config);
    const manifests = await createDeployManifestTemplates(
      createDeployPlan(config, candidates, { root: true, names: ["selected"], snapshot: true }),
      config,
      { sourcePubkey: "a".repeat(64) },
    );
    for (const manifest of manifests) {
      const tags = manifest.template!.tags;
      if (manifest.template!.kind === 5129) {
        assertEquals(tags.filter((t) => t[0] === "d"), []);
        assert(tags.some((t) => t[0] === "a" && t[1].includes("a".repeat(64))));
      } else assertEquals(tags.filter((t) => ["a", "A"].includes(t[0])), []);
      if (manifest.template!.kind === 15129) assertEquals(tags.filter((t) => t[0] === "d"), []);
    }
  });
});

Deno.test("head reader ignores malformed/unsupported icons and metadata outside the head", async () => {
  const minimal = await readHtmlPublishingMetadata(
    '<head><meta name="description" content="Only description"></head><body><title>Wrong</title></body>',
  );
  assertEquals(minimal.tags, [["description", "Only description"]]);
  for (
    const url of [
      "data:image/svg+xml,<svg/>",
      "data:image/png;base64,!!!",
      "data:image/png;base64,",
      "https://example.com/icon.png",
    ]
  ) {
    assertEquals(
      (await readHtmlPublishingMetadata(`<head><link rel="icon" href="${url}"></head>`)).icon,
      undefined,
    );
  }
  const url = `data:image/png,${
    [...png].map((b) => `%${b.toString(16).padStart(2, "0")}`).join("")
  }`;
  assertEquals(
    (await readHtmlPublishingMetadata(`<head><link rel="icon" href="${url}"></head>`)).icon?.sha256,
    await hash(png),
  );
});
