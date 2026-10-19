import { finalizeEvent, verifyEvent } from "nostr-tools";
import { normalizeConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { createDeployManifestTemplates } from "../src/manifest.ts";
import { readManifestMetadataTags } from "../src/manifest-metadata.ts";
import { inferRepositorySource, repositorySourceUrl } from "../src/repository-source.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

async function git(directory: string, ...args: string[]): Promise<void> {
  const output = await new Deno.Command("git", { args: ["-C", directory, ...args], stdout: "piped", stderr: "piped" }).output();
  assert(output.success, new TextDecoder().decode(output.stderr));
}

Deno.test("repository source normalizes clone URLs without publishing credentials", () => {
  for (const [remote, expected] of [
    ["git@github.com:napplet/web.git", "https://github.com/napplet/web"],
    ["ssh://git@gitlab.com:2222/group/project.git", "https://gitlab.com/group/project"],
    ["https://user:token@github.com/napplet/web.git/?token=secret#ref", "https://github.com/napplet/web"],
    ["http://forge.example:3000/team/repo", "http://forge.example:3000/team/repo"],
    ["https://gitlab.com/group/subgroup/repo.git", "https://gitlab.com/group/subgroup/repo"],
    ["/local/repo.git", undefined], ["../repo", undefined], ["file:///local/repo", undefined],
    ["C:\\local\\repo.git", undefined], ["git://host/repo", undefined],
    ["git@host:~/repo.git", undefined], ["https://github.com/", undefined],
  ]) assertEquals(repositorySourceUrl(remote!), expected);
});

Deno.test("source override accepts one URL or false and rejects arrays and unsafe values", () => {
  assertEquals(normalizeConfig({ metadata: { source: " https://example.org/archive.tar.gz " } }).metadata?.source, "https://example.org/archive.tar.gz");
  assertEquals(normalizeConfig({ metadata: { source: false } }).metadata?.source, false);
  for (const source of [[], ["https://a.example", "https://b.example"], true, null, "", "git@host:repo", "https:example.org", "//example.org/repo", "file:///repo", "https://user:secret@example.org/repo"]) {
    let error = "";
    try { normalizeConfig({ metadata: { source } }); } catch (caught) { error = String(caught); }
    assert(error.includes("metadata.source"));
    assert(!error.includes("secret"));
  }
});

Deno.test("source precedence is config, sidecar, HTML, then the build repository", async () => {
  await withTempDir(async (dir) => {
    await git(dir, "init", "-q");
    await git(dir, "remote", "add", "origin", "git@github.com:example/project.git");
    await Deno.mkdir(`${dir}/dist`);
    const index = `${dir}/dist/index.html`;
    const sidecar = `${dir}/dist/manifest.json`;
    const sources = async (source?: string | false) => (await readManifestMetadataTags(index, sidecar, { metadata: { source } })).filter((tag) => tag[0] === "source");
    await Deno.writeTextFile(index, '<meta name="description" content="Test app">');
    assertEquals(await sources(), [["source", "https://github.com/example/project"]]);
    await Deno.writeTextFile(index, '<meta name="napplet-source" content="https://html.example/repo">');
    assertEquals(await sources(), [["source", "https://html.example/repo"]]);
    await Deno.writeTextFile(sidecar, JSON.stringify({ tags: [["source", "https://old.example"], ["source", "https://sidecar.example/repo"]] }));
    assertEquals(await sources(), [["source", "https://sidecar.example/repo"]]);
    assertEquals(await sources("https://config.example/archive"), [["source", "https://config.example/archive"]]);
    assertEquals(await sources(false), []);
    await Deno.remove(sidecar);
    await Deno.writeTextFile(index, '<meta name="description" content="Test app">');
    assertEquals((await readManifestMetadataTags(index, undefined, {}, "legacy")).filter((tag) => tag[0] === "source"), []);
  });
});

Deno.test("signed root, named and companion snapshot events each contain one inferred source", async () => {
  await withTempDir(async (dir) => {
    await git(dir, "init", "-q");
    await git(dir, "remote", "add", "origin", "https://github.com/example/real-project.git");
    await Deno.mkdir(`${dir}/dist`);
    const indexHtml = `${dir}/dist/index.html`;
    await Deno.writeTextFile(indexHtml, '<meta name="description" content="A source test app">');
    const candidate = { name: "app", dir: `${dir}/dist`, indexHtml };
    const config = normalizeConfig({ sourceDir: candidate.dir });
    const key = new Uint8Array(32).fill(1);
    const pubkey = finalizeEvent({ kind: 1, created_at: 1, tags: [], content: "" }, key).pubkey;
    const plan = createDeployPlan(config, [candidate], { root: true, names: ["app"], snapshot: true });
    const manifests = await createDeployManifestTemplates(plan, config, { sourcePubkey: pubkey });
    assertEquals(manifests.map((manifest) => manifest.template?.kind), [15129, 5129, 35129, 5129]);
    for (const manifest of manifests) {
      assert(manifest.template);
      const signed = finalizeEvent(manifest.template, key);
      assert(verifyEvent(signed));
      assertEquals(signed.tags.filter((tag) => tag[0] === "source"), [["source", "https://github.com/example/real-project"]]);
    }
  });
});

Deno.test("inference handles nested builds and worktrees and omits absent origins", async () => {
  await withTempDir(async (dir) => {
    assertEquals(await inferRepositorySource(dir), undefined);
    await git(dir, "init", "-q");
    assertEquals(await inferRepositorySource(dir), undefined);
    await git(dir, "remote", "add", "origin", "git@github.com:example/monorepo.git");
    await git(dir, "-c", "user.name=Test", "-c", "user.email=test@example.org", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-qm", "fixture");
    const worktree = `${dir}/checkout`;
    await git(dir, "worktree", "add", "--detach", worktree);
    await Deno.mkdir(`${worktree}/packages/app/dist`, { recursive: true });
    assertEquals(await inferRepositorySource(`${worktree}/packages/app/dist`), "https://github.com/example/monorepo");
    await git(dir, "remote", "set-url", "origin", "/private/local/repository");
    assertEquals(await inferRepositorySource(dir), undefined);
  });
});
