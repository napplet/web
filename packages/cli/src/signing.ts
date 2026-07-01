import { nip19 } from "nostr-tools";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { hexToBytes } from "nostr-tools/utils";
import type {
  DeployManifestTemplate,
  NappletConfig,
  NostrEventTemplate,
  SignedNostrEvent,
  SigningMethod,
} from "./types.ts";

export interface LocalSigner {
  pubkey: string;
  sign(template: NostrEventTemplate): SignedNostrEvent;
}

export function detectSecretFormat(
  secret: string,
): "nsec" | "nbunksec" | "bunker-url" | "hex" | null {
  const trimmed = secret.trim();
  if (trimmed.startsWith("nbunksec1")) return "nbunksec";
  if (trimmed.startsWith("nsec1")) return "nsec";
  if (trimmed.startsWith("bunker://")) return "bunker-url";
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return "hex";
  return null;
}

export function resolveSigningMethod(
  config: NappletConfig,
  options: { sec?: string; promptSec?: boolean; env?: Record<string, string | undefined> } = {},
): SigningMethod {
  if (options.sec) {
    const format = detectSecretFormat(options.sec);
    if (!format) {
      throw new Error("Invalid --sec. Expected nsec, nbunksec, bunker:// URL, or 64-char hex.");
    }
    if (format === "nsec" || format === "hex") {
      return { type: "private-key", source: "sec-flag", format };
    }
    return { type: "bunker", source: "sec-flag", format };
  }

  if (options.promptSec) {
    return { type: "prompt", source: "prompt-sec" };
  }

  const env = options.env ?? Deno.env.toObject();
  const ciReference = env.NAPPLET_CI_SIGNING_KEY ?? env.NAPPLET_CI_KEY_REFERENCE;
  if (config.signing?.mode === "ci" && ciReference) {
    return { type: "ci-revocable", source: "environment", keyReference: ciReference };
  }

  if (config.signing?.keyReference) {
    return { type: "stored", source: "config", keyReference: config.signing.keyReference };
  }

  return { type: "none" };
}

export function createPrivateKeySigner(secret: string): LocalSigner {
  const privateKey = decodePrivateKey(secret);
  const pubkey = getPublicKey(privateKey);
  return {
    pubkey,
    sign(template: NostrEventTemplate): SignedNostrEvent {
      const signed = finalizeEvent({
        kind: template.kind,
        created_at: template.created_at,
        tags: template.tags.map((tag) => [...tag]),
        content: template.content,
      }, privateKey);
      return {
        kind: signed.kind,
        created_at: signed.created_at,
        tags: signed.tags.map((tag) => [...tag]),
        content: signed.content,
        id: signed.id,
        pubkey: signed.pubkey,
        sig: signed.sig,
      };
    },
  };
}

export function signDeployManifestTemplates(
  manifests: readonly DeployManifestTemplate[],
  signer: LocalSigner,
): DeployManifestTemplate[] {
  return manifests.map((manifest) => ({
    ...manifest,
    signedEvent: manifest.template ? signer.sign(manifest.template) : undefined,
  }));
}

export function decodePrivateKey(secret: string): Uint8Array {
  const trimmed = secret.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return hexToBytes(trimmed);
  if (trimmed.startsWith("nsec1")) {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== "nsec" || !(decoded.data instanceof Uint8Array)) {
      throw new Error("Invalid nsec private key");
    }
    return decoded.data;
  }
  throw new Error("Local signing requires an nsec or 64-character hex private key");
}
