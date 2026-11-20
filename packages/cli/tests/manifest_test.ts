import { defaultConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import {
  collectManifestFiles,
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

Deno.test("collectManifestFiles skips local control paths but keeps well-known", async () => {
  await withTempDir(async (dir) => {
    await Deno.mkdir(`${dir}/.git`, { recursive: true });
    await Deno.mkdir(`${dir}/.napplet`, { recursive: true });
    await Deno.mkdir(`${dir}/.well-known`, { recursive: true });
    await Deno.mkdir(`${dir}/node_modules/pkg`, { recursive: true });
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.writeTextFile(`${dir}/.env`, "NAPPLET_CI_SIGNING_KEY=secret");
    await Deno.writeTextFile(`${dir}/.git/config`, "private");
    await Deno.writeTextFile(`${dir}/.napplet/config.yaml`, 'servers: [https://cdn.example]\n');
    await Deno.writeTextFile(`${dir}/.well-known/nostr.json`, "{}");
    await Deno.writeTextFile(`${dir}/node_modules/pkg/index.js`, "ignored");

    assertEquals((await collectManifestFiles(dir)).map((file) => file.path), [
      "/.well-known/nostr.json",
      "/index.html",
    ]);
  });
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
    { createdAt: 123, servers: ["https://cdn.example"], content: "A feed" },
  );
  assertEquals(named.kind, NAPPLET_KIND_NAMED);
  assertEquals(named.created_at, 123);
  assertEquals(named.tags[0], ["d", "feed"]);
  assertEquals(named.tags.filter((tag) => tag[0] === "x"), [["x", indexHash]]);
  assertEquals(named.content, "A feed");
  assert(named.tags.some((tag) => tag[0] === "server" && tag[1] === "https://cdn.example"));

  const root = await createSiteManifestTemplate(
    { candidate, target: "root", kind: NAPPLET_KIND_ROOT },
    files,
    { createdAt: 123, content: "A feed" },
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
      { content: "A feed" },
    );
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("Named napplet d tag"));
});

Deno.test("createSiteManifestTemplate accepts named d tags longer than 13 characters", async () => {
  const dTag = "my-very-long-napplet-name";
  const named = await createSiteManifestTemplate(
    {
      candidate: { name: dTag, dir: `/tmp/${dTag}`, indexHtml: `/tmp/${dTag}/index.html` },
      target: "named",
      dTag,
      kind: NAPPLET_KIND_NAMED,
    },
    files,
    { content: "A feed" },
  );
  assertEquals(named.tags[0], ["d", dTag]);
});

Deno.test("createSnapshotManifestTemplate copies the source artifact hash and content", async () => {
  const source = await createSiteManifestTemplate(
    {
      candidate: { name: "feed", dir: "/tmp/feed", indexHtml: "/tmp/feed/index.html" },
      target: "named",
      dTag: "feed",
      kind: NAPPLET_KIND_NAMED,
    },
    files,
    { createdAt: 123, servers: ["https://cdn.example"], content: "A feed" },
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
  assertEquals(snapshot.content, "A feed");
});

Deno.test("createDeployManifestTemplates builds dry-run templates and flags snapshots", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const candidate: NappletCandidate = {
      name: "feed",
      dir,
      indexHtml: `${dir}/index.html`,
    };
    const config = defaultConfig({ blossomServers: ["https://cdn.example"], metadata: { description: "A feed" } });
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
    const config = defaultConfig({ named: ["feed"], metadata: { description: "A feed" } });
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

Deno.test("createDeployManifestTemplates converts legacy plugin sidecar requires tags to R", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({
        tags: [
          ["requires", "relay"],
          ["requires", "storage"],
          ["requires", "count"],
        ],
      }),
    );
    const candidate: NappletCandidate = {
      name: "feed",
      dir,
      indexHtml: `${dir}/index.html`,
      manifestPath: `${dir}/.nip5a-manifest.json`,
    };
    const config = defaultConfig({ named: ["feed"], metadata: { description: "A feed" } });
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
      assertEquals(manifest.template?.tags.filter((tag) => tag[0] === "R"), [
        ["R", "relay"],
        ["R", "storage"],
        ["R", "count"],
      ]);
      assertEquals(manifest.template?.tags.some((tag) => tag[0] === "requires"), false);
    }
  });
});

Deno.test("deploy keeps unknown domains from legacy sidecars", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({ tags: [["requires", "mesh"], ["requires", " relay "], ["requires", ""]] }),
    );
    const candidate: NappletCandidate = {
      name: "dingdong",
      dir,
      indexHtml: `${dir}/index.html`,
      manifestPath: `${dir}/.nip5a-manifest.json`,
    };
    const config = defaultConfig({ named: ["dingdong"], metadata: { description: "An example napplet" } });
    const plan = createDeployPlan(config, [candidate], {});
    const manifests = await createDeployManifestTemplates(plan, config, { createdAt: 123 });

    assertEquals(manifests[0].template?.tags.filter((tag) => tag[0] === "R"), [
      ["R", "mesh"],
      ["R", "relay"],
    ]);
  });
});

Deno.test("current: deploy preserves required and optional Blossom declarations", async () => {
  for (const declaration of ["R", "O"]) {
    await withTempDir(async (dir) => {
      await Deno.writeTextFile(`${dir}/index.html`, "index");
      await Deno.writeTextFile(
        `${dir}/.nip5a-manifest.json`,
        JSON.stringify({ tags: [[declaration, "blossom"]] }),
      );
      const candidate: NappletCandidate = {
        name: "blob-browser",
        dir,
        indexHtml: `${dir}/index.html`,
        manifestPath: `${dir}/.nip5a-manifest.json`,
      };
      const config = defaultConfig({ named: ["blob-browser"], metadata: { description: "Browse blobs" } });
      const manifests = await createDeployManifestTemplates(createDeployPlan(config, [candidate], {}), config, {
        createdAt: 123,
      });
      assertEquals(
        manifests[0].template?.tags.filter((tag) => tag[0] === "R" || tag[0] === "O"),
        [[declaration, "blossom"]],
      );
    });
  }
});

Deno.test("plugin manifest requirements cover every active @napplet/nap domain", async () => {
  await withTempDir(async (dir) => {
    const napPackage = JSON.parse(
      await Deno.readTextFile(new URL("../../nap/package.json", import.meta.url)),
    ) as { exports: Record<string, unknown> };
    const activeDomains = Object.keys(napPackage.exports)
      .filter((subpath) => /^\.\/[^/]+$/.test(subpath) && subpath !== "./ifc")
      .map((subpath) => subpath.slice(2))
      .sort();
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({ tags: activeDomains.map((domain) => ["requires", domain]) }),
    );
    const candidate: NappletCandidate = {
      name: "domain-audit",
      dir,
      indexHtml: `${dir}/index.html`,
      manifestPath: `${dir}/.nip5a-manifest.json`,
    };
    const config = defaultConfig({ named: ["domain-audit"], metadata: { description: "Domain audit" } });
    const plan = createDeployPlan(config, [candidate], {});
    const manifests = await createDeployManifestTemplates(plan, config, { createdAt: 123 });

    assertEquals(
      manifests[0].template?.tags
        .filter((tag) => tag[0] === "R")
        .map((tag) => tag[1])
        .sort(),
      activeDomains,
    );
  });
});

Deno.test("createDeployManifestTemplates emits the HTML title tag and description content", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(
      `${dir}/index.html`,
      [
        "<!doctype html><html><head>",
        "<title>Feed</title>",
        '<meta name="description" content="A feed napplet">',
        "</head><body></body></html>",
      ].join(""),
    );
    const candidate: NappletCandidate = { name: "feed", dir, indexHtml: `${dir}/index.html` };
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
    // NIP-5D §Manifest: the description is event content, never a tag, on every kind.
    for (const manifest of manifests) {
      assertEquals(manifest.template?.tags.filter((tag) => tag[0] === "title"), [[
        "title",
        "Feed",
      ]]);
      assertEquals(manifest.template?.tags.some((tag) => tag[0] === "description"), false);
      assertEquals(manifest.template?.content, "A feed napplet");
    }
  });
});

Deno.test("createDeployManifestTemplates omits the title tag when the HTML title is empty", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(
      `${dir}/index.html`,
      '<!doctype html><html><head><title>   </title><meta name="description" content=""></head><body></body></html>',
    );
    const candidate: NappletCandidate = { name: "feed", dir, indexHtml: `${dir}/index.html` };
    const config = defaultConfig({ named: ["feed"], metadata: { description: "A feed" } });
    const plan = createDeployPlan(config, [candidate], { root: true });
    const manifests = await createDeployManifestTemplates(plan, config, { createdAt: 123 });

    assertEquals(manifests[0].template?.tags.some((tag) => tag[0] === "title"), false);
    assertEquals(manifests[0].template?.tags.some((tag) => tag[0] === "description"), false);
    assertEquals(manifests[0].template?.content, "A feed");
  });
});

Deno.test("createDeployManifestTemplates dedupes the title and keeps description content beside R tags", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(
      `${dir}/index.html`,
      [
        "<!doctype html><html><head>",
        "<title>First</title>",
        "<title>Second</title>",
        "<meta name='description' content='Desc &amp; more'>",
        "</head><body></body></html>",
      ].join(""),
    );
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({ tags: [["requires", "relay"]] }),
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
      // First non-empty title wins; entity-decoded description content; R coexists.
      assertEquals(manifest.template?.tags.filter((tag) => tag[0] === "title"), [
        ["title", "First"],
      ]);
      assertEquals(manifest.template?.content, "Desc & more");
      assertEquals(manifest.template?.tags.filter((tag) => tag[0] === "R"), [
        ["R", "relay"],
      ]);
    }
  });
});

Deno.test("config metadata overrides template archetype metadata", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(
      `${dir}/index.html`,
      '<html><head><title>Template title</title><meta name="description" content="Template description"></head></html>',
    );
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({
        tags: [
          ["requires", "relay"],
          ["archetype", "feed", "napplet:feed/open"],
          ["archetype", "bad", "not-a-convention"],
          ["archetype", "feed", "napplet:feed/open", "kind:1"],
          ["type", "invented"],
        ],
      }),
    );
    const candidate: NappletCandidate = {
      name: "notes",
      dir,
      indexHtml: `${dir}/index.html`,
      manifestPath: `${dir}/.nip5a-manifest.json`,
    };
    const config = defaultConfig({
      metadata: {
        name: "notes",
        title: "Notes",
        description: "CLI-owned description",
        archetypes: [{
          slug: "note",
          convention: "napplet:note/open",
        }],
      },
    });
    const plan = createDeployPlan(config, [candidate], {});
    const manifests = await createDeployManifestTemplates(plan, config, { createdAt: 123 });
    const tags = manifests[0].template?.tags ?? [];

    assertEquals(tags.filter((tag) => tag[0] === "d"), [["d", "notes"]]);
    assertEquals(tags.filter((tag) => tag[0] === "title"), [["title", "Notes"]]);
    assertEquals(manifests[0].template?.content, "CLI-owned description");
    assertEquals(tags.filter((tag) => tag[0] === "z" || tag[0] === "i"), [
      ["z", "note"],
      ["i", "napplet:note/open"],
    ]);
    assertEquals(tags.filter((tag) => tag[0] === "type"), [["type", "invented"]]);
  });
});

Deno.test("siteAddress renders root and named NIP-5D addresses", () => {
  assertEquals(siteAddress({ kind: NAPPLET_KIND_ROOT, pubkey }), `${NAPPLET_KIND_ROOT}:${pubkey}:`);
  assertEquals(
    siteAddress({ kind: NAPPLET_KIND_NAMED, pubkey, dTag: "feed" }),
    `${NAPPLET_KIND_NAMED}:${pubkey}:feed`,
  );
});
