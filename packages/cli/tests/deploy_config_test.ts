import { defaultConfig } from "../src/config.ts";
import { completeDeployInputs } from "../src/deploy-config.ts";
import { collectFlags } from "../src/flags.ts";
import type { NappletConfig } from "../src/types.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

Deno.test("partial configuration prompts for missing inputs and preserves existing values", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "<!doctype html><title>Notes</title>");
    const original = defaultConfig({ sourceDir: dir, named: ["notes"], metadata: { title: "Keep title", source: false }, signing: { mode: "interactive", keyReference: "keep-key" } });
    const answers = ["Private notes", "not a relay", "wss://relay.example", "https://blossom.example/path", "https://blossom.example", "yes"];
    const saved: NappletConfig[] = [];
    const result = await completeDeployInputs(original, collectFlags([]), "current", {
      interactive: true, ask: async () => answers.shift()!, print() {},
      save: async (config) => { saved.push(config); },
    });
    assertEquals(answers.length, 0);
    assertEquals(result.config.metadata, { title: "Keep title", source: false, description: "Private notes" });
    assertEquals(result.config.signing, original.signing);
    assertEquals(result.config.relays, ["wss://relay.example"]);
    assertEquals(result.config.blossomServers, ["https://blossom.example"]);
    assertEquals(original.relays, []);
    assertEquals(original.metadata?.description, undefined);
    assertEquals(saved.length, 1);
  });
});

Deno.test("-i reports all missing deployment inputs without asking or saving", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "<!doctype html><title>Notes</title>");
    let error = "";
    try {
      await completeDeployInputs(defaultConfig({ sourceDir: dir }), collectFlags(["-i"]), "current", {
        interactive: true, ask: () => { throw new Error("unexpected prompt"); },
        save: () => { throw new Error("unexpected write"); },
      });
    } catch (e) { error = String(e); }
    for (const field of ["metadata.description", "--relay", "--server"]) assert(error.includes(field));
    assert(!error.includes("unexpected"));
  });
});

Deno.test("dry runs honor artifact metadata and do not demand network destinations", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, '<!doctype html><meta name="description" content="Artifact description">');
    const result = await completeDeployInputs(defaultConfig({ sourceDir: dir, named: ["notes"] }), collectFlags(["--dry-run"]), "current", {
      interactive: true, ask: () => { throw new Error("unexpected prompt"); },
    });
    assertEquals(result.config.relays, []);
    assertEquals(result.config.metadata, undefined);
  });
});

Deno.test("correcting a build directory continues discovery and can remain unsaved", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, '<!doctype html><meta name="description" content="Artifact description">');
    const answers = [dir, "no"];
    const result = await completeDeployInputs(defaultConfig({ sourceDir: `${dir}/missing`, named: ["notes"] }), collectFlags(["--dry-run"]), "current", {
      interactive: true, ask: async () => answers.shift()!, print() {},
      save: () => { throw new Error("unexpected write"); },
    });
    assertEquals(result.candidates.length, 1);
    assertEquals(result.config.sourceDir, dir);
    assertEquals(answers.length, 0);
  });
});
