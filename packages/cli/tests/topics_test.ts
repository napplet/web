import { stringify } from "yaml";
import { runInitFromFlags } from "../src/config-command.ts";
import { defaultConfig, normalizeConfig, normalizeTopics, readConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { collectFlags } from "../src/flags.ts";
import { createDeployManifestTemplates } from "../src/manifest.ts";
import { renderInitReport } from "../src/output.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const html = '<!doctype html><meta name="description" content="Notes">';

Deno.test("normalizeTopics trims, drops a leading #, lowercases, and deduplicates in order", () => {
  assertEquals(normalizeTopics([" #Nostr ", "notes", "NOSTR", "#notes"]), ["nostr", "notes"]);
});

Deno.test("normalizeTopics rejects empty and multi-word topics", () => {
  for (const value of ["", "  ", "#", "two words"]) {
    let message = "";
    try {
      normalizeTopics([value], "metadata.topics");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    assert(message.includes("metadata.topics"), `expected rejection for ${JSON.stringify(value)}`);
  }
});

Deno.test("readConfig normalizes metadata.topics and rejects non-string entries", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.yaml`;
    await Deno.writeTextFile(path, stringify({ metadata: { topics: ["#Nostr", "notes"] } }));
    assertEquals((await readConfig(path))?.metadata?.topics, ["nostr", "notes"]);
  });
  let message = "";
  try {
    normalizeConfig({ metadata: { topics: [42] } });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("metadata.topics"));
});

Deno.test("configured topics become t tags and replace sidecar t tags", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, html);
    const manifestPath = `${dir}/.nip5a-manifest.json`;
    await Deno.writeTextFile(manifestPath, JSON.stringify({ content: "Notes", tags: [["t", "stale"], ["custom", "kept"]] }));
    const candidate = { name: "notes", dir, indexHtml: `${dir}/index.html`, manifestPath };
    const config = defaultConfig({ named: ["notes"], metadata: { name: "notes", topics: ["nostr", "notes"] } });
    const [manifest] = await createDeployManifestTemplates(createDeployPlan(config, [candidate], { names: ["notes"] }), config);
    const tags = manifest.template?.tags ?? [];
    assertEquals(tags.filter((tag) => tag[0] === "t"), [["t", "nostr"], ["t", "notes"]]);
    assertEquals(tags.filter((tag) => tag[0] === "custom"), [["custom", "kept"]]);
  });
});

Deno.test("sidecar t tags pass through when config sets no topics", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, html);
    const manifestPath = `${dir}/.nip5a-manifest.json`;
    await Deno.writeTextFile(manifestPath, JSON.stringify({ content: "Notes", tags: [["t", "from-plugin"]] }));
    const candidate = { name: "notes", dir, indexHtml: `${dir}/index.html`, manifestPath };
    const config = defaultConfig({ named: ["notes"], metadata: { name: "notes" } });
    const [manifest] = await createDeployManifestTemplates(createDeployPlan(config, [candidate], { names: ["notes"] }), config);
    assertEquals((manifest.template?.tags ?? []).filter((tag) => tag[0] === "t"), [["t", "from-plugin"]]);
  });
});

Deno.test("napplet init --topic records normalized topics and reports them", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/.napplet/config.yaml`;
    const report = await runInitFromFlags(collectFlags([
      "--non-interactive", "--config", path, "--name", "notes", "--title", "Notes",
      "--topic", "#Nostr", "--topic", "notes", "--topic", "nostr",
    ]));
    assertEquals(report.config.metadata?.topics, ["nostr", "notes"]);
    assertEquals((await readConfig(path))?.metadata?.topics, ["nostr", "notes"]);
    assert(renderInitReport(report).includes("#nostr"));

    const rerun = await runInitFromFlags(collectFlags(["--non-interactive", "--config", path]), await readConfig(path) ?? undefined);
    assertEquals(rerun.config.metadata?.topics, ["nostr", "notes"]);
  });
});

Deno.test("napplet init without topics leaves metadata.topics unset", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/.napplet/config.yaml`;
    const report = await runInitFromFlags(collectFlags(["--non-interactive", "--config", path, "--name", "notes"]));
    assertEquals(report.config.metadata?.topics, undefined);
    assert(!(await Deno.readTextFile(path)).includes("topics"));
  });
});
