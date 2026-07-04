import type { AbstractSimplePool } from "nostr-tools/abstract-pool";
import { decrypt, encrypt, getConversationKey } from "nostr-tools/nip44";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { bytesToHex } from "nostr-tools/utils";
import {
  buildPerms,
  connectRemoteSigner,
  detectBunkerLine,
  renderQrMatrix,
} from "../src/nostr-connect.ts";
import { decodeNbunksec } from "../src/signing.ts";
import { assert, assertEquals } from "./assert.ts";

const NOSTR_CONNECT_KIND = 24133;

interface RpcEvent {
  kind: number;
  pubkey: string;
  content: string;
  tags: string[][];
  created_at: number;
  id: string;
  sig: string;
}

type EventHandler = (event: RpcEvent) => void;

/**
 * In-memory pool that plays the role of a remote NIP-46 signer. It never
 * touches a real relay: on publish it decrypts the client's request with the
 * shared NIP-44 conversation key and delivers an encrypted response to every
 * recorded subscription listener.
 */
class FakeRemotePool {
  private readonly listeners: EventHandler[] = [];

  constructor(
    private readonly remoteSk: Uint8Array,
    private readonly remotePubkey: string,
  ) {}

  subscribe(
    _relays: string[],
    _filter: unknown,
    handlers: { onevent?: EventHandler },
  ): { close(): void } {
    if (handlers?.onevent) this.listeners.push(handlers.onevent);
    return { close: () => {} };
  }

  publish(_relays: string[], event: RpcEvent): Promise<void>[] {
    const convKey = getConversationKey(this.remoteSk, event.pubkey);
    const request = JSON.parse(decrypt(event.content, convKey)) as {
      id: string;
      method: string;
    };
    const result = request.method === "get_public_key" ? this.remotePubkey : "ack";
    const response: RpcEvent = {
      kind: NOSTR_CONNECT_KIND,
      pubkey: this.remotePubkey,
      content: encrypt(JSON.stringify({ id: request.id, result }), convKey),
      tags: [["p", event.pubkey]],
      created_at: Math.floor(Date.now() / 1000),
      id: "0".repeat(64),
      sig: "0".repeat(128),
    };
    queueMicrotask(() => {
      for (const listener of this.listeners) listener(response);
    });
    return [Promise.resolve()];
  }

  close(_relays: string[]): void {}
}

Deno.test("buildPerms lists get_public_key then per-kind sign_event", () => {
  assertEquals(buildPerms([]), ["get_public_key"]);
  assertEquals(buildPerms([1, 24242]), [
    "get_public_key",
    "sign_event:1",
    "sign_event:24242",
  ]);
});

Deno.test("detectBunkerLine accepts bunker:// and rejects noise", () => {
  assertEquals(detectBunkerLine("bunker://abc"), "bunker://abc");
  assertEquals(detectBunkerLine("  bunker://abc  "), "bunker://abc");
  assertEquals(detectBunkerLine("nostrconnect://abc"), null);
  assertEquals(detectBunkerLine("just some text"), null);
  assertEquals(detectBunkerLine(""), null);
});

Deno.test("renderQrMatrix renders half-block rows with a quiet zone", () => {
  const matrix = [
    [true, false],
    [false, true],
  ];
  const lines = renderQrMatrix(matrix, 2);
  // 1 top border + 1 content row (two matrix rows folded) + 1 bottom border.
  assertEquals(lines.length, 3);
  // Each row is width (2) + a quiet-zone border of 2 modules on each side.
  for (const line of lines) assertEquals(line.length, 6);
  assert(lines[1].includes("▀") || lines[1].includes("▄") || lines[1].includes("█"));
  assertEquals(renderQrMatrix([], 2), []);
});

Deno.test("connectRemoteSigner completes via a pasted bunker:// URL", async () => {
  const remoteSk = generateSecretKey();
  const remotePubkey = getPublicKey(remoteSk);
  const relays = ["wss://relay.test"];
  const bunkerUrl = `bunker://${remotePubkey}?relay=${
    encodeURIComponent(relays[0])
  }&secret=conn-secret`;

  const pool = new FakeRemotePool(remoteSk, remotePubkey);
  const stdin = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`${bunkerUrl}\n`));
      controller.close();
    },
  });

  const result = await connectRemoteSigner({
    relays,
    stdin,
    pool: pool as unknown as AbstractSimplePool,
    print: () => {},
    timeoutMs: 5000,
  });

  assertEquals(result.pubkey, remotePubkey);
  assertEquals(result.relays, relays);

  const decoded = decodeNbunksec(result.nbunksec);
  assertEquals(decoded.pubkey, remotePubkey);
  assertEquals(decoded.relays, relays);
  assertEquals(decoded.secret, "conn-secret");
  assertEquals(/^[0-9a-f]{64}$/.test(decoded.localKey), true);
  // The stored local key is the ephemeral client key, never the remote key.
  assert(decoded.localKey !== bytesToHex(remoteSk));
});
