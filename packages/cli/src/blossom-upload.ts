/**
 * Deno adapter for shared exact-byte Blossom uploads.
 *
 * The protocol request, authorization, redirect, descriptor, retry, and batch
 * semantics live in @napplet/build-tools. This module only reads deploy files,
 * supplies Deno DNS/fetch, and preserves the CLI's progress/result shape.
 *
 * @module
 */

import { contentType } from "@std/media-types";
import { extname } from "@std/path";
import {
  type BuildSigner,
  createNetworkPolicy,
  type NetworkPolicy,
  type PublicAddressResolver,
  uploadExactBlobs,
} from "@napplet/build-tools";
import { joinPath } from "./path.ts";
import type { NappletSigner } from "./signing.ts";
import type { DeployManifestTemplate, ManifestFileMapping } from "./types.ts";

export interface DeployFilePayload {
  candidateDir: string;
  path: string;
  sha256: string;
  data: Uint8Array;
  contentType: string;
}

export interface ServerUploadResult {
  server: string;
  file: string;
  sha256: string;
  success: boolean;
  skipped: boolean;
  error?: string;
}

export type UploadResultProgress = {
  type: "upload:result";
  completedUploads: number;
  totalUploads: number;
  result: ServerUploadResult;
};

export interface UploadFilesToServersOptions {
  fetch?: typeof fetch;
  now?: () => number;
  networkPolicy?: NetworkPolicy;
  resolve?: PublicAddressResolver["resolve"];
  onProgress?: (progress: UploadResultProgress) => void;
}

/** Read each unique manifest file without transforming the bytes before upload. */
export async function collectDeployFilePayloads(
  manifests: readonly DeployManifestTemplate[],
): Promise<DeployFilePayload[]> {
  const unique = new Map<string, { candidateDir: string; file: ManifestFileMapping }>();
  for (const manifest of manifests) {
    for (const file of manifest.files) {
      const key = `${manifest.item.candidate.dir}\0${file.path}`;
      if (!unique.has(key)) unique.set(key, { candidateDir: manifest.item.candidate.dir, file });
    }
  }
  const payloads: DeployFilePayload[] = [];
  for (const { candidateDir, file } of unique.values()) {
    const data = file.data ?? await Deno.readFile(joinPath(candidateDir, file.path.slice(1)));
    if (await sha256Hex(data) !== file.sha256) {
      throw new Error(`Deploy input changed after manifest creation: ${file.path}`);
    }
    payloads.push({
      candidateDir,
      path: file.path,
      sha256: file.sha256,
      data,
      contentType: file.mimeType ?? contentTypeForPath(file.path),
    });
  }
  return payloads;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const bytes = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Upload exact payload bytes through the shared BUD implementation.
 *
 * @returns Per-upload evidence compatible with existing deployment reporting.
 */
export async function uploadFilesToServers(
  files: readonly DeployFilePayload[],
  servers: readonly string[],
  signer: NappletSigner,
  options: UploadFilesToServersOptions = {},
): Promise<ServerUploadResult[]> {
  if (files.length === 0 || servers.length === 0) return [];
  const policy = options.networkPolicy ??
    createNetworkPolicy({ resolve: options.resolve ?? resolvePublicDns });
  const endpoints = [];
  try {
    for (const server of servers) {
      endpoints.push(await policy.validate(new URL(server), new AbortController().signal));
    }
  } catch {
    return recordFailure(files, servers[0], "Upload did not produce verified evidence", options);
  }
  const result = await uploadExactBlobs({
    primary: endpoints[0],
    secondary: endpoints.slice(1),
    blobs: files.map((file) => ({ bytes: file.data, contentType: file.contentType })),
    signer: asBuildSigner(signer),
  }, { fetch: options.fetch ?? globalThis.fetch, networkPolicy: policy, now: options.now });
  const pathForHash = new Map(files.map((file) => [file.sha256, file.path]));
  const uploads = result.evidence.map((evidence) => ({
    server: safeServer(evidence.server),
    file: pathForHash.get(evidence.sha256) ?? "[unknown-file]",
    sha256: evidence.sha256,
    success: evidence.accepted,
    skipped: evidence.descriptor?.existed ?? false,
    error: evidence.error?.message,
  }));
  let completedUploads = 0;
  for (const upload of uploads) {
    completedUploads += 1;
    options.onProgress?.({
      type: "upload:result",
      completedUploads,
      totalUploads: files.length * servers.length,
      result: upload,
    });
  }
  return uploads;
}

function asBuildSigner(signer: NappletSigner): BuildSigner {
  return {
    signEvent: (template) => signer.sign(template),
    getPublicKey: () => Promise.resolve(signer.pubkey),
    close: () => signer.close?.() ?? Promise.resolve(),
  };
}

function recordFailure(
  files: readonly DeployFilePayload[],
  server: string,
  error: string,
  options: UploadFilesToServersOptions,
): ServerUploadResult[] {
  const results = files.map((file) => ({
    server: safeServer(server),
    file: file.path,
    sha256: file.sha256,
    success: false,
    skipped: false,
    error,
  }));
  for (const [index, result] of results.entries()) {
    options.onProgress?.({
      type: "upload:result",
      completedUploads: index + 1,
      totalUploads: files.length,
      result,
    });
  }
  return results;
}

async function resolvePublicDns(
  hostname: string,
  _signal: AbortSignal,
): Promise<readonly string[]> {
  const records = await Promise.allSettled([
    Deno.resolveDns(hostname, "A"),
    Deno.resolveDns(hostname, "AAAA"),
  ]);
  return records.flatMap((record) => record.status === "fulfilled" ? record.value : []);
}

function contentTypeForPath(path: string): string {
  const extension = extname(path);
  const type = extension ? contentType(extension) : undefined;
  if (type) return type;
  console.warn(
    `[deploy] no known content type for "${path}"; uploading as application/octet-stream`,
  );
  return "application/octet-stream";
}

function safeServer(value: string): string {
  try {
    return new URL(value).toString();
  } catch {
    return "[invalid-server]";
  }
}
