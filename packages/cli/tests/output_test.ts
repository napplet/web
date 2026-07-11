import { nip19 } from "nostr-tools";
import type { SigningDebugInfo } from "../src/debug.ts";
import type { NetworkDeployResult } from "../src/deploy-network.ts";
import {
  createDeployProgressReporter,
  createEventPointers,
  type DeployReport,
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

  assert(output.includes("Napplet Deploy"));
  assert(output.includes("named:feed kind"));
  assert(output.includes("wss://relay.example"));
  assert(output.includes("https://blob.example"));
  assert(output.includes("Copy nevent: nevent1"));
  assert(output.includes("Copy naddr: naddr1"));
  assert(output.includes("Dry run complete"));
});

Deno.test("renderDeployReport replaces placeholder candidate names with a readable source", () => {
  const item: DeployPlanItem = {
    candidate: {
      name: "..",
      dir: "/repo/gbcolor-napplet/dist",
      indexHtml: "/repo/gbcolor-napplet/dist/index.html",
    },
    target: "named",
    kind: NAPPLET_KIND_NAMED,
    dTag: "gbc-emulator",
  };
  const output = renderDeployReport({
    signing: {
      type: "none",
      source: "none",
      canSignWithoutPrompt: false,
      requiresSecretLookup: false,
      notes: [],
    },
    plan: {
      configPath: ".napplet/config.json",
      items: [item],
    },
    manifests: [{
      item,
      files: [{ path: "/index.html", sha256: "a".repeat(64) }],
      aggregateHash: "b".repeat(64),
      template: {
        kind: NAPPLET_KIND_NAMED,
        created_at: 123,
        tags: [["d", "gbc-emulator"], ["path", "/index.html", "a".repeat(64)]],
        content: "",
      },
    }],
    relays: ["wss://relay.example"],
    blossomServers: ["https://blob.example"],
    dryRun: true,
  });

  assert(!output.includes("from .."));
  assert(output.includes("from gbcolor-napplet"));
});

Deno.test("renderDeployReport treats a failed redundant mirror as a warning", async () => {
  const { report, signedEvent } = await createNetworkDeployReport();
  report.blossomServers = [
    "https://a.example",
    "https://b.example",
    "https://c.example",
  ];
  report.deploy = {
    uploaded: [
      successfulUpload("https://a.example"),
      {
        ...successfulUpload("https://b.example"),
        success: false,
        error: "HTTP 502",
      },
      successfulUpload("https://c.example"),
    ],
    published: [successfulPublish(signedEvent.id)],
    uploadSummary: {
      servers: 3,
      serversFullyUploaded: 2,
      totalUploads: 3,
      failedUploads: 1,
    },
  };

  const output = renderDeployReport(report);

  assert(output.includes("Status: complete with warnings (1 incomplete Blossom mirror)"));
  assert(output.includes("Deploy complete with warnings: 1 incomplete Blossom mirror."));
  assert(!output.includes("Status: attention needed"));
  assert(!output.includes("Deploy failed"));
});

Deno.test("renderDeployReport treats a failed redundant relay publish as a warning", async () => {
  const { report, signedEvent } = await createNetworkDeployReport();
  const deploy = report.deploy;
  assert(deploy);
  deploy.published.push({
    relay: "wss://backup-relay.example",
    eventId: signedEvent.id,
    success: false,
    error: "relay unavailable",
  });

  const output = renderDeployReport(report);

  assert(output.includes("complete with warnings (1 failed redundant relay publish)"));
  assert(!output.includes("Deploy failed"));
});

Deno.test("renderDeployReport fails when a manifest has no successful relay publish", async () => {
  const { report } = await createNetworkDeployReport();
  const deploy = report.deploy;
  assert(deploy);
  deploy.published = [];

  const output = renderDeployReport(report);

  assert(output.includes("Status: failed (1 manifest event was not published)"));
  assert(output.includes("Deploy failed: 1 manifest event was not published."));
});

async function createNetworkDeployReport(): Promise<{
  report: DeployReport;
  signedEvent: Awaited<ReturnType<typeof signer.sign>>;
}> {
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
  return {
    signedEvent,
    report: {
      signing: {
        type: "private-key",
        source: "sec-flag",
        format: "nsec",
        canSignWithoutPrompt: true,
        requiresSecretLookup: false,
        notes: [],
      },
      plan: {
        configPath: ".napplet/config.json",
        items: [item],
      },
      manifests: [{
        item,
        files: [{ path: "/index.html", sha256: "a".repeat(64) }],
        aggregateHash: "b".repeat(64),
        template: signedEvent,
        signedEvent,
      }],
      deploy: {
        uploaded: [successfulUpload("https://blob.example")],
        published: [successfulPublish(signedEvent.id)],
        uploadSummary: {
          servers: 1,
          serversFullyUploaded: 1,
          totalUploads: 1,
          failedUploads: 0,
        },
      },
      relays: ["wss://relay.example"],
      blossomServers: ["https://blob.example"],
      dryRun: false,
    },
  };
}

function successfulUpload(server: string): NetworkDeployResult["uploaded"][number] {
  return {
    server,
    file: "/index.html",
    sha256: "a".repeat(64),
    success: true,
    skipped: false,
  };
}

function successfulPublish(eventId: string): NetworkDeployResult["published"][number] {
  return { relay: "wss://relay.example", eventId, success: true };
}

Deno.test("createDeployProgressReporter renders terminal progress lines", () => {
  const lines: string[] = [];
  const report = createDeployProgressReporter({ writeLine: (line) => lines.push(line) });

  report({ type: "upload:start", files: 2, servers: 1, totalUploads: 2 });
  report({
    type: "upload:result",
    completedUploads: 1,
    totalUploads: 2,
    result: {
      server: "https://blob.example",
      file: "/index.html",
      sha256: "a".repeat(64),
      success: true,
      skipped: false,
    },
  });
  report({
    type: "publish:event",
    completedEvents: 1,
    events: 1,
    eventId: "b".repeat(64),
    results: [{ relay: "wss://relay.example", eventId: "b".repeat(64), success: true }],
  });

  assert(lines[0].includes("Uploading 2 file(s)"));
  assert(lines[1].includes("upload 1/2 uploaded: https://blob.example/index.html"));
  assert(lines[2].includes("publish 1/1 1/1 relays accepted"));
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

  assert(output.includes("Napplet Init Complete"));
  assert(output.includes("Status: created"));
  assert(output.includes("Config: /repo/.napplet/config.json"));
  assert(output.includes("Default target: named"));
  assert(output.includes("Named d tags: 1 (feed)"));
  assert(output.includes("Relays: 1 (wss://relay.example)"));
  assert(output.includes("Blossom servers: 1 (https://cdn.example)"));
  assert(output.includes("napplet deploy --dry-run"));
});
