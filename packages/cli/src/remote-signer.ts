import { NostrConnectSigner, PrivateKeySigner } from "applesauce-signers";
import { generateSecretKey } from "nostr-tools/pure";
import { hexToBytes } from "nostr-tools/utils";
import { closeNostrConnectPool, ensureNostrConnectPool } from "./nostr-connect-pool.ts";
import type { NappletSigner, NbunksecInfo } from "./signing.ts";
import type { SignedNostrEvent } from "./types.ts";

const REMOTE_SIGNER_CONNECT_TIMEOUT_MS = 30_000;
const REMOTE_SIGNER_PUBLIC_KEY_TIMEOUT_MS = 30_000;

/** Open a stored nbunksec remote signer session. */
export async function createNbunksecRemoteSigner(info: NbunksecInfo): Promise<NappletSigner> {
  ensureNostrConnectPool();
  const signer = new NostrConnectSigner({
    remote: info.pubkey,
    relays: info.relays,
    signer: new PrivateKeySigner(hexToBytes(info.localKey)),
  });
  try {
    await withRemoteTimeout(
      signer.connect(),
      REMOTE_SIGNER_CONNECT_TIMEOUT_MS,
      "Remote signer connection timed out after 30s",
    );
  } catch (error) {
    await closeRemoteSigner(signer);
    throw error;
  }
  return await createConnectedRemoteSigner(signer);
}

/** Open a one-shot bunker:// remote signer session. */
export async function createBunkerUrlRemoteSigner(secret: string): Promise<NappletSigner> {
  let pointer: { remote: string; relays: string[]; secret?: string };
  try {
    pointer = NostrConnectSigner.parseBunkerURI(secret.trim());
  } catch {
    throw new Error("Invalid bunker:// signing URL");
  }
  ensureNostrConnectPool();
  const signer = new NostrConnectSigner({
    remote: pointer.remote,
    relays: pointer.relays,
    signer: new PrivateKeySigner(generateSecretKey()),
  });
  try {
    await withRemoteTimeout(
      signer.connect(pointer.secret),
      REMOTE_SIGNER_CONNECT_TIMEOUT_MS,
      "Remote signer connection timed out after 30s",
    );
  } catch (error) {
    await closeRemoteSigner(signer);
    throw error;
  }
  return await createConnectedRemoteSigner(signer);
}

async function createConnectedRemoteSigner(
  signer: NostrConnectSigner,
): Promise<NappletSigner> {
  let pubkey: string;
  try {
    pubkey = await withRemoteTimeout(
      signer.getPublicKey(),
      REMOTE_SIGNER_PUBLIC_KEY_TIMEOUT_MS,
      "Remote signer did not return a public key within 30s",
    );
  } catch (error) {
    await closeRemoteSigner(signer);
    throw error;
  }
  return {
    pubkey,
    async sign(template): Promise<SignedNostrEvent> {
      return toSignedEvent(
        await signer.signEvent({
          kind: template.kind,
          created_at: template.created_at,
          tags: template.tags.map((tag) => [...tag]),
          content: template.content,
        }),
      );
    },
    async close(): Promise<void> {
      await closeRemoteSigner(signer);
    },
  };
}

async function withRemoteTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function closeRemoteSigner(
  signer: NostrConnectSigner,
): Promise<void> {
  try {
    await signer.close();
  } finally {
    closeNostrConnectPool();
  }
}

function toSignedEvent(event: {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  id: string;
  pubkey: string;
  sig: string;
}): SignedNostrEvent {
  return {
    kind: event.kind,
    created_at: event.created_at,
    tags: event.tags.map((tag) => [...tag]),
    content: event.content,
    id: event.id,
    pubkey: event.pubkey,
    sig: event.sig,
  };
}
