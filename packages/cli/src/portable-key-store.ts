/** Password-encrypted key storage for hosts without native keychain utilities. */
import { join } from "node:path";
import { userHomeDir } from "./tool-cache.ts";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";
import { isTerminalInput, promptSecret } from "./prompt.ts";
import type { KeyStoreProvider, StoredSecret } from "./key-store.ts";

interface KeyRecord {
  version: 1;
  service: string;
  account: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

/** Password-encrypted files; the password is never stored alongside the keys. */
export class PortableKeyStore implements KeyStoreProvider {
  readonly name = "encrypted local key store";
  private password?: Promise<string>;

  constructor(
    private readonly directory = Deno.env.get("NAPPLET_KEYSTORE_DIR") ?? join(userHomeDir(), ".napplet", "keys"),
    private readonly readPassword = async () => {
      const supplied = Deno.env.get("NAPPLET_KEYSTORE_PASSWORD");
      if (supplied) return supplied;
      if (!isTerminalInput()) throw new Error("Set NAPPLET_KEYSTORE_PASSWORD to unlock the encrypted local key store in non-interactive sessions");
      return await promptSecret({ message: "Local key store password (input hidden): " });
    },
  ) {}

  isAvailable(): Promise<boolean> { return Promise.resolve(true); }

  async store(secret: StoredSecret): Promise<void> {
    // Reject a wrong password before replacing an existing encrypted secret.
    const existing = await this.record(secret.service, secret.account);
    if (existing) await this.decrypt(existing);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.key(salt);
    const additionalData = new TextEncoder().encode(JSON.stringify([secret.service, secret.account]));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, key, new TextEncoder().encode(secret.secret));
    const record: KeyRecord = { version: 1, service: secret.service, account: secret.account, salt: encodeBase64(salt), iv: encodeBase64(iv), ciphertext: encodeBase64(ciphertext) };
    await Deno.mkdir(this.directory, { recursive: true, mode: 0o700 });
    const staging = await Deno.makeTempFile({ dir: this.directory, prefix: ".key-" });
    try {
      if (Deno.build.os !== "windows") await Deno.chmod(staging, 0o600);
      await Deno.writeTextFile(staging, JSON.stringify(record));
      await Deno.rename(staging, await this.path(secret.service, secret.account));
    } finally {
      await Deno.remove(staging).catch((error) => { if (!(error instanceof Deno.errors.NotFound)) throw error; });
    }
  }

  async retrieve(service: string, account: string): Promise<string | null> {
    const record = await this.record(service, account);
    return record ? await this.decrypt(record) : null;
  }

  async delete(service: string, account: string): Promise<boolean> {
    try { await Deno.remove(await this.path(service, account)); return true; }
    catch (error) { if (error instanceof Deno.errors.NotFound) return false; throw error; }
  }

  async list(service: string): Promise<string[]> {
    const accounts: string[] = [];
    try {
      for await (const file of Deno.readDir(this.directory)) {
        if (!file.isFile || !file.name.endsWith(".json")) continue;
        const record = JSON.parse(await Deno.readTextFile(join(this.directory, file.name))) as KeyRecord;
        if (record.version === 1 && record.service === service) accounts.push(record.account);
      }
    } catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
    return accounts.sort();
  }

  private async path(service: string, account: string): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([service, account]))));
    return join(this.directory, `${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}.json`);
  }

  private async record(service: string, account: string): Promise<KeyRecord | null> {
    let text: string;
    try { text = await Deno.readTextFile(await this.path(service, account)); }
    catch (error) { if (error instanceof Deno.errors.NotFound) return null; throw error; }
    const record = JSON.parse(text) as KeyRecord;
    if (record.version !== 1 || record.service !== service || record.account !== account) throw new Error("Invalid encrypted key record");
    return record;
  }

  private async key(salt: Uint8Array): Promise<CryptoKey> {
    this.password ??= this.readPassword();
    const password = await this.password;
    if (password.length < 12) throw new Error("Local key store password must contain at least 12 characters");
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations: 600000 }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  private async decrypt(record: KeyRecord): Promise<string> {
    const key = await this.key(decodeBase64(record.salt));
    try {
      const additionalData = new TextEncoder().encode(JSON.stringify([record.service, record.account]));
      const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(decodeBase64(record.iv)), additionalData }, key, new Uint8Array(decodeBase64(record.ciphertext)));
      return new TextDecoder().decode(bytes);
    } catch { throw new Error("Cannot unlock local key: incorrect password or damaged encrypted record"); }
  }
}
