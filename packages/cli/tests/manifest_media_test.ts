import { finalizeEvent } from "nostr-tools";
import { defaultConfig, normalizeConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { attachCapturedScreenshots } from "../src/deploy-screenshot.ts";
import { createDeployManifestTemplates, createSiteManifestTemplate } from "../src/manifest.ts";
import {
  buildMediaTag,
  imageDimensions,
  mediaUploadPath,
  normalizePreviewConfig,
  normalizeScreenshotConfigs,
  normalizeSourceArchive,
  normalizeSourceCommit,
  parseMediaFields,
  presentationMediaHashes,
  sniffMediaType,
  validateMediaAndSourceTags,
} from "../src/manifest-media.ts";
import { migrateManifestEvent } from "../src/migrate.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const html = '<!doctype html><meta name="description" content="Read &amp; write notes">';
const fixtures = JSON.parse(
  await Deno.readTextFile(
    new URL("../../../tests/fixtures/publishing-icons.json", import.meta.url),
  ),
) as Array<{ mimeType: string; base64: string; sha256: string }>;
const bytes = (mimeType: string): Uint8Array =>
  Uint8Array.from(
    atob(fixtures.find((f) => f.mimeType === mimeType)!.base64),
    (c) => c.charCodeAt(0),
  );
const fixtureHash = (mimeType: string): string =>
  fixtures.find((f) => f.mimeType === mimeType)!.sha256;
const webm = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86]);
const X = "d".repeat(64);
const archive = [
  "source-archive",
  "https://dl.example.com/src.tar.gz",
  "c".repeat(64),
  "application/gzip",
];

async function sha256(data: Uint8Array): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(data)))].map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

function rejects(fn: () => unknown, message: string): void {
  let error = "";
  try {
    fn();
  } catch (caught) {
    error = String(caught);
  }
  assert(error.includes(message), `Expected failure containing ${message}, got ${error}`);
}

async function rejectsAsync(fn: () => Promise<unknown>, message: string): Promise<void> {
  let error = "";
  try {
    await fn();
  } catch (caught) {
    error = String(caught);
  }
  assert(error.includes(message), `Expected failure containing ${message}, got ${error}`);
}

function pngHeader(width: number, height: number): Uint8Array {
  const out = new Uint8Array(33);
  out.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  new DataView(out.buffer).setUint32(16, width);
  new DataView(out.buffer).setUint32(20, height);
  return out;
}

Deno.test("media fields follow NIP-92 splitting and the NIP-5D ignore rules", () => {
  assertEquals(parseMediaFields(["screenshot", `x ${X}`, "m image/png", "alt Two  spaces"]), {
    sha256: X,
    mimeType: "image/png",
    problems: [],
  });
  assertEquals(parseMediaFields(["preview", `x ${X}`, "m video/webm"]).problems, []);
  for (
    const tag of [["screenshot"], ["screenshot", "x"], ["screenshot", `x ${X}`, `x ${X}`], [
      "screenshot",
      `x ${X.toUpperCase()}`,
    ], ["screenshot", `x  ${X}`]]
  ) {
    assert(parseMediaFields(tag).problems[0].includes("exactly one x field"), JSON.stringify(tag));
  }
  assert(
    parseMediaFields(["screenshot", `x ${X}`, "m image/gif"]).problems[0].includes(
      "image/gif cannot match",
    ),
  );
  assert(
    parseMediaFields(["preview", `x ${X}`, "m image/png"]).problems[0].includes(
      "cannot match a decodable preview",
    ),
  );
  assertEquals(parseMediaFields(["screenshot", `x ${X}`, "m bad type"]).mimeType, undefined);
});

Deno.test("presentation hashes skip unusable entries and a multiplied preview", () => {
  const tags = [
    ["screenshot", `x ${X}`],
    ["screenshot", "m image/png"],
    ["screenshot", `x ${"e".repeat(64)}`, "m image/gif"],
    ["preview", `x ${"f".repeat(64)}`],
    ["preview", `x ${"a".repeat(64)}`],
    ["icon", "b".repeat(64), "image/png"],
  ];
  assertEquals([...presentationMediaHashes(tags)], [X]);
  assertEquals([...presentationMediaHashes([["preview", `x ${"f".repeat(64)}`]])], [
    "f".repeat(64),
  ]);
});

Deno.test("deploy-time validation rejects entries clients would ignore and malformed source pins", () => {
  validateMediaAndSourceTags([["screenshot", `x ${X}`], ["preview", `x ${X}`, "m video/mp4"], [
    "source-commit",
    "a".repeat(40),
  ], archive]);
  rejects(
    () => validateMediaAndSourceTags([["screenshot", "m image/png"]]),
    "screenshot tag would be ignored",
  );
  rejects(
    () => validateMediaAndSourceTags([["preview", `x ${X}`], ["preview", `x ${X}`]]),
    "at most one preview",
  );
  for (const commit of ["A".repeat(40), "a".repeat(39), "a".repeat(65)]) {
    rejects(
      () => validateMediaAndSourceTags([["source-commit", commit]]),
      "source-commit must appear once",
    );
  }
  rejects(
    () =>
      validateMediaAndSourceTags([["source-commit", "a".repeat(40)], [
        "source-commit",
        "b".repeat(40),
      ]]),
    "source-commit must appear once",
  );
  for (
    const tag of [
      archive.slice(0, 3),
      [...archive, "extra"],
      ["source-archive", "http://dl.example.com/src.tgz", "c".repeat(64), "application/gzip"],
      ["source-archive", "https://u:p@dl.example.com/src.tgz", "c".repeat(64), "application/gzip"],
      ["source-archive", "https://dl.example.com/src.tgz#x", "c".repeat(64), "application/gzip"],
      ["source-archive", "https://dl.example.com/src.tgz", "C".repeat(64), "application/gzip"],
      ["source-archive", "https://dl.example.com/src.tgz", "c".repeat(64), "gzip"],
    ]
  ) rejects(() => validateMediaAndSourceTags([tag]), "source-archive must appear once");
  rejects(() => validateMediaAndSourceTags([archive, archive]), "source-archive must appear once");
});

Deno.test("media sniffing and dimension reading cover the supported formats", () => {
  for (const mimeType of ["image/png", "image/jpeg", "image/webp"]) {
    assertEquals(sniffMediaType(bytes(mimeType)), mimeType);
    assertEquals(imageDimensions(bytes(mimeType), mimeType), { width: 1, height: 1 });
  }
  assertEquals(sniffMediaType(webm), "video/webm");
  assertEquals(sniffMediaType(Uint8Array.from([0, 0, 0, 24, 102, 116, 121, 112])), "video/mp4");
  assertEquals(sniffMediaType(new TextEncoder().encode("<svg/>")), undefined);
  assertEquals(imageDimensions(pngHeader(1200, 750), "image/png"), { width: 1200, height: 750 });
  assertEquals(imageDimensions(pngHeader(1200, 750).subarray(0, 20), "image/png"), undefined);
  assertEquals(imageDimensions(bytes("image/png"), "image/jpeg"), undefined);
});

Deno.test("media tags derive x, m, dim and size from bytes and name their upload paths", async () => {
  const png = bytes("image/png");
  const shot = await buildMediaTag("screenshot", png, { alt: "Board" });
  assertEquals(shot.tag, [
    "screenshot",
    `x ${fixtureHash("image/png")}`,
    "m image/png",
    "dim 1x1",
    `size ${png.length}`,
    "alt Board",
  ]);
  assertEquals(
    mediaUploadPath("screenshot", shot.blob),
    `/screenshot-${fixtureHash("image/png")}.png`,
  );
  const clip = await buildMediaTag("preview", webm, { duration: 8.5 });
  assertEquals(clip.tag, [
    "preview",
    `x ${await sha256(webm)}`,
    "m video/webm",
    `size ${webm.length}`,
    "duration 8.5",
  ]);
  assertEquals(mediaUploadPath("preview", clip.blob), `/preview-${await sha256(webm)}.webm`);
  assertEquals(
    mediaUploadPath("screenshot", { sha256: X, mimeType: "image/jpeg" }),
    `/screenshot-${X}.jpg`,
  );
  await rejectsAsync(
    () => buildMediaTag("screenshot", webm),
    "screenshot must be PNG, JPEG, or WebP",
  );
  await rejectsAsync(() => buildMediaTag("preview", png), "preview must be WebM or MP4");
  await rejectsAsync(
    () => buildMediaTag("screenshot", new Uint8Array(), { label: "metadata.screenshots[0]" }),
    "metadata.screenshots[0]: media file is empty",
  );
});

Deno.test("config metadata validates source pins and local media entries", () => {
  const config = normalizeConfig({
    metadata: {
      source: "nostr://npub1example/relay.example/repo",
      sourceCommit: " a".repeat(1) + "a".repeat(39) + " ",
      sourceArchive: {
        url: " https://dl.example.com/src.tar.gz ",
        sha256: "c".repeat(64),
        mimeType: " application/gzip ",
      },
      screenshots: ["shots/one.png", { path: "shots/two.webp", alt: "Second" }],
      preview: { path: "clips/demo.webm", alt: "Demo", duration: 8.5 },
    },
  });
  assertEquals(config.metadata?.source, "nostr://npub1example/relay.example/repo");
  assertEquals(config.metadata?.sourceCommit, "a".repeat(40));
  assertEquals(config.metadata?.sourceArchive, {
    url: "https://dl.example.com/src.tar.gz",
    sha256: "c".repeat(64),
    mimeType: "application/gzip",
  });
  assertEquals(config.metadata?.screenshots, [{ path: "shots/one.png" }, {
    path: "shots/two.webp",
    alt: "Second",
  }]);
  assertEquals(config.metadata?.preview, { path: "clips/demo.webm", alt: "Demo", duration: 8.5 });
  assertEquals(normalizeConfig(JSON.parse(JSON.stringify(config))).metadata, config.metadata);
  assertEquals(defaultConfig(config).metadata, config.metadata);
  assertEquals(normalizeConfig({ metadata: { screenshots: [] } }).metadata?.screenshots, []);

  rejects(() => normalizeSourceCommit("A".repeat(40)), "metadata.sourceCommit");
  rejects(() => normalizeSourceCommit(42), "metadata.sourceCommit");
  rejects(
    () => normalizeSourceArchive("https://dl.example.com/src.tgz"),
    "metadata.sourceArchive must be an object",
  );
  rejects(
    () =>
      normalizeSourceArchive({
        url: "http://dl.example.com/src.tgz",
        sha256: "c".repeat(64),
        mimeType: "application/gzip",
      }),
    "metadata.sourceArchive.url",
  );
  rejects(
    () =>
      normalizeSourceArchive({
        url: "https://dl.example.com/src.tgz",
        sha256: "nope",
        mimeType: "application/gzip",
      }),
    "metadata.sourceArchive.sha256",
  );
  rejects(
    () =>
      normalizeSourceArchive({
        url: "https://dl.example.com/src.tgz",
        sha256: "c".repeat(64),
        mimeType: "gzip",
      }),
    "metadata.sourceArchive.mimeType",
  );
  rejects(
    () => normalizeScreenshotConfigs("shots/one.png", "metadata.screenshots"),
    "metadata.screenshots must be an array",
  );
  rejects(
    () => normalizeScreenshotConfigs([{ alt: "x" }], "metadata.screenshots"),
    "metadata.screenshots[0].path",
  );
  rejects(
    () => normalizeScreenshotConfigs(["https://images.example/shot.png"], "metadata.screenshots"),
    "must be a local file",
  );
  rejects(
    () => normalizeScreenshotConfigs([{ path: "a.png", alt: " " }], "metadata.screenshots"),
    "metadata.screenshots[0].alt",
  );
  rejects(
    () => normalizePreviewConfig({ path: "demo.webm", duration: -1 }),
    "metadata.preview.duration",
  );
  rejects(() => normalizePreviewConfig([]), "metadata.preview must be a local path");
  rejects(() => normalizeConfig({ metadata: { source: "nostr://" } }), "metadata.source");
});

async function rootDeploy(dir: string, config = defaultConfig()) {
  const candidate = {
    name: "notes",
    dir,
    indexHtml: `${dir}/index.html`,
    manifestPath: `${dir}/.nip5a-manifest.json`,
  };
  const plan = createDeployPlan(config, [candidate], { root: true });
  return await createDeployManifestTemplates(plan, config, { createdAt: 1 });
}

Deno.test("current deploy keeps blobs referenced by screenshot and preview tags", async () => {
  await withTempDir(async (dir) => {
    const png = bytes("image/png");
    await Deno.writeTextFile(`${dir}/index.html`, html);
    await Deno.writeFile(`${dir}/${fixtureHash("image/png")}.png`, png);
    await Deno.writeFile(`${dir}/${await sha256(webm)}.webm`, webm);
    const tags = [
      [
        "screenshot",
        `x ${fixtureHash("image/png")}`,
        "m image/png",
        "dim 1x1",
        `size ${png.length}`,
      ],
      ["preview", `x ${await sha256(webm)}`, "m video/webm"],
      ["source", "https://git.example.com/owner/repo.git"],
      ["source-commit", "b".repeat(40)],
      archive,
    ];
    await Deno.writeTextFile(`${dir}/.nip5a-manifest.json`, JSON.stringify({ tags }));
    const [manifest] = await rootDeploy(dir);
    assertEquals(
      manifest.files.map((file) => file.path).sort(),
      [`/${fixtureHash("image/png")}.png`, `/${await sha256(webm)}.webm`, "/index.html"].sort(),
    );
    for (const tag of tags) {
      assert(
        manifest.template!.tags.some((t) => JSON.stringify(t) === JSON.stringify(tag)),
        JSON.stringify(tag),
      );
    }
  });
});

Deno.test("current deploy refuses sidecar media clients would ignore and unreferenced blobs", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, html);
    await Deno.writeFile(`${dir}/${X}.png`, bytes("image/png"));
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({ tags: [["screenshot", `x ${X}`]] }),
    );
    await rejectsAsync(() => rootDeploy(dir), `/${X}.png`);
    await Deno.remove(`${dir}/${X}.png`);
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({ tags: [["screenshot", "m image/png"]] }),
    );
    await rejectsAsync(() => rootDeploy(dir), "screenshot tag would be ignored");
    await Deno.writeTextFile(
      `${dir}/.nip5a-manifest.json`,
      JSON.stringify({ tags: [["source-commit", "nope"]] }),
    );
    await rejectsAsync(() => rootDeploy(dir), "source-commit must appear once");
  });
});

Deno.test("configured media and source pins replace sidecar categories and upload their bytes", async () => {
  await withTempDir(async (dir) => {
    const png = bytes("image/png");
    const jpeg = bytes("image/jpeg");
    // Media lives outside the build directory; only the artifact and referenced blobs are collected there.
    const build = `${dir}/build`;
    await Deno.mkdir(build);
    await Deno.writeTextFile(`${build}/index.html`, html);
    await Deno.mkdir(`${dir}/media`);
    await Deno.writeFile(`${dir}/media/one.png`, png);
    await Deno.writeFile(`${dir}/media/two.jpg`, jpeg);
    await Deno.writeFile(`${dir}/media/demo.webm`, webm);
    await Deno.writeTextFile(
      `${build}/.nip5a-manifest.json`,
      JSON.stringify({
        tags: [
          ["screenshot", `x ${X}`, "m image/webp"],
          ["preview", `x ${X}`, "m video/mp4"],
          ["source-commit", "a".repeat(40)],
          ["source-archive", "https://old.example.com/src.tgz", "a".repeat(64), "application/gzip"],
        ],
      }),
    );
    const config = normalizeConfig({
      metadata: {
        sourceCommit: "b".repeat(64),
        sourceArchive: {
          url: "https://dl.example.com/src.tar.gz",
          sha256: "c".repeat(64),
          mimeType: "application/gzip",
        },
        screenshots: [`${dir}/media/one.png`, { path: `${dir}/media/two.jpg`, alt: "Second" }],
        preview: { path: `${dir}/media/demo.webm`, duration: 8 },
      },
    });
    const [manifest] = await rootDeploy(build, config);
    const tags = manifest.template!.tags;
    assertEquals(tags.filter((t) => t[0] === "screenshot"), [
      [
        "screenshot",
        `x ${fixtureHash("image/png")}`,
        "m image/png",
        "dim 1x1",
        `size ${png.length}`,
      ],
      [
        "screenshot",
        `x ${fixtureHash("image/jpeg")}`,
        "m image/jpeg",
        "dim 1x1",
        `size ${jpeg.length}`,
        "alt Second",
      ],
    ]);
    assertEquals(tags.filter((t) => t[0] === "preview"), [[
      "preview",
      `x ${await sha256(webm)}`,
      "m video/webm",
      `size ${webm.length}`,
      "duration 8",
    ]]);
    assertEquals(tags.filter((t) => t[0] === "source-commit"), [["source-commit", "b".repeat(64)]]);
    assertEquals(tags.filter((t) => t[0] === "source-archive"), [[
      "source-archive",
      "https://dl.example.com/src.tar.gz",
      "c".repeat(64),
      "application/gzip",
    ]]);
    assertEquals(manifest.files.map((file) => file.path), [
      "/index.html",
      `/screenshot-${fixtureHash("image/png")}.png`,
      `/screenshot-${fixtureHash("image/jpeg")}.jpg`,
      `/preview-${await sha256(webm)}.webm`,
    ]);
    assert(manifest.files.slice(1).every((file) => file.data && file.mimeType));
    assertEquals(manifest.files[1].sha256, fixtureHash("image/png"));

    const cleared = await rootDeploy(build, normalizeConfig({ metadata: { screenshots: [] } }));
    assertEquals(cleared[0].template!.tags.filter((t) => t[0] === "screenshot"), []);
    assertEquals(cleared[0].template!.tags.filter((t) => t[0] === "preview"), [[
      "preview",
      `x ${X}`,
      "m video/mp4",
    ]]);
    await rejectsAsync(
      () =>
        rootDeploy(
          build,
          normalizeConfig({ metadata: { screenshots: [`${dir}/media/missing.png`] } }),
        ),
      "metadata.screenshots[0]: media file not found",
    );
    await rejectsAsync(
      () => rootDeploy(build, normalizeConfig({ metadata: { preview: `${dir}/media/one.png` } })),
      "metadata.preview: preview must be WebM or MP4",
    );
  });
});

Deno.test("legacy output leaves configured media and source pins alone", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, html);
    await Deno.writeFile(`${dir}/one.png`, bytes("image/png"));
    const config = normalizeConfig({
      metadata: { screenshots: [`${dir}/one.png`], sourceCommit: "a".repeat(40) },
    });
    const candidate = { name: "notes", dir, indexHtml: `${dir}/index.html` };
    const plan = createDeployPlan(config, [candidate], { root: true });
    const [manifest] = await createDeployManifestTemplates(plan, config, {
      createdAt: 1,
      format: "legacy",
    });
    assertEquals(manifest.template!.tags.some((t) => t[0] === "screenshot"), false);
    assertEquals(manifest.template!.tags.filter((t) => t[0] === "source-commit"), [[
      "source-commit",
      "a".repeat(40),
    ]]);
  });
});

Deno.test("captured screenshots join each previewed artifact's current manifests before signing", async () => {
  await withTempDir(async (dir) => {
    const png = bytes("image/png");
    await Deno.writeFile(`${dir}/capture.png`, png);
    const files = [{ path: "/index.html", sha256: "1".repeat(64) }];
    const item = (name: string, target: "root" | "named" | "snapshot") => ({
      candidate: { name, dir: `${dir}/${name}`, indexHtml: `${dir}/${name}/index.html` },
      target,
      kind: 35129,
      dTag: target === "named" ? name : undefined,
    });
    const template = (target: "root" | "named") =>
      createSiteManifestTemplate(item("one", target), files, { createdAt: 1, content: "Notes" });
    const templates = [
      {
        item: item("one", "named"),
        files: [...files],
        format: "current" as const,
        template: await template("named"),
      },
      {
        item: item("one", "snapshot"),
        files: [...files],
        format: "current" as const,
        template: await template("root"),
      },
      {
        item: item("two", "named"),
        files: [...files],
        format: "current" as const,
        template: await template("named"),
      },
      {
        item: item("one", "named"),
        files: [...files],
        format: "legacy" as const,
        template: await template("named"),
      },
      {
        item: item("one", "named"),
        files: [...files],
        format: "current" as const,
        skippedReason: "no source",
      },
    ];
    const screenshot = {
      paths: [`${dir}/capture.png`],
      captures: [{ path: `${dir}/capture.png`, indexHtml: `${dir}/one/index.html` }],
      cleanup: () => Promise.resolve(),
    };
    await attachCapturedScreenshots(templates, screenshot, defaultConfig());
    const expected = [
      "screenshot",
      `x ${fixtureHash("image/png")}`,
      "m image/png",
      "dim 1x1",
      `size ${png.length}`,
    ];
    for (const index of [0, 1]) {
      assertEquals(templates[index].template!.tags.filter((t) => t[0] === "screenshot"), [
        expected,
      ]);
      assertEquals(templates[index].files.map((file) => file.path), [
        "/index.html",
        `/screenshot-${fixtureHash("image/png")}.png`,
      ]);
    }
    assertEquals(templates[2].template!.tags.some((t) => t[0] === "screenshot"), false);
    assertEquals(templates[3].template!.tags.some((t) => t[0] === "screenshot"), false);
    assertEquals(templates[4].files.length, 1);

    // A URL capture names no artifact, so it previews every current manifest; repeats dedupe.
    await attachCapturedScreenshots(templates, {
      ...screenshot,
      captures: [{ path: `${dir}/capture.png` }],
    }, defaultConfig());
    assertEquals(templates[2].template!.tags.filter((t) => t[0] === "screenshot"), [expected]);
    assertEquals(templates[0].template!.tags.filter((t) => t[0] === "screenshot").length, 1);
    assertEquals(templates[0].files.length, 2);

    // Explicit configuration keeps its own list.
    const untouched = {
      item: item("three", "named"),
      files: [...files],
      format: "current" as const,
      template: await template("named"),
    };
    await attachCapturedScreenshots(
      [untouched],
      screenshot,
      normalizeConfig({ metadata: { screenshots: [] } }),
    );
    assertEquals(untouched.template.tags.some((t) => t[0] === "screenshot"), false);
    await attachCapturedScreenshots([untouched], undefined, defaultConfig());
    assertEquals(untouched.files.length, 1);
  });
});

Deno.test("migration drops unusable presentation media and keeps valid source pins", () => {
  const key = new Uint8Array(32).fill(1);
  const signed = (tags: string[][]) =>
    finalizeEvent({
      kind: 35129,
      created_at: 1,
      content: "Notes",
      tags: [["d", "notes"], ["x", "1".repeat(64)], ...tags],
    }, key);
  const result = migrateManifestEvent(
    signed([
      ["screenshot", `x ${X}`, "m image/png"],
      ["screenshot", "m image/png"],
      ["preview", `x ${X}`],
      ["preview", `x ${X}`],
      ["source", "https://git.example.com/owner/repo.git"],
      ["source-commit", "a".repeat(40)],
      archive,
    ]),
    { createdAt: 2 },
  );
  assertEquals(result.template.tags.filter((t) => ["screenshot", "preview"].includes(t[0])), [[
    "screenshot",
    `x ${X}`,
    "m image/png",
  ]]);
  assertEquals(result.template.tags.filter((t) => t[0] === "source-commit"), [[
    "source-commit",
    "a".repeat(40),
  ]]);
  assertEquals(result.template.tags.filter((t) => t[0] === "source-archive"), [archive]);
  assert(
    result.notes.some((note) => note.includes("Unusable screenshot or preview metadata removed")),
  );
  const clean = migrateManifestEvent(signed([["screenshot", `x ${X}`]]), { createdAt: 2 });
  assertEquals(clean.notes.some((note) => note.includes("Unusable")), false);
  rejects(
    () => migrateManifestEvent(signed([["source-commit", "nope"]])),
    "source-commit must appear once",
  );
  rejects(
    () => migrateManifestEvent(signed([archive, archive])),
    "source-archive must appear once",
  );
});

function webpHeader(chunk: "VP8L" | "VP8X", width: number, height: number): Uint8Array {
  const out = new Uint8Array(40);
  out.set([82, 73, 70, 70, 32, 0, 0, 0, 87, 69, 66, 80, ...[...chunk].map((c) => c.charCodeAt(0))]);
  const view = new DataView(out.buffer);
  if (chunk === "VP8L") {
    out[20] = 0x2f;
    view.setUint32(21, (width - 1) | ((height - 1) << 14), true);
  } else {
    view.setUint32(24, width - 1, true);
    view.setUint32(27, height - 1, true);
  }
  return out;
}

Deno.test("dimension reading handles every WebP chunk layout and JPEG marker shape", () => {
  assertEquals(imageDimensions(webpHeader("VP8L", 300, 200), "image/webp"), { width: 300, height: 200 });
  assertEquals(imageDimensions(webpHeader("VP8X", 4096, 2160), "image/webp"), { width: 4096, height: 2160 });
  assertEquals(imageDimensions(webpHeader("VP8X", 4096, 2160).subarray(0, 26), "image/webp"), undefined);
  assertEquals(imageDimensions(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 65, 76, 80, 72]), "image/webp"), undefined);
  // Padding 0xFF bytes, a standalone RST marker, then a baseline SOF0 frame header.
  const sof = [0xff, 0xc0, 0, 11, 8, 1, 224, 2, 128, 1, 1, 0x11, 0];
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xff, 0xd0, 0xff, 0xe0, 0, 4, 0, 0, ...sof]);
  assertEquals(imageDimensions(jpeg, "image/jpeg"), { width: 640, height: 480 });
  assertEquals(imageDimensions(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2, 0, 0]), "image/jpeg"), undefined);
  assertEquals(imageDimensions(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0]), "image/jpeg"), undefined);
  assertEquals(imageDimensions(Uint8Array.from([0xff, 0xd8, 0x00, 0x00, 0, 0]), "image/jpeg"), undefined);
});

Deno.test("source archive URLs that do not parse are rejected everywhere", () => {
  rejects(() => validateMediaAndSourceTags([["source-archive", "not a url", "c".repeat(64), "application/gzip"]]), "source-archive must appear once");
  rejects(() => normalizeSourceArchive({ url: "not a url", sha256: "c".repeat(64), mimeType: "application/gzip" }), "metadata.sourceArchive.url");
});

Deno.test("configured media that is also a referenced build file is uploaded once, and unreadable paths surface their real error", async () => {
  await withTempDir(async (dir) => {
    const png = bytes("image/png");
    await Deno.writeTextFile(`${dir}/index.html`, html);
    await Deno.writeFile(`${dir}/one.png`, png);
    const [manifest] = await rootDeploy(dir, normalizeConfig({ metadata: { screenshots: [`${dir}/one.png`] } }));
    assertEquals(manifest.files.map((file) => file.path), ["/index.html", "/one.png"]);
    assertEquals(manifest.template!.tags.filter((t) => t[0] === "screenshot").length, 1);
    await Deno.mkdir(`${dir}/folder.png`);
    let error = "";
    try {
      await rootDeploy(dir, normalizeConfig({ metadata: { screenshots: [`${dir}/folder.png`] } }));
    } catch (caught) {
      error = String(caught);
    }
    assert(error && !error.includes("media file not found"), error);
  });
});
