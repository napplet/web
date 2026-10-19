import { initConfig, readConfig, writeConfig, setSigningKeyReference } from "../src/config.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

Deno.test("hand-edited YAML supports comments, quoted strings, and signing updates", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/settings.yml`;
    await Deno.writeTextFile(path, '# deployment settings\nsourceDir: dist # built files\nnamed: ["001"] # preserve this name\nsigning:\n  mode: interactive # signing policy\n  keyReference: old # selected key\nextra:\n  enabled: false # feature flag\n');
    const config = await readConfig(path);
    assert(config);
    assertEquals(config.named, ["001"]);
    await writeConfig(setSigningKeyReference(config, "new"), path);
    const text = await Deno.readTextFile(path);
    for (const comment of ["# deployment settings", "# built files", "# preserve this name", "# signing policy", "# selected key", "# feature flag"]) assert(text.includes(comment), text);
    assertEquals((await readConfig(path))?.signing?.keyReference, "new");
    if (Deno.build.os !== "windows") {
      await Deno.chmod(path, 0o640);
      await writeConfig(config, path);
      assertEquals((await Deno.stat(path)).mode! & 0o777, 0o640);
    }
  });
});

Deno.test("invalid YAML cannot be read or overwritten", async () => {
  for (const text of ["sourceDir: [", "sourceDir: one\nsourceDir: two\n", "- item\n", "extra: .inf\n", "extra: &loop [*loop]\n", "extra: !unknown value\n"]) {
    await withTempDir(async (dir) => {
      const path = `${dir}/config.yaml`;
      await Deno.writeTextFile(path, text);
      for (const operation of [() => readConfig(path), () => initConfig({ path, force: true })]) {
        let rejected = false;
        try { await operation(); } catch { rejected = true; }
        assert(rejected, text);
        assertEquals(await Deno.readTextFile(path), text);
      }
    });
  }
});

Deno.test("init supports custom yml paths and creates owner-only YAML", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/custom/settings.yml`;
    const result = await initConfig({ path, sourceDir: "dist" });
    assertEquals(result.path, path);
    assert((await Deno.readTextFile(path)).includes("sourceDir: dist"));
    if (Deno.build.os !== "windows") assertEquals((await Deno.stat(path)).mode! & 0o777, 0o600);
  });
});
