import { parse, stringify } from "yaml";
import { defaultConfig } from "../src/config.ts";
import { completeDeployInputs } from "../src/deploy-config.ts";
import { collectFlags } from "../src/flags.ts";
import { saveDeploySigner } from "../src/editable-config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { createDeployManifestTemplates } from "../src/manifest.ts";
import { PromptCancelledError } from "../src/prompt.ts";
import type { NappletConfig } from "../src/types.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

Deno.test("partial configuration prompts for missing inputs and preserves existing values", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "<!doctype html><title>Notes</title>");
    const original = defaultConfig({ sourceDir: dir, named: ["notes"], metadata: { title: "Keep title", source: false }, signing: { mode: "interactive", keyReference: "keep-key" } });
    const answers = ["Private notes", ",", "not a relay", "wss://relay.example", "https://blossom.example/path", "https://blossom.example", "maybe", "yes"];
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

Deno.test("per-build descriptions preserve valid neighboring artifact metadata", async () => {
  await withTempDir(async (dir) => {
    for (const name of ["notes", "clock"]) await Deno.mkdir(`${dir}/${name}`);
    await Deno.writeTextFile(`${dir}/notes/index.html`, '<!doctype html><meta name="description" content="Existing notes">');
    await Deno.writeTextFile(`${dir}/clock/index.html`, '<!doctype html><title>Clock</title>');
    const answers = ["A clock"];
    const original = defaultConfig({ sourceDir: dir, discover: { enabled: true, roots: [dir] } });
    const result = await completeDeployInputs(original, collectFlags(["--all", "--dry-run"]), "current", {
      interactive: true, ask: async () => answers.shift()!, print() {},
      save: () => { throw new Error("per-build metadata must not overwrite shared config"); },
    });
    assertEquals(result.candidates.length, 2);
    assertEquals(answers.length, 0);
    const plan = createDeployPlan(result.config, result.candidates, {}, { traverse: true });
    const templates = await createDeployManifestTemplates(plan, result.config, { format: "current", descriptions: result.descriptions });
    assertEquals(templates.map((entry) => entry.template?.content).sort(), ["A clock", "Existing notes"]);
    assertEquals(result.config.metadata, undefined);
  });
});

Deno.test("Zapstore completion honors save refusal and non-interactive mode", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, '<!doctype html><meta name="description" content="Notes">');
    const config = defaultConfig({ sourceDir: dir, named: ["notes"] });
    const answers = ["org.example.notes", "Notes", "no"];
    const result = await completeDeployInputs(config, collectFlags(["--dry-run", "--zapstore"]), "current", {
      interactive: true, ask: async () => answers.shift()!, print() {},
      save: () => { throw new Error("unexpected save"); },
    });
    assertEquals(result.config.zapstore, { id: "org.example.notes", name: "Notes", enabled: true });
    assertEquals(answers.length, 0);
    let error = "";
    try {
      await completeDeployInputs(config, collectFlags(["--dry-run", "--zapstore", "-i"]), "current", {
        interactive: true, ask: () => { throw new Error("unexpected prompt"); },
      });
    } catch (e) { error = String(e); }
    assert(error.includes("zapstore.id") && error.includes("zapstore.name"));
    assert(!error.includes("unexpected"));
  });
});

Deno.test("canceling deployment setup leaves configuration untouched", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "<!doctype html><title>Notes</title>");
    const original = defaultConfig({ sourceDir: dir });
    let canceled = false;
    try {
      await completeDeployInputs(original, collectFlags([]), "current", {
        interactive: true, ask: () => { throw new PromptCancelledError(); },
        save: () => { throw new Error("unexpected save"); },
      });
    } catch (error) { canceled = error instanceof PromptCancelledError; }
    assert(canceled);
    assertEquals(original.metadata, undefined);
  });
});

Deno.test("saving a connected signer preserves unsaved settings and incomplete app metadata", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.yaml`;
    const persisted = { version: 1, sourceDir: "dist", relays: [], zapstore: { id: "org.example.notes" }, custom: "keep" };
    await Deno.writeTextFile(path, "# keep this comment\n" + stringify(persisted));
    const updated = defaultConfig({
      sourceDir: "transient", relays: ["wss://override.example"], metadata: { description: "Unsaved" },
      zapstore: { id: "org.example.notes", name: "Unsaved name" },
      signing: { mode: "interactive", keyReference: "connected-signer", pubkey: "02".repeat(32) },
    });
    await saveDeploySigner(updated, path);
    assertEquals(parse(await Deno.readTextFile(path)), { ...persisted, signing: updated.signing });
    assert((await Deno.readTextFile(path)).includes("# keep this comment"));
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
