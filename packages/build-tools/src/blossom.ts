import { verifyEvent } from "nostr-tools/pure";
import type { BuildSigner, SafeStatus, SignedEvent, UnsignedEvent } from "./contracts.ts";
import type { NetworkPolicy, ValidatedEndpoint } from "./network-policy.ts";

const AUTHORIZATION_KIND = 24_242;
const AUTHORIZATION_TTL_SECONDS = 300;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_MAX_BLOBS = 64;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** Binary content retained by the build before it is eligible for deletion. */
export interface UploadBlob {
  /** Exact emitted bytes, hashed and sent unchanged. */
  bytes: Uint8Array;
  /** MIME type associated with the emitted asset. */
  contentType: string;
}

/** A BUD-02 descriptor after its expected digest and byte length are checked. */
export interface BlobDescriptor {
  /** Public BUD-01 retrieval URL supplied by the server. */
  url: URL;
  /** Lowercase SHA-256 digest reported by the server. */
  sha256: string;
  /** Exact byte length reported by the server. */
  size: number;
  /** Server MIME classification. */
  type: string;
  /** Unix upload timestamp reported by the server. */
  uploaded: number;
}

/** Verified evidence from a direct BUD-01 or BUD-02 operation. */
export interface VerifiedBlobDescriptor extends BlobDescriptor {
  /** Validated server used for the operation. */
  server: ValidatedEndpoint;
  /** Whether BUD-01 confirmed the exact blob already existed. */
  existed: boolean;
}

/** Platform services and explicit bounds for Blossom HTTP operations. */
export interface BlossomServices {
  /** Fetch implementation injected by Node or Deno. */
  fetch?: typeof fetch;
  /** Transport that connects to an address from the already validated endpoint. */
  fetchPinned?: (endpoint: ValidatedEndpoint, init: RequestInit) => Promise<Response>;
  /** Non-normative policy that resolves and validates every request hop. */
  networkPolicy: NetworkPolicy;
  /** Deterministic Unix-seconds clock used for short-lived authorization. */
  now?: () => number;
  /** Per-request timeout; defaults to 30 seconds. */
  timeoutMs?: number;
  /** Maximum redirect hops; defaults to three. */
  maxRedirects?: number;
  /** Maximum descriptor response bytes; defaults to 64 KiB. */
  maxResponseBytes?: number;
  /** Maximum 401 authorization retries; defaults to one. */
  maxRetries?: number;
  /** Cancellation signal for one or more requests. */
  signal?: AbortSignal;
}

/** A deterministic record of one direct upload attempt. */
export interface UploadEvidence {
  /** Validated server URL. */
  server: string;
  /** Lowercase SHA-256 of the retained emitted bytes. */
  sha256: string;
  /** Whether this direct operation returned verified evidence. */
  accepted: boolean;
  /** Verified descriptor when accepted. */
  descriptor?: VerifiedBlobDescriptor;
  /** Redaction-safe reason when rejected. */
  error?: SafeStatus;
}

/** Ordered direct-upload inputs. The primary server is always attempted first. */
export interface UploadBatchInput {
  /** First BUD-03 server, whose success is required. */
  primary: ValidatedEndpoint;
  /** Optional additional BUD-03 servers, attempted in listed order. */
  secondary?: readonly ValidatedEndpoint[];
  /** Exact asset bytes that must all receive verified evidence. */
  blobs: readonly UploadBlob[];
  /** Narrow signer that may authorize only kind 24242 events. */
  signer: BuildSigner;
}

export type UploadBatchResult =
  | { status: "complete"; deletionAuthorized: true; evidence: UploadEvidence[] }
  | { status: "failed"; deletionAuthorized: false; evidence: UploadEvidence[]; reason: SafeStatus };

/**
 * Check whether a server has a SHA-256-addressed blob through BUD-01 HEAD.
 *
 * @param server - Previously validated server endpoint.
 * @param sha256 - Lowercase SHA-256 path to check.
 * @param services - Injected fetch, policy, and bounded-request services.
 * @returns Header-derived descriptor evidence, or undefined when no exact blob is confirmed.
 */
export async function headBlob(
  server: ValidatedEndpoint,
  sha256: string,
  services: BlossomServices,
): Promise<BlobDescriptor | undefined> {
  if (!SHA256_PATTERN.test(sha256)) throw new Error("invalid blob SHA-256");
  const response = await request(server.url, `/${sha256}`, { method: "HEAD" }, services);
  if (response.response.status !== 200) return undefined;
  const length = Number(response.response.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length < 0) return undefined;
  return {
    url: response.endpoint.url,
    sha256,
    size: length,
    type: response.response.headers.get("content-type") ?? "application/octet-stream",
    uploaded: 0,
  };
}

/**
 * Upload one exact byte sequence through BUD-02 with a fresh, scoped BUD-11 token.
 *
 * @param server - Validated direct-upload server.
 * @param blob - Retained bytes and their MIME type.
 * @param signer - Narrow signer for the kind-24242 authorization event.
 * @param services - Injected HTTP, clock, policy, timeout, and cancellation services.
 * @returns Descriptor evidence only after digest and byte-length verification succeeds.
 */
export async function uploadBlob(
  server: ValidatedEndpoint,
  blob: UploadBlob,
  signer: BuildSigner,
  services: BlossomServices,
): Promise<VerifiedBlobDescriptor> {
  const sha256 = await sha256Hex(blob.bytes);
  const existing = await headBlob(server, sha256, services);
  if (existing && existing.size === blob.bytes.byteLength) return { ...existing, server, existed: true };

  const retries = bounded(services.maxRetries, DEFAULT_MAX_RETRIES, DEFAULT_MAX_RETRIES);
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const authorization = await createAuthorization(server, sha256, signer, services.now ?? unixNow, attempt);
    const response = await request(server.url, "/upload", {
      method: "PUT",
      headers: {
        Authorization: authorization,
        "Content-Type": blob.contentType,
        "Content-Length": String(blob.bytes.byteLength),
        "X-SHA-256": sha256,
      },
      body: new Blob([copyBytes(blob.bytes).buffer], { type: blob.contentType }),
    }, services);
    if (response.response.status === 401 && attempt < retries) continue;
    if (response.response.status !== 200 && response.response.status !== 201) {
      throw new Error("Blossom upload did not return verified evidence");
    }
    const descriptor = await parseDescriptor(response.response, sha256, blob.bytes.byteLength, services);
    return { ...descriptor, server: response.endpoint, existed: false };
  }
  throw new Error("Blossom upload did not return verified evidence");
}

/**
 * Upload retained blobs directly to the primary server, then optional secondaries.
 *
 * This intentionally does not call BUD-04: the build process never asks a remote
 * Blossom server to fetch build bytes from another server.
 *
 * @param input - Ordered servers, exact bytes, and narrow signer.
 * @param services - Injected HTTP and safety services.
 * @returns Complete evidence or a typed non-committable failed batch.
 */
export async function uploadExactBlobs(
  input: UploadBatchInput,
  services: BlossomServices,
): Promise<UploadBatchResult> {
  if (input.blobs.length === 0 || input.blobs.length > DEFAULT_MAX_BLOBS) {
    return failed([], "invalid-batch", "No upload evidence was produced");
  }
  const servers = [input.primary, ...(input.secondary ?? [])];
  const evidence: UploadEvidence[] = [];
  for (const server of servers) {
    for (const blob of input.blobs) {
      try {
        const descriptor = await uploadBlob(server, blob, input.signer, services);
        evidence.push({ server: server.url.toString(), sha256: descriptor.sha256, accepted: true, descriptor });
      } catch {
        const sha256 = await sha256Hex(blob.bytes).catch(() => "");
        evidence.push({
          server: server.url.toString(),
          sha256,
          accepted: false,
          error: { code: "upload-failed", message: "Upload did not produce verified evidence" },
        });
        return failed(evidence, "partial-upload", "Upload did not produce complete verified evidence");
      }
    }
  }
  return { status: "complete", deletionAuthorized: true, evidence };
}

async function createAuthorization(
  server: ValidatedEndpoint,
  sha256: string,
  signer: BuildSigner,
  now: () => number,
  attempt: number,
): Promise<string> {
  const createdAt = now();
  const template: UnsignedEvent = {
    kind: AUTHORIZATION_KIND,
    created_at: createdAt,
    tags: [
      ["t", "upload"],
      ["expiration", String(createdAt + AUTHORIZATION_TTL_SECONDS)],
      ["x", sha256],
      ["server", server.hostname.toLowerCase()],
    ],
    content: attempt === 0 ? "Upload blob to Blossom" : "Retry upload blob to Blossom",
  };
  const signed = await signer.signEvent(template);
  if (!isExpectedAuthorization(signed, template) || !verifyEvent(canonicalSignedEvent(signed))) {
    throw new Error("Blossom authorization verification failed");
  }
  return `Nostr ${base64Url(new TextEncoder().encode(JSON.stringify(signed)))}`;
}

function isExpectedAuthorization(signed: SignedEvent, template: UnsignedEvent): boolean {
  return signed.kind === template.kind && signed.created_at === template.created_at && signed.content === template.content &&
    JSON.stringify(signed.tags) === JSON.stringify(template.tags);
}

function canonicalSignedEvent(event: SignedEvent): SignedEvent {
  return { ...event, tags: event.tags.map((tag) => [...tag]) };
}

async function request(
  serverUrl: URL,
  path: string,
  init: RequestInit,
  services: BlossomServices,
): Promise<{ response: Response; endpoint: ValidatedEndpoint }> {
  const signal = services.signal ?? new AbortController().signal;
  if (signal.aborted) throw new Error("network operation cancelled");
  const maxRedirects = bounded(services.maxRedirects, DEFAULT_MAX_REDIRECTS, DEFAULT_MAX_REDIRECTS);
  const originalOrigin = serverUrl.origin;
  let target = new URL(path, serverUrl);
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const endpoint = await services.networkPolicy.validate(target, signal);
    const headers = new Headers(init.headers);
    if (endpoint.url.origin !== originalOrigin) headers.delete("authorization");
    const response = await fetchWithTimeout(endpoint, { ...init, headers, redirect: "manual" }, services, signal);
    if (response.status < 300 || response.status >= 400) return { response, endpoint };
    const location = response.headers.get("location");
    if (!location || redirects === maxRedirects || (response.status !== 307 && response.status !== 308)) {
      throw new Error("Blossom redirect did not produce verified evidence");
    }
    target = new URL(location, endpoint.url);
  }
  throw new Error("Blossom redirect did not produce verified evidence");
}

async function fetchWithTimeout(
  endpoint: ValidatedEndpoint,
  init: RequestInit,
  services: BlossomServices,
  outerSignal: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  outerSignal.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), services.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    // Policy validation cannot pin global fetch's later DNS lookup. A platform
    // adapter must provide the transport that owns the validated connection.
    if (services.fetchPinned) {
      return await services.fetchPinned(endpoint, { ...init, signal: controller.signal });
    }
    if (!services.fetch) throw new Error("Blossom request requires a pinned transport");
    return await services.fetch(endpoint.url, { ...init, signal: controller.signal });
  } catch {
    throw new Error(outerSignal.aborted ? "network operation cancelled" : "Blossom request failed");
  } finally {
    clearTimeout(timeout);
    outerSignal.removeEventListener("abort", onAbort);
  }
}

async function parseDescriptor(
  response: Response,
  expectedSha256: string,
  expectedSize: number,
  services: BlossomServices,
): Promise<BlobDescriptor> {
  const text = await readBoundedText(response, services.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Blossom returned an invalid descriptor");
  }
  if (!value || typeof value !== "object") throw new Error("Blossom returned an invalid descriptor");
  const descriptor = value as Partial<Record<keyof BlobDescriptor, unknown>>;
  if (descriptor.sha256 !== expectedSha256 || descriptor.size !== expectedSize || typeof descriptor.url !== "string" ||
    typeof descriptor.type !== "string" || typeof descriptor.uploaded !== "number") {
    throw new Error("Blossom descriptor did not match uploaded bytes");
  }
  let url: URL;
  try {
    url = new URL(descriptor.url);
  } catch {
    throw new Error("Blossom returned an invalid descriptor");
  }
  if (url.username || url.password || (url.protocol !== "https:" && url.protocol !== "http:")) {
    throw new Error("Blossom returned an invalid descriptor");
  }
  return { url, sha256: descriptor.sha256, size: descriptor.size, type: descriptor.type, uploaded: descriptor.uploaded };
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && (declared < 0 || declared > maxBytes)) {
    throw new Error("Blossom descriptor exceeded response limit");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) throw new Error("Blossom descriptor exceeded response limit");
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", copyBytes(bytes));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bounded(value: number | undefined, fallback: number, maximum: number): number {
  return Number.isInteger(value) && value! >= 0 ? Math.min(value!, maximum) : fallback;
}

function failed(evidence: UploadEvidence[], code: string, message: string): UploadBatchResult {
  return { status: "failed", deletionAuthorized: false, evidence, reason: { code, message } };
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}
