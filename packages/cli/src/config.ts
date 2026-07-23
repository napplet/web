import {
  CONFIG_DIR,
  CONFIG_FILE,
  type DeployTargetKind,
  type NappletArchetypeConvention,
  type NappletConfig,
  type NappletDeployMetadata,
} from "./types.ts";
import { dirname, joinPath, resolvePath } from "./path.ts";
import { normalizeDTag } from "./manifest.ts";

/** DEFAULT_CONFIG constant used by configuration helpers. */
export const DEFAULT_CONFIG: NappletConfig = {
  version: 1,
  sourceDir: ".",
  relays: [],
  blossomServers: [],
  defaultTarget: "named",
  named: [],
  discover: {
    enabled: true,
    roots: ["."],
  },
  signing: {
    mode: "interactive",
  },
  conformance: {
    command: "napplet-conformance",
  },
  paja: {
    command: "kehto",
  },
};

/** default config helper for configuration. */
export function defaultConfig(overrides: Partial<NappletConfig> = {}): NappletConfig {
  const metadata = overrides.metadata
    ? {
      ...overrides.metadata,
      archetypes: overrides.metadata.archetypes?.map((convention) => ({ ...convention })),
    }
    : undefined;
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    relays: overrides.relays ?? [...DEFAULT_CONFIG.relays],
    blossomServers: overrides.blossomServers ?? [...DEFAULT_CONFIG.blossomServers],
    named: metadata?.name ? [metadata.name] : overrides.named ?? [...(DEFAULT_CONFIG.named ?? [])],
    metadata,
    discover: {
      ...DEFAULT_CONFIG.discover,
      ...overrides.discover,
      enabled: overrides.discover?.enabled ?? DEFAULT_CONFIG.discover?.enabled ?? true,
      roots: overrides.discover?.roots ?? [...(DEFAULT_CONFIG.discover?.roots ?? ["."])],
    },
    signing: {
      ...DEFAULT_CONFIG.signing,
      ...overrides.signing,
      mode: overrides.signing?.mode ?? DEFAULT_CONFIG.signing?.mode ?? "interactive",
    },
    conformance: {
      ...DEFAULT_CONFIG.conformance,
      ...overrides.conformance,
      command: overrides.conformance?.command ?? DEFAULT_CONFIG.conformance?.command ??
        "napplet-conformance",
    },
    paja: {
      ...DEFAULT_CONFIG.paja,
      ...overrides.paja,
      command: overrides.paja?.command ?? DEFAULT_CONFIG.paja?.command ?? "kehto",
    },
  };
}

/** config path helper for configuration. */
export function configPath(cwd: string = Deno.cwd()): string {
  return joinPath(cwd, CONFIG_DIR, CONFIG_FILE);
}

/** read config helper for configuration. */
export async function readConfig(path: string = configPath()): Promise<NappletConfig | null> {
  try {
    const raw = await Deno.readTextFile(path);
    return normalizeConfig(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return null;
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${path}: ${error.message}`);
    }
    throw error;
  }
}

/** write config helper for configuration. */
export async function writeConfig(
  config: NappletConfig,
  path: string = configPath(),
): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, `${JSON.stringify(normalizeConfig(config), null, 2)}\n`);
}

/** init config helper for configuration. */
export async function initConfig(
  options: {
    cwd?: string;
    force?: boolean;
    sourceDir?: string;
    relays?: string[];
    blossomServers?: string[];
    named?: string[];
    defaultTarget?: DeployTargetKind;
    metadata?: NappletDeployMetadata;
  } = {},
): Promise<{ path: string; config: NappletConfig; created: boolean }> {
  const cwd = options.cwd ?? Deno.cwd();
  const path = configPath(cwd);
  const existing = await readConfig(path);
  if (existing && !options.force) {
    return { path, config: existing, created: false };
  }

  const config = defaultConfig({
    sourceDir: options.sourceDir ?? ".",
    relays: options.relays ?? [],
    blossomServers: options.blossomServers ?? [],
    named: options.named ?? [],
    defaultTarget: options.defaultTarget ?? "named",
    metadata: options.metadata,
  });
  await writeConfig(config, path);
  return { path, config, created: true };
}

/** normalize config helper for configuration. */
export function normalizeConfig(input: unknown): NappletConfig {
  if (!input || typeof input !== "object") {
    throw new Error("Config must be a JSON object");
  }
  const value = input as Partial<NappletConfig>;
  if (value.version !== undefined && value.version !== 1) {
    throw new Error(`Unsupported .napplet config version: ${value.version}`);
  }
  if (value.defaultTarget && !["root", "named", "snapshot"].includes(value.defaultTarget)) {
    throw new Error(`Invalid defaultTarget: ${value.defaultTarget}`);
  }
  const metadata = normalizeMetadata(value.metadata);
  const named = metadata?.name ? [metadata.name] : stringArray(value.named, "named");
  return defaultConfig({
    ...value,
    version: 1,
    sourceDir: typeof value.sourceDir === "string" ? value.sourceDir : ".",
    relays: stringArray(value.relays, "relays"),
    blossomServers: stringArray(value.blossomServers, "blossomServers"),
    bunkerPubkey: typeof value.bunkerPubkey === "string" ? value.bunkerPubkey : undefined,
    named,
    metadata,
    discover: value.discover
      ? {
        enabled: value.discover.enabled ?? true,
        roots: stringArray(value.discover.roots, "discover.roots"),
      }
      : undefined,
    signing: value.signing
      ? {
        mode: value.signing.mode === "ci" ? "ci" : "interactive",
        keyReference: typeof value.signing.keyReference === "string"
          ? value.signing.keyReference
          : undefined,
        pubkey: typeof value.signing.pubkey === "string" ? value.signing.pubkey : undefined,
        relays: value.signing.relays === undefined
          ? undefined
          : stringArray(value.signing.relays, "signing.relays"),
      }
      : undefined,
  });
}

/** Normalize and validate one `slug:convention` automation value. */
export function parseArchetypeConvention(value: string): NappletArchetypeConvention {
  const separator = value.indexOf(":");
  const slug = separator === -1 ? "" : value.slice(0, separator).trim();
  const convention = separator === -1 ? "" : value.slice(separator + 1).trim();
  return normalizeArchetypeConvention({ slug, convention }, "archetype");
}

/** Normalize and deduplicate CLI archetype values. */
export function parseArchetypeConventions(values: readonly string[]): NappletArchetypeConvention[] {
  const conventions = values.map(parseArchetypeConvention);
  const seen = new Set<string>();
  return conventions.filter((convention) => {
    const key = `${convention.slug}\0${convention.convention}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeMetadata(value: unknown): NappletDeployMetadata | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("metadata must be an object");
  }
  const metadata = value as Partial<NappletDeployMetadata>;
  const name = optionalString(metadata.name, "metadata.name");
  const title = optionalString(metadata.title, "metadata.title");
  const description = optionalString(metadata.description, "metadata.description", true);
  if (name) normalizeDTag(name);
  let archetypes: NappletArchetypeConvention[] | undefined;
  if (metadata.archetypes !== undefined) {
    if (!Array.isArray(metadata.archetypes)) {
      throw new Error("metadata.archetypes must be an array");
    }
    archetypes = metadata.archetypes.map((convention, index) =>
      normalizeArchetypeConvention(convention, `metadata.archetypes[${index}]`)
    );
  }
  return {
    name,
    title,
    description,
    archetypes,
  };
}

function normalizeArchetypeConvention(
  value: unknown,
  field: string,
): NappletArchetypeConvention {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must use slug:convention (for example note:napplet:note/open)`);
  }
  const conventionValue = value as Partial<NappletArchetypeConvention>;
  const slug = optionalString(conventionValue.slug, `${field}.slug`);
  const convention = optionalString(conventionValue.convention, `${field}.convention`);
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`${field} slug must contain lowercase letters, numbers, and hyphens`);
  }
  if (convention && /^NAP-[1-9][0-9]*$/.test(convention)) {
    throw new Error(`${field} convention must use napplet:<archetype>/<intent>, not a numbered NAP identifier`);
  }
  if (!convention || !/^napplet:[^/\s]+\/[^\s]+$/.test(convention)) {
    throw new Error(`${field} convention must use napplet:<archetype>/<intent>`);
  }
  return { slug, convention };
}

function optionalString(value: unknown, field: string, allowEmpty = false): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const normalized = value.trim();
  if (!allowEmpty && normalized === "") throw new Error(`${field} cannot be empty`);
  return normalized === "" ? undefined : normalized;
}

/** resolve configured source helper for configuration. */
export function resolveConfiguredSource(
  config: NappletConfig,
  cwd: string = Deno.cwd(),
): string {
  return resolvePath(cwd, config.sourceDir);
}

/** set signing key reference helper for configuration. */
export function setSigningKeyReference(config: NappletConfig, keyReference: string): NappletConfig {
  if (keyReference.trim() === "") throw new Error("keyReference cannot be empty");
  return defaultConfig({
    ...config,
    signing: {
      ...config.signing,
      mode: "interactive",
      keyReference,
    },
  });
}

/** set signing remote helper for interactive NIP-46 configuration. */
export function setSigningRemote(
  config: NappletConfig,
  options: {
    pubkey: string;
    keyReference?: string;
    relays?: string[];
  },
): NappletConfig {
  if (options.pubkey.trim() === "") throw new Error("pubkey cannot be empty");
  if (options.keyReference !== undefined && options.keyReference.trim() === "") {
    throw new Error("keyReference cannot be empty");
  }
  return defaultConfig({
    ...config,
    bunkerPubkey: options.pubkey,
    signing: {
      ...config.signing,
      mode: "interactive",
      keyReference: options.keyReference,
      pubkey: options.pubkey,
      relays: options.relays ?? config.signing?.relays,
    },
  });
}

function stringArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  for (const entry of value) {
    if (typeof entry !== "string") throw new Error(`${field} must contain only strings`);
  }
  return value;
}
