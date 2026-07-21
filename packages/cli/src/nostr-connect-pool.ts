import { RelayPool } from "applesauce-relay/pool";
import { NostrConnectSigner } from "applesauce-signers";

let sharedPool: RelayPool | undefined;

/** Ensure applesauce NIP-46 signers use the same RelayPool path as nsyte. */
export function ensureNostrConnectPool(): RelayPool {
  if (!sharedPool) {
    sharedPool = new RelayPool();
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
  sharedPool = undefined;
}
