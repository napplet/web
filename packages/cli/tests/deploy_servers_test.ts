import { rejects, throws } from "node:assert/strict";
import { defaultConfig } from "../src/config.ts";
import { discoverNapplets } from "../src/discover.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { createDeployManifestTemplates } from "../src/manifest.ts";
import { executeNetworkDeploy, resolveDeployServers } from "../src/deploy-network.ts";
import { createPrivateKeySigner } from "../src/signing.ts";
import { main } from "../src/cli.ts";
import { assertEquals, withTempDir } from "./assert.ts";

const invalidOrigin = /Invalid Blossom server.*HTTP\(S\) origin/;
const invalidServers = [
  "",
  " ",
  "not a URL",
  "/relative",
  "//blossom.example",
  "https:",
  "ftp://blossom.example",
  "file:///tmp/blob",
  "javascript:alert(1)",
  "https://blossom.example/upload",
  "https://blossom.example/path/..",
  "https://blossom.example?redirect=elsewhere",
  "https://blossom.example/#fragment",
  "https://user:password@blossom.example",
  "https://blossom.example:invalid",
  "https://blossom.example\\elsewhere",
  "https://blos\nsom.example",
];

Deno.test("deploy reports malformed sidecar servers before manifest signing", async () => {
  await withTempDir(async (dir) => {
    const sourceDir = `${dir}/dist`;
    await Deno.mkdir(sourceDir);
    await Deno.writeTextFile(
      `${sourceDir}/index.html`,
      '<meta name="description" content="Notes">',
    );
    await Deno.writeTextFile(
      `${sourceDir}/.nip5a-manifest.json`,
      JSON.stringify({ tags: [["server"]] }),
    );
    await Deno.writeTextFile(`${dir}/config.json`, JSON.stringify(defaultConfig({ sourceDir })));
    const errors: string[] = [];
    const previousError = console.error;
    console.error = (message: unknown) => errors.push(String(message));
    try {
      assertEquals(
        await main([
          "deploy",
          "--dry-run",
          "--json",
          "--config",
          `${dir}/config.json`,
          "--sec",
          "01".padStart(64, "0"),
        ]),
        1,
      );
      assertEquals(errors.length, 1);
      assertEquals(invalidOrigin.test(errors[0]), true);
    } finally {
      console.error = previousError;
    }
  });
});

Deno.test("deploy destinations reject non-origins from config and manifest tags", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, '<meta name="description" content="Notes">');
    const config = defaultConfig({ sourceDir: dir });
    const manifests = await createDeployManifestTemplates(
      createDeployPlan(config, await discoverNapplets(config)),
      config,
    );
    for (const server of invalidServers) {
      throws(() => resolveDeployServers(manifests, [server]), invalidOrigin, server);
      manifests[0].template!.tags.push(["server", server]);
      throws(() => resolveDeployServers(manifests, []), invalidOrigin, server);
      manifests[0].template!.tags.pop();
    }
    const origins = [
      "https://blossom.example",
      "https://mirror.example/",
      "http://localhost:3000",
      "http://[::1]:3000/",
    ];
    manifests[0].template!.tags.push(...origins.map((s) => ["server", s]), ["server", origins[0]]);
    assertEquals(resolveDeployServers(manifests, []), origins);
    assertEquals(resolveDeployServers([], []), []);
    manifests[0].template!.tags.push(["server"]);
    throws(() => resolveDeployServers(manifests, []), invalidOrigin);
    assertEquals(resolveDeployServers(manifests, origins), origins);
    const signer = createPrivateKeySigner("01".padStart(64, "0"));
    manifests[0].signedEvent = await signer.sign(manifests[0].template!);
    manifests[0].template!.tags = [];
    throws(() => resolveDeployServers(manifests, []), invalidOrigin);
  });
});

Deno.test("malformed recovered destinations fail before any upload, authorization or publish", async () => {
  await withTempDir(async (dir) => {
    const config = defaultConfig({ sourceDir: dir });
    const signer = createPrivateKeySigner("01".padStart(64, "0"));
    for (const source of ["sidecar", "html", "config"]) {
      await Deno.writeTextFile(
        `${dir}/index.html`,
        '<meta name="description" content="Notes">' +
          '<meta name="napplet-server" content="https://valid.example">' +
          (source === "html"
            ? '<meta name="napplet-server" content="https://invalid.example/path">'
            : ""),
      );
      const manifestPath = `${dir}/.nip5a-manifest.json`;
      await Deno.writeTextFile(
        manifestPath,
        JSON.stringify({
          tags: source === "sidecar" ? [["server", "https://valid.example"], ["server"]] : [],
        }),
      );
      const manifests = await createDeployManifestTemplates(
        createDeployPlan(config, await discoverNapplets(config)),
        config,
      );
      if (source !== "sidecar") {
        manifests[0].signedEvent = await signer.sign(manifests[0].template!);
      }
      const calls: string[] = [];
      await rejects(() =>
        executeNetworkDeploy(
          manifests,
          {
            relays: ["wss://relay.example"],
            blossomServers: source === "config" ? ["https://valid.example", ""] : [],
          },
          {
            ...signer,
            sign: (event) => {
              calls.push("sign");
              return signer.sign(event);
            },
          },
          {
            fetch: () => {
              calls.push("fetch");
              return Promise.resolve(new Response(null));
            },
            publish: () => {
              calls.push("publish");
              return Promise.resolve([]);
            },
          },
        ), invalidOrigin);
      assertEquals(calls, []);
    }
  });
});
