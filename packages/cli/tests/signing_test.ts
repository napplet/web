import { defaultConfig } from "../src/config.ts";
import { detectSecretFormat, resolveSigningMethod } from "../src/signing.ts";
import { assertEquals } from "./assert.ts";

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
