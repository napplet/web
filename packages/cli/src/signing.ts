import { nip19 } from "nostr-tools";
import { BunkerSigner } from "nostr-tools/nip46";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { hexToBytes } from "nostr-tools/utils";
import type {
  DeployManifestTemplate,
  NappletConfig,
  NostrEventTemplate,
  SignedNostrEvent,
  SigningMethod,
} from "./types.ts";

/** NappletSigner shape used by Nostr signing helpers. */
export interface NappletSigner {
  pubkey: string;
  sign(template: NostrEventTemplate): Promise<SignedNostrEvent>;
  close?(): Promise<void>;
}

/** LocalSigner union used by Nostr signing helpers. */
export type LocalSigner = NappletSigner;

/** NbunksecInfo shape used by Nostr signing helpers. */
export interface NbunksecInfo {
  pubkey: string;
  localKey: string;
  relays: string[];
  secret?: string;
}

/** detect secret format helper for Nostr signing. */
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

/** resolve signing method helper for Nostr signing. */
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

/** create signer from secret helper for Nostr signing. */
export async function createSignerFromSecret(secret: string): Promise<NappletSigner> {
  const format = detectSecretFormat(secret);
  if (format === "nsec" || format === "hex") return createPrivateKeySigner(secret);
  if (format === "nbunksec") return await createNbunksecSigner(secret);
  if (format === "bunker-url") {
    throw new Error("bunker:// signing is not implemented yet; use nbunksec for CI signing");
  }
  throw new Error("Signing requires nsec, nbunksec, bunker:// URL, or 64-character hex input");
}

/** create private key signer helper for Nostr signing. */
export function createPrivateKeySigner(secret: string): LocalSigner {
  const privateKey = decodePrivateKey(secret);
  const pubkey = getPublicKey(privateKey);
  return {
    pubkey,
    sign(template: NostrEventTemplate): Promise<SignedNostrEvent> {
      const signed = finalizeEvent({
        kind: template.kind,
        created_at: template.created_at,
        tags: template.tags.map((tag) => [...tag]),
        content: template.content,
      }, privateKey);
      return Promise.resolve({
        kind: signed.kind,
        created_at: signed.created_at,
        tags: signed.tags.map((tag) => [...tag]),
        content: signed.content,
        id: signed.id,
        pubkey: signed.pubkey,
        sig: signed.sig,
      });
    },
  };
}

/** sign deploy manifest templates helper for Nostr signing. */
export function signDeployManifestTemplates(
  manifests: readonly DeployManifestTemplate[],
  signer: NappletSigner,
): Promise<DeployManifestTemplate[]> {
  return Promise.all(
    manifests.map(async (manifest) => ({
      ...manifest,
      signedEvent: manifest.template ? await signer.sign(manifest.template) : undefined,
    })),
  );
}

/** decode private key helper for Nostr signing. */
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

/** decode nbunksec helper for Nostr signing. */
export function decodeNbunksec(value: string): NbunksecInfo {
  const bytes = decodeBech32("nbunksec", value.trim());
  const info: NbunksecInfo = {
    pubkey: "",
    localKey: "",
    relays: [],
  };
  let offset = 0;
  while (offset < bytes.length) {
    const type = bytes[offset];
    const length = bytes[offset + 1];
    if (length === undefined || offset + 2 + length > bytes.length) {
      throw new Error("Invalid nbunksec: incomplete TLV record");
    }
    const data = bytes.slice(offset + 2, offset + 2 + length);
    if (type === 0) info.pubkey = hex(data);
    if (type === 1) info.localKey = hex(data);
    if (type === 2) info.relays.push(new TextDecoder().decode(data));
    if (type === 3) info.secret = new TextDecoder().decode(data);
    offset += 2 + length;
  }
  if (!/^[0-9a-f]{64}$/.test(info.pubkey)) throw new Error("Invalid nbunksec: missing pubkey");
  if (!/^[0-9a-f]{64}$/.test(info.localKey)) {
    throw new Error("Invalid nbunksec: missing local_key");
  }
  if (info.relays.length === 0) throw new Error("Invalid nbunksec: missing relays");
  return info;
}

/** create nbunksec signer helper for Nostr signing. */
export async function createNbunksecSigner(secret: string): Promise<NappletSigner> {
  const info = decodeNbunksec(secret);
  const signer = BunkerSigner.fromBunker(
    hexToBytes(info.localKey),
    {
      pubkey: info.pubkey,
      relays: info.relays,
      secret: info.secret ?? null,
    },
  );
  await signer.connect();
  const pubkey = await signer.getPublicKey();
  return {
    pubkey,
    async sign(template: NostrEventTemplate): Promise<SignedNostrEvent> {
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
      await signer.close();
    },
  };
}

/** encode nbunksec helper for Nostr signing. */
export function encodeNbunksec(info: NbunksecInfo): string {
  const parts: Uint8Array[] = [
    tlv(0, hexToBytes(info.pubkey)),
    tlv(1, hexToBytes(info.localKey)),
    ...info.relays.map((relay) => tlv(2, new TextEncoder().encode(relay))),
  ];
  if (info.secret) parts.push(tlv(3, new TextEncoder().encode(info.secret)));
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return encodeBech32("nbunksec", bytes);
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

function tlv(type: number, value: Uint8Array): Uint8Array {
  if (value.length > 255) throw new Error("nbunksec TLV values must be <=255 bytes");
  const out = new Uint8Array(value.length + 2);
  out[0] = type;
  out[1] = value.length;
  out.set(value, 2);
  return out;
}

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function decodeBech32(expectedPrefix: string, input: string): Uint8Array {
  const lower = input.toLowerCase();
  if (input !== lower && input !== input.toUpperCase()) throw new Error("Invalid bech32 casing");
  const separator = lower.lastIndexOf("1");
  if (separator < 1) throw new Error("Invalid bech32 separator");
  const prefix = lower.slice(0, separator);
  if (prefix !== expectedPrefix) throw new Error(`Invalid bech32 prefix: ${prefix}`);
  const data = Array.from(lower.slice(separator + 1), (char) => {
    const value = BECH32_CHARSET.indexOf(char);
    if (value < 0) throw new Error(`Invalid bech32 character: ${char}`);
    return value;
  });
  if (!verifyBech32Checksum(prefix, data)) throw new Error("Invalid bech32 checksum");
  return fromBech32Words(data.slice(0, -6));
}

function encodeBech32(prefix: string, bytes: Uint8Array): string {
  const words = toBech32Words(bytes);
  const checksum = createBech32Checksum(prefix, words);
  return `${prefix}1${words.concat(checksum).map((word) => BECH32_CHARSET[word]).join("")}`;
}

function fromBech32Words(words: readonly number[]): Uint8Array {
  let value = 0;
  let bits = 0;
  const output: number[] = [];
  for (const word of words) {
    if (word < 0 || word > 31) throw new Error("Invalid bech32 word");
    value = (value << 5) | word;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xff);
    }
  }
  if (bits >= 5 || ((value << (8 - bits)) & 0xff) !== 0) {
    throw new Error("Invalid bech32 padding");
  }
  return new Uint8Array(output);
}

function toBech32Words(bytes: Uint8Array): number[] {
  let value = 0;
  let bits = 0;
  const output: number[] = [];
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output.push((value >> bits) & 31);
    }
  }
  if (bits > 0) output.push((value << (5 - bits)) & 31);
  return output;
}

function verifyBech32Checksum(prefix: string, data: readonly number[]): boolean {
  return bech32Polymod(bech32HrpExpand(prefix).concat(data)) === 1;
}

function createBech32Checksum(prefix: string, words: readonly number[]): number[] {
  const values = bech32HrpExpand(prefix).concat(words, [0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  return [0, 1, 2, 3, 4, 5].map((index) => (mod >> (5 * (5 - index))) & 31);
}

function bech32HrpExpand(prefix: string): number[] {
  const chars = Array.from(prefix);
  return chars.map((char) => char.charCodeAt(0) >> 5).concat(
    [0],
    chars.map((char) => char.charCodeAt(0) & 31),
  );
}

function bech32Polymod(values: readonly number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < generators.length; i += 1) {
      if ((top >> i) & 1) checksum ^= generators[i];
    }
  }
  return checksum;
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
