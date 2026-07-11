import { commandKeys } from "../src/keys-command.ts";
import { defaultConfig } from "../src/config.ts";
import { KEY_SERVICE_NAME, type KeyStoreProvider, type StoredSecret } from "../src/key-store.ts";
import { DEFAULT_CONNECT_RELAYS } from "../src/nostr-connect.ts";
import type { NappletConfig } from "../src/types.ts";
import { assertEquals } from "./assert.ts";

const pubkey = "02".repeat(32);

function provider(stores: StoredSecret[]): KeyStoreProvider {
  return {
    name: "test key store",
    isAvailable: () => Promise.resolve(true),
    store(secret) {
      stores.push(secret);
      return Promise.resolve();
    },
    retrieve: () => Promise.resolve(null),
    delete: () => Promise.resolve(false),
    list: () => Promise.resolve([]),
  };
}

Deno.test("commandKeys connect records remote signer pubkey and relays for recovery", async () => {
  const stores: StoredSecret[] = [];
  const written: Array<{ config: NappletConfig; path?: string }> = [];

  const code = await commandKeys(
    [
      "connect",
      "--name",
      "default",
      "--relay",
      "wss://relay.connect",
      "--config",
      "/repo/.napplet/config.json",
    ],
    "help",
    {
      requireKeyStoreProvider: () => Promise.resolve(provider(stores)),
      connectRemoteSigner(options) {
        assertEquals(options.relays, ["wss://relay.connect"]);
        return Promise.resolve({
          nbunksec: "nbunksec1connected",
          pubkey,
          relays: ["wss://relay.connect"],
        });
      },
      readConfig(path) {
        assertEquals(path, "/repo/.napplet/config.json");
        return Promise.resolve(defaultConfig());
      },
      writeConfig(config, path) {
        written.push({ config, path });
        return Promise.resolve();
      },
    },
  );

  assertEquals(code, 0);
  assertEquals(stores, [{
    service: KEY_SERVICE_NAME,
    account: "default",
    secret: "nbunksec1connected",
  }]);
  assertEquals(written[0].path, "/repo/.napplet/config.json");
  assertEquals(written[0].config.bunkerPubkey, pubkey);
  assertEquals(written[0].config.signing, {
    mode: "interactive",
    keyReference: "default",
    pubkey,
    relays: ["wss://relay.connect"],
  });
});

Deno.test("commandKeys connect prompts for bunker relays when no relay flags are passed", async () => {
  const stores: StoredSecret[] = [];
  const written: Array<{ config: NappletConfig; path?: string }> = [];

  const code = await commandKeys(
    ["connect", "--name", "default"],
    "help",
    {
      requireKeyStoreProvider: () => Promise.resolve(provider(stores)),
      promptConnectRelays(defaults) {
        assertEquals(defaults, [...DEFAULT_CONNECT_RELAYS]);
        return Promise.resolve([...defaults]);
      },
      connectRemoteSigner(options) {
        assertEquals(options.relays, [...DEFAULT_CONNECT_RELAYS]);
        return Promise.resolve({
          nbunksec: "nbunksec1connected",
          pubkey,
          relays: [...DEFAULT_CONNECT_RELAYS],
        });
      },
      readConfig() {
        return Promise.resolve(defaultConfig());
      },
      writeConfig(config, path) {
        written.push({ config, path });
        return Promise.resolve();
      },
    },
  );

  assertEquals(code, 0);
  assertEquals(stores[0], {
    service: KEY_SERVICE_NAME,
    account: "default",
    secret: "nbunksec1connected",
  });
  assertEquals(written[0].config.signing?.relays, [...DEFAULT_CONNECT_RELAYS]);
});
