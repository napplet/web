import { verifyEvent } from "nostr-tools";
import { captureDeployScreenshot } from "../src/deploy-screenshot.ts";
import { collectFlags } from "../src/flags.ts";
import { main } from "../src/cli.ts";
import { createSigningDebugInfo } from "../src/debug.ts";
import { renderDeployReport } from "../src/output.ts";
import { defaultConfig, normalizeConfig } from "../src/config.ts";
import { executeNetworkDeploy, networkDeploySucceeded } from "../src/deploy-network.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { createDeployManifestTemplates } from "../src/manifest.ts";
import { runPackageCli } from "../src/package-runner.ts";
import { createPrivateKeySigner, signDeployManifestTemplates } from "../src/signing.ts";
import { normalizeZapstoreConfig, prepareZapstorePublication } from "../src/zapstore.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ZkAAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);
const servers = ["https://primary.example", "https://mirror.example"];
const signer = createPrivateKeySigner("01".padStart(64, "0"));
const listing = { id: "org.example.notes", name: "Notes", description: "A notebook" };

async function rejects(fn: () => unknown, message: string): Promise<void> {
  try {
    await fn();
  } catch (error) {
    assert(String(error).includes(message), String(error));
    return;
  }
  throw new Error(`Expected failure containing ${message}`);
}

Deno.test("Zapstore is opt-in and flags can disable configured publishing without reading media", async () => {
  const config = defaultConfig({ zapstore: { ...listing, images: ["missing.png"] } });
  assertEquals(await prepareZapstorePublication(config, []), undefined);
  config.zapstore!.enabled = true;
  assertEquals(await prepareZapstorePublication(config, [], { enabled: false }), undefined);
  await rejects(
    () => prepareZapstorePublication(defaultConfig(), [], { enabled: true }),
    "requires zapstore.id",
  );
});

Deno.test("Zapstore configuration rejects malformed values and round trips valid fields", async () => {
  for (
    const input of [null, [], { id: "x" }, { ...listing, enabled: "yes" }, {
      ...listing,
      images: [1],
    }]
  ) {
    await rejects(() => normalizeZapstoreConfig(input), "zapstore");
  }
  const config = normalizeConfig({ zapstore: { ...listing, tags: ["notes", "notes"] } });
  assertEquals(config.zapstore?.tags, ["notes"]);
  assertEquals(normalizeConfig(JSON.parse(JSON.stringify(config))).zapstore, config.zapstore);
});

Deno.test("application uses Software Application tags and hashes local screenshots unchanged", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeFile(`${dir}/preview.png`, png);
    const config = defaultConfig({
      zapstore: {
        ...listing,
        enabled: true,
        images: ["preview.png", "https://images.example/remote.png"],
        icon: "preview.png",
        summary: "Notebook",
        license: "MIT",
        repository: "https://github.com/example/notes",
        website: "https://notes.example",
        tags: ["notes"],
      },
    });
    const application = await prepareZapstorePublication(config, servers, {
      cwd: dir,
      createdAt: 123,
    });
    assert(application);
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", png)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    assertEquals(application.template, {
      kind: 32267,
      created_at: 123,
      content: "A notebook",
      tags: [
        ["d", listing.id],
        ["name", "Notes"],
        ["summary", "Notebook"],
        ["url", "https://notes.example"],
        ["repository", "https://github.com/example/notes"],
        ["license", "MIT"],
        ["icon", `${servers[0]}/${digest}`],
        ["image", `${servers[0]}/${digest}`],
        ["image", "https://images.example/remote.png"],
        ["t", "notes"],
      ],
    });
    assertEquals(application.files.length, 1);
    assertEquals(application.files[0].data, png);
    assertEquals(application.files[0].contentType, "image/png");
    assert(verifyEvent(await signer.sign(application.template)));
    await rejects(
      () => prepareZapstorePublication(config, [], { cwd: dir }),
      "require a Blossom server",
    );
    await Deno.writeTextFile(`${dir}/bad.png`, "not an image");
    await rejects(
      () =>
        prepareZapstorePublication(
          defaultConfig({ zapstore: { ...listing, enabled: true, images: ["bad.png"] } }),
          servers,
          { cwd: dir },
        ),
      "must be PNG",
    );
  });
});

for (
  const scenario of [
    "success",
    "relay rejection",
    "primary media failure",
    "all uploads fail",
  ] as const
) {
  Deno.test(`application deploy: ${scenario}`, async () => {
    await withTempDir(async (dir) => {
      await Deno.writeTextFile(`${dir}/index.html`, '<meta name="description" content="Notes">');
      await Deno.writeFile(`${dir}-preview.png`, png);
      // Keep the preview outside the deploy artifact, but clean it explicitly.
      const preview = `${dir}-preview.png`;
      try {
        const config = defaultConfig({
          sourceDir: dir,
          relays: ["wss://relay.example"],
          blossomServers: servers,
          zapstore: { ...listing, enabled: true, images: [preview] },
        });
        const plan = createDeployPlan(config, [{
          name: "notes",
          dir,
          indexHtml: `${dir}/index.html`,
        }], { names: ["notes"] });
        const templates = await createDeployManifestTemplates(plan, config, { createdAt: 123 });
        const manifests = await signDeployManifestTemplates(templates, signer);
        const before = JSON.stringify(manifests);
        const application = await prepareZapstorePublication(config, servers, { createdAt: 123 });
        assert(application);
        application.signedEvent = await signer.sign(application.template);
        const published: number[] = [];
        const uploads: string[] = [];
        const result = await executeNetworkDeploy(manifests, config, signer, {
          application,
          fetch: ((input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.method === "HEAD") {
              return Promise.resolve(new Response(null, { status: 404 }));
            }
            const hash = new Headers(init?.headers).get("x-sha-256");
            uploads.push(hash!);
            const failure = scenario === "all uploads fail" ||
              (scenario === "primary media failure" && String(input).startsWith(servers[0]) &&
                hash === application.files[0].sha256);
            return Promise.resolve(
              new Response(JSON.stringify({ sha256: hash }), { status: failure ? 500 : 201 }),
            );
          }) as typeof fetch,
          publish: (relays, event) => {
            published.push(event.kind);
            assert(verifyEvent(event));
            return Promise.resolve(
              relays.map((relay) => ({
                relay,
                eventId: event.id,
                success: !(scenario === "relay rejection" && event.kind === 32267),
              })),
            );
          },
        });
        assertEquals(JSON.stringify(manifests), before);
        assertEquals(networkDeploySucceeded(result, manifests), scenario === "success");
        const report = renderDeployReport({
          signing: createSigningDebugInfo({ type: "none" }),
          plan,
          manifests,
          application,
          deploy: result,
          relays: config.relays,
          blossomServers: servers,
          dryRun: false,
        });
        assert(report.includes("Zapstore Application"));
        if (scenario !== "success") {
          assert(report.includes("Zapstore application metadata was not published"));
        }
        assert(uploads.includes(application.files[0].sha256));
        assertEquals(
          published.includes(32267),
          scenario === "success" || scenario === "relay rejection",
        );
        if (scenario === "all uploads fail") assertEquals(published, []);
      } finally {
        await Deno.remove(preview);
      }
    });
  });
}

Deno.test("CLI dry run includes application metadata only when requested, with no network permission", async () => {
  await withTempDir(async (dir) => {
    await Deno.mkdir(`${dir}/dist`);
    await Deno.writeTextFile(`${dir}/dist/index.html`, '<meta name="description" content="Notes">');
    await Deno.writeFile(`${dir}/preview.png`, png);
    const config = defaultConfig({
      sourceDir: `${dir}/dist`,
      blossomServers: servers,
      zapstore: { ...listing, images: [`${dir}/preview.png`] },
    });
    await Deno.writeTextFile(`${dir}/config.json`, JSON.stringify(config));
    const output: string[] = [];
    const log = console.log;
    console.log = (value: unknown) => output.push(String(value));
    try {
      assertEquals(
        await main([
          "deploy",
          "--config",
          `${dir}/config.json`,
          "--zapstore",
          "--dry-run",
          "--json",
        ]),
        0,
      );
      assertEquals(
        await main([
          "deploy",
          "--config",
          `${dir}/config.json`,
          "--no-zapstore",
          "--dry-run",
          "--json",
        ]),
        0,
      );
    } finally {
      console.log = log;
    }
    const enabled = JSON.parse(output[0]);
    const disabled = JSON.parse(output[1]);
    assertEquals(enabled.application.template.kind, 32267);
    assertEquals(enabled.application.files[0].data, undefined);
    assertEquals(disabled.application, undefined);
    assertEquals(enabled.manifests[0].artifactHash, disabled.manifests[0].artifactHash);
    assertEquals(
      enabled.manifests[0].template.tags.some((tag: string[]) => tag[0] === "app"),
      false,
    );
  });
});

Deno.test("screenshot runner pins a compatible version and preserves literal arguments", async () => {
  let received: string[] = [];
  const args = ["http://localhost:5173", "--output", "preview with spaces.png"];
  assertEquals(
    await runPackageCli("@napplet/conformance-cli", args, {
      runner: (command, argv) => {
        received = [command, ...argv];
        return Promise.resolve({ code: 0, stdout: "", stderr: "" });
      },
      os: "windows",
    }),
    0,
  );
  assertEquals(received, ["npx.cmd", "--yes", "@napplet/conformance-cli@0.3.3", "screenshot", ...args]);
});

for (const automatic of [false, true]) {
  for (const outcome of ["success", "capture failure", "invalid image", "disabled"] as const) {
    Deno.test(`inline deploy screenshot (${automatic ? "automatic" : "URL"}): ${outcome}`, async () => {
      await withTempDir(async (dir) => {
        await Deno.mkdir(`${dir}/dist`);
        await Deno.writeTextFile(
          `${dir}/dist/index.html`,
          '<meta name="description" content="Notes">',
        );
        const config = defaultConfig({
          sourceDir: `${dir}/dist`,
          blossomServers: servers,
          zapstore: { ...listing, images: ["https://images.example/existing.png"] },
        });
        await Deno.writeTextFile(`${dir}/config.json`, JSON.stringify(config));
        const originalConfig = await Deno.readTextFile(`${dir}/config.json`);
        const logs: string[] = [];
        const errors: string[] = [];
        const log = console.log;
        const error = console.error;
        console.log = (value: unknown) => logs.push(String(value));
        console.error = (value: unknown) => errors.push(String(value));
        let capturePath = "";
        let code: number;
        try {
          code = await main([
            "deploy",
            "--config",
            `${dir}/config.json`,
            "--dry-run",
            "--json",
            "--screenshot",
            ...(automatic ? [] : ["http://localhost:5173"]),
            "--screenshot-ready-selector",
            ".ready",
            ...(outcome === "disabled" ? ["--no-zapstore"] : ["--zapstore"]),
          ], {
            runScreenshot: async (args) => {
              assertEquals(args.slice(0, automatic ? 2 : 1), automatic ? ["--artifact", `${dir}/dist/index.html`] : ["http://localhost:5173"]);
              assertEquals(args.slice(automatic ? 4 : 3), ["--ready-selector", ".ready"]);
              capturePath = args[automatic ? 3 : 2];
              await Deno.writeFile(
                capturePath,
                outcome === "invalid image" ? new Uint8Array([1, 2, 3]) : png,
              );
              return outcome === "capture failure" ? 2 : 0;
            },
          });
        } finally {
          console.log = log;
          console.error = error;
        }
        assertEquals(code, outcome === "success" ? 0 : 1);
        assertEquals(await Deno.readTextFile(`${dir}/config.json`), originalConfig);
        if (outcome === "success") {
          assertEquals(logs.length, 1);
          const report = JSON.parse(logs[0]);
          const images = report.application.template.tags.filter((tag: string[]) =>
            tag[0] === "image"
          );
          assertEquals(images.length, 2);
          assertEquals(images[0], ["image", "https://images.example/existing.png"]);
          assert(images[1][1].startsWith(servers[0]));
          assertEquals(report.manifests[0].files.length, 1);
        } else {
          assertEquals(logs.length, 0);
          assert(errors.length > 0);
        }
        if (outcome === "disabled") assertEquals(capturePath, "");
        else {
          try {
            await Deno.stat(capturePath.slice(0, capturePath.lastIndexOf("/")));
            throw new Error("Temporary directory was retained");
          } catch (error) {
            assert(error instanceof Deno.errors.NotFound);
          }
        }
      });
    });
  }

}

Deno.test("automatic screenshots deduplicate companion snapshots and retain distinct builds", async () => {
  const config = defaultConfig({ blossomServers: servers, zapstore: { ...listing, enabled: true } });
  const candidates = ["one", "two"].map((name) => ({ name, dir: `/build/${name}`, indexHtml: `/build/${name}/index.html` }));
  const plan = createDeployPlan(config, candidates, { root: true, snapshot: true });
  const captured: string[] = [];
  const screenshot = await captureDeployScreenshot(collectFlags(["--screenshot"]), config, async (args) => {
    captured.push(args[1]);
    await Deno.writeFile(args[3], png);
    return 0;
  }, plan);
  assert(screenshot);
  try {
    assertEquals(captured, candidates.map((candidate) => candidate.indexHtml));
    assertEquals(screenshot.paths.length, 2);
  } finally { await screenshot.cleanup(); }
});
