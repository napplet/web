import { defaultConfig } from "../src/config.ts";
import { commandRecord } from "../src/record-command.ts";
import { normalizePreviewVideo, previewDigest, readPreviewVideo } from "../src/preview-video.ts";
import { prepareZapstorePublication } from "../src/zapstore.ts";
import { createPrivateKeySigner } from "../src/signing.ts";
import { verifyEvent } from "nostr-tools";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const fixture = new URL("./fixtures/gameplay-preview.webm", import.meta.url);
const cover = new URL("./fixtures/gameplay-preview.png", import.meta.url);

async function rejects(fn: () => unknown, text: string) {
  try { await fn(); } catch (error) { assert(String(error).includes(text), String(error)); return; }
  throw new Error(`Expected ${text}`);
}

async function recording(dir: string) {
  const data = await Deno.readFile(fixture);
  await Deno.writeFile(`${dir}/clip.webm`, data);
  await Deno.writeFile(`${dir}/cover.png`, await Deno.readFile(cover));
  return {
    file: "clip.webm", thumbnail: "cover.png", width: 480, height: 320, durationMs: 1920,
    sha256: await previewDigest(data), artifactHash: await previewDigest(new TextEncoder().encode("current artifact")),
  };
}

Deno.test("video metadata uses NIP-92 and preserves existing covers and application identity", async () => {
  await withTempDir(async dir => {
    const video = await recording(dir);
    const config = defaultConfig({ zapstore: { enabled: true, id: "org.example.game", name: "Game", description: "Play", images: ["https://example.org/cover.png"], video } });
    const app = await prepareZapstorePublication(config, ["https://blossom.example"], { cwd: dir, artifactHashes: [video.artifactHash] });
    assert(app);
    const url = `https://blossom.example/${video.sha256}`;
    assertEquals(app.template.content, `Play\n\n${url}`);
    assert(app.template.tags.some(tag => tag[0] === "image" && tag[1] === "https://example.org/cover.png"));
    const imeta = app.template.tags.find(tag => tag[0] === "imeta")!;
    for (const field of [`url ${url}`, "m video/webm", `x ${video.sha256}`, "dim 480x320", `size ${(await Deno.stat(fixture)).size}`]) assert(imeta.includes(field));
    assert(imeta.some(field => field.startsWith("thumb https://blossom.example/")));
    assertEquals(app.files.find(file => file.contentType === "video/webm")!.data, await Deno.readFile(fixture));
    assert(verifyEvent(await createPrivateKeySigner("01".padStart(64, "0")).sign(app.template)));
    config.zapstore!.images = [];
    const fallback = await prepareZapstorePublication(config, ["https://blossom.example"], { cwd: dir, artifactHashes: [video.artifactHash] });
    assert(fallback!.template.tags.some(tag => tag[0] === "image"));
  });
});

Deno.test("stale or modified videos fail before publishing; disabling Zapstore preserves normal deployment", async () => {
  await withTempDir(async dir => {
    const video = await recording(dir);
    await rejects(() => readPreviewVideo(video, [], dir), "different build");
    await rejects(() => readPreviewVideo(video, [video.artifactHash, "another build"], dir), "different build");
    const bytes = await Deno.readFile(fixture); bytes[bytes.length - 1] ^= 1;
    await Deno.writeFile(`${dir}/clip.webm`, bytes);
    await rejects(() => readPreviewVideo(video, [video.artifactHash], dir), "bytes changed");
    const config = defaultConfig({ zapstore: { id: "game", name: "Game", enabled: true, video } });
    assertEquals(await prepareZapstorePublication(config, [], { enabled: false }), undefined);
    await rejects(() => normalizePreviewVideo({ ...video, width: Infinity }), "width");
    await rejects(() => normalizePreviewVideo({ ...video, artifactHash: "x" }), "artifactHash");
  });
});

Deno.test("record command selects successful capture, preserves config fields and deselects without deleting media", async () => {
  await withTempDir(async dir => {
    const path = `${dir}/config.json`;
    const output = `${dir}/new.webm`;
    const video = await recording(dir);
    await Deno.writeTextFile(path, JSON.stringify({ ...defaultConfig({ sourceDir: "built-game" }), futureField: "keep", zapstore: { id: "game", name: "Game", images: ["cover.png"] } }));
    const run = async (args: readonly string[]) => {
      assertEquals(args[0], "built-game");
      await Deno.writeTextFile(`${output}.json`, JSON.stringify({ ...video, file: `${dir}/clip.webm`, thumbnail: `${dir}/cover.png` }));
      return 0;
    };
    assertEquals(await commandRecord(["--config", path, "--output", output], run), 0);
    const saved = JSON.parse(await Deno.readTextFile(path));
    assertEquals(saved.futureField, "keep");
    assertEquals(saved.zapstore.video.sha256, video.sha256);
    assertEquals(saved.zapstore.images, ["cover.png"]);
    await commandRecord(["--config", path, "--clear"], run);
    assertEquals(JSON.parse(await Deno.readTextFile(path)).zapstore.video, undefined);
    assert((await Deno.stat(`${dir}/clip.webm`)).isFile);
  });
});

Deno.test("record command preserves concurrent configuration edits", async () => {
  await withTempDir(async dir => {
    const path = `${dir}/config.json`, output = `${dir}/new.webm`;
    const video = await recording(dir);
    const config = { ...defaultConfig(), zapstore: { id: "game", name: "Game" } };
    await Deno.writeTextFile(path, JSON.stringify(config));
    await rejects(() => commandRecord(["--config", path, "--output", output], async () => {
      await Deno.writeTextFile(`${output}.json`, JSON.stringify({ ...video, file: `${dir}/clip.webm`, thumbnail: `${dir}/cover.png` }));
      await Deno.writeTextFile(path, JSON.stringify({ ...config, futureField: "concurrent" }));
      return 0;
    }), "Config changed");
    assertEquals(JSON.parse(await Deno.readTextFile(path)).futureField, "concurrent");
  });
});
