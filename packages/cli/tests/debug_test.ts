import { defaultConfig } from "../src/config.ts";
import { createDebugReport, createSigningDebugInfo } from "../src/debug.ts";
import { resolveSigningMethod } from "../src/signing.ts";
import { assertEquals, withTempDir } from "./assert.ts";

Deno.test("createDebugReport summarizes config discovery deploy and manifests", async () => {
  await withTempDir(async (dir) => {
    await Deno.mkdir(`${dir}/dist`, { recursive: true });
    await Deno.writeTextFile(`${dir}/dist/index.html`, "<!doctype html>");
    await Deno.writeTextFile(`${dir}/dist/app.js`, "console.log('napplet');");

    const config = defaultConfig({
      sourceDir: "dist",
      relays: ["wss://relay.example"],
      blossomServers: ["https://cdn.example"],
      named: ["feed"],
      signing: { mode: "ci" },
    });
    const signing = resolveSigningMethod(config, {
      env: { NAPPLET_CI_SIGNING_KEY: "NAPPLET_REMOTE_SIGNER" },
    });

    const report = await createDebugReport(config, {
      cwd: dir,
      configPath: `${dir}/.napplet/config.json`,
      selection: { snapshot: true },
      signing,
      env: { NAPPLET_REMOTE_SIGNER: "nbunksec1placeholder" },
    });

    assertEquals(report.configPath, `${dir}/.napplet/config.json`);
    assertEquals(report.config.relays, ["wss://relay.example"]);
    assertEquals(report.config.blossomServers, ["https://cdn.example"]);
    assertEquals(report.discovery.count, 1);
    assertEquals(report.discovery.candidates[0].dir, `${dir}/dist`);
    assertEquals(report.deploy.itemCount, 2);
    assertEquals(report.deploy.items.map((item) => item.target), ["named", "snapshot"]);
    assertEquals(report.manifests.count, 2);
    assertEquals(report.manifests.buildable, 1);
    assertEquals(report.manifests.skipped, 1);
    assertEquals(report.signing, {
      type: "ci-revocable",
      source: "environment",
      format: undefined,
      keyReference: "NAPPLET_REMOTE_SIGNER",
      canSignWithoutPrompt: true,
      requiresSecretLookup: true,
      notes: ["CI signing secret available through referenced environment variable"],
    });
  });
});

Deno.test("createSigningDebugInfo redacts direct CI signing material", () => {
  const info = createSigningDebugInfo({
    type: "ci-revocable",
    source: "environment",
    keyReference: "0a".repeat(32),
  });
  assertEquals(info.keyReference, "<redacted>");
  assertEquals(info.format, "hex");
  assertEquals(info.canSignWithoutPrompt, true);
});
