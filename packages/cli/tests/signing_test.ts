import { nip19 } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";
import { defaultConfig } from "../src/config.ts";
import {
  createPrivateKeySigner,
  decodePrivateKey,
  detectSecretFormat,
  resolveSigningMethod,
  signDeployManifestTemplates,
} from "../src/signing.ts";
import { NAPPLET_KIND_ROOT, type NappletCandidate } from "../src/types.ts";
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

Deno.test("decodePrivateKey supports hex and nsec local secrets", () => {
  const nsec = nip19.nsecEncode(hexToBytes(privateKeyHex));
  assertEquals([...decodePrivateKey(privateKeyHex)], [...hexToBytes(privateKeyHex)]);
  assertEquals([...decodePrivateKey(nsec)], [...hexToBytes(privateKeyHex)]);
});

Deno.test("createPrivateKeySigner signs NIP-01 event templates", () => {
  const signer = createPrivateKeySigner(privateKeyHex);
  const signed = signer.sign({
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

Deno.test("signDeployManifestTemplates signs only built templates", () => {
  const candidate: NappletCandidate = {
    name: "feed",
    dir: "/tmp/feed",
    indexHtml: "/tmp/feed/index.html",
  };
  const manifests = signDeployManifestTemplates([
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
      item: { candidate, target: "snapshot", kind: 5128 },
      files: [{ path: "/index.html", sha256: "a".repeat(64) }],
      aggregateHash: "b".repeat(64),
      skippedReason: "needs pubkey",
    },
  ], createPrivateKeySigner(privateKeyHex));

  assertEquals(manifests[0].signedEvent?.pubkey, publicKeyHex);
  assertEquals(manifests[1].signedEvent, undefined);
});
