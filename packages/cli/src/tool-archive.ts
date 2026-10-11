/** In-process extraction for verified tooling archives. No tar/unzip executables. */
import { gunzipSync, unzipSync } from "fflate";
import { dirname, join } from "node:path";

const decoder = new TextDecoder();

/**
 * Validate an archive member before writing it below a staging directory.
 * @param name Archive-relative path, including its distribution root.
 * @returns Safe path components.
 * @example archivePath('node-v22/bin/node')
 */
export function archivePath(name: string): string[] {
  if (name.includes("\\") || name.includes("\0") || name.startsWith("/") || /^[a-z]:/i.test(name)) {
    throw new Error("Unsafe tooling archive path");
  }
  const parts = name.split("/").filter((part) => part && part !== ".");
  if (parts.includes("..")) throw new Error("Unsafe tooling archive path");
  return parts;
}

async function writeMember(root: string, name: string, bytes: Uint8Array, mode: number): Promise<void> {
  const parts = archivePath(name);
  if (!parts.length) return;
  const path = join(root, ...parts);
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeFile(path, bytes, { createNew: true, mode: mode & 0o777 });
}

/**
 * Extract regular files from a tooling tar.gz or zip; links are never materialized.
 * @param bytes Complete verified archive.
 * @param format Distribution format.
 * @param root Fresh staging directory.
 * @returns Resolves after extraction.
 * @example await extractToolArchive(bytes, 'tar.gz', staging)
 */
export async function extractToolArchive(bytes: Uint8Array, format: "tar.gz" | "tar" | "zip", root: string): Promise<void> {
  if (format === "zip") {
    for (const [name, data] of Object.entries(unzipSync(bytes))) {
      archivePath(name);
      if (!name.endsWith("/")) await writeMember(root, name, data, 0o644);
    }
    return;
  }
  const tar = format === "tar" ? bytes : gunzipSync(bytes);
  const field = (start: number, size: number) => decoder.decode(tar.subarray(start, start + size)).split("\0", 1)[0];
  let extendedPath: string | undefined;
  for (let offset = 0; offset + 512 <= tar.length;) {
    if (tar.subarray(offset, offset + 512).every((byte) => byte === 0)) break;
    const size = parseInt(field(offset + 124, 12).trim(), 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error("Invalid tooling tar archive");
    const prefix = field(offset + 345, 155);
    const name = extendedPath ?? `${prefix ? `${prefix}/` : ""}${field(offset, 100)}`;
    const type = field(offset + 156, 1);
    const data = tar.subarray(offset + 512, offset + 512 + size);
    if (type === "x") {
      // POSIX extended path records contain a decimal byte length followed by key=value.
      for (let index = 0; index < data.length;) {
        const space = data.indexOf(32, index);
        const length = Number(decoder.decode(data.subarray(index, space)));
        if (space < index || !Number.isSafeInteger(length) || length <= 0 || index + length > data.length) throw new Error("Invalid tooling tar metadata");
        const record = decoder.decode(data.subarray(space + 1, index + length - 1));
        if (record.startsWith("path=")) extendedPath = record.slice(5);
        index += length;
      }
    } else if (type === "L") {
      extendedPath = decoder.decode(data).split("\0", 1)[0];
    } else {
      archivePath(name);
      if (type === "0" || type === "") await writeMember(root, name, data, parseInt(field(offset + 100, 8).trim(), 8) || 0o644);
      extendedPath = undefined;
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
}
