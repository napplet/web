import {
  eventsToRelaySuggestions,
  getBlossomServerSuggestions,
  getRelaySuggestions,
} from "../src/suggestions.ts";
import { assert, assertEquals } from "./assert.ts";

class FakePool {
  readonly calls: { relays: string[]; filter: Record<string, unknown> }[] = [];
  constructor(
    private readonly events: unknown[] | ((relays: string[], filter: Record<string, unknown>) => unknown[]),
    private readonly fail = false,
  ) {}

  querySync(
    relays: string[],
    filter: Record<string, unknown>,
    params?: { maxWait?: number; label?: string },
  ): Promise<unknown[]> {
    assert(relays.length > 0);
    assert(Array.isArray(filter.kinds));
    assert(params?.label === "napplet-init-suggestions");
    if (this.fail) throw new Error("offline");
    this.calls.push({ relays, filter });
    return Promise.resolve(typeof this.events === "function" ? this.events(relays, filter) : this.events);
  }
}

const pubkey = "a".repeat(64);

function signedEvent(kind: number, createdAt: number, tags: string[][]): Record<string, unknown> {
  return {
    id: `${kind}${createdAt}`.padEnd(64, "0"),
    pubkey,
    sig: "b".repeat(128),
    kind,
    created_at: createdAt,
    content: "",
    tags,
  };
}

Deno.test("eventsToRelaySuggestions extracts and scores NIP-66 relay discovery events", () => {
  const relays = eventsToRelaySuggestions([
    {
      kind: 30166,
      created_at: 20,
      tags: [["d", "wss://slow.example/"], ["rtt-open", "900"]],
    },
    {
      kind: 30166,
      created_at: 10,
      tags: [["d", "wss://fast.example/"], ["rtt-open", "80"], ["R", "!payment"]],
    },
    {
      kind: 30166,
      created_at: 30,
      tags: [["d", "https://not-a-relay.example"]],
    },
  ]);

  assertEquals(relays, ["wss://fast.example", "wss://slow.example"]);
});

Deno.test("getRelaySuggestions prefers static defaults and appends live discovery", async () => {
  const live = await getRelaySuggestions({
    pool: new FakePool([
      {
        kind: 30166,
        created_at: 1,
        tags: [["d", "wss://live.example"], ["rtt-open", "50"]],
      },
    ]),
    relays: ["wss://relaypag.es"],
    limit: 7,
  });
  assertEquals(live.slice(0, 6), [
    "wss://relay.primal.net",
    "wss://nos.lol",
    "wss://relay.damus.io",
    "wss://nostr.wine",
    "wss://relay.nostr.band",
    "wss://nostr-pub.wellorder.net",
  ]);
  assertEquals(live[6], "wss://live.example");

  const fallback = await getRelaySuggestions({
    pool: new FakePool([], true),
    relays: ["wss://relaypag.es"],
    limit: 2,
  });
  assertEquals(fallback, ["wss://relay.primal.net", "wss://nos.lol"]);
});

Deno.test("getRelaySuggestions keeps a large autocomplete pool by default", async () => {
  const live = await getRelaySuggestions({
    pool: new FakePool(
      Array.from({ length: 20 }, (_, index) => ({
        kind: 30166,
        created_at: index,
        tags: [["d", `wss://live-${index}.example`], ["rtt-open", String(50 + index)]],
      })),
    ),
    relays: ["wss://relaypag.es"],
  });

  assert(live.length > 12);
  assert(live.includes("wss://live-19.example"));
});

Deno.test("getBlossomServerSuggestions follows verified directory, write-relay, and ordered BUD-03 stages", async () => {
  const pool = new FakePool((relays, filter) => {
    const kinds = filter.kinds as number[];
    if (kinds[0] === 10002) {
      assertEquals(relays, ["wss://directory.example"]);
      return [
        signedEvent(10002, 9, [["r", "wss://stale.example", "read"]]),
        signedEvent(10002, 10, [
          ["r", "wss://read.example", "read"],
          ["r", "wss://write.example", "write"],
          ["r", "wss://both.example"],
        ]),
      ];
    }
    assertEquals(relays, ["wss://write.example", "wss://both.example"]);
    return [signedEvent(10063, 11, [
      ["server", "https://first.example/"],
      ["server", "https://second.example"],
      ["server", "https://first.example/"],
    ])];
  });

  const servers = await getBlossomServerSuggestions({
    pool,
    pubkey,
    relays: ["wss://directory.example"],
    now: () => 12,
    verifyEvent: () => true,
  });

  assertEquals(servers, ["https://first.example/", "https://second.example/"]);
  assertEquals(pool.calls.map((call) => call.filter.kinds), [[10002], [10063]]);
});

Deno.test("getBlossomServerSuggestions has no default server when verified discovery is unavailable", async () => {
  assertEquals(await getBlossomServerSuggestions(), []);
  assertEquals(await getBlossomServerSuggestions({
    pool: new FakePool([], true),
    pubkey,
    relays: ["wss://directory.example"],
    verifyEvent: () => true,
  }), []);
});
