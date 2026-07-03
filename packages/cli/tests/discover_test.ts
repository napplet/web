import { defaultConfig } from "../src/config.ts";
import { discoverNapplets } from "../src/discover.ts";
import { joinPath } from "../src/path.ts";
import { assertEquals, withTempDir } from "./assert.ts";

Deno.test("discoverNapplets prefers built dist/index.html", async () => {
  await withTempDir(async (dir) => {
    await Deno.mkdir(joinPath(dir, "dist"), { recursive: true });
    await Deno.writeTextFile(joinPath(dir, "index.html"), "<script src='/src/main.ts'></script>");
    await Deno.writeTextFile(joinPath(dir, "dist", "index.html"), "<script>built</script>");

    const candidates = await discoverNapplets(defaultConfig({ sourceDir: "." }), { cwd: dir });
    assertEquals(candidates.length, 1);
    assertEquals(candidates[0].dir, joinPath(dir, "dist"));
    assertEquals(candidates[0].name, "root");
  });
});

Deno.test("discoverNapplets traverses configured roots and stages each napplet once", async () => {
  await withTempDir(async (dir) => {
    await Deno.mkdir(joinPath(dir, "one", "dist"), { recursive: true });
    await Deno.mkdir(joinPath(dir, "two"), { recursive: true });
    await Deno.writeTextFile(joinPath(dir, "one", "dist", "index.html"), "one");
    await Deno.writeTextFile(joinPath(dir, "two", "index.html"), "two");

    const candidates = await discoverNapplets(defaultConfig(), { cwd: dir, traverse: true });
    assertEquals(candidates.map((candidate) => candidate.name), ["one", "two"]);
  });
});
