/** Publishing hints only; signed manifests remain the runtime authority (NIP-5D). */
import { type DefaultTreeAdapterMap, parse } from "parse5";

type Element = DefaultTreeAdapterMap["element"];
const mapping: Record<string, string> = {
  description: "description",
  "napplet-id": "d",
  "napplet-archetype": "z",
  "napplet-intent": "i",
  "napplet-requires": "R",
  "napplet-optional": "O",
  "napplet-source": "source",
  "napplet-server": "server",
  "napplet-parent": "a",
  "napplet-root": "A",
};
const words = (value: string): string[] => value.split(/[\t\n\f\r ]+/).filter(Boolean);
const attr = (node: Element, name: string): string | undefined =>
  node.attrs.find((a) => a.name === name)?.value;

export interface EmbeddedIcon {
  data: Uint8Array;
  sha256: string;
  mimeType: string;
}

/** Read head declarations and decode a supported icon without fetching any URLs. */
export async function readHtmlPublishingMetadata(
  html: string,
): Promise<{ tags: string[][]; icon?: EmbeddedIcon }> {
  const document = parse(html);
  const root = document.childNodes.find((n): n is Element =>
    "tagName" in n && n.tagName === "html"
  )!;
  const head = root.childNodes.find((n): n is Element => "tagName" in n && n.tagName === "head")!;
  const tags: string[][] = [];
  let icon: EmbeddedIcon | undefined;
  for (const node of head.childNodes) {
    if (!("tagName" in node)) continue;
    if (node.tagName === "link" && words(attr(node, "rel")?.toLowerCase() ?? "").includes("icon")) {
      icon ??= await decodeIcon(attr(node, "href") ?? "", attr(node, "type"));
      continue;
    }
    const name = node.tagName === "title"
      ? "title"
      : node.tagName === "meta"
      ? mapping[attr(node, "name")?.toLowerCase() ?? ""]
      : undefined;
    if (!name) continue;
    const value = name === "title"
      ? node.childNodes.map((n) => "value" in n ? n.value : "").join("")
      : attr(node, "content") ?? "";
    if (!value.trim()) continue;
    if (name === "R" || name === "O") tags.push(...words(value).map((domain) => [name, domain]));
    else tags.push(name === "i" ? [name, ...words(value)] : [name, value]);
  }
  if (icon) tags.push(["icon", icon.sha256, icon.mimeType]);
  const singletons = new Set(["title", "description", "d", "source", "a", "A"]);
  return {
    tags: tags.filter((tag, i) =>
      !singletons.has(tag[0]) || tags.findIndex((t) => t[0] === tag[0]) === i
    ),
    icon,
  };
}

async function decodeIcon(url: string, declaredType?: string): Promise<EmbeddedIcon | undefined> {
  const match = /^data:(image\/(?:png|jpeg|webp))(;base64)?,(.*)$/is.exec(url);
  if (!match) return undefined;
  const mimeType = match[1].toLowerCase();
  if (declaredType && declaredType.toLowerCase() !== mimeType) return undefined;
  try {
    const data = match[2]
      ? Uint8Array.from(atob(decodeURIComponent(match[3])), (c) => c.charCodeAt(0))
      : decodeDataBytes(match[3]);
    if (!data.length) return undefined;
    const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
    const sha256 = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return { data, sha256, mimeType };
  } catch {
    return undefined;
  }
}

function decodeDataBytes(value: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "%") {
      if (!/^[0-9a-f]{2}$/i.test(value.slice(i + 1, i + 3))) throw new Error("Invalid data URL");
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16));
      i += 2;
    } else bytes.push(...new TextEncoder().encode(value[i]));
  }
  return new Uint8Array(bytes);
}

/** Missing HTML carries no declarations. */
export async function readHtmlPublishingFile(
  path?: string,
): Promise<{ tags: string[][]; icon?: EmbeddedIcon }> {
  if (!path) return { tags: [] };
  try {
    return await readHtmlPublishingMetadata(await Deno.readTextFile(path));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return { tags: [] };
    throw error;
  }
}
