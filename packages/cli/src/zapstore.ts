/** Optional software application events and their local image uploads. */
import { resolvePath } from "./path.ts";
import type { DeployFilePayload } from "./blossom-upload.ts";
import type {
  NappletConfig,
  NostrEventTemplate,
  SignedNostrEvent,
  ZapstoreConfig,
} from "./types.ts";

/** Prepared kind 32267 event and the blobs referenced by its media URLs. */
export interface ZapstorePublication {
  template: NostrEventTemplate;
  signedEvent?: SignedNostrEvent;
  files: DeployFilePayload[];
  mediaServer?: string;
}

/**
 * Validate the optional CLI application listing configuration.
 * @param input JSON configuration value.
 * @returns Validated configuration, or undefined when absent.
 * @example normalizeZapstoreConfig({ id: "org.example.notes", name: "Notes" })
 */
export function normalizeZapstoreConfig(input: unknown): ZapstoreConfig | undefined {
  if (input === undefined) return undefined;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("zapstore must be an object");
  }
  const value = input as Record<string, unknown>;
  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    throw new Error("zapstore.enabled must be a boolean");
  }
  const result: Record<string, unknown> = { enabled: value.enabled };
  for (
    const key of [
      "id",
      "name",
      "description",
      "summary",
      "icon",
      "website",
      "repository",
      "license",
    ]
  ) {
    const field = value[key];
    if (field === undefined && key !== "id" && key !== "name") continue;
    if (typeof field !== "string" || !field.trim()) {
      throw new Error(`zapstore.${key} must be a non-empty string`);
    }
    result[key] = field.trim();
  }
  for (const key of ["images", "tags"]) {
    const field = value[key];
    if (field === undefined) continue;
    if (!Array.isArray(field) || field.some((item) => typeof item !== "string" || !item.trim())) {
      throw new Error(`zapstore.${key} must contain non-empty strings`);
    }
    result[key] = [...new Set(field.map((item: string) => item.trim()))];
  }
  return result as unknown as ZapstoreConfig;
}

/**
 * Prepare an opt-in application event without signing or network writes.
 * @param config Deployment configuration.
 * @param servers Validated Blossom origins, in preference order.
 * @param options CLI opt-in override, local path base, and event timestamp.
 * @returns Application metadata and upload bytes, or undefined when disabled.
 * @example await prepareZapstorePublication(config, servers, { enabled: true })
 */
export async function prepareZapstorePublication(
  config: NappletConfig,
  servers: readonly string[],
  options: { enabled?: boolean; cwd?: string; createdAt?: number } = {},
): Promise<ZapstorePublication | undefined> {
  if (!(options.enabled ?? config.zapstore?.enabled ?? false)) return undefined;
  const metadata = normalizeZapstoreConfig(config.zapstore);
  if (!metadata) throw new Error("--zapstore requires zapstore.id and zapstore.name in config");
  const files: DeployFilePayload[] = [];
  const cwd = options.cwd ?? Deno.cwd();
  const media = async (value: string): Promise<string> => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[a-z]:[\\/]/i.test(value)) {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("Zapstore image URLs must use HTTP(S) without credentials");
      }
      return url.href;
    }
    if (!servers.length) throw new Error("Local Zapstore images require a Blossom server");
    const path = resolvePath(cwd, value);
    const data = await Deno.readFile(path);
    const contentType = imageType(data);
    if (!contentType) throw new Error(`Zapstore image must be PNG, JPEG, or WebP: ${value}`);
    const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
    const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    if (!files.some((file) => file.sha256 === sha256)) {
      files.push({ candidateDir: cwd, path: value, sha256, data, contentType });
    }
    return `${servers[0].replace(/\/$/, "")}/${sha256}`;
  };
  // Proposed Software Applications NIP, "Software Application":
  // https://github.com/nostr-protocol/nips/pull/1336
  const tags: string[][] = [["d", metadata.id], ["name", metadata.name]];
  for (
    const [key, tag] of [["summary", "summary"], ["website", "url"], ["repository", "repository"], [
      "license",
      "license",
    ]] as const
  ) {
    if (metadata[key]) tags.push([tag, metadata[key]!]);
  }
  if (metadata.icon) tags.push(["icon", await media(metadata.icon)]);
  for (const value of metadata.images ?? []) tags.push(["image", await media(value)]);
  for (const topic of metadata.tags ?? []) tags.push(["t", topic]);
  return {
    template: {
      kind: 32267,
      created_at: options.createdAt ?? Math.floor(Date.now() / 1000),
      content: metadata.description ?? config.metadata?.description ?? "",
      tags,
    },
    files,
    mediaServer: files.length ? servers[0] : undefined,
  };
}

function imageType(bytes: Uint8Array): string | undefined {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) {
    return "image/png";
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  const text = new TextDecoder().decode(bytes.subarray(0, 12));
  if (text.startsWith("RIFF") && text.endsWith("WEBP")) return "image/webp";
  return undefined;
}
