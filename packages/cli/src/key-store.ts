import { type CommandRunner, runCommand } from "./process.ts";

export const KEY_SERVICE_NAME = "napplet";

export interface StoredSecret {
  service: string;
  account: string;
  secret: string;
}

export interface KeyStoreProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  store(secret: StoredSecret): Promise<void>;
  retrieve(service: string, account: string): Promise<string | null>;
  delete(service: string, account: string): Promise<boolean>;
  list(service: string): Promise<string[]>;
}

export interface KeyStoreOptions {
  os?: typeof Deno.build.os;
  env?: Record<string, string | undefined>;
  run?: CommandRunner;
}

export async function getKeyStoreProvider(
  options: KeyStoreOptions = {},
): Promise<KeyStoreProvider | null> {
  const os = options.os ?? Deno.build.os;
  const env = options.env ?? Deno.env.toObject();
  const run = options.run ?? runCommand;

  if (env.NAPPLET_DISABLE_KEYCHAIN === "true" || env.NAPPLET_TEST_MODE === "true") {
    return null;
  }

  const provider = createProvider(os, env, run);
  if (!provider) return null;
  return await provider.isAvailable() ? provider : null;
}

export async function requireKeyStoreProvider(
  options: KeyStoreOptions = {},
): Promise<KeyStoreProvider> {
  const provider = await getKeyStoreProvider(options);
  if (!provider) {
    throw new Error(
      "No native keychain provider is available. Install macOS security, Windows Credential Manager/cmdkey, or Linux libsecret secret-tool with a D-Bus session.",
    );
  }
  return provider;
}

function createProvider(
  os: typeof Deno.build.os,
  env: Record<string, string | undefined>,
  run: CommandRunner,
): KeyStoreProvider | null {
  switch (os) {
    case "darwin":
      return new MacOSKeychain(run);
    case "windows":
      return new WindowsCredentialManager(run);
    case "linux":
      return new LinuxSecretService(run, env);
    default:
      return null;
  }
}

export class MacOSKeychain implements KeyStoreProvider {
  readonly name = "macOS Keychain";

  constructor(private readonly run: CommandRunner = runCommand) {}

  async isAvailable(): Promise<boolean> {
    const result = await this.run("which", ["security"]);
    return result.code === 0;
  }

  async store(secret: StoredSecret): Promise<void> {
    await this.delete(secret.service, secret.account);
    const result = await this.run("security", [
      "add-generic-password",
      "-a",
      secret.account,
      "-s",
      secret.service,
      "-w",
      secret.secret,
      "-U",
    ]);
    if (result.code !== 0) {
      throw new Error(`macOS Keychain store failed: ${result.stderr.trim() || result.code}`);
    }
  }

  async retrieve(service: string, account: string): Promise<string | null> {
    const result = await this.run("security", [
      "find-generic-password",
      "-a",
      account,
      "-s",
      service,
      "-w",
    ]);
    if (result.code !== 0) return null;
    return result.stdout.trim() || null;
  }

  async delete(service: string, account: string): Promise<boolean> {
    const result = await this.run("security", [
      "delete-generic-password",
      "-a",
      account,
      "-s",
      service,
    ]);
    return result.code === 0;
  }

  list(): Promise<string[]> {
    return Promise.resolve([]);
  }
}

export class WindowsCredentialManager implements KeyStoreProvider {
  readonly name = "Windows Credential Manager";

  constructor(private readonly run: CommandRunner = runCommand) {}

  async isAvailable(): Promise<boolean> {
    const result = await this.run("where", ["cmdkey"]);
    return result.code === 0;
  }

  async store(secret: StoredSecret): Promise<void> {
    const target = this.target(secret.service, secret.account);
    await this.delete(secret.service, secret.account);
    const result = await this.run("cmdkey", [
      `/add:${target}`,
      `/user:${secret.account}`,
      `/pass:${secret.secret}`,
    ]);
    if (result.code !== 0) {
      throw new Error(
        `Windows Credential Manager store failed: ${result.stderr.trim() || result.code}`,
      );
    }
  }

  async retrieve(service: string, account: string): Promise<string | null> {
    const target = this.target(service, account);
    const script = `
$target = ${JSON.stringify(target)}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class NappletCredentialManager {
  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr credentialPtr);
  [DllImport("advapi32.dll", SetLastError = true)]
  public static extern void CredFree([In] IntPtr cred);
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags;
    public int Type;
    public IntPtr TargetName;
    public IntPtr Comment;
    public long LastWritten;
    public int CredentialBlobSize;
    public IntPtr CredentialBlob;
    public int Persist;
    public int AttributeCount;
    public IntPtr Attributes;
    public IntPtr TargetAlias;
    public IntPtr UserName;
  }
  public static string GetPassword(string target) {
    IntPtr credPtr;
    if (!CredRead(target, 1, 0, out credPtr)) return null;
    try {
      CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
      byte[] passwordBytes = new byte[cred.CredentialBlobSize];
      Marshal.Copy(cred.CredentialBlob, passwordBytes, 0, cred.CredentialBlobSize);
      return Encoding.Unicode.GetString(passwordBytes);
    } finally {
      CredFree(credPtr);
    }
  }
}
"@
[NappletCredentialManager]::GetPassword($target)
`;
    const result = await this.run("powershell", ["-NoProfile", "-Command", script]);
    if (result.code !== 0) return null;
    return result.stdout.trim() || null;
  }

  async delete(service: string, account: string): Promise<boolean> {
    const result = await this.run("cmdkey", [`/delete:${this.target(service, account)}`]);
    return result.code === 0;
  }

  async list(service: string): Promise<string[]> {
    const result = await this.run("cmdkey", ["/list"]);
    if (result.code !== 0) return [];
    const accounts: string[] = [];
    for (const line of result.stdout.split("\n")) {
      const trimmed = line.trim();
      const prefix = `Target: ${service}:`;
      if (trimmed.startsWith(prefix)) accounts.push(trimmed.slice(prefix.length).trim());
    }
    return accounts;
  }

  private target(service: string, account: string): string {
    return `${service}:${account}`;
  }
}

export class LinuxSecretService implements KeyStoreProvider {
  readonly name = "Linux Secret Service";

  constructor(
    private readonly run: CommandRunner = runCommand,
    private readonly env: Record<string, string | undefined> = Deno.env.toObject(),
  ) {}

  async isAvailable(): Promise<boolean> {
    if (!this.env.DBUS_SESSION_BUS_ADDRESS) return false;
    const which = await this.run("which", ["secret-tool"]);
    if (which.code !== 0) return false;
    const probe = await this.run("secret-tool", ["search", "service", "napplet-probe"]);
    return probe.code === 0 || probe.code === 1;
  }

  async store(secret: StoredSecret): Promise<void> {
    const result = await this.run("secret-tool", [
      "store",
      "--label",
      `${secret.service} - ${secret.account}`,
      "service",
      secret.service,
      "account",
      secret.account,
    ], { input: secret.secret });
    if (result.code !== 0) {
      throw new Error(`Linux Secret Service store failed: ${result.stderr.trim() || result.code}`);
    }
  }

  async retrieve(service: string, account: string): Promise<string | null> {
    const result = await this.run("secret-tool", [
      "lookup",
      "service",
      service,
      "account",
      account,
    ]);
    if (result.code !== 0) return null;
    return result.stdout.trim() || null;
  }

  async delete(service: string, account: string): Promise<boolean> {
    const result = await this.run("secret-tool", [
      "clear",
      "service",
      service,
      "account",
      account,
    ]);
    return result.code === 0;
  }

  async list(service: string): Promise<string[]> {
    const result = await this.run("secret-tool", ["search", "service", service]);
    if (result.code !== 0) return [];
    const accounts = new Set<string>();
    for (const line of result.stdout.split("\n")) {
      const match = line.match(/attribute\.account = (.+)/);
      if (match) accounts.add(match[1].trim());
    }
    return [...accounts];
  }
}
