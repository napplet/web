/** Convert verified legacy event JSON into an unsigned current manifest for review. */
import { verifyEvent } from "nostr-tools";
import type { NostrEventTemplate, SignedNostrEvent } from "./types.ts";

export interface MigrationOptions {
  description?: string;
  /** Explicitly classify these legacy requirements as optional integrations. */
  optional?: string[];
  createdAt?: number;
}

export interface MigrationResult {
  sourceId: string;
  sourcePubkey: string;
  template: NostrEventTemplate;
  notes: string[];
}

/**
 * Prepare a current NIP-5D event without signing, publishing or changing its artifact.
 * @param input Original signed manifest event.
 * @param options Description and optional-domain choices made by the operator.
 * @returns Unsigned template and provenance for review; the input is left intact.
 * @example migrateManifestEvent(event, { optional: ['theme'] })
 */
export function migrateManifestEvent(
  input: unknown,
  options: MigrationOptions = {},
): MigrationResult {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be a signed event JSON object");
  }
  const event = input as SignedNostrEvent;
  if (
    !Array.isArray(event.tags) ||
    !event.tags.every((tag) => Array.isArray(tag) && tag.every((part) => typeof part === "string"))
  ) throw new Error("Event tags must be arrays of strings");
  // Clone before signature verification: never trust nostr-tools' cached verification symbol.
  const source = JSON.parse(JSON.stringify(event)) as SignedNostrEvent;
  if (!verifyEvent(source)) throw new Error("Source event signature is invalid");
  if (![5129, 15129, 35129].includes(event.kind)) {
    throw new Error("Source is not a NIP-5D napplet manifest");
  }
  const ds = event.tags.filter((tag) => tag[0] === "d");
  if (event.kind === 35129 ? ds.length !== 1 || !ds[0][1] : ds.length !== 0) {
    throw new Error("Source has ambiguous or invalid d tags");
  }
  const paths = event.tags.filter((tag) => tag[0] === "path");
  const hashes = event.tags.filter((tag) => tag[0] === "x");
  const legacy = paths.length > 0 || hashes.some((tag) => tag[2] === "aggregate");
  let artifactHash: string;
  if (legacy) {
    if (paths.length !== 1 || paths[0][1] !== "/index.html") {
      throw new Error(
        "Migration requires exactly one /index.html path; rebundle multi-file napplets first",
      );
    }
    artifactHash = paths[0][2];
  } else {
    if (hashes.length !== 1 || hashes[0].length !== 2) {
      throw new Error("Current manifests require exactly one artifact x tag");
    }
    artifactHash = hashes[0][1];
  }
  if (!/^[0-9a-f]{64}$/.test(artifactHash)) {
    throw new Error("Artifact hash must be lowercase sha256 hex");
  }
  const descriptions = event.tags.filter((tag) => tag[0] === "description");
  if (descriptions.length > 1 && options.description === undefined) {
    throw new Error("Source has multiple descriptions; supply --description");
  }
  const content = options.description ??
    (legacy ? descriptions[0]?.[1] || event.content : event.content);
  if (!content?.trim()) {
    throw new Error("Supply --description with a non-empty plain-text description");
  }
  const tags = convertTags(event, options, artifactHash);
  const notes = legacy
    ? [
      "Artifact bytes are unchanged. Shell ACL/storage identities change from aggregate to artifact hash.",
    ]
    : ["Source already uses the current artifact-hash schema."];
  const icons = tags.filter((tag) => tag[0] === "icon");
  const invalidIcons = icons.length > 1 ||
    icons.some((tag) =>
      tag.length !== 3 || !/^[0-9a-f]{64}$/.test(tag[1]) ||
      !["image/png", "image/jpeg", "image/webp"].includes(tag[2])
    );
  if (invalidIcons) {
    notes.push("Invalid optional icon metadata removed; clients use generic artwork.");
  }
  for (const name of ["title", "source", "a", "A"]) {
    const values = tags.filter((tag) => tag[0] === name);
    if (values.length > 1 || (values.length && ["a", "A"].includes(name) && event.kind !== 5129)) {
      throw new Error(`Invalid ${name} metadata cardinality`);
    }
  }
  return {
    sourceId: event.id,
    sourcePubkey: event.pubkey,
    template: {
      kind: event.kind,
      created_at: options.createdAt ??
        Math.max(Math.floor(Date.now() / 1000), event.created_at + 1),
      tags: invalidIcons ? tags.filter((tag) => tag[0] !== "icon") : tags,
      content,
    },
    notes,
  };
}

function convertTags(
  event: SignedNostrEvent,
  options: MigrationOptions,
  artifactHash: string,
): string[][] {
  const optional = new Set(options.optional ?? []);
  const declared = event.tags.filter((tag) => ["requires", "R", "O"].includes(tag[0])).map((tag) =>
    tag[1]
  );
  for (const domain of optional) {
    if (!declared.includes(domain)) {
      throw new Error(`Optional domain ${domain} was not declared by the source`);
    }
  }
  const tags: string[][] = [["x", artifactHash]];
  for (const tag of event.tags) {
    if (["x", "path", "description"].includes(tag[0])) continue;
    if (tag[0] === "requires" || tag[0] === "R" || tag[0] === "O") {
      if (tag.length !== 2 || !tag[1] || /[:\s]/.test(tag[1]) || tag[1].startsWith("NAP-")) {
        throw new Error("Capability tags must name one bare NAP domain");
      }
      tags.push([optional.has(tag[1]) || tag[0] === "O" ? "O" : "R", tag[1]]);
    } else if (tag[0] === "archetype") {
      if (tag.length !== 3 || !tag[1] || !/^napplet:[^/?#\s]+\/[^/?#\s]+$/.test(tag[2])) {
        throw new Error("Ambiguous legacy archetype tag; review its intent before migration");
      }
      tags.push(["z", tag[1]], ["i", tag[2]]);
    } else {
      if (tag[0] === "i" && (!tag[1]?.trim() || tag[1].includes("?"))) {
        throw new Error("Intent advertisements must be non-empty queryless identities");
      }
      tags.push([...tag]);
    }
  }
  return tags.filter((tag, index) =>
    tags.findIndex((other) => JSON.stringify(tag) === JSON.stringify(other)) === index
  );
}
