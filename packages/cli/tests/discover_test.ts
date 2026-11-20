import { defaultConfig } from "../src/config.ts";
import { discoverNapplets, discoverProjectNapplets, findNappletProjects, hasNappletConfig } from "../src/discover.ts";
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

async function writeProject(root: string, path: string, name: string, build = true): Promise<void> {
  const dir = joinPath(root, path);
  await Deno.mkdir(joinPath(dir, ".napplet"), { recursive: true });
  await Deno.writeTextFile(joinPath(dir, ".napplet", "config.yaml"), `version: 1\nsourceDir: dist\nnamed: [${name}]\n`);
  if (build) {
    await Deno.mkdir(joinPath(dir, "dist"), { recursive: true });
    await Deno.writeTextFile(joinPath(dir, "dist", "index.html"), `<title>${name}</title>`);
  }
}

Deno.test("findNappletProjects finds per-napplet configs below a config-less root", async () => {
  await withTempDir(async (dir) => {
    await writeProject(dir, "napplets/napplet1", "napplet1");
    await writeProject(dir, "napplets/napplet2", "napplet2");
    await writeProject(dir, "napplets/napplet1/nested", "nested");
    await writeProject(dir, "node_modules/dep", "dep");
    await Deno.writeTextFile(joinPath(dir, "index.html"), "stray root page");

    assertEquals(await hasNappletConfig(dir), false);
    const projects = await findNappletProjects(dir);
    assertEquals(projects.map((project) => project.name), ["napplet1", "napplet2"]);
    assertEquals(projects[0].configPath, joinPath(dir, "napplets", "napplet1", ".napplet", "config.yaml"));
  });
});

Deno.test("discoverProjectNapplets resolves builds from each project's own sourceDir", async () => {
  await withTempDir(async (dir) => {
    await writeProject(dir, "napplets/napplet1", "napplet1");
    await writeProject(dir, "napplets/unbuilt", "unbuilt", false);

    const { candidates, unbuilt } = await discoverProjectNapplets(await findNappletProjects(dir), dir);
    assertEquals(candidates.map(({ name, project, dir: build }) => ({ name, project, build })), [
      { name: "napplet1", project: "napplets/napplet1", build: joinPath(dir, "napplets", "napplet1", "dist") },
    ]);
    assertEquals(unbuilt.map((project) => project.name), ["unbuilt"]);
  });
});
