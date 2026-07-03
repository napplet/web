import { defaultConfig } from "../src/config.ts";
import { collectDeployFilePayloads } from "../src/deploy-network.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { createDeployManifestTemplates } from "../src/manifest.ts";
import {
  createScreenshotPlan,
  DEFAULT_SCREENSHOT_IDENTITY,
  normalizeScreenshotIdentity,
  parsePositiveInt,
} from "../src/screenshot.ts";
import type { NappletCandidate } from "../src/types.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const defaultPubkey = "e771af0b05c8e95fcdf6feb3500544d2fb1ccd384788e9f490bb3ee28e8ed66f";

Deno.test("normalizeScreenshotIdentity accepts the default npub and hex overrides", () => {
  assertEquals(normalizeScreenshotIdentity(DEFAULT_SCREENSHOT_IDENTITY), defaultPubkey);
  assertEquals(normalizeScreenshotIdentity(defaultPubkey.toUpperCase()), defaultPubkey);
});

Deno.test("parsePositiveInt rejects invalid dimensions", () => {
  assertEquals(parsePositiveInt("1280", "width"), 1280);
  let message = "";
  try {
    parsePositiveInt("0", "width");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("--width"));
});

Deno.test("createScreenshotPlan saves screenshots under the deploy directory", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const candidate = candidateFor(dir, "Feed App");
    const plan = createScreenshotPlan([candidate]);
    assertEquals(plan.length, 1);
    assertEquals(plan[0].outPath, `${dir}/screenshots/feed-app.png`);
    assertEquals(plan[0].manifestPath, "/screenshots/feed-app.png");
  });
});

Deno.test("createScreenshotPlan falls back for unsafe inferred candidate names", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const candidate = candidateFor(dir, "..");
    const plan = createScreenshotPlan([candidate]);
    assertEquals(plan[0].outPath, `${dir}/screenshots/napplet.png`);
    assertEquals(plan[0].manifestPath, "/screenshots/napplet.png");
  });
});

Deno.test("createScreenshotPlan rejects output directories outside the deploy directory", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const candidate = candidateFor(dir, "feed");
    let message = "";
    try {
      createScreenshotPlan([candidate], { outDir: "../screenshots" });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    assert(message.includes("--out-dir"));
  });
});

Deno.test("deploy manifest and Blossom payload discovery include generated screenshots", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.mkdir(`${dir}/screenshots`, { recursive: true });
    await Deno.writeFile(`${dir}/screenshots/feed.png`, new Uint8Array([137, 80, 78, 71]));
    const candidate = candidateFor(dir, "feed");
    const config = defaultConfig({ named: ["feed"], blossomServers: ["https://blob.example"] });
    const deployPlan = createDeployPlan(config, [candidate], { names: ["feed"] });
    const manifests = await createDeployManifestTemplates(deployPlan, config, { createdAt: 123 });
    const manifest = manifests[0];
    assert(manifest.files.some((file) => file.path === "/screenshots/feed.png"));
    assert(
      manifest.template?.tags.some((tag) =>
        tag[0] === "path" && tag[1] === "/screenshots/feed.png"
      ),
    );

    const payloads = await collectDeployFilePayloads(manifests);
    const screenshot = payloads.find((payload) => payload.path === "/screenshots/feed.png");
    assert(screenshot, "screenshot should be uploaded to Blossom with deploy payloads");
    assertEquals(screenshot.contentType, "image/png");
  });
});

function candidateFor(dir: string, name: string): NappletCandidate {
  return {
    name,
    dir,
    indexHtml: `${dir}/index.html`,
  };
}
