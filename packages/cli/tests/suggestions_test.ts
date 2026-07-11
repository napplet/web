import {
  eventsToBlossomServerSuggestions,
  eventsToRelaySuggestions,
  getBlossomServerSuggestions,
  getRelaySuggestions,
} from "../src/suggestions.ts";
import { assert, assertEquals } from "./assert.ts";

class FakePool {
  constructor(private readonly events: unknown[], private readonly fail = false) {}

  querySync(
    relays: string[],
    filter: Record<string, unknown>,
    params?: { maxWait?: number; label?: string },
  ): Promise<unknown[]> {
    assert(relays.length > 0);
    assert(Array.isArray(filter.kinds));
    assert(params?.label === "napplet-init-suggestions");
    if (this.fail) throw new Error("offline");
    return Promise.resolve(this.events);
  }
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

Deno.test("eventsToBlossomServerSuggestions extracts kind 10063 server tags by frequency", () => {
  const servers = eventsToBlossomServerSuggestions([
    {
      kind: 10063,
      tags: [["server", "https://cdn-two.example/"], ["server", "https://cdn-one.example"]],
    },
    {
      kind: 10063,
      tags: [["server", "https://cdn-two.example"], ["relay", "wss://ignored.example"]],
    },
  ]);

  assertEquals(servers, ["https://cdn-two.example", "https://cdn-one.example"]);
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

Deno.test("getBlossomServerSuggestions appends defaults and tolerates relay failures", async () => {
  const live = await getBlossomServerSuggestions({
    pool: new FakePool([
      {
        kind: 10063,
        tags: [["server", "https://cdn-live.example"]],
      },
    ]),
    relays: ["wss://relay.example"],
    limit: 2,
  });
  assertEquals(live, ["https://cdn-live.example", "https://cdn.hzrd149.com"]);

  const fallback = await getBlossomServerSuggestions({
    pool: new FakePool([], true),
    relays: ["wss://relay.example"],
    limit: 2,
  });
  assertEquals(fallback, ["https://cdn.hzrd149.com", "https://cdn.sovbit.host"]);
});

Deno.test("getBlossomServerSuggestions keeps a large autocomplete pool by default", async () => {
  const live = await getBlossomServerSuggestions({
    pool: new FakePool(
      Array.from({ length: 20 }, (_, index) => ({
        kind: 10063,
        tags: [["server", `https://cdn-${index}.example`]],
      })),
    ),
    relays: ["wss://relay.example"],
  });

  assert(live.length > 12);
  assert(live.includes("https://cdn-19.example"));
});
