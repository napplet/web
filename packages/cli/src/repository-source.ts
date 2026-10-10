/** Repository source metadata for deployment; never contacts the remote. */

/**
 * Convert common Git clone URLs to credential-free HTTP(S) repository URLs.
 * @param remote Git origin URL (HTTP(S), SSH URL, or scp-style SSH).
 * @returns Repository URL, or undefined for local and unsupported remotes.
 * @example repositorySourceUrl('git@github.com:napplet/web.git')
 */
export function repositorySourceUrl(remote: string): string | undefined {
  let value = remote.trim();
  if (/^[a-z]:[\\/]/i.test(value)) return undefined;
  if (!value.includes("://")) {
    const scp = /^(?:[^@/:]+@)?([^/:]+):(.+)$/.exec(value);
    if (!scp || scp[2].startsWith("~")) return undefined;
    value = `ssh://${scp[1]}/${scp[2]}`;
  }
  try {
    const url = new URL(value);
    if (!["http:", "https:", "ssh:"].includes(url.protocol)) return undefined;
    const path = url.pathname.replace(/\/+$/, "").replace(/\.git$/, "");
    if (!path || path === "/") return undefined;
    const origin = url.protocol === "ssh:" ? `https://${url.hostname}` : `${url.protocol}//${url.host}`;
    return `${origin}${path}`;
  } catch { return undefined; }
}

/**
 * Read the origin of the repository containing a selected build directory.
 * @param directory Build directory; Git walks parents and handles worktrees.
 * @returns Optional source URL; absent Git, repositories, and origins are non-fatal.
 * @example await inferRepositorySource('/project/dist')
 */
export async function inferRepositorySource(directory: string): Promise<string | undefined> {
  try {
    const result = await new Deno.Command("git", {
      args: ["-C", directory, "config", "--local", "--get", "remote.origin.url"],
      stdin: "null", stdout: "piped", stderr: "null",
      signal: AbortSignal.timeout(2000),
    }).output();
    return result.success ? repositorySourceUrl(new TextDecoder().decode(result.stdout)) : undefined;
  } catch { return undefined; }
}

/**
 * Validate an explicit source override without converting clone URLs.
 * @param value Configured HTTP(S) source URL, false to omit, or undefined.
 * @returns Trimmed source setting.
 * @example normalizeSourceOverride('https://github.com/napplet/web')
 */
export function normalizeSourceOverride(value: unknown): string | false | undefined {
  if (value === undefined || value === false) return value;
  if (typeof value === "string") {
    try {
      const url = new URL(value.trim());
      if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return value.trim();
    } catch { /* Report the config field, without echoing a potentially secret value. */ }
  }
  throw new Error("metadata.source must be an absolute HTTP(S) URL without credentials, or false");
}
