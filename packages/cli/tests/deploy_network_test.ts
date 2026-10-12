import { decodeBase64Url } from "@std/encoding/base64url";
import {
  executeNetworkDeploy,
  type NetworkDeployProgress,
  networkDeploySucceeded,
  type RelayPublishResult,
} from "../src/deploy-network.ts";
import { computeAggregateHash } from "../src/manifest.ts";
import { createPrivateKeySigner } from "../src/signing.ts";
import {
  type DeployManifestTemplate,
  type ManifestFileMapping,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_SNAPSHOT,
  type SignedNostrEvent,
} from "../src/types.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const privateKeyHex = "01".padStart(64, "0");
const signer = createPrivateKeySigner(privateKeyHex);
const sha256 = "1bc04b5291c26a46d918139138b992d2de976d6851d0893b0476b85bfbdfc6e6";
const secondSha256 = "a172cedcae47474b615c54d510a5d84a8dea3032e958587430b413538be3f333";
const resolvePublicDns = () => Promise.resolve(["93.184.216.34"]);

interface FetchCall {
  url: string;
  method: string;
  authorization?: string;
  xSha256?: string;
  contentType?: string;
  body?: Uint8Array;
}

function decodeAuthEvent(header: string): SignedNostrEvent {
  const encoded = header.slice("Nostr ".length);
  const json = new TextDecoder().decode(decodeBase64Url(encoded));
  return JSON.parse(json) as SignedNostrEvent;
}

function decodeStandardAuthEvent(header: string): SignedNostrEvent {
  const encoded = header.slice("Nostr ".length);
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as SignedNostrEvent;
}

interface FakeFetchOptions {
  headStatus?: (url: string) => number;
  putResponse?: (url: string) => Response;
}

function descriptorResponse(hash: string, size = 5): Response {
  return new Response(
    JSON.stringify({
      url: "https://blob.example/blob",
      sha256: hash,
      size,
      type: "text/html",
      uploaded: 123,
    }),
    { status: 201, headers: { "content-type": "application/json" } },
  );
}

function createFakeFetch(
  calls: FetchCall[],
  options: FakeFetchOptions = {},
): typeof fetch {
  const headStatus = options.headStatus ?? (() => 404);
  const putResponse = options.putResponse ??
    (() => descriptorResponse(sha256));
  return (async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      method: init?.method ?? "GET",
      authorization: headers.get("authorization") ?? undefined,
      xSha256: headers.get("x-sha-256") ?? undefined,
      contentType: headers.get("content-type") ?? undefined,
      body: init?.body instanceof Blob ? new Uint8Array(await init.body.arrayBuffer()) : undefined,
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

Deno.test("executeNetworkDeploy uploads unique files and publishes signed manifests", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish, events } = fakePublish();
    const progress: NetworkDeployProgress[] = [];

    const result = await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: ["https://blob.example"] },
      signer,
      {
        fetch: createFakeFetch(calls),
        publish,
        now: () => 123,
        resolve: resolvePublicDns,
        onProgress: (event) => progress.push(event),
      },
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
    assertEquals(new TextDecoder().decode(calls[1].body), "index");
    const authorization = decodeAuthEvent(calls[1].authorization ?? "");
    assertEquals(authorization.tags, [
      ["t", "upload"],
      ["expiration", "423"],
      ["x", sha256],
      ["server", "blob.example"],
    ]);
    assertEquals(networkDeploySucceeded(result, manifests), true);
    assertEquals(progress.map((event) => event.type), [
      "upload:start",
      "upload:result",
      "upload:complete",
      "publish:start",
      "publish:event",
      "publish:event",
      "publish:complete",
    ]);
    assertEquals(progress[0], {
      type: "upload:start",
      files: 1,
      servers: 1,
      totalUploads: 1,
    });
  });
});

Deno.test("executeNetworkDeploy defaults uploads to the runtime fetch", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish, events } = fakePublish();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = createFakeFetch(calls);

    try {
      const result = await executeNetworkDeploy(
        manifests,
        { relays: ["wss://relay.example"], blossomServers: ["https://blob.example"] },
        signer,
        {
          publish,
          now: () => 123,
          resolve: resolvePublicDns,
        },
      );

      assertEquals(calls.map((call) => call.method), ["HEAD", "PUT"]);
      assertEquals(result.uploaded[0].success, true);
      assertEquals(result.published.length, 2);
      assertEquals(events.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
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
          putResponse: () => descriptorResponse("0".repeat(64)),
        }),
        publish,
        now: () => 123,
        resolve: resolvePublicDns,
      },
    );

    assertEquals(result.uploaded[0].success, false);
    assertEquals(result.uploaded[0].error, "Upload did not produce verified evidence");
    assertEquals(result.published.length, 0);
    assertEquals(events.length, 0);
  });
});

Deno.test("executeNetworkDeploy rejects files changed after manifest creation before uploading", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    await Deno.writeTextFile(`${dir}/index.html`, "changed after manifest");
    const calls: FetchCall[] = [];

    await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: ["https://blob.example"] },
      signer,
      { fetch: createFakeFetch(calls), publish: fakePublish().publish, resolve: resolvePublicDns },
    ).then(
      () => {
        throw new Error("changed deploy input must reject");
      },
      (error) => assert(String(error).includes("Deploy input changed after manifest creation")),
    );
    assertEquals(calls.length, 0);
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
      {
        fetch: createFakeFetch(calls, { headStatus: () => 500 }),
        publish,
        now: () => 123,
        resolve: resolvePublicDns,
      },
    );

    assertEquals(calls.map((call) => call.method), ["HEAD", "PUT"]);
    assertEquals(result.uploaded[0].success, true);
    assertEquals(result.uploaded[0].skipped, false);
  });
});

Deno.test("executeNetworkDeploy directly uploads the primary and secondary servers in order", async () => {
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
      { fetch: createFakeFetch(calls), publish, now: () => 123, resolve: resolvePublicDns },
    );

    const puts = calls.filter((call) => call.method === "PUT");
    const hosts = puts.map((call) =>
      decodeAuthEvent(call.authorization ?? "").tags.find((tag) => tag[0] === "server")?.[1]
    );
    assertEquals(hosts, ["a.example", "b.example"]);
    assertEquals(puts.map((call) => call.url), [
      "https://a.example/upload",
      "https://b.example/upload",
    ]);
  });
});

Deno.test("executeNetworkDeploy counts canonical server origins before publishing", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.writeTextFile(`${dir}/app.js`, "app");
    const manifests = await manifestsFor(dir, [
      { path: "/index.html", sha256 },
      { path: "/app.js", sha256: secondSha256 },
    ]);
    const calls: FetchCall[] = [];
    const { publish, events } = fakePublish();
    let upload = 0;
    const servers = ["https://blob.example/", "https://other.example/"];

    const result = await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: servers },
      signer,
      {
        fetch: createFakeFetch(calls, {
          putResponse: () => {
            const file = upload % 2;
            upload += 1;
            return descriptorResponse(file === 0 ? sha256 : secondSha256, file === 0 ? 5 : 3);
          },
        }),
        publish,
        now: () => 123,
        resolve: resolvePublicDns,
      },
    );

    assertEquals(result.uploadSummary, {
      servers: 2,
      serversFullyUploaded: 2,
      totalUploads: 4,
      failedUploads: 0,
    });
    assertEquals(
      new Set(result.uploaded.map((entry) => `${entry.server}\0${entry.file}\0${entry.sha256}`))
        .size,
      4,
    );
    assertEquals(result.uploaded.map((entry) => entry.server), [
      servers[0],
      servers[0],
      servers[1],
      servers[1],
    ]);
    assertEquals(calls.filter((call) => call.method === "PUT").map((call) => call.url), [
      "https://blob.example/upload",
      "https://blob.example/upload",
      "https://other.example/upload",
      "https://other.example/upload",
    ]);
    assertEquals(events.length, 2);
    assertEquals(networkDeploySucceeded(result, manifests), true);
  });
});

Deno.test("executeNetworkDeploy retries a bounded fresh shared authorization after 401", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish } = fakePublish();
    let attempts = 0;

    const result = await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: ["https://blob.example"] },
      signer,
      {
        fetch: createFakeFetch(calls, {
          putResponse: () => {
            attempts += 1;
            if (attempts === 1) {
              return new Response(JSON.stringify({ message: "not authorized" }), {
                status: 401,
                headers: { "content-type": "application/json" },
              });
            }
            return descriptorResponse(sha256);
          },
        }),
        publish,
        now: () => 123,
        resolve: resolvePublicDns,
      },
    );

    assertEquals(result.uploaded[0].success, true);
    const puts = calls.filter((call) => call.method === "PUT");
    assertEquals(puts.length, 2);
    assertEquals(puts.map((put) => decodeAuthEvent(put.authorization ?? "").content), [
      "Upload blob to Blossom",
      "Retry upload blob to Blossom",
    ]);
  });
});

Deno.test("executeNetworkDeploy fails the deployment when any direct upload is partial", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const manifests = await manifestsFor(dir);
    const calls: FetchCall[] = [];
    const { publish, events } = fakePublish();

    const result = await executeNetworkDeploy(
      manifests,
      {
        relays: ["wss://relay.example"],
        blossomServers: [
          "https://a.example",
          "https://b.example",
          "https://c.example",
        ],
      },
      signer,
      {
        fetch: createFakeFetch(calls, {
          putResponse: (url) =>
            url.startsWith("https://b.example")
              ? new Response("nope", { status: 500 })
              : descriptorResponse(sha256),
        }),
        publish,
        now: () => 123,
        resolve: resolvePublicDns,
      },
    );

    assertEquals(result.uploadSummary, {
      servers: 3,
      serversFullyUploaded: 0,
      totalUploads: 2,
      failedUploads: 1,
    });
    assertEquals(result.published.length, 0);
    assertEquals(events.length, 0);
    assertEquals(networkDeploySucceeded(result, manifests), false);
  });
});

Deno.test("executeNetworkDeploy skips publish when uploads are split across incomplete mirrors", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    await Deno.writeTextFile(`${dir}/app.js`, "app");
    const manifests = await manifestsFor(dir, [
      { path: "/index.html", sha256 },
      { path: "/app.js", sha256: secondSha256 },
    ]);
    const calls: FetchCall[] = [];
    const { publish, events } = fakePublish();
    let uploads = 0;

    const result = await executeNetworkDeploy(
      manifests,
      {
        relays: ["wss://relay.example"],
        blossomServers: ["https://a.example", "https://b.example"],
      },
      signer,
      {
        fetch: createFakeFetch(calls, {
          putResponse: () => {
            const upload = uploads;
            uploads += 1;
            if (upload === 1 || upload === 2) return new Response("nope", { status: 500 });
            const storedSha256 = upload === 0 ? sha256 : secondSha256;
            return descriptorResponse(storedSha256, upload === 0 ? 5 : 3);
          },
        }),
        publish,
        now: () => 123,
        resolve: resolvePublicDns,
      },
    );

    assertEquals(result.uploadSummary, {
      servers: 2,
      serversFullyUploaded: 0,
      totalUploads: 2,
      failedUploads: 1,
    });
    assertEquals(result.published.length, 0);
    assertEquals(events.length, 0);
    assertEquals(networkDeploySucceeded(result, manifests), false);
  });
});

async function manifestsFor(
  dir: string,
  files: ManifestFileMapping[] = [{ path: "/index.html", sha256 }],
): Promise<DeployManifestTemplate[]> {
  const aggregateHash = await computeAggregateHash(files);
  const pathTags = files.map((file) => ["path", file.path, file.sha256]);
  const aggregateTag = ["x", aggregateHash, "aggregate"];
  const root = await signer.sign({
    kind: NAPPLET_KIND_ROOT,
    created_at: 123,
    tags: [...pathTags, aggregateTag],
    content: "",
  });
  const snapshot = await signer.sign({
    kind: NAPPLET_KIND_SNAPSHOT,
    created_at: 123,
    tags: [
      ...pathTags,
      aggregateTag,
      ["a", `${NAPPLET_KIND_ROOT}:${signer.pubkey}:`],
    ],
    content: "",
  });
  return [
    manifest(dir, NAPPLET_KIND_ROOT, root, files, aggregateHash),
    manifest(dir, NAPPLET_KIND_SNAPSHOT, snapshot, files, aggregateHash),
  ];
}

function manifest(
  dir: string,
  kind: typeof NAPPLET_KIND_ROOT | typeof NAPPLET_KIND_SNAPSHOT,
  signedEvent: SignedNostrEvent,
  files: ManifestFileMapping[],
  aggregateHash: string,
): DeployManifestTemplate {
  return {
    item: {
      candidate: { name: "feed", dir, indexHtml: `${dir}/index.html` },
      target: kind === NAPPLET_KIND_ROOT ? "root" : "snapshot",
      kind,
    },
    files: files.map((file) => ({ ...file })),
    aggregateHash,
    template: signedEvent,
    signedEvent,
  };
}
