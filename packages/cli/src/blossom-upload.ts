import { base64urlnopad } from "@scure/base";
import { contentType } from "@std/media-types";
import { extname } from "@std/path";
import { joinPath } from "./path.ts";
import type { NappletSigner } from "./signing.ts";
import type { DeployManifestTemplate, ManifestFileMapping, SignedNostrEvent } from "./types.ts";

const UPLOAD_AUTH_KIND = 24242;
const UPLOAD_AUTH_TTL_SECONDS = 3600;
type UploadAuthorizationEncoding = "base64url" | "base64";

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
  onProgress?: (progress: UploadResultProgress) => void;
}

export async function collectDeployFilePayloads(
  manifests: readonly DeployManifestTemplate[],
): Promise<DeployFilePayload[]> {
  const unique = new Map<string, { candidateDir: string; file: ManifestFileMapping }>();
  for (const manifest of manifests) {
    for (const file of manifest.files) {
      const key = `${manifest.item.candidate.dir}\0${file.path}`;
      if (!unique.has(key)) {
        unique.set(key, { candidateDir: manifest.item.candidate.dir, file });
      }
    }
  }
  const payloads: DeployFilePayload[] = [];
  for (const { candidateDir, file } of unique.values()) {
    payloads.push({
      candidateDir,
      path: file.path,
      sha256: file.sha256,
      data: await Deno.readFile(joinPath(candidateDir, file.path.slice(1))),
      contentType: contentTypeForPath(file.path),
    });
  }
  return payloads;
}

export async function uploadFilesToServers(
  files: readonly DeployFilePayload[],
  servers: readonly string[],
  signer: NappletSigner,
  options: UploadFilesToServersOptions = {},
): Promise<ServerUploadResult[]> {
  const fetcher = options.fetch ?? fetch;
  const blobSha256s = [...new Set(files.map((file) => file.sha256))];
  const results: ServerUploadResult[] = [];
  const totalUploads = files.length * servers.length;
  for (const server of servers) {
    // BUD-11: scope each token to the target server so a leaked header cannot be
    // replayed against other Blossom servers before it expires. Some deployed
    // Blossom servers reject either scoped tokens or base64url auth, so retries
    // below intentionally fall back only after an auth-shaped failure.
    const authAttempts: UploadAuthorizationAttempt[] = [
      {
        create: once(() =>
          createUploadAuthorization(signer, blobSha256s, options.now, serverHost(server))
        ),
      },
      {
        create: once(() => createUploadAuthorization(signer, blobSha256s, options.now)),
      },
      {
        create: once(() =>
          createUploadAuthorization(signer, blobSha256s, options.now, undefined, "base64")
        ),
      },
    ];
    let preferredAuthAttempt = 0;
    for (const file of files) {
      const upload = await uploadFileToServer(
        file,
        server,
        authAttempts,
        fetcher,
        preferredAuthAttempt,
      );
      const result = upload.result;
      if (upload.authAttemptIndex !== undefined) preferredAuthAttempt = upload.authAttemptIndex;
      results.push(result);
      options.onProgress?.({
        type: "upload:result",
        completedUploads: results.length,
        totalUploads,
        result,
      });
    }
  }
  return results;
}

export async function createUploadAuthorization(
  signer: NappletSigner,
  blobSha256s: readonly string[],
  now: () => number = () => Math.floor(Date.now() / 1000),
  server?: string,
  encoding: UploadAuthorizationEncoding = "base64url",
): Promise<string> {
  const createdAt = now();
  const tags: string[][] = [
    ["t", "upload"],
    ...blobSha256s.map((hash) => ["x", hash]),
    ["expiration", String(createdAt + UPLOAD_AUTH_TTL_SECONDS)],
    ["client", "napplet"],
  ];
  if (server) tags.push(["server", server]);
  const signed = await signer.sign({
    kind: UPLOAD_AUTH_KIND,
    created_at: createdAt,
    tags,
    content: "Upload blobs via napplet",
  });
  return `Nostr ${encodeAuthEvent(signed, encoding)}`;
}

interface UploadAuthorizationAttempt {
  create: () => Promise<string>;
}

interface UploadFileAttemptResult {
  result: ServerUploadResult;
  authAttemptIndex?: number;
}

async function uploadFileToServer(
  file: DeployFilePayload,
  server: string,
  authAttempts: readonly UploadAuthorizationAttempt[],
  fetcher: typeof fetch,
  preferredAuthAttempt: number,
): Promise<UploadFileAttemptResult> {
  const base = server.endsWith("/") ? server : `${server}/`;
  const blobUrl = `${base}${file.sha256}`;
  const uploadUrl = `${base}upload`;
  try {
    // BUD-01 makes HEAD /<sha256> a SHOULD, so only a positive hit lets us skip the
    // upload; any other status (or a thrown error) falls through to PUT.
    const preflight = await fetcher(blobUrl, { method: "HEAD" });
    if (preflight.ok) {
      return {
        result: {
          server,
          file: file.path,
          sha256: file.sha256,
          success: true,
          skipped: true,
        },
      };
    }
  } catch {
    // Fall through to PUT; some Blossom servers do not support unauthenticated HEAD checks.
  }

  let lastFailure: ServerUploadResult | undefined;
  for (const { authAttempt, index } of orderedAuthAttempts(authAttempts, preferredAuthAttempt)) {
    const result = await putFileToServer(
      file,
      server,
      uploadUrl,
      await authAttempt.create(),
      fetcher,
    );
    if (result.success) return { result, authAttemptIndex: index };
    lastFailure = result;
    if (!isRetryableAuthFailure(result)) return { result };
  }
  return { result: lastFailure ?? failure(server, file, `PUT ${uploadUrl} did not run`) };
}

async function putFileToServer(
  file: DeployFilePayload,
  server: string,
  uploadUrl: string,
  authHeader: string,
  fetcher: typeof fetch,
): Promise<ServerUploadResult> {
  const response = await fetcher(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: authHeader,
      "Content-Type": file.contentType,
      // BUD-02: lets the server reject a mismatched body early (409) before storing it.
      "X-SHA-256": file.sha256,
    },
    body: new Blob([copyBytes(file.data).buffer], { type: file.contentType }),
  });
  if (!response.ok) {
    const reason = response.headers.get("x-reason");
    const body = await response.text().catch(() => "");
    const details = [reason, body].filter(Boolean).join(": ");
    return failure(
      server,
      file,
      `PUT ${uploadUrl} returned HTTP ${response.status}${details ? `: ${details}` : ""}`,
    );
  }

  // BUD-02: a 200/201 upload returns a blob descriptor; confirm the server stored the
  // exact blob we asked for before treating the upload as successful.
  const descriptorError = await verifyBlobDescriptor(response, file.sha256);
  if (descriptorError) return failure(server, file, `PUT ${uploadUrl} ${descriptorError}`);
  return {
    server,
    file: file.path,
    sha256: file.sha256,
    success: true,
    skipped: false,
  };
}

function isRetryableAuthFailure(result: ServerUploadResult): boolean {
  if (result.success) return false;
  const error = result.error ?? "";
  if (!/\bHTTP (400|401)\b/.test(error)) return false;
  return /auth|authorization|token|server url mismatch|server .*scope|invalid auth string|signature|base64/i
    .test(error);
}

function orderedAuthAttempts(
  attempts: readonly UploadAuthorizationAttempt[],
  preferredIndex: number,
): { authAttempt: UploadAuthorizationAttempt; index: number }[] {
  return attempts.map((authAttempt, index) => ({ authAttempt, index })).sort((left, right) => {
    if (left.index === preferredIndex) return -1;
    if (right.index === preferredIndex) return 1;
    return left.index - right.index;
  });
}

async function verifyBlobDescriptor(
  response: Response,
  expectedSha256: string,
): Promise<string | undefined> {
  let descriptor: unknown;
  try {
    descriptor = await response.json();
  } catch {
    return "returned an unparseable blob descriptor";
  }
  if (typeof descriptor !== "object" || descriptor === null) {
    return "returned an invalid blob descriptor";
  }
  const sha256 = (descriptor as { sha256?: unknown }).sha256;
  if (typeof sha256 !== "string") return "blob descriptor is missing a sha256";
  if (sha256.toLowerCase() !== expectedSha256) {
    return `stored sha256 ${sha256} does not match expected ${expectedSha256}`;
  }
  return undefined;
}

function failure(server: string, file: DeployFilePayload, error: string): ServerUploadResult {
  return {
    server,
    file: file.path,
    sha256: file.sha256,
    success: false,
    skipped: false,
    error,
  };
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function encodeAuthEvent(event: SignedNostrEvent, encoding: UploadAuthorizationEncoding): string {
  const bytes = new TextEncoder().encode(JSON.stringify(event));
  // BUD-11 uses base64url without padding; standard base64 is only for legacy
  // servers that still reject the specified encoding.
  if (encoding === "base64url") return base64urlnopad.encode(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function once<T>(create: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => {
    promise ??= create();
    return promise;
  };
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

function serverHost(server: string): string {
  try {
    return new URL(server).hostname.toLowerCase();
  } catch {
    // Fall back to the raw value; config validation is responsible for URL shape.
    return server.split(":")[0].toLowerCase();
  }
}
