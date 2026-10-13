/** Local recording provenance and byte checks for optional application previews. */
import { resolvePath } from "./path.ts";
import type { PreviewVideo } from "./types.ts";

/**
 * Validate the recorder sidecar selected for publication.
 * @param input Optional local recording metadata.
 * @returns Validated selection, or undefined when absent.
 * @example normalizePreviewVideo(config.zapstore?.video)
 */
export function normalizePreviewVideo(input: unknown): PreviewVideo | undefined {
  if (input === undefined) return undefined;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("zapstore.video must be a recording object");
  const value = input as Record<string, unknown>;
  for (const key of ["file", "thumbnail"]) {
    if (typeof value[key] !== "string" || !value[key].trim()) throw new Error(`zapstore.video.${key} must be a local path`);
  }
  for (const key of ["artifactHash", "sha256"]) {
    if (typeof value[key] !== "string" || !/^[a-f0-9]{64}$/.test(value[key])) throw new Error(`zapstore.video.${key} must be a SHA-256 hash`);
  }
  for (const [key, max] of [["width", 1920], ["height", 1920], ["durationMs", 35000]] as const) {
    if (!Number.isInteger(value[key]) || Number(value[key]) <= 0 || Number(value[key]) > max) throw new Error(`zapstore.video.${key} is outside recording limits`);
  }
  return { file: value.file as string, thumbnail: value.thumbnail as string, artifactHash: value.artifactHash as string, sha256: value.sha256 as string, width: Number(value.width), height: Number(value.height), durationMs: Number(value.durationMs) };
}

/**
 * Hash local bytes identically to the artifact and Blossom upload paths.
 * @param bytes File contents.
 * @returns Lowercase SHA-256 hex digest.
 * @example await previewDigest(await Deno.readFile('preview.webm'))
 */
export async function previewDigest(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Read an unchanged recorded clip only when it belongs to every selected build.
 * @param video Selected local recording.
 * @param artifactHashes Exact artifact hashes being published.
 * @param cwd Base directory for relative media paths.
 * @returns Verified WebM bytes.
 * @example await readPreviewVideo(video, [artifactHash], Deno.cwd())
 */
export async function readPreviewVideo(video: PreviewVideo, artifactHashes: readonly string[], cwd: string): Promise<Uint8Array> {
  if (!artifactHashes.length || artifactHashes.some((hash) => hash !== video.artifactHash)) {
    throw new Error("Selected video belongs to a different build. Record again or run napplet record --clear.");
  }
  const path = resolvePath(cwd, video.file);
  const file = await Deno.open(path, { read: true });
  try {
    const info = await file.stat();
    if (!info.isFile || info.size < 4 || info.size > 20 * 1024 * 1024) throw new Error("Selected video must be a WebM file up to 20 MiB");
    const data = new Uint8Array(info.size);
    let offset = 0;
    while (offset < data.length) {
      const count = await file.read(data.subarray(offset));
      if (count === null) throw new Error("Selected video changed while reading");
      offset += count;
    }
    if (await file.read(new Uint8Array(1)) !== null) throw new Error("Selected video changed while reading");
    if (![0x1a, 0x45, 0xdf, 0xa3].every((byte, index) => data[index] === byte)) throw new Error("Selected video must be WebM");
    if (await previewDigest(data) !== video.sha256) throw new Error("Selected video bytes changed. Record again before publishing.");
    return data;
  } finally { file.close(); }
}
