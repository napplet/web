import { finalizeEvent } from "nostr-tools";
import { defaultConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import {
  createDeployManifestTemplates,
  createSiteManifestTemplate,
  createSnapshotManifestTemplate,
} from "../src/manifest.ts";
import { selectManifestFormat } from "../src/manifest-format.ts";
import { migrateManifestEvent } from "../src/migrate.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const html = '<!doctype html><meta name="description" content="Read &amp; write notes">';
const key = new Uint8Array(32).fill(1);
const hash = [
  ...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(html))),
].map((byte) => byte.toString(16).padStart(2, "0")).join("");

Deno.test("current is the unattended and interactive deployment default; legacy is explicit", async () => {
  assertEquals(await selectManifestFormat(undefined, false), "current");
  let prompted = false;
  assertEquals(
    await selectManifestFormat(undefined, true, (options) => {
      prompted = true;
      assertEquals(options.defaultValue, "current");
      return Promise.resolve("current");
    }),
    "current",
  );
  assert(prompted);
  assertEquals(await selectManifestFormat("legacy", false), "legacy");
  let rejected = false;
  try {
    await selectManifestFormat("invalid", false);
  } catch {
    rejected = true;
  }
  assert(rejected);
});

Deno.test("current deploy hashes index bytes and preserves plugin metadata in snapshots", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, html);
    await Deno.writeTextFile(`${dir}/unused.txt`, "unused");
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({
        content: "Read & write notes",
        tags: [["R", "relay"], ["O", "theme"], ["z", "note"], ["i", "napplet:note/open", "id"], [
          "source",
          "https://example.com/source",
        ]],
      }),
    );
    const candidate = {
      name: "notes",
      dir,
      indexHtml: `${dir}/index.html`,
      manifestPath: `${dir}/.nip5a-manifest.json`,
    };
    const config = defaultConfig({ named: ["notes"] });
    const plan = createDeployPlan(config, [candidate], { names: ["notes"], snapshot: true });
    const deployed = await createDeployManifestTemplates(plan, config, {
      sourcePubkey: "a".repeat(64),
      createdAt: 12,
    });
    for (const manifest of deployed) {
      assertEquals(manifest.format, "current");
      assertEquals(manifest.artifactHash, hash);
      assertEquals(manifest.aggregateHash, undefined);
      assertEquals(manifest.files, [{ path: "/index.html", sha256: hash }]);
      assertEquals(manifest.template?.content, "Read & write notes");
      assert(
        manifest.template?.tags.some((tag) =>
          JSON.stringify(tag) === JSON.stringify(["i", "napplet:note/open", "id"])
        ),
      );
      assertEquals(manifest.template?.tags.filter((tag) => tag[0] === "x"), [["x", hash]]);
      assertEquals(
        manifest.template?.tags.some((tag) =>
          ["path", "description", "requires", "archetype"].includes(tag[0])
        ),
        false,
      );
    }
    assertEquals(deployed[1].template?.kind, 5129);
    assertEquals(deployed[1].template?.tags.some((tag) => tag[0] === "d"), false);
  });
});

Deno.test("current root output has no identifier and rejects empty descriptions", async () => {
  const candidate = { name: "notes", dir: "/tmp", indexHtml: "/tmp/index.html" };
  const item = { candidate, target: "root" as const, kind: 15129 };
  const files = [{ path: "/index.html", sha256: hash }];
  const event = await createSiteManifestTemplate(item, files, { content: "Notes" });
  assertEquals(event.tags, [["x", hash]]);
  assertEquals(
    createSnapshotManifestTemplate(event, { kind: 15129, pubkey: "a".repeat(64) }).content,
    "Notes",
  );
  let rejected = false;
  try {
    await createSiteManifestTemplate(item, files);
  } catch {
    rejected = true;
  }
  assert(rejected);
});

function signed(tags: string[][], content = "") {
  return finalizeEvent(
    { kind: 35129, created_at: 1, content, tags: [["d", "notes"], ...tags] },
    key,
  );
}

Deno.test("migration preserves source and direct artifact hash with explicit optional classification", () => {
  const event = signed([
    ["path", "/index.html", hash],
    ["x", "b".repeat(64), "aggregate"],
    ["description", "Read notes"],
    ["requires", "relay"],
    ["requires", "theme"],
    ["archetype", "note", "napplet:note/open"],
    ["custom", "retained"],
  ]);
  const before = JSON.stringify(event);
  const result = migrateManifestEvent(event, { optional: ["theme"], createdAt: 2 });
  assertEquals(JSON.stringify(event), before);
  assertEquals(result.sourceId, event.id);
  assertEquals(result.template.content, "Read notes");
  assertEquals(result.template.tags.filter((tag) => tag[0] === "x"), [["x", hash]]);
  assert(result.template.tags.some((tag) => tag[0] === "O" && tag[1] === "theme"));
  assert(result.template.tags.some((tag) => tag[0] === "custom"));
  assertEquals("sig" in result.template, false);
});

Deno.test("migration rejects tampering, ambiguous artifacts and absent descriptions", () => {
  const valid = signed([["path", "/index.html", hash], ["description", "Notes"]]);
  const cases = [
    { ...valid, content: "tampered" },
    signed([["path", "/index.html", hash], ["path", "/app.js", hash], ["description", "Notes"]]),
    signed([["x", "b".repeat(64), "aggregate"], ["description", "Notes"]]),
    signed([["x", hash]]),
  ];
  for (const event of cases) {
    let rejected = false;
    try {
      migrateManifestEvent(event);
    } catch {
      rejected = true;
    }
    assert(rejected);
  }
});

Deno.test("migrating current events preserves semantic fields and invalid icons fall back", () => {
  const event = signed([["x", hash], ["O", "theme"], ["i", "napplet:note/open", "id"], [
    "icon",
    "bad",
    "image/svg+xml",
  ]], "Notes");
  const result = migrateManifestEvent(event, { createdAt: 2 });
  assertEquals(result.template.tags.some((tag) => tag[0] === "icon"), false);
  const roundTrip = migrateManifestEvent(finalizeEvent(structuredClone(result.template), key), {
    createdAt: 2,
  });
  assertEquals(roundTrip.template, result.template);
});
