/// <reference lib="deno.ns" />

import { finalizeEvent, generateSecretKey, getPublicKey } from "npm:nostr-tools@^2.23.3/pure";
import {
  discoverBlossomServers,
  type DiscoveryServices,
} from "./index.ts";

const NOW = 1_700_000_000;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function signedEvent(
  secret: Uint8Array,
  kind: number,
  createdAt: number,
  tags: string[][],
) {
  return finalizeEvent({ kind, created_at: createdAt, tags, content: "" }, secret);
}

class FakeDirectory implements DiscoveryServices {
  readonly calls: Array<{ relays: readonly string[]; kinds: readonly number[] }> = [];

  constructor(
    private readonly relayListEvents: readonly unknown[],
    private readonly serverListEvents: readonly unknown[],
  ) {}

  query(relays: readonly string[], filter: { kinds: readonly number[] }): Promise<readonly unknown[]> {
    this.calls.push({ relays, kinds: filter.kinds });
    return Promise.resolve(filter.kinds[0] === 10002 ? this.relayListEvents : this.serverListEvents);
  }
}

Deno.test("discovery selects the newest verified kind-10002 from bounded directories", async () => {
  const owner = generateSecretKey();
  const attacker = generateSecretKey();
  const pubkey = getPublicKey(owner);
  const old = signedEvent(owner, 10002, NOW - 1, [["r", "wss://old.example", "write"]]);
  const newest = signedEvent(owner, 10002, NOW, [["r", "wss://write.example", "write"]]);
  const forged = { ...signedEvent(owner, 10002, NOW + 1, [["r", "wss://forged.example", "write"]]), content: "forged" };
  const wrongAuthor = signedEvent(attacker, 10002, NOW + 2, [["r", "wss://attacker.example", "write"]]);
  const serverList = signedEvent(owner, 10063, NOW, [["server", "https://blossom.example"]]);
  const service = new FakeDirectory(
    [old, newest, forged, wrongAuthor],
    [serverList],
  );
  const result = await discoverBlossomServers({ pubkey, now: () => NOW }, service);

  assert(result.status === "found", "expected a discovered server list");
  assertEquals(service.calls[0].relays.includes("wss://purplepag.es"), true);
  assertEquals(service.calls[1].relays, ["wss://write.example"]);
  assertEquals(result.sourceEvent.id, serverList.id);
  assertEquals(result.servers.map((server) => server.toString()), ["https://blossom.example/"]);
});

Deno.test("discovery uses write and unmarked relays only and preserves verified server order", async () => {
  const owner = generateSecretKey();
  const pubkey = getPublicKey(owner);
  const relayList = signedEvent(owner, 10002, NOW, [
    ["r", "wss://read.example", "read"],
    ["r", "wss://write.example/", "write"],
    ["r", "wss://both.example/"],
    ["r", "wss://write.example", "write"],
  ]);
  const first = signedEvent(owner, 10063, NOW, [
    ["server", "https://one.example/"],
    ["server", "https://two.example"],
    ["server", "https://one.example"],
  ]);
  const sameTimeWithLaterId = signedEvent(owner, 10063, NOW, [["server", "https://tie.example"]]);
  const selected = first.id > sameTimeWithLaterId.id ? first : sameTimeWithLaterId;
  const service = new FakeDirectory([relayList], [first, sameTimeWithLaterId]);

  const result = await discoverBlossomServers({ pubkey, now: () => NOW }, service);

  assert(result.status === "found", "expected a server list");
  assertEquals(service.calls[1].relays, ["wss://write.example", "wss://both.example"]);
  assertEquals(result.sourceEvent.id, selected.id);
  if (selected.id === first.id) {
    assertEquals(result.servers.map((server) => server.toString()), ["https://one.example/", "https://two.example/"]);
  } else {
    assertEquals(result.servers.map((server) => server.toString()), ["https://tie.example/"]);
  }
});

Deno.test("discovery preserves a valid NIP-65 relay path", async () => {
  const owner = generateSecretKey();
  const pubkey = getPublicKey(owner);
  const relayList = signedEvent(owner, 10002, NOW, [["r", "wss://relay.example/nostr", "write"]]);
  const serverList = signedEvent(owner, 10063, NOW, [["server", "https://blossom.example"]]);
  const service = new FakeDirectory([relayList], [serverList]);

  await discoverBlossomServers({ pubkey, now: () => NOW }, service);
  assertEquals(service.calls[1].relays, ["wss://relay.example/nostr"]);
});

Deno.test("discovery returns an explicit no-server-list result for missing, stale, and empty data", async () => {
  const owner = generateSecretKey();
  const pubkey = getPublicKey(owner);
  const writeRelay = signedEvent(owner, 10002, NOW, [["r", "wss://write.example", "write"]]);
  const staleServers = signedEvent(owner, 10063, NOW - 60 * 60 * 24 * 31, [["server", "https://stale.example"]]);
  const emptyServers = signedEvent(owner, 10063, NOW - 1, [["server", "not a URL"]]);
  const service = new FakeDirectory([writeRelay], [staleServers, emptyServers]);

  const result = await discoverBlossomServers({ pubkey, now: () => NOW }, service);

  assert(result.status === "no-server-list", "missing valid server lists must be explicit");
  assertEquals(result.reason.code, "no-server-list");
  assert(!result.reason.message.includes("https://"), "status must not expose untrusted URLs");
});
