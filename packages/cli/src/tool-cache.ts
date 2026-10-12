/** Private CLI tooling locations; never installs into the user's project or PATH. */
import { join, resolve } from "node:path";

/**
 * Read the user's home without a system call or extra Deno permissions.
 * @returns Home directory from the platform's environment.
 * @example userHomeDir()
 */
export function userHomeDir(): string {
  const home = Deno.env.get(Deno.build.os === "windows" ? "USERPROFILE" : "HOME");
  if (!home) throw new Error("Set HOME (USERPROFILE on Windows) or provide NAPPLET_CACHE_DIR and NAPPLET_KEYSTORE_DIR");
  return home;
}

/**
 * Locate the private tooling cache.
 * @returns Absolute cache directory, overridable for offline copies and tests.
 * @example toolCacheDir()
 */
export function toolCacheDir(): string {
  const override = Deno.env.get("NAPPLET_CACHE_DIR");
  if (override) return resolve(override);
  const base = Deno.build.os === "windows"
    ? Deno.env.get("LOCALAPPDATA") ?? join(userHomeDir(), "AppData", "Local")
    : Deno.build.os === "darwin"
    ? join(userHomeDir(), "Library", "Caches")
    : Deno.env.get("XDG_CACHE_HOME") ?? join(userHomeDir(), ".cache");
  return join(base, "napplet");
}

/**
 * Check for a completed cache entry, preserving unexpected filesystem errors.
 * @param path File to check.
 * @returns Whether the file exists.
 * @example await cacheFileExists('/cache/ready')
 */
export async function cacheFileExists(path: string): Promise<boolean> {
  try { return (await Deno.stat(path)).isFile; }
  catch (error) { if (error instanceof Deno.errors.NotFound) return false; throw error; }
}
