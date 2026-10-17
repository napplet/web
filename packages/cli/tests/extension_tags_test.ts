import { verifyEvent } from "nostr-tools";
import { defaultConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { createDeployManifestTemplates } from "../src/manifest.ts";
import { migrateManifestEvent } from "../src/migrate.ts";
import { createPrivateKeySigner } from "../src/signing.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const signer = createPrivateKeySigner("01".repeat(32));
const extensions = [
  ["t", "notes"],
  ["p", "a".repeat(64), "wss://relay.example", "author"],
  ["custom", "保留", "", '{"nested":[1,2]}'],
  ["custom", "repeat"],
  ["custom", "repeat"],
  ["flag"],
  ["config", "one"],
  ["config", "two"],
];
const extensionNames = new Set(extensions.map((tag) => tag[0]));

for (const format of ["current", "legacy"] as const) {
  Deno.test(`${format} publishing and snapshots preserve extension tags through signing`, async () => {
    await withTempDir(async (dir) => {
      await Deno.writeTextFile(`${dir}/index.html`, '<!doctype html><meta name="description" content="HTML fallback">');
      const metadata = { content: "Source description", tags: [["title", "Source title"], ...extensions] };
      const original = JSON.stringify(metadata);
      const manifestPath = `${dir}/.nip5a-manifest.json`;
      await Deno.writeTextFile(manifestPath, original);
      const candidate = { name: "notes", dir, indexHtml: `${dir}/index.html`, manifestPath };
      const config = defaultConfig({ named: ["notes"], metadata: { title: "Configured title", description: "Configured description" } });
      const plan = createDeployPlan(config, [candidate], { root: true, names: ["notes"], snapshot: true });
      const manifests = await createDeployManifestTemplates(plan, config, { format, sourcePubkey: signer.pubkey });
      assertEquals(manifests.length, 4);
      for (const manifest of manifests) {
        assert(manifest.template);
        assertEquals(manifest.template.tags.filter((tag) => extensionNames.has(tag[0])), extensions);
        const event = await signer.sign(manifest.template);
        assert(verifyEvent(event));
        assertEquals(event.tags.filter((tag) => extensionNames.has(tag[0])), extensions);
        assertEquals(event.tags.filter((tag) => tag[0] === "title"), [["title", "Configured title"]]);
      }
      assertEquals(await Deno.readTextFile(manifestPath), original);
    });
  });
}

Deno.test("current sidecars retain historical-looking extension names independently of content", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, '<!doctype html><meta name="description" content="HTML fallback">');
    const extra = [["description", "Opaque description"], ["description", "Another value"], ["path", "custom path payload"], ["requires", "not-a-NAP value"], ["archetype", "opaque"]];
    const manifestPath = `${dir}/.nip5a-manifest.json`;
    await Deno.writeTextFile(manifestPath, JSON.stringify({ content: "Manifest content", tags: extra }));
    const candidate = { name: "notes", dir, indexHtml: `${dir}/index.html`, manifestPath };
    const config = defaultConfig({ named: ["notes"], metadata: { archetypes: [] } });
    const [manifest] = await createDeployManifestTemplates(createDeployPlan(config, [candidate], { names: ["notes"] }), config);
    assert(manifest.template);
    assertEquals(manifest.template.content, "Manifest content");
    assertEquals(manifest.template.tags.filter((tag) => extra.some((item) => item[0] === tag[0])), extra);
  });
});

Deno.test("migration preserves current-event extension tags and their multiplicity", async () => {
  const extra = [...extensions, ["path", "extension data"], ["description", "one"], ["description", "two"], ["requires", "opaque value"], ["archetype", "opaque"]];
  const event = await signer.sign({ kind: 35129, created_at: 1, content: "Notes", tags: [["d", "notes"], ["x", "c".repeat(64)], ...extra] });
  const original = JSON.stringify(event);
  const migrated = migrateManifestEvent(event, { createdAt: 2 });
  assertEquals(migrated.template.tags.filter((tag) => !["d", "x"].includes(tag[0])), extra);
  assertEquals(migrated.template.content, event.content);
  assertEquals(JSON.stringify(event), original);
  const signed = await signer.sign(migrated.template);
  assert(verifyEvent(signed));
});

Deno.test("migration converts legacy fields while preserving repeated extension tags", async () => {
  const event = await signer.sign({
    kind: 35129, created_at: 1, content: "",
    tags: [["d", "notes"], ["path", "/index.html", "c".repeat(64)], ["x", "d".repeat(64), "aggregate"], ["description", "Notes"], ["requires", "storage"], ...extensions],
  });
  const migrated = migrateManifestEvent(event, { createdAt: 2 });
  assertEquals(migrated.template.content, "Notes");
  assertEquals(migrated.template.tags.filter((tag) => extensionNames.has(tag[0])), extensions);
  assertEquals(migrated.template.tags.filter((tag) => tag[0] === "R"), [["R", "storage"]]);
  assert(verifyEvent(await signer.sign(migrated.template)));
});
