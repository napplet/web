import { decodeBase64Url } from "@std/encoding/base64url";
import {
  createUploadAuthorization,
  executeNetworkDeploy,
  networkDeploySucceeded,
  type RelayPublishResult,
} from "../src/deploy-network.ts";
import { createPrivateKeySigner } from "../src/signing.ts";
import {
  type DeployManifestTemplate,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_SNAPSHOT,
  type SignedNostrEvent,
} from "../src/types.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const privateKeyHex = "01".padStart(64, "0");
const signer = createPrivateKeySigner(privateKeyHex);
const sha256 = "1bc04b5291c26a46d918139138b992d2de976d6851d0893b0476b85bfbdfc6e6";

interface FetchCall {
  url: string;
  method: string;
  authorization?: string;
  xSha256?: string;
  contentType?: string;
}

function decodeAuthEvent(header: string): SignedNostrEvent {
  const encoded = header.slice("Nostr ".length);
  const json = new TextDecoder().decode(decodeBase64Url(encoded));
  return JSON.parse(json) as SignedNostrEvent;
}

interface FakeFetchOptions {
  headStatus?: (url: string) => number;
  putResponse?: (url: string) => Response;
}

function createFakeFetch(
  calls: FetchCall[],
  options: FakeFetchOptions = {},
): typeof fetch {
  const headStatus = options.headStatus ?? (() => 404);
  const putResponse = options.putResponse ??
    (() =>
      new Response(JSON.stringify({ url: "https://blob.example", sha256, size: 5 }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }));
  return ((input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      method: init?.method ?? "GET",
      authorization: headers.get("authorization") ?? undefined,
      xSha256: headers.get("x-sha-256") ?? undefined,
      contentType: headers.get("content-type") ?? undefined,
    });
    if (init?.method === "HEAD") {
      return Promise.resolve(new Response(null, { status: headStatus(url) }));
    }
    return Promise.resolve(putResponse(url));
  }) as typeof fetch;
}

function fakePublish(): {
  publish: (relays: string[], event: SignedNostrEvent) => Promise<RelayPublishResult[]>;
  events: SignedNostrEvent[];
} {
  const events: SignedNostrEvent[] = [];
  return {
    events,
    publish: (relays, event) => {
      events.push(event);
      return Promise.resolve(relays.map((relay) => ({ relay, eventId: event.id, success: true })));
    },
  };
}

Deno.test("createUploadAuthorization signs a base64url upload token scoped to the server", async () => {
  const header = await createUploadAuthorization(signer, [sha256], () => 123, "blob.example");
  assert(header.startsWith("Nostr "));
  const encoded = header.slice("Nostr ".length);
  // BUD-11 requires base64url without padding.
  assert(!/[+/=]/.test(encoded), "auth token must be base64url without padding");
  const event = decodeAuthEvent(header);
  assertEquals(event.kind, 24242);
  assertEquals(event.created_at, 123);
  assertEquals(event.pubkey, signer.pubkey);
  assertEquals(event.tags, [
    ["t", "upload"],
    ["x", sha256],
    ["expiration", "3723"],
    ["client", "napplet"],
    ["server", "blob.example"],
  ]);
});

Deno.test("createUploadAuthorization omits the server tag when unscoped", async () => {
  const event = decodeAuthEvent(await createUploadAuthorization(signer, [sha256], () => 123));
  assertEquals(event.tags.some((tag) => tag[0] === "server"), false);
});

Deno.test("executeNetworkDeploy uploads unique files and publishes signed manifests", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish, events } = fakePublish();

    const result = await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: ["https://blob.example"] },
      signer,
      { fetch: createFakeFetch(calls), publish, now: () => 123 },
    );

    assertEquals(result.uploaded.length, 1);
    assertEquals(result.uploaded[0].success, true);
    assertEquals(result.published.length, 2);
    assertEquals(result.uploadSummary, {
      servers: 1,
      serversFullyUploaded: 1,
      totalUploads: 1,
      failedUploads: 0,
    });
    assertEquals(events.map((event) => event.kind), [NAPPLET_KIND_ROOT, NAPPLET_KIND_SNAPSHOT]);
    assertEquals(calls.map((call) => call.method), ["HEAD", "PUT"]);
    // BUD-02: upload carries the content hash and MIME type from @std/media-types.
    assertEquals(calls[1].xSha256, sha256);
    assertEquals(calls[1].contentType, "text/html; charset=UTF-8");
    assert(calls[1].authorization?.startsWith("Nostr "));
    assertEquals(networkDeploySucceeded(result, manifests), true);
  });
});

Deno.test("executeNetworkDeploy fails when the server stores a mismatched blob", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish, events } = fakePublish();

    const result = await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: ["https://blob.example"] },
      signer,
      {
        fetch: createFakeFetch(calls, {
          putResponse: () =>
            new Response(JSON.stringify({ sha256: "0".repeat(64) }), {
              status: 201,
              headers: { "content-type": "application/json" },
            }),
        }),
        publish,
        now: () => 123,
      },
    );

    assertEquals(result.uploaded[0].success, false);
    assert(result.uploaded[0].error?.includes("does not match expected"));
    assertEquals(result.published.length, 0);
    assertEquals(events.length, 0);
  });
});

Deno.test("executeNetworkDeploy still uploads when HEAD preflight errors", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish } = fakePublish();

    const result = await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: ["https://blob.example"] },
      signer,
      { fetch: createFakeFetch(calls, { headStatus: () => 500 }), publish, now: () => 123 },
    );

    assertEquals(calls.map((call) => call.method), ["HEAD", "PUT"]);
    assertEquals(result.uploaded[0].success, true);
    assertEquals(result.uploaded[0].skipped, false);
  });
});

Deno.test("executeNetworkDeploy scopes each server's token to its own host", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish } = fakePublish();

    await executeNetworkDeploy(
      manifests,
      {
        relays: ["wss://relay.example"],
        blossomServers: ["https://a.example", "https://b.example"],
      },
      signer,
      { fetch: createFakeFetch(calls), publish, now: () => 123 },
    );

    const puts = calls.filter((call) => call.method === "PUT");
    const hosts = puts.map((call) => {
      const event = decodeAuthEvent(call.authorization ?? "");
      return event.tags.find((tag) => tag[0] === "server")?.[1];
    });
    assertEquals(hosts, ["a.example", "b.example"]);
  });
});

Deno.test("executeNetworkDeploy skips publish when one mirror fails and reports partial success", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish, events } = fakePublish();

    const result = await executeNetworkDeploy(
      manifests,
      {
        relays: ["wss://relay.example"],
        blossomServers: ["https://a.example", "https://b.example"],
      },
      signer,
      {
        fetch: createFakeFetch(calls, {
          putResponse: (url) =>
            url.startsWith("https://b.example")
              ? new Response("nope", { status: 500 })
              : new Response(JSON.stringify({ sha256 }), {
                status: 201,
                headers: { "content-type": "application/json" },
              }),
        }),
        publish,
        now: () => 123,
      },
    );

    assertEquals(result.uploadSummary, {
      servers: 2,
      serversFullyUploaded: 1,
      totalUploads: 2,
      failedUploads: 1,
    });
    assertEquals(result.published.length, 0);
    assertEquals(events.length, 0);
  });
});

async function manifestsFor(dir: string): Promise<DeployManifestTemplate[]> {
  const root = await signer.sign({
    kind: NAPPLET_KIND_ROOT,
    created_at: 123,
    tags: [["path", "/index.html", sha256]],
    content: "",
  });
  const snapshot = await signer.sign({
    kind: NAPPLET_KIND_SNAPSHOT,
    created_at: 123,
    tags: [["path", "/index.html", sha256], ["a", `${NAPPLET_KIND_ROOT}:${signer.pubkey}:`]],
    content: "",
  });
  return [
    manifest(dir, NAPPLET_KIND_ROOT, root),
    manifest(dir, NAPPLET_KIND_SNAPSHOT, snapshot),
  ];
}

function manifest(
  dir: string,
  kind: typeof NAPPLET_KIND_ROOT | typeof NAPPLET_KIND_SNAPSHOT,
  signedEvent: SignedNostrEvent,
): DeployManifestTemplate {
  return {
    item: {
      candidate: { name: "feed", dir, indexHtml: `${dir}/index.html` },
      target: kind === NAPPLET_KIND_ROOT ? "root" : "snapshot",
      kind,
    },
    files: [{ path: "/index.html", sha256 }],
    aggregateHash: sha256,
    template: signedEvent,
    signedEvent,
  };
}
