import {
  defaultConfig,
  initConfig,
  normalizeConfig,
  parseArchetypeConventions,
  readConfig,
  setSigningKeyReference,
  setSigningRemote,
} from "../src/config.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

Deno.test("defaultConfig uses a singular .napplet-style project model", () => {
  const config = defaultConfig();
  assertEquals(config.version, 1);
  assertEquals(config.sourceDir, ".");
  assertEquals(config.defaultTarget, "named");
  assertEquals(config.discover?.roots, ["."]);
});

Deno.test("initConfig writes .napplet/config.json", async () => {
  await withTempDir(async (dir) => {
    const result = await initConfig({
      cwd: dir,
      sourceDir: "dist",
      relays: ["wss://relay.example"],
      blossomServers: ["https://cdn.example"],
      named: ["feed"],
    });
    assert(result.created);
    assert(result.path.endsWith(".napplet/config.json"));
    const config = await readConfig(result.path);
    assertEquals(config?.sourceDir, "dist");
    assertEquals(config?.named, ["feed"]);
    assertEquals(config?.defaultTarget, "named");
  });
});

Deno.test("initConfig persists CLI-owned deploy metadata", async () => {
  await withTempDir(async (dir) => {
    const result = await initConfig({
      cwd: dir,
      named: ["note-editor"],
      metadata: {
        name: "note-editor",
        title: "Note Editor",
        description: "Edits long-form notes",
        archetypes: [{
          slug: "note",
          convention: "napplet:note/open",
        }],
      },
    });
    const config = await readConfig(result.path);

    assertEquals(config?.named, ["note-editor"]);
    assertEquals(config?.metadata, {
      name: "note-editor",
      title: "Note Editor",
      description: "Edits long-form notes",
      archetypes: [{
        slug: "note",
        convention: "napplet:note/open",
      }],
    });
  });
});

Deno.test("readConfig preserves legacy named configs without metadata", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(
      path,
      JSON.stringify({
        version: 1,
        sourceDir: ".",
        relays: [],
        blossomServers: [],
        defaultTarget: "named",
        named: ["legacy"],
      }),
    );
    const config = await readConfig(path);
    assertEquals(config?.named, ["legacy"]);
    assertEquals(config?.metadata, undefined);
  });
});

Deno.test("parseArchetypeConventions accepts stable identities and rejects discovery payloads", () => {
  assertEquals(parseArchetypeConventions([
    "napplet:note/open",
    "note:napplet:note/open",
    " napplet:feed/open ",
  ]), [
    { slug: "note", convention: "napplet:note/open" },
    { slug: "feed", convention: "napplet:feed/open" },
  ]);

  for (const value of [
    "note:NAP-4",
    "napplet:feed/open?source=following",
    "napplet:feed/open#fragment",
    "napplet:feed",
    "feed:napplet:feed/open?source=following",
    "feed:napplet:feed/open#fragment",
  ]) {
    let message = "";
    try {
      parseArchetypeConventions([value]);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    assert(message.includes("napplet:<archetype>/<intent>"));
  }
});

Deno.test("readConfig accepts URI archetypes alongside objects with advertised params", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, JSON.stringify({
      metadata: {
        archetypes: [
          "napplet:note/open",
          { slug: "profile", convention: "napplet:profile/open", params: ["pubkey"] },
        ],
      },
    }));
    const config = await readConfig(path);
    assertEquals(config?.metadata?.archetypes, [
      { slug: "note", convention: "napplet:note/open" },
      { slug: "profile", convention: "napplet:profile/open", params: ["pubkey"] },
    ]);
  });
});

Deno.test("invalid archetype entries identify the config field and accepted input", () => {
  for (const value of [null, 42, [], "napplet:note/open?kind=1", "napplet:note/open#handler"]) {
    let message = "";
    try {
      normalizeConfig({ metadata: { archetypes: [value] } });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    assert(message.includes("metadata.archetypes[0]"));
    assert(message.includes("napplet:"));
    assert(!message.includes("note:napplet:"));
  }
});

Deno.test("normalizeConfig preserves canonical archetype conventions", () => {
  const normalized = normalizeConfig({
    version: 1,
    metadata: {
      archetypes: [
        { slug: "note", convention: "napplet:note/open" },
        { slug: "article", convention: "napplet:article/open" },
        { slug: "profile", convention: "napplet:profile/open" },
        { slug: "profile", convention: "napplet:note/open" },
      ],
    },
  });

  assertEquals(normalized.metadata?.archetypes, [
    { slug: "note", convention: "napplet:note/open" },
    { slug: "article", convention: "napplet:article/open" },
    { slug: "profile", convention: "napplet:profile/open" },
    { slug: "profile", convention: "napplet:note/open" },
  ]);
});

Deno.test("initConfig can create a root-target config", async () => {
  await withTempDir(async (dir) => {
    const result = await initConfig({
      cwd: dir,
      sourceDir: "dist",
      defaultTarget: "root",
    });
    const config = await readConfig(result.path);

    assertEquals(config?.sourceDir, "dist");
    assertEquals(config?.defaultTarget, "root");
    assertEquals(config?.named, []);
  });
});

Deno.test("setSigningKeyReference points config signing at a stored local key", () => {
  const config = setSigningKeyReference(defaultConfig(), "default");
  assertEquals(config.signing, {
    mode: "interactive",
    keyReference: "default",
  });
});

Deno.test("setSigningRemote records a configured bunker pubkey", () => {
  const pubkey = "02".repeat(32);
  const config = setSigningRemote(defaultConfig(), {
    pubkey,
    keyReference: pubkey,
    relays: ["wss://relay.example"],
  });
  assertEquals(config.bunkerPubkey, pubkey);
  assertEquals(config.signing, {
    mode: "interactive",
    keyReference: pubkey,
    pubkey,
    relays: ["wss://relay.example"],
  });
});
