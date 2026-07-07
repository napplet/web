export function joinPath(...parts: string[]): string {
  const joined = parts.filter((part) => part.length > 0).join("/");
  return normalizePath(joined);
}

export function normalizePath(path: string): string {
  const absolute = path.startsWith("/");
  const segments: string[] = [];
  for (const raw of path.replaceAll("\\", "/").split("/")) {
    if (raw === "" || raw === ".") continue;
    if (raw === "..") {
      if (segments.length > 0 && segments[segments.length - 1] !== "..") {
        segments.pop();
      } else if (!absolute) {
        segments.push(raw);
      }
      continue;
    }
    segments.push(raw);
  }
  const result = segments.join("/");
  if (absolute) return `/${result}`;
  return result || ".";
}

export function dirname(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") return "/";
  const parts = normalized.split("/");
  parts.pop();
  const result = parts.join("/");
  if (result === "") return normalized.startsWith("/") ? "/" : ".";
  return result;
}

export function basename(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") return "/";
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? normalized;
}

export function isAbsolute(path: string): boolean {
  return path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(path);
}

export function resolvePath(base: string, path: string): string {
  if (isAbsolute(path)) return normalizePath(path);
  return normalizePath(joinPath(base, path));
}

export function relativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split("/").filter(Boolean);
  const toParts = normalizePath(to).split("/").filter(Boolean);
  while (fromParts.length > 0 && toParts.length > 0 && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  return [...fromParts.map(() => ".."), ...toParts].join("/") || ".";
}
