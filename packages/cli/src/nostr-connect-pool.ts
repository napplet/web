import { Relay, type RelayInformation } from "applesauce-relay";
import { RelayPool } from "applesauce-relay/pool";
import { NostrConnectSigner } from "applesauce-signers";
import { from, type Observable } from "rxjs";
import { activeProxy, networkFetch, networkWebSocket } from "./network.ts";

let sharedPool: RelayPool | undefined;
const directInformationDocument = Relay.fetchInformationDocument;

/**
 * Fetch a relay's NIP-11 document through the configured proxy, as applesauce does directly: null on any failure
 * or after 10 seconds, so a relay without one still connects.
 * @param url Relay WebSocket URL.
 * @returns The information document, or null.
 * @example proxiedInformationDocument("wss://relay.example")
 */
export function proxiedInformationDocument(url: string): Observable<RelayInformation | null> {
  return from(readInformation(url));
}

async function readInformation(url: string): Promise<RelayInformation | null> {
  const http = new URL(url);
  if (http.protocol === "ws:") http.protocol = "http:";
  if (http.protocol === "wss:") http.protocol = "https:";
  try {
    const response = await networkFetch(http, {
      headers: { Accept: "application/nostr+json" },
      signal: AbortSignal.timeout(10_000),
    });
    return await response.json() as RelayInformation;
  } catch {
    return null;
  }
}

/** Ensure applesauce NIP-46 signers use the same RelayPool path as nsyte, through the configured proxy if any. */
export function ensureNostrConnectPool(): RelayPool {
  if (!sharedPool) {
    // Applesauce fetches each relay's NIP-11 document on connect with the global fetch; route it like the socket.
    Relay.fetchInformationDocument = activeProxy() ? proxiedInformationDocument : directInformationDocument;
    sharedPool = new RelayPool({ WebSocket: networkWebSocket() });
    // CLI signer flows start from a cold pool, so include relays before their
    // ready flag flips or the first NIP-46 publish/subscription is a no-op.
    sharedPool.ignoreOffline = false;
  }
  NostrConnectSigner.pool = sharedPool;
  return sharedPool;
}

/** Close the shared NIP-46 relay pool after a CLI signer flow settles. */
export function closeNostrConnectPool(): void {
  const pool = sharedPool;
  if (!pool) return;
  const relayUrls = Array.from(pool.relays.keys());
  for (const relay of relayUrls) pool.remove(relay, true);
  if (NostrConnectSigner.pool === pool) NostrConnectSigner.pool = undefined;
  Relay.fetchInformationDocument = directInformationDocument;
  sharedPool = undefined;
}
