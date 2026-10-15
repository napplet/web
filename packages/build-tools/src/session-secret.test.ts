/// <reference lib="deno.ns" />

import { decodeBuildSignerSecret, encodeBuildSignerSecret } from "./session-secret.ts";

const VECTOR = "nbunksec1qqsqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpyqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zqsnwaehxw309aex2mrp0yhx27rpd4cxcegrq3cxz6tjf5v0wt";

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test("build signer secrets match the CLI nbunksec interoperability vector", () => {
  const value = {
    remotePubkey: "00".repeat(32),
    clientSecretKey: "11".repeat(32),
    relays: ["wss://relay.example"],
    secret: "pair",
  };

  assertEquals(encodeBuildSignerSecret(value), VECTOR);
  assertEquals(decodeBuildSignerSecret(VECTOR), value);
});

Deno.test("build signer secret decoding rejects corrupted or incomplete sessions", () => {
  for (const value of [VECTOR.slice(0, -1), "nbunksec1invalid", VECTOR.replace("q", "Q")]) {
    try {
      decodeBuildSignerSecret(value);
      throw new Error("expected invalid nbunksec rejection");
    } catch (error) {
      if ((error as Error).message === "expected invalid nbunksec rejection") throw error;
    }
  }
});
