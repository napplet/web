/// <reference lib="deno.ns" />

import { finalizeEvent, generateSecretKey } from "npm:nostr-tools@^2.23.3/pure";
import {
  createNetworkPolicy,
  headBlob,
  uploadBlob,
  uploadExactBlobs,
  type BuildSigner,
  type SignedEvent,
  type UnsignedEvent,
  type ValidatedEndpoint,
} from "./index.ts";

const SHA256 = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
const BYTES = new TextEncoder().encode("hello");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function endpoint(value: string): ValidatedEndpoint {
  const url = new URL(value);
  return { url, hostname: url.hostname, addresses: ["93.184.216.34"] };
}

function signer(): BuildSigner {
  const secret = generateSecretKey();
  return {
    getPublicKey: () => Promise.resolve("not-used"),
    signEvent: (template: UnsignedEvent): Promise<SignedEvent> => Promise.resolve(finalizeEvent(template, secret)),
    close: () => Promise.resolve(),
  };
}

function descriptor(server = "https://primary.example"): Record<string, unknown> {
  return {
    url: `${server}/${SHA256}.bin`,
    sha256: SHA256,
    size: BYTES.byteLength,
    type: "application/octet-stream",
    uploaded: 1,
  };
}

function services(fetcher: typeof fetch) {
  return {
    fetch: fetcher,
    networkPolicy: createNetworkPolicy({ resolve: () => Promise.resolve(["93.184.216.34"]) }),
    now: () => 100,
  };
}

function decodeAuthorization(value: string): SignedEvent {
  const encoded = value.slice("Nostr ".length).replace(/-/g, "+").replace(/_/g, "/");
  const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))));
}

Deno.test("head and upload use the exact bytes, hash, BUD-11 authorization, and descriptor", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = ((url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (init?.method === "HEAD") return Promise.resolve(new Response(null, { status: 404 }));
    return Promise.resolve(new Response(JSON.stringify(descriptor()), {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;
  const blob = { bytes: BYTES, contentType: "text/plain" };

  assertEquals(await headBlob(endpoint("https://primary.example"), SHA256, services(fetcher)), undefined);
  const uploaded = await uploadBlob(endpoint("https://primary.example"), blob, signer(), services(fetcher));

  assertEquals(uploaded.sha256, SHA256);
  assertEquals(calls.map((call) => call.init.method), ["HEAD", "HEAD", "PUT"]);
  const put = calls[2];
  const headers = new Headers(put.init.headers);
  assertEquals(headers.get("x-sha-256"), SHA256);
  assertEquals(headers.get("content-type"), "text/plain");
  assertEquals(headers.get("content-length"), "5");
  assertEquals(
    [...new Uint8Array(await (put.init.body as Blob).arrayBuffer())],
    [...BYTES],
  );
  const event = decodeAuthorization(headers.get("authorization") ?? "");
  assertEquals(event.kind, 24242);
  assertEquals(event.content, "Upload blob to Blossom");
  assertEquals(event.tags, [["t", "upload"], ["expiration", "400"], ["x", SHA256], ["server", "primary.example"]]);
});

Deno.test("Blossom requests prefer the validated-address transport", async () => {
  const calls: ValidatedEndpoint[] = [];
  const server = endpoint("https://primary.example");
  const result = await headBlob(server, SHA256, {
    networkPolicy: createNetworkPolicy({ resolve: () => Promise.resolve(server.addresses) }),
    fetch: (() => Promise.reject(new Error("global fetch must not be used"))) as typeof fetch,
    fetchPinned: (validated, init) => {
      calls.push(validated);
      assertEquals(init.method, "HEAD");
      return Promise.resolve(new Response(null, {
        status: 200,
        headers: { "content-length": String(BYTES.byteLength), "content-type": "text/plain" },
      }));
    },
  });

  assertEquals(calls.length, 1);
  assertEquals(calls[0]?.hostname, server.hostname);
  assertEquals(calls[0]?.addresses, server.addresses);
  assertEquals(calls[0]?.url.pathname, `/${SHA256}`);
  assertEquals(result?.sha256, SHA256);
  assertEquals(result?.size, BYTES.byteLength);
});

Deno.test("batch uploads primary then secondary directly with recorded evidence", async () => {
  const calls: string[] = [];
  const fetcher = ((url: string | URL | Request, init?: RequestInit) => {
    calls.push(`${init?.method} ${String(url)}`);
    if (init?.method === "HEAD") return Promise.resolve(new Response(null, { status: 404 }));
    return Promise.resolve(new Response(JSON.stringify(descriptor(new URL(String(url)).origin)), {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;

  const result = await uploadExactBlobs({
    primary: endpoint("https://primary.example"),
    secondary: [endpoint("https://secondary.example")],
    blobs: [{ bytes: BYTES, contentType: "text/plain" }],
    signer: signer(),
  }, services(fetcher));

  assertEquals(result.status, "complete");
  assertEquals(result.deletionAuthorized, true);
  assertEquals(calls, [
    `HEAD https://primary.example/${SHA256}`,
    "PUT https://primary.example/upload",
    `HEAD https://secondary.example/${SHA256}`,
    "PUT https://secondary.example/upload",
  ]);
  assertEquals(result.evidence.map((item) => item.server), ["https://primary.example/", "https://secondary.example/"]);
});

Deno.test("upload retries one authorization challenge but rejects descriptor substitution and redirects", async () => {
  let attempts = 0;
  const authorization: string[] = [];
  const challengeFetcher = ((_: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "HEAD") return Promise.resolve(new Response(null, { status: 404 }));
    authorization.push(new Headers(init?.headers).get("authorization") ?? "");
    attempts += 1;
    return Promise.resolve(attempts === 1
      ? new Response(null, { status: 401 })
      : new Response(JSON.stringify(descriptor()), { status: 201, headers: { "content-type": "application/json" } }));
  }) as typeof fetch;
  await uploadBlob(endpoint("https://primary.example"), { bytes: BYTES, contentType: "text/plain" }, signer(), services(challengeFetcher));
  assertEquals(attempts, 2);
  assert(authorization[0] !== authorization[1], "retry must use a fresh authorization event");

  const substitutedFetcher = ((_: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "HEAD") return Promise.resolve(new Response(null, { status: 404 }));
    return Promise.resolve(new Response("<html>not a descriptor</html>", { status: 201, headers: { "content-type": "text/html" } }));
  }) as typeof fetch;
  await uploadBlob(endpoint("https://primary.example"), { bytes: BYTES, contentType: "text/plain" }, signer(), services(substitutedFetcher))
    .then(() => { throw new Error("expected descriptor rejection"); }, () => {});

  const redirectFetcher = ((_: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "HEAD") return Promise.resolve(new Response(null, { status: 404 }));
    return Promise.resolve(new Response(null, { status: 307, headers: { location: "https://169.254.169.254/upload" } }));
  }) as typeof fetch;
  const failed = await uploadExactBlobs({
    primary: endpoint("https://primary.example"),
    blobs: [{ bytes: BYTES, contentType: "text/plain" }],
    signer: signer(),
  }, services(redirectFetcher));
  assertEquals(failed.status, "failed");
  assertEquals(failed.deletionAuthorized, false);
});

Deno.test("batch rejects descriptor mismatches, partial secondaries, and cancellation without deletion authority", async () => {
  const mismatchFetcher = ((_: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "HEAD") return Promise.resolve(new Response(null, { status: 404 }));
    return Promise.resolve(new Response(JSON.stringify({ ...descriptor(), size: 6 }), {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;
  const mismatch = await uploadExactBlobs({
    primary: endpoint("https://primary.example"),
    blobs: [{ bytes: BYTES, contentType: "text/plain" }],
    signer: signer(),
  }, services(mismatchFetcher));
  assertEquals(mismatch.status, "failed");
  assertEquals(mismatch.deletionAuthorized, false);

  const partialFetcher = ((url: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "HEAD") return Promise.resolve(new Response(null, { status: 404 }));
    return Promise.resolve(String(url).startsWith("https://secondary.example")
      ? new Response(null, { status: 500 })
      : new Response(JSON.stringify(descriptor()), { status: 201, headers: { "content-type": "application/json" } }));
  }) as typeof fetch;
  const partial = await uploadExactBlobs({
    primary: endpoint("https://primary.example"),
    secondary: [endpoint("https://secondary.example")],
    blobs: [{ bytes: BYTES, contentType: "text/plain" }],
    signer: signer(),
  }, services(partialFetcher));
  assertEquals(partial.status, "failed");
  assertEquals(partial.evidence.length, 2);

  const controller = new AbortController();
  controller.abort();
  const cancelled = await uploadExactBlobs({
    primary: endpoint("https://primary.example"),
    blobs: [{ bytes: BYTES, contentType: "text/plain" }],
    signer: signer(),
  }, { ...services(partialFetcher), signal: controller.signal });
  assertEquals(cancelled.status, "failed");
  assertEquals(cancelled.deletionAuthorized, false);
});
