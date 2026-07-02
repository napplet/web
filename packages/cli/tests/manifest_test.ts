import { defaultConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import {
  collectManifestFiles,
  computeAggregateHash,
  createDeployManifestTemplates,
  createSiteManifestTemplate,
  createSnapshotManifestTemplate,
  siteAddress,
} from "../src/manifest.ts";
import {
  type ManifestFileMapping,
  NAPPLET_KIND_NAMED,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_SNAPSHOT,
  type NappletCandidate,
} from "../src/types.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const indexHash = "1bc04b5291c26a46d918139138b992d2de976d6851d0893b0476b85bfbdfc6e6";
const assetHash = "a172cedcae47474b615c54d510a5d84a8dea3032e958587430b413538be3f333";
const pubkey = "a".repeat(64);

const files: ManifestFileMapping[] = [
  { path: "/index.html", sha256: indexHash },
  { path: "/assets/app.js", sha256: assetHash },
];

Deno.test("collectManifestFiles hashes dist files and excludes generated manifests", async () => {
  await withTempDir(async (dir) => {
    await Deno.mkdir(`${dir}/assets`, { recursive: true });
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.writeTextFile(`${dir}/assets/app.js`, "app");
    await Deno.writeTextFile(`${dir}/.nip5a-manifest.json`, "ignored");

    assertEquals(await collectManifestFiles(dir), [
      { path: "/assets/app.js", sha256: assetHash },
      { path: "/index.html", sha256: indexHash },
    ]);
  });
});

Deno.test("computeAggregateHash is order-independent and uses only path mappings", async () => {
  const first = await computeAggregateHash(files);
  const second = await computeAggregateHash([...files].reverse());
  assertEquals(first, second);
  assertEquals(first.length, 64);
});

Deno.test("createSiteManifestTemplate builds NIP-5D named and root manifests", async () => {
  const candidate: NappletCandidate = {
    name: "feed",
    dir: "/tmp/feed/dist",
    indexHtml: "/tmp/feed/dist/index.html",
  };
  const named = await createSiteManifestTemplate(
    { candidate, target: "named", dTag: "feed", kind: NAPPLET_KIND_NAMED },
    files,
    { createdAt: 123, servers: ["https://cdn.example"] },
  );
  assertEquals(named.kind, NAPPLET_KIND_NAMED);
  assertEquals(named.created_at, 123);
  assertEquals(named.tags[0], ["d", "feed"]);
  assertEquals(named.tags.filter((tag) => tag[0] === "x").length, 1);
  assert(named.tags.some((tag) => tag[0] === "server" && tag[1] === "https://cdn.example"));

  const root = await createSiteManifestTemplate(
    { candidate, target: "root", kind: NAPPLET_KIND_ROOT },
    files,
    { createdAt: 123 },
  );
  assertEquals(root.kind, NAPPLET_KIND_ROOT);
  assertEquals(root.tags.some((tag) => tag[0] === "d"), false);
});

Deno.test("createSiteManifestTemplate rejects invalid named d tags", async () => {
  let message = "";
  try {
    await createSiteManifestTemplate(
      {
        candidate: { name: "bad", dir: "/tmp/bad", indexHtml: "/tmp/bad/index.html" },
        target: "named",
        dTag: "Bad Name",
        kind: NAPPLET_KIND_NAMED,
      },
      files,
    );
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("Named napplet d tag"));
});

Deno.test("createSnapshotManifestTemplate copies source paths and exact aggregate", async () => {
  const source = await createSiteManifestTemplate(
    {
      candidate: { name: "feed", dir: "/tmp/feed", indexHtml: "/tmp/feed/index.html" },
      target: "named",
      dTag: "feed",
      kind: NAPPLET_KIND_NAMED,
    },
    files,
    { createdAt: 123, servers: ["https://cdn.example"] },
  );
  const snapshot = createSnapshotManifestTemplate(
    source,
    { kind: NAPPLET_KIND_NAMED, pubkey, dTag: "feed" },
    { createdAt: 456 },
  );
  assertEquals(snapshot.kind, NAPPLET_KIND_SNAPSHOT);
  assertEquals(snapshot.created_at, 456);
  assertEquals(snapshot.tags[0], ["a", `${NAPPLET_KIND_NAMED}:${pubkey}:feed`]);
  assertEquals(
    snapshot.tags.find((tag) => tag[0] === "x"),
    source.tags.find((tag) => tag[0] === "x"),
  );
});

Deno.test("createDeployManifestTemplates builds dry-run templates and flags snapshots", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const candidate: NappletCandidate = {
      name: "feed",
      dir,
      indexHtml: `${dir}/index.html`,
    };
    const config = defaultConfig({ blossomServers: ["https://cdn.example"] });
    const plan = createDeployPlan(config, [candidate], { root: true, snapshot: true });
    const manifests = await createDeployManifestTemplates(plan, config, { createdAt: 123 });
    assertEquals(manifests.length, 2);
    assertEquals(manifests[0].template?.kind, NAPPLET_KIND_ROOT);
    assertEquals(manifests[1].template, undefined);
    assert(manifests[1].skippedReason?.includes("signer pubkey"));
  });
});

Deno.test("createDeployManifestTemplates builds snapshot templates with a signer pubkey", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const candidate: NappletCandidate = {
      name: "feed",
      dir,
      indexHtml: `${dir}/index.html`,
    };
    const config = defaultConfig({ named: ["feed"] });
    const plan = createDeployPlan(config, [candidate], { snapshot: true });
    const manifests = await createDeployManifestTemplates(plan, config, {
      createdAt: 123,
      sourcePubkey: pubkey,
    });
    assertEquals(manifests.length, 2);
    assertEquals(manifests[0].template?.kind, NAPPLET_KIND_NAMED);
    assertEquals(manifests[1].template?.kind, NAPPLET_KIND_SNAPSHOT);
    assertEquals(
      manifests[1].template?.tags.find((tag) => tag[0] === "a"),
      ["a", `${NAPPLET_KIND_NAMED}:${pubkey}:feed`],
    );
    assertEquals(manifests[1].skippedReason, undefined);
  });
});

Deno.test("createDeployManifestTemplates preserves plugin-emitted requires tags", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({
        tags: [
          ["requires", "relay"],
          ["requires", "storage"],
          ["server", "https://ignored.example"],
        ],
      }),
    );
    const candidate: NappletCandidate = {
      name: "feed",
      dir,
      indexHtml: `${dir}/index.html`,
      manifestPath: `${dir}/.nip5a-manifest.json`,
    };
    const config = defaultConfig({ named: ["feed"] });
    const plan = createDeployPlan(config, [candidate], {
      root: true,
      names: ["feed"],
      snapshot: true,
    });
    const manifests = await createDeployManifestTemplates(plan, config, {
      createdAt: 123,
      sourcePubkey: pubkey,
    });

    assertEquals(manifests.length, 4);
    for (const manifest of manifests) {
      assertEquals(manifest.template?.tags.filter((tag) => tag[0] === "requires"), [
        ["requires", "relay"],
        ["requires", "storage"],
      ]);
      assertEquals(
        manifest.template?.tags.some((tag) =>
          tag[0] === "server" && tag[1] === "https://ignored.example"
        ),
        false,
      );
    }
  });
});

Deno.test("siteAddress renders root and named NIP-5D addresses", () => {
  assertEquals(siteAddress({ kind: NAPPLET_KIND_ROOT, pubkey }), `${NAPPLET_KIND_ROOT}:${pubkey}:`);
  assertEquals(
    siteAddress({ kind: NAPPLET_KIND_NAMED, pubkey, dTag: "feed" }),
    `${NAPPLET_KIND_NAMED}:${pubkey}:feed`,
  );
});
