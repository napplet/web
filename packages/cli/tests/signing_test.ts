import { nip19 } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";
import { defaultConfig } from "../src/config.ts";
import {
  createPrivateKeySigner,
  decodeNbunksec,
  decodePrivateKey,
  detectSecretFormat,
  encodeNbunksec,
  encodePublicKey,
  normalizePublicKey,
  resolveSigningMethod,
  signDeployManifestTemplates,
} from "../src/signing.ts";
import { NAPPLET_KIND_ROOT, NAPPLET_KIND_SNAPSHOT, type NappletCandidate } from "../src/types.ts";
import { assertEquals } from "./assert.ts";

const privateKeyHex = "01".padStart(64, "0");
const publicKeyHex = "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";

Deno.test("detectSecretFormat classifies nsyte-compatible signing inputs", () => {
  assertEquals(detectSecretFormat("nsec1example"), "nsec");
  assertEquals(detectSecretFormat("nbunksec1example"), "nbunksec");
  assertEquals(detectSecretFormat("bunker://pubkey?relay=wss%3A%2F%2Frelay.example"), "bunker-url");
  assertEquals(detectSecretFormat("a".repeat(64)), "hex");
  assertEquals(detectSecretFormat("nope"), null);
});

Deno.test("resolveSigningMethod honors ci revocable key references", () => {
  const method = resolveSigningMethod(
    defaultConfig({ signing: { mode: "ci" } }),
    { env: { NAPPLET_CI_SIGNING_KEY: "ci-key-1" } },
  );
  assertEquals(method, {
    type: "ci-revocable",
    source: "environment",
    keyReference: "ci-key-1",
  });
});

Deno.test("resolveSigningMethod prefers explicit --sec", () => {
  const method = resolveSigningMethod(
    defaultConfig({ signing: { mode: "ci", keyReference: "stored" } }),
    { sec: "b".repeat(64), env: { NAPPLET_CI_SIGNING_KEY: "ci-key-1" } },
  );
  assertEquals(method, {
    type: "private-key",
    source: "sec-flag",
    format: "hex",
  });
});

Deno.test("resolveSigningMethod supports configured bunker npubs", () => {
  const npub = nip19.npubEncode(publicKeyHex);
  const method = resolveSigningMethod(
    defaultConfig({
      relays: ["wss://relay.example"],
      bunkerPubkey: npub,
    }),
  );
  assertEquals(method, {
    type: "bunker-pubkey",
    source: "config",
    pubkey: publicKeyHex,
    relays: ["wss://relay.example"],
  });
});

Deno.test("normalizePublicKey supports hex and npub values", () => {
  const npub = nip19.npubEncode(publicKeyHex);
  assertEquals(normalizePublicKey(publicKeyHex.toUpperCase()), publicKeyHex);
  assertEquals(normalizePublicKey(npub), publicKeyHex);
  assertEquals(encodePublicKey(publicKeyHex), npub);
});

Deno.test("decodePrivateKey supports hex and nsec local secrets", () => {
  const nsec = nip19.nsecEncode(hexToBytes(privateKeyHex));
  assertEquals([...decodePrivateKey(privateKeyHex)], [...hexToBytes(privateKeyHex)]);
  assertEquals([...decodePrivateKey(nsec)], [...hexToBytes(privateKeyHex)]);
});

Deno.test("createPrivateKeySigner signs NIP-01 event templates", async () => {
  const signer = createPrivateKeySigner(privateKeyHex);
  const signed = await signer.sign({
    kind: NAPPLET_KIND_ROOT,
    created_at: 123,
    tags: [["path", "/index.html", "a".repeat(64)]],
    content: "",
  });
  assertEquals(signer.pubkey, publicKeyHex);
  assertEquals(signed.pubkey, publicKeyHex);
  assertEquals(signed.id.length, 64);
  assertEquals(signed.sig.length, 128);
});

Deno.test("signDeployManifestTemplates signs only built templates", async () => {
  const candidate: NappletCandidate = {
    name: "feed",
    dir: "/tmp/feed",
    indexHtml: "/tmp/feed/index.html",
  };
  const manifests = await signDeployManifestTemplates([
    {
      item: { candidate, target: "root", kind: NAPPLET_KIND_ROOT },
      files: [{ path: "/index.html", sha256: "a".repeat(64) }],
      aggregateHash: "b".repeat(64),
      template: {
        kind: NAPPLET_KIND_ROOT,
        created_at: 123,
        tags: [["path", "/index.html", "a".repeat(64)]],
        content: "",
      },
    },
    {
      item: { candidate, target: "snapshot", kind: NAPPLET_KIND_SNAPSHOT },
      files: [{ path: "/index.html", sha256: "a".repeat(64) }],
      aggregateHash: "b".repeat(64),
      skippedReason: "needs pubkey",
    },
  ], createPrivateKeySigner(privateKeyHex));

  assertEquals(manifests[0].signedEvent?.pubkey, publicKeyHex);
  assertEquals(manifests[1].signedEvent, undefined);
});

Deno.test("decodeNbunksec stores the remote signer pubkey for reconnect", () => {
  const info = {
    pubkey: "02".repeat(32),
    localKey: "03".repeat(32),
    relays: ["wss://relay.example", "wss://relay2.example"],
    secret: "connect-secret",
  };
  const encoded = encodeNbunksec(info);
  assertEquals(encoded.startsWith("nbunksec1"), true);
  assertEquals(decodeNbunksec(encoded), info);
});
