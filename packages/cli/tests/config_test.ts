import {
  defaultConfig,
  initConfig,
  parseArchetypeContracts,
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
        archetypes: [{ slug: "note", protocol: "NAP-4", eventKinds: [1, 30023] }],
      },
    });
    const config = await readConfig(result.path);

    assertEquals(config?.named, ["note-editor"]);
    assertEquals(config?.metadata, {
      name: "note-editor",
      title: "Note Editor",
      description: "Edits long-form notes",
      archetypes: [{ slug: "note", protocol: "NAP-4", eventKinds: [1, 30023] }],
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

Deno.test("parseArchetypeContracts accepts canonical contracts and rejects invented types", () => {
  assertEquals(parseArchetypeContracts(["note:NAP-4", "note:NAP-4", "feed:NAP-5"]), [
    { slug: "note", protocol: "NAP-4", eventKinds: undefined },
    { slug: "feed", protocol: "NAP-5", eventKinds: undefined },
  ]);
  let message = "";
  try {
    parseArchetypeContracts(["note:custom-type"]);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("canonical NAP-N"));
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
