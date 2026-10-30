/**
 * NIP-5D presentation media and source pins for deployment.
 *
 * `screenshot` and `preview` tags carry NIP-92 `key value` fields; `source-commit`
 * and `source-archive` pin the revision behind a `source` tag. This module mirrors the
 * living text at https://github.com/nostr-protocol/nips/pull/2303 (§Presentation media,
 * §Source) and is non-normative implementation guidance.
 */

/** Image formats a NIP-5D client decodes for icons and screenshots. */
export const SCREENSHOT_FORMATS = ["image/png", "image/jpeg", "image/webp"];
const MIME_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/webm": "webm",
  "video/mp4": "mp4",
};

/** Parsed NIP-92 fields of one presentation media tag. */
export interface MediaFields {
  /** Lowercase-hex sha256 from the single `x` field, when usable. */
  sha256?: string;
  /** Declared MIME type (`m`), when present and well-formed. */
  mimeType?: string;
  /** Problems that make a client ignore the whole entry. */
  problems: string[];
}

/** Blob bytes resolved from a local file for a configured screenshot or preview. */
export interface MediaBlob {
  sha256: string;
  mimeType: string;
  data: Uint8Array;
}

/**
 * Parse one `screenshot` or `preview` tag's `key value` fields.
 * @param tag Manifest tag including its name.
 * @returns The usable hash and type, plus problems that make clients ignore the entry.
 * @example parseMediaFields(["screenshot", "x <sha256>", "m image/png"])
 */
export function parseMediaFields(tag: readonly string[]): MediaFields {
  const fields = new Map<string, string[]>();
  for (const field of tag.slice(1)) {
    const space = field.indexOf(" ");
    const key = space < 0 ? field : field.slice(0, space);
    const values = fields.get(key) ?? [];
    values.push(space < 0 ? "" : field.slice(space + 1));
    fields.set(key, values);
  }
  const problems: string[] = [];
  const hashes = fields.get("x");
  const sha256 = hashes?.length === 1 && SHA256.test(hashes[0]) ? hashes[0] : undefined;
  if (!sha256) problems.push("exactly one x field with a lowercase sha256 is required");
  const types = fields.get("m");
  const mimeType = types?.length === 1 && MIME_TYPE.test(types[0])
    ? types[0].toLowerCase()
    : undefined;
  if (mimeType !== undefined) {
    const decodable = tag[0] === "preview"
      ? mimeType.startsWith("video/")
      : SCREENSHOT_FORMATS.includes(mimeType);
    if (!decodable) problems.push(`${mimeType} cannot match a decodable ${tag[0]} format`);
  }
  return { sha256, mimeType, problems };
}

/**
 * Hashes of presentation blobs a client could resolve from the given tags.
 * @param tags Manifest tags.
 * @returns Usable `x` hashes of screenshot and preview tags, ignoring unusable entries.
 * @example presentationMediaHashes(template.tags)
 */
export function presentationMediaHashes(tags: readonly (readonly string[])[]): Set<string> {
  const hashes = new Set<string>();
  const previews = tags.filter((tag) => tag[0] === "preview");
  for (const tag of tags) {
    if (tag[0] !== "screenshot" && !(tag[0] === "preview" && previews.length === 1)) continue;
    const { sha256, problems } = parseMediaFields(tag);
    if (sha256 && !problems.length) hashes.add(sha256);
  }
  return hashes;
}

/**
 * Validate presentation media and source pins before signing a current-format event.
 * @param tags Manifest tags.
 * @throws When an entry would be ignored by clients or a source pin is malformed.
 * @example validateMediaAndSourceTags(template.tags)
 */
export function validateMediaAndSourceTags(tags: readonly (readonly string[])[]): void {
  for (const tag of tags) {
    if (tag[0] !== "screenshot" && tag[0] !== "preview") continue;
    const { problems } = parseMediaFields(tag);
    if (problems.length) {
      throw new Error(`${tag[0]} tag would be ignored by clients: ${problems[0]}`);
    }
  }
  if (tags.filter((tag) => tag[0] === "preview").length > 1) {
    throw new Error("A manifest carries at most one preview tag");
  }
  const commits = tags.filter((tag) => tag[0] === "source-commit");
  if (commits.length > 1 || commits.some((tag) => tag.length !== 2 || !COMMIT.test(tag[1]))) {
    throw new Error(
      "source-commit must appear once with a full lowercase-hex Git commit ID (40 or 64 characters)",
    );
  }
  const archives = tags.filter((tag) => tag[0] === "source-archive");
  if (
    archives.length > 1 ||
    archives.some((tag) =>
      tag.length !== 4 || !isArchiveUrl(tag[1]) || !SHA256.test(tag[2]) || !MIME_TYPE.test(tag[3])
    )
  ) {
    throw new Error(
      "source-archive must appear once with an HTTPS URL without credentials or fragment, a lowercase sha256, and a MIME type",
    );
  }
}

/**
 * Validate a configured Git commit pin.
 * @param value Configured value.
 * @returns The commit ID, or undefined when absent.
 * @example normalizeSourceCommit("a".repeat(40))
 */
export function normalizeSourceCommit(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !COMMIT.test(value.trim())) {
    throw new Error(
      "metadata.sourceCommit must be a full lowercase-hex Git commit ID (40 or 64 characters)",
    );
  }
  return value.trim();
}

/**
 * Validate a configured source archive.
 * @param value Configured value.
 * @returns The normalized archive fields, or undefined when absent.
 * @example normalizeSourceArchive({ url: "https://dl.example/src.tgz", sha256, mimeType: "application/gzip" })
 */
export function normalizeSourceArchive(
  value: unknown,
): { url: string; sha256: string; mimeType: string } | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("metadata.sourceArchive must be an object with url, sha256 and mimeType");
  }
  const { url, sha256, mimeType } = value as Record<string, unknown>;
  if (typeof url !== "string" || !isArchiveUrl(url.trim())) {
    throw new Error(
      "metadata.sourceArchive.url must be an absolute HTTPS URL without credentials or a fragment",
    );
  }
  if (typeof sha256 !== "string" || !SHA256.test(sha256)) {
    throw new Error("metadata.sourceArchive.sha256 must be a lowercase sha256");
  }
  if (typeof mimeType !== "string" || !MIME_TYPE.test(mimeType.trim())) {
    throw new Error("metadata.sourceArchive.mimeType must be a MIME type");
  }
  return { url: url.trim(), sha256, mimeType: mimeType.trim() };
}

/** Configured local screenshot. */
export interface ScreenshotConfig {
  path: string;
  alt?: string;
}

/** Configured local preview video. */
export interface PreviewConfig extends ScreenshotConfig {
  duration?: number;
}

/**
 * Validate configured screenshots: local paths with optional alt text.
 * @param value Configured value; strings are shorthand for `{ path }`.
 * @param field Config field name for error messages.
 * @returns Normalized entries, or undefined when absent.
 * @example normalizeScreenshotConfigs(["shots/board.png"], "metadata.screenshots")
 */
export function normalizeScreenshotConfigs(
  value: unknown,
  field: string,
): ScreenshotConfig[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`${field} must be an array of local image paths`);
  return value.map((entry, index) => normalizeMediaConfig(entry, `${field}[${index}]`));
}

/**
 * Validate a configured preview video: a local path with optional alt and duration.
 * @param value Configured value; a string is shorthand for `{ path }`.
 * @returns The normalized entry, or undefined when absent.
 * @example normalizePreviewConfig({ path: "clips/demo.webm", duration: 8.5 })
 */
export function normalizePreviewConfig(value: unknown): PreviewConfig | undefined {
  if (value === undefined) return undefined;
  const entry = normalizeMediaConfig(value, "metadata.preview") as PreviewConfig;
  const duration = typeof value === "object" && value
    ? (value as Record<string, unknown>).duration
    : undefined;
  if (duration !== undefined) {
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) {
      throw new Error("metadata.preview.duration must be a non-negative number of seconds");
    }
    entry.duration = duration;
  }
  return entry;
}

function normalizeMediaConfig(value: unknown, field: string): ScreenshotConfig {
  if (typeof value === "string") value = { path: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be a local path or an object with path and optional alt`);
  }
  const { path, alt } = value as Record<string, unknown>;
  if (typeof path !== "string" || !path.trim()) {
    throw new Error(`${field}.path must be a non-empty local path`);
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path.trim())) {
    throw new Error(`${field}.path must be a local file, not a URL`);
  }
  if (alt !== undefined && (typeof alt !== "string" || !alt.trim())) {
    throw new Error(`${field}.alt must be a non-empty string`);
  }
  return { path: path.trim(), ...(alt === undefined ? {} : { alt: (alt as string).trim() }) };
}

/**
 * Build a presentation tag from media bytes.
 * @param kind Tag name.
 * @param data Complete media bytes.
 * @param options Accessible text and preview duration.
 * @returns The tag and the blob to upload.
 * @throws When the bytes are not a decodable screenshot or preview format.
 * @example await buildMediaTag("screenshot", await Deno.readFile("board.png"), { alt: "Board" })
 */
export async function buildMediaTag(
  kind: "screenshot" | "preview",
  data: Uint8Array,
  options: { alt?: string; duration?: number; label?: string } = {},
): Promise<{ tag: string[]; blob: MediaBlob }> {
  const label = options.label ?? kind;
  if (!data.length) throw new Error(`${label}: media file is empty`);
  const mimeType = sniffMediaType(data);
  const decodable = mimeType !== undefined &&
    (kind === "preview" ? mimeType.startsWith("video/") : SCREENSHOT_FORMATS.includes(mimeType));
  if (!decodable) {
    throw new Error(
      `${label}: ${
        kind === "preview" ? "preview must be WebM or MP4" : "screenshot must be PNG, JPEG, or WebP"
      }`,
    );
  }
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const tag = [kind, `x ${sha256}`, `m ${mimeType}`];
  const dim = kind === "screenshot" ? imageDimensions(data, mimeType) : undefined;
  if (dim) tag.push(`dim ${dim.width}x${dim.height}`);
  tag.push(`size ${data.length}`);
  if (options.duration !== undefined) tag.push(`duration ${options.duration}`);
  if (options.alt !== undefined) tag.push(`alt ${options.alt}`);
  return { tag, blob: { sha256, mimeType, data } };
}

/**
 * Conventional upload path for a presentation blob.
 * @param blob Resolved blob.
 * @returns A deploy-local path such as `/screenshot-<sha256>.png`.
 * @example mediaUploadPath("screenshot", blob)
 */
export function mediaUploadPath(
  kind: "screenshot" | "preview",
  blob: Pick<MediaBlob, "sha256" | "mimeType">,
): string {
  const extension = EXTENSIONS[blob.mimeType] ??
    blob.mimeType.split("/")[1].replace(/[^a-z0-9]+/gi, "");
  return `/${kind}-${blob.sha256}.${extension}`;
}

/**
 * Detect a supported presentation format from leading bytes.
 * @param data Complete media bytes.
 * @returns PNG, JPEG, WebP, WebM or MP4 type, or undefined.
 * @example sniffMediaType(bytes) // "image/png"
 */
export function sniffMediaType(data: Uint8Array): string | undefined {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => data[index] === byte)) {
    return "image/png";
  }
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (ascii(data, 0, 4) === "RIFF" && ascii(data, 8, 12) === "WEBP") return "image/webp";
  if (data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3) {
    return "video/webm";
  }
  if (ascii(data, 4, 8) === "ftyp") return "video/mp4";
  return undefined;
}

/**
 * Read pixel dimensions from PNG, JPEG, or WebP headers without decoding pixels.
 * @param data Complete image bytes.
 * @param mimeType Sniffed image format.
 * @returns Width and height, or undefined when the header is unreadable.
 * @example imageDimensions(png, "image/png")
 */
export function imageDimensions(
  data: Uint8Array,
  mimeType: string,
): { width: number; height: number } | undefined {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  try {
    if (mimeType === "image/png" && ascii(data, 12, 16) === "IHDR") {
      return positive(view.getUint32(16), view.getUint32(20));
    }
    if (mimeType === "image/jpeg") return jpegDimensions(data, view);
    if (mimeType === "image/webp") {
      const chunk = ascii(data, 12, 16);
      if (chunk === "VP8 ") {
        return positive(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
      }
      if (chunk === "VP8L") {
        const bits = view.getUint32(21, true);
        return positive((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
      }
      if (chunk === "VP8X") return positive(uint24(data, 24) + 1, uint24(data, 27) + 1);
    }
  } catch {
    // Truncated headers carry no dimensions.
  }
  return undefined;
}

function jpegDimensions(
  data: Uint8Array,
  view: DataView,
): { width: number; height: number } | undefined {
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return undefined;
    const marker = data[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return undefined;
    const length = view.getUint16(offset + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) return positive(view.getUint16(offset + 7), view.getUint16(offset + 5));
    offset += 2 + length;
  }
  return undefined;
}

function isArchiveUrl(value: string): boolean {
  if (!value || value.includes("#")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function ascii(data: Uint8Array, start: number, end: number): string {
  return data.length >= end ? String.fromCharCode(...data.subarray(start, end)) : "";
}

function uint24(data: Uint8Array, offset: number): number {
  if (data.length < offset + 3) throw new RangeError("truncated");
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
}

function positive(width: number, height: number): { width: number; height: number } | undefined {
  return width > 0 && height > 0 ? { width, height } : undefined;
}
