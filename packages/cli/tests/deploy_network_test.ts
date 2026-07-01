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

Deno.test("createUploadAuthorization signs batch Blossom upload auth", () => {
  const header = createUploadAuthorization(signer, [sha256], () => 123);
  assert(header.startsWith("Nostr "));
  const event = JSON.parse(atob(header.slice("Nostr ".length))) as SignedNostrEvent;
  assertEquals(event.kind, 24242);
  assertEquals(event.created_at, 123);
  assertEquals(event.pubkey, signer.pubkey);
  assertEquals(event.tags, [
    ["t", "upload"],
    ["x", sha256],
    ["expiration", "3723"],
    ["client", "napplet"],
  ]);
});

Deno.test("executeNetworkDeploy uploads unique files and publishes signed manifests", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(`${dir}/index.html`, "index");
    const root = signer.sign({
      kind: NAPPLET_KIND_ROOT,
      created_at: 123,
      tags: [["path", "/index.html", sha256]],
      content: "",
    });
    const snapshot = signer.sign({
      kind: NAPPLET_KIND_SNAPSHOT,
      created_at: 123,
      tags: [["path", "/index.html", sha256], ["a", `${NAPPLET_KIND_ROOT}:${signer.pubkey}:`]],
      content: "",
    });
    const manifests: DeployManifestTemplate[] = [
      manifest(dir, NAPPLET_KIND_ROOT, root),
      manifest(dir, NAPPLET_KIND_SNAPSHOT, snapshot),
    ];
    const fetchCalls: Array<{ url: string; method: string; authorization?: string }> = [];
    const fakeFetch: typeof fetch = ((input, init) => {
      const url = String(input);
      fetchCalls.push({
        url,
        method: init?.method ?? "GET",
        authorization: new Headers(init?.headers).get("authorization") ?? undefined,
      });
      if (init?.method === "HEAD") {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      return Promise.resolve(new Response("ok", { status: 200 }));
    }) as typeof fetch;
    const publishedEvents: SignedNostrEvent[] = [];
    const publish = (
      relays: string[],
      event: SignedNostrEvent,
    ): Promise<RelayPublishResult[]> => {
      publishedEvents.push(event);
      return Promise.resolve(
        relays.map((relay) => ({ relay, eventId: event.id, success: true })),
      );
    };

    const result = await executeNetworkDeploy(
      manifests,
      { relays: ["wss://relay.example"], blossomServers: ["https://blob.example"] },
      signer,
      { fetch: fakeFetch, publish, now: () => 123 },
    );

    assertEquals(result.uploaded.length, 1);
    assertEquals(result.uploaded[0].success, true);
    assertEquals(result.published.length, 2);
    assertEquals(publishedEvents.map((event) => event.kind), [
      NAPPLET_KIND_ROOT,
      NAPPLET_KIND_SNAPSHOT,
    ]);
    assertEquals(fetchCalls.map((call) => call.method), ["HEAD", "PUT"]);
    assert(fetchCalls[1].authorization?.startsWith("Nostr "));
    assertEquals(networkDeploySucceeded(result, manifests), true);
  });
});

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
