import { defaultConfig, initConfig, readConfig } from "../src/config.ts";
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
  });
});
