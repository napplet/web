import { nip19 } from "nostr-tools";
import type { SigningDebugInfo } from "../src/debug.ts";
import {
  createEventPointers,
  isTerminalOutput,
  renderDeployReport,
  renderInitReport,
} from "../src/output.ts";
import { createPrivateKeySigner } from "../src/signing.ts";
import {
  type DeployManifestTemplate,
  type DeployPlanItem,
  NAPPLET_KIND_NAMED,
} from "../src/types.ts";
import { assert, assertEquals } from "./assert.ts";

const signer = createPrivateKeySigner("01".padStart(64, "0"));

Deno.test("createEventPointers emits NIP-19 event and address pointers", async () => {
  const event = await signer.sign({
    kind: NAPPLET_KIND_NAMED,
    created_at: 123,
    tags: [["d", "feed"], ["path", "/index.html", "a".repeat(64)]],
    content: "",
  });

  const pointers = createEventPointers(event, ["wss://relay.example"]);

  assert(pointers.nevent.startsWith("nevent1"));
  assert(pointers.naddr?.startsWith("naddr1"));
  assertEquals(nip19.decode(pointers.nevent).type, "nevent");
  const decoded = nip19.decode(pointers.naddr ?? "");
  assertEquals(decoded.type, "naddr");
  if (decoded.type === "naddr") {
    assertEquals(decoded.data.identifier, "feed");
    assertEquals(decoded.data.pubkey, signer.pubkey);
    assertEquals(decoded.data.kind, NAPPLET_KIND_NAMED);
  }
});

Deno.test("renderDeployReport shows deploy summary and copyable pointers", async () => {
  const item: DeployPlanItem = {
    candidate: {
      name: "feed",
      dir: "/tmp/feed",
      indexHtml: "/tmp/feed/index.html",
    },
    target: "named",
    kind: NAPPLET_KIND_NAMED,
    dTag: "feed",
  };
  const signedEvent = await signer.sign({
    kind: NAPPLET_KIND_NAMED,
    created_at: 123,
    tags: [["d", "feed"], ["path", "/index.html", "a".repeat(64)]],
    content: "",
  });
  const manifest: DeployManifestTemplate = {
    item,
    files: [{ path: "/index.html", sha256: "a".repeat(64) }],
    aggregateHash: "b".repeat(64),
    template: {
      kind: NAPPLET_KIND_NAMED,
      created_at: 123,
      tags: [["d", "feed"], ["path", "/index.html", "a".repeat(64)]],
      content: "",
    },
    signedEvent,
  };
  const signing: SigningDebugInfo = {
    type: "private-key",
    source: "sec-flag",
    format: "nsec",
    canSignWithoutPrompt: true,
    requiresSecretLookup: false,
    notes: [],
  };

  const output = renderDeployReport({
    signing,
    plan: {
      configPath: ".napplet/config.json",
      items: [item],
    },
    manifests: [manifest],
    relays: ["wss://relay.example"],
    blossomServers: ["https://blob.example"],
    dryRun: true,
  });

  assert(output.includes("Napplet deploy"));
  assert(output.includes("named:feed kind"));
  assert(output.includes("wss://relay.example"));
  assert(output.includes("https://blob.example"));
  assert(output.includes("nevent1"));
  assert(output.includes("naddr1"));
  assert(output.includes("Dry run complete"));
});

Deno.test("isTerminalOutput falls back to false for non-terminal sinks", () => {
  assertEquals(isTerminalOutput({ isTerminal: () => true }), true);
  assertEquals(isTerminalOutput({}), false);
});

Deno.test("renderInitReport shows resolved config", () => {
  const output = renderInitReport({
    path: "/repo/.napplet/config.json",
    created: true,
    config: {
      version: 1,
      sourceDir: "dist",
      defaultTarget: "named",
      named: ["feed"],
      relays: ["wss://relay.example"],
      blossomServers: ["https://cdn.example"],
    },
  });

  assert(output.includes("Created /repo/.napplet/config.json"));
  assert(output.includes("Default target: named"));
  assert(output.includes("Named d tags: feed"));
  assert(output.includes("wss://relay.example"));
  assert(output.includes("https://cdn.example"));
});
