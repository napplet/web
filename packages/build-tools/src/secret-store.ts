/**
 * Platform secret-store selection for reusable NIP-46 build sessions.
 *
 * The provider boundary is deliberately injected: this module selects and
 * invokes native credential tools without importing Node or Deno globals.
 */

import { RedactedSecret } from "./contracts.ts";
import type { FileSystemAdapter, ProcessAdapter, SecretStore } from "./contracts.ts";

const DEFAULT_SERVICE = "napplet";

/** Options for selecting a protected platform store or explicit file fallback. */
export interface PlatformSecretStoreOptions {
  /** Target operating system supplied by the runtime adapter. */
  os: "darwin" | "linux" | "windows" | string;
  /** Environment values needed to detect Linux Secret Service. */
  env?: Readonly<Record<string, string | undefined>>;
  /** Injected process boundary for OS credential tools. */
  process: ProcessAdapter;
  /** Filesystem boundary used only by an explicitly requested fallback. */
  fileSystem?: FileSystemAdapter;
  /** Deliberate plaintext fallback path; omit it to require a protected store. */
  fallbackFile?: string;
  /** Credential service namespace, compatible with the CLI's `napplet` service. */
  service?: string;
}

interface PlatformProvider {
  available(): Promise<boolean>;
  get(key: string): Promise<RedactedSecret | undefined>;
  set(key: string, value: RedactedSecret): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Select a platform credential provider, or an explicit caller-owned file
 * fallback when no protected provider is available.
 *
 * Provider failures deliberately do not fall through to plaintext storage.
 *
 * @param options - Injected platform adapters and selection details.
 * @returns A secret store whose normal output paths keep values opaque.
 * @example
 * ```ts
 * const store = await createPlatformSecretStore({ os: "darwin", process });
 * ```
 */
export async function createPlatformSecretStore(options: PlatformSecretStoreOptions): Promise<SecretStore> {
  const provider = createProvider(options);
  if (provider && await provider.available()) return provider;
  if (options.fileSystem && options.fallbackFile) {
    return new FileSecretStore(options.fileSystem, options.fallbackFile);
  }
  throw new Error("No protected secret store is available");
}

function createProvider(options: PlatformSecretStoreOptions): PlatformProvider | undefined {
  const service = options.service ?? DEFAULT_SERVICE;
  switch (options.os) {
    case "darwin":
      return new MacOSKeychainStore(options.process, service);
    case "linux":
      return new LinuxSecretServiceStore(options.process, options.env ?? {}, service);
    case "windows":
      return new WindowsCredentialStore(options.process, service);
    default:
      return undefined;
  }
}

class MacOSKeychainStore implements PlatformProvider, SecretStore {
  constructor(private readonly process: ProcessAdapter, private readonly service: string) {}

  async available(): Promise<boolean> {
    return false;
  }

  async get(key: string): Promise<RedactedSecret | undefined> {
    const result = await this.process.run("security", [
      "find-generic-password", "-a", key, "-s", this.service, "-w",
    ]);
    return result.code === 0 && result.stdout.trim() ? new RedactedSecret(result.stdout.trim()) : undefined;
  }

  async set(key: string, value: RedactedSecret): Promise<void> {
    void key; void value;
    throw new Error("macOS Keychain writes require an in-memory provider");
  }

  async delete(key: string): Promise<void> {
    await this.process.run("security", ["delete-generic-password", "-a", key, "-s", this.service]);
  }
}

class LinuxSecretServiceStore implements PlatformProvider, SecretStore {
  constructor(
    private readonly process: ProcessAdapter,
    private readonly env: Readonly<Record<string, string | undefined>>,
    private readonly service: string,
  ) {}

  async available(): Promise<boolean> {
    if (!this.env.DBUS_SESSION_BUS_ADDRESS) return false;
    return (await this.process.run("which", ["secret-tool"])).code === 0;
  }

  async get(key: string): Promise<RedactedSecret | undefined> {
    const result = await this.process.run("secret-tool", ["lookup", "service", this.service, "account", key]);
    return result.code === 0 && result.stdout.trim() ? new RedactedSecret(result.stdout.trim()) : undefined;
  }

  async set(key: string, value: RedactedSecret): Promise<void> {
    const result = await this.process.run(
      "secret-tool",
      ["store", "--label", `${this.service} - ${key}`, "service", this.service, "account", key],
      value,
    );
    if (result.code !== 0) throw new Error("Linux Secret Service store failed");
  }

  async delete(key: string): Promise<void> {
    await this.process.run("secret-tool", ["clear", "service", this.service, "account", key]);
  }
}

class WindowsCredentialStore implements PlatformProvider, SecretStore {
  constructor(private readonly process: ProcessAdapter, private readonly service: string) {}

  async available(): Promise<boolean> {
    // cmdkey accepts credentials only on its command line, exposing reusable
    // NIP-46 material to local process inspection. Keep Windows unavailable
    // until a native Credential Manager boundary can pass the blob in memory.
    return false;
  }

  async get(key: string): Promise<RedactedSecret | undefined> {
    const result = await this.process.run("cmdkey", ["/list", this.target(key)]);
    return result.code === 0 && result.stdout.trim() ? new RedactedSecret(result.stdout.trim()) : undefined;
  }

  async set(key: string, value: RedactedSecret): Promise<void> {
    void key;
    void value;
    throw new Error("Windows Credential Manager writes require an in-memory provider");
  }

  async delete(key: string): Promise<void> {
    await this.process.run("cmdkey", [`/delete:${this.target(key)}`]);
  }

  private target(key: string): string {
    return `${this.service}:${key}`;
  }
}

class FileSecretStore implements SecretStore {
  constructor(private readonly fileSystem: FileSystemAdapter, private readonly path: string) {}

  async get(key: string): Promise<RedactedSecret | undefined> {
    const entries = await this.read();
    const value = entries[key];
    return typeof value === "string" && value ? new RedactedSecret(value) : undefined;
  }

  async set(key: string, value: RedactedSecret): Promise<void> {
    const entries = await this.read();
    value.withValue((raw) => {
      entries[key] = raw;
    });
    await this.fileSystem.writeText(this.path, JSON.stringify(entries));
  }

  async delete(key: string): Promise<void> {
    const entries = await this.read();
    delete entries[key];
    await this.fileSystem.writeText(this.path, JSON.stringify(entries));
  }

  private async read(): Promise<Record<string, string>> {
    if (!await this.fileSystem.exists(this.path)) return {};
    try {
      const parsed: unknown = JSON.parse(await this.fileSystem.readText(this.path));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    } catch {
      return {};
    }
  }
}
