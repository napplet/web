/** Temporary pre-artifact-hash serializer. Remove with CLI --format legacy. */
import type { ManifestFileMapping, NostrEventTemplate } from "./types.ts";

/** Compute the historical NIP-5A path aggregate for explicitly legacy output. */
export async function computeAggregateHash(files: readonly ManifestFileMapping[]): Promise<string> {
  if (!files.length) throw new Error("Manifest must include at least one path tag");
  const lines = files.map((file) => {
    if (
      !file.path.startsWith("/") || file.path.endsWith("/") || !/^[0-9a-f]{64}$/.test(file.sha256)
    ) throw new Error(`Invalid legacy path mapping: ${file.path}`);
    return `${file.sha256} ${file.path}\n`;
  }).sort().join("");
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(lines)))]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildLegacyManifestFields(
  files: readonly ManifestFileMapping[],
  metadata: readonly string[][],
  description: string,
): Promise<Pick<NostrEventTemplate, "tags" | "content">> {
  const tags: string[][] = files.map((file) => ["path", file.path, file.sha256]);
  tags.push(["x", await computeAggregateHash(files), "aggregate"]);
  if (description) tags.push(["description", description]);
  for (const tag of metadata) {
    if (tag[0] === "R" || tag[0] === "O") tags.push(["requires", tag[1]]);
    else if (tag[0] === "z") {
      for (const intent of metadata.filter((item) => item[0] === "i")) {
        tags.push(["archetype", tag[1], intent[1]]);
      }
    } else if (!["i", "description", "path", "x", "d", "a", "A", "server"].includes(tag[0])) {
      tags.push([...tag]);
    }
  }
  return {
    tags: tags.filter((tag, index) =>
      tags.findIndex((other) => JSON.stringify(tag) === JSON.stringify(other)) === index
    ),
    content: "",
  };
}
