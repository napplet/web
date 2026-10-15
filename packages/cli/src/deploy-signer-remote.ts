import { reconnectBuildSigner, type BuildSigner } from "@napplet/build-tools";
import { createKeyStore, type KeyStoreProvider } from "./key-store.ts";
import { reconnectRemoteBuildSigner } from "./nostr-connect.ts";
import { decodeNbunksec, encodePublicKey, type NappletSigner } from "./signing.ts";
import type { DeploySignerOptions } from "./deploy-signer.ts";

export function createRemoteDeploySigner(signer: NappletSigner, getBuildSigner: () => Promise<BuildSigner>): NappletSigner {
  let buildSigner: Promise<BuildSigner> | undefined;
  return { pubkey: signer.pubkey, async sign(template) {
    if (template.kind !== 24242) return await signer.sign(template);
    buildSigner ??= getBuildSigner();
    return await (await buildSigner).signEvent(template);
  }, async close() {
    try { await signer.close?.(); }
    finally { await buildSigner?.then((shared) => shared.close()).catch(() => {}); }
  } };
}

export async function getStoredBuildSigner(account: string, provider: KeyStoreProvider, options: DeploySignerOptions): Promise<BuildSigner> {
  const session = await reconnectBuildSigner({
    secretStore: createKeyStore(provider), sessionKey: account,
    parseStoredSession: (stored) => stored.withValue((value) => {
      const info = decodeNbunksec(value); return { remotePubkey: info.pubkey, relays: info.relays };
    }),
    reconnect: (stored, _identity, signal) => (options.reconnectRemoteBuildSigner ?? reconnectRemoteBuildSigner)(stored, signal),
  });
  if (!session) throw new Error("Remote signer session could not be reconnected");
  return session.signer;
}

export async function getOptionalKeyStore(options: DeploySignerOptions): Promise<KeyStoreProvider | null> {
  return await (options.getKeyStoreProvider ?? (await import("./key-store.ts")).getKeyStoreProvider)();
}

export function formatPubkey(pubkey: string): string {
  try { const npub = encodePublicKey(pubkey); return `${npub.slice(0, 12)}...${npub.slice(-8)}`; }
  catch { return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`; }
}

export function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
