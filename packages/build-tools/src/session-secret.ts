/** Opaque nbunksec payload fields shared by build-time NIP-46 adapters. */
export interface BuildSignerSecret {
  remotePubkey: string;
  clientSecretKey: string;
  relays: string[];
  secret?: string;
}

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

/**
 * Encode a reusable NIP-46 client session as the established nbunksec TLV.
 *
 * @param value - Remote signer pointer, local client key, relays, and optional secret.
 * @returns A checksummed nbunksec value suitable for protected persistence.
 * @example
 * ```ts
 * const encoded = encodeBuildSignerSecret({
 *   remotePubkey: "00".repeat(32),
 *   clientSecretKey: "11".repeat(32),
 *   relays: ["wss://relay.example"],
 * });
 * ```
 */
export function encodeBuildSignerSecret(value: BuildSignerSecret): string {
  const parts = [
    tlv(0, fromHex(value.remotePubkey)),
    tlv(1, fromHex(value.clientSecretKey)),
    ...value.relays.map((relay) => tlv(2, new TextEncoder().encode(relay))),
  ];
  if (value.secret) parts.push(tlv(3, new TextEncoder().encode(value.secret)));
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return encodeBech32("nbunksec", bytes);
}

/**
 * Decode and validate an established nbunksec NIP-46 client session.
 *
 * @param input - Checksummed nbunksec value retrieved from protected storage.
 * @returns Validated remote signer and local client session fields.
 * @example
 * ```ts
 * const session = decodeBuildSignerSecret(encoded);
 * ```
 */
export function decodeBuildSignerSecret(input: string): BuildSignerSecret {
  const bytes = decodeBech32("nbunksec", input.trim());
  const value: BuildSignerSecret = { remotePubkey: "", clientSecretKey: "", relays: [] };
  let offset = 0;
  while (offset < bytes.length) {
    const type = bytes[offset];
    const length = bytes[offset + 1];
    if (length === undefined || offset + 2 + length > bytes.length) throw new Error("Invalid nbunksec session");
    const data = bytes.slice(offset + 2, offset + 2 + length);
    if (type === 0) value.remotePubkey = toHex(data);
    if (type === 1) value.clientSecretKey = toHex(data);
    if (type === 2) value.relays.push(new TextDecoder().decode(data));
    if (type === 3) value.secret = new TextDecoder().decode(data);
    offset += 2 + length;
  }
  if (!/^[0-9a-f]{64}$/.test(value.remotePubkey) ||
    !/^[0-9a-f]{64}$/.test(value.clientSecretKey) || value.relays.length === 0) {
    throw new Error("Invalid nbunksec session");
  }
  return value;
}

function tlv(type: number, value: Uint8Array): Uint8Array {
  if (value.length > 255) throw new Error("nbunksec value is too long");
  const output = new Uint8Array(value.length + 2);
  output[0] = type;
  output[1] = value.length;
  output.set(value, 2);
  return output;
}

function fromHex(value: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error("Invalid nbunksec public key");
  return Uint8Array.from(value.match(/.{2}/g)!, (pair) => Number.parseInt(pair, 16));
}

function toHex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeBech32(expectedPrefix: string, input: string): Uint8Array {
  const lower = input.toLowerCase();
  if (input !== lower && input !== input.toUpperCase()) throw new Error("Invalid bech32 casing");
  const separator = lower.lastIndexOf("1");
  if (separator < 1 || lower.slice(0, separator) !== expectedPrefix) throw new Error("Invalid bech32 prefix");
  const data = Array.from(lower.slice(separator + 1), (character) => {
    const word = BECH32_CHARSET.indexOf(character);
    if (word < 0) throw new Error("Invalid bech32 character");
    return word;
  });
  if (bech32Polymod(hrpExpand(expectedPrefix).concat(data)) !== 1) throw new Error("Invalid bech32 checksum");
  return convertFromWords(data.slice(0, -6));
}

function encodeBech32(prefix: string, bytes: Uint8Array): string {
  const words = convertToWords(bytes);
  const values = hrpExpand(prefix).concat(words, [0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  const checksum = [0, 1, 2, 3, 4, 5].map((index) => (mod >>> (5 * (5 - index))) & 31);
  return `${prefix}1${words.concat(checksum).map((word) => BECH32_CHARSET[word]).join("")}`;
}

function convertFromWords(words: readonly number[]): Uint8Array {
  let value = 0;
  let bits = 0;
  const output: number[] = [];
  for (const word of words) {
    value = (value << 5) | word;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xff);
    }
  }
  if (bits >= 5 || ((value << (8 - bits)) & 0xff) !== 0) throw new Error("Invalid bech32 padding");
  return new Uint8Array(output);
}

function convertToWords(bytes: Uint8Array): number[] {
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

function hrpExpand(prefix: string): number[] {
  const characters = Array.from(prefix);
  return characters.map((character) => character.charCodeAt(0) >> 5)
    .concat([0], characters.map((character) => character.charCodeAt(0) & 31));
}

function bech32Polymod(values: readonly number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let index = 0; index < generators.length; index += 1) {
      if ((top >> index) & 1) checksum ^= generators[index]!;
    }
  }
  return checksum;
}
