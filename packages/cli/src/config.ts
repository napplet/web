import { CONFIG_DIR, CONFIG_FILE, type NappletConfig } from "./types.ts";
import { dirname, joinPath, resolvePath } from "./path.ts";
import { DEFAULT_SCREENSHOT_DIR, DEFAULT_SCREENSHOT_IDENTITY } from "./screenshot.ts";

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
  screenshot: {
    directory: DEFAULT_SCREENSHOT_DIR,
    identity: DEFAULT_SCREENSHOT_IDENTITY,
    width: 1280,
    height: 800,
    timeoutMs: 30_000,
  },
};

export function defaultConfig(overrides: Partial<NappletConfig> = {}): NappletConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    relays: overrides.relays ?? [...DEFAULT_CONFIG.relays],
    blossomServers: overrides.blossomServers ?? [...DEFAULT_CONFIG.blossomServers],
    named: overrides.named ?? [...(DEFAULT_CONFIG.named ?? [])],
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
    screenshot: {
      ...DEFAULT_CONFIG.screenshot,
      ...overrides.screenshot,
      directory: overrides.screenshot?.directory ?? DEFAULT_CONFIG.screenshot?.directory ??
        DEFAULT_SCREENSHOT_DIR,
      identity: overrides.screenshot?.identity ?? DEFAULT_CONFIG.screenshot?.identity,
      width: overrides.screenshot?.width ?? DEFAULT_CONFIG.screenshot?.width,
      height: overrides.screenshot?.height ?? DEFAULT_CONFIG.screenshot?.height,
      timeoutMs: overrides.screenshot?.timeoutMs ?? DEFAULT_CONFIG.screenshot?.timeoutMs,
    },
  };
}

export function configPath(cwd: string = Deno.cwd()): string {
  return joinPath(cwd, CONFIG_DIR, CONFIG_FILE);
}

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

export async function writeConfig(
  config: NappletConfig,
  path: string = configPath(),
): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, `${JSON.stringify(normalizeConfig(config), null, 2)}\n`);
}

export async function initConfig(
  options: {
    cwd?: string;
    force?: boolean;
    sourceDir?: string;
    relays?: string[];
    blossomServers?: string[];
    named?: string[];
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
  });
  await writeConfig(config, path);
  return { path, config, created: true };
}

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
  return defaultConfig({
    ...value,
    version: 1,
    sourceDir: typeof value.sourceDir === "string" ? value.sourceDir : ".",
    relays: stringArray(value.relays, "relays"),
    blossomServers: stringArray(value.blossomServers, "blossomServers"),
    named: stringArray(value.named, "named"),
    discover: value.discover
      ? {
        enabled: value.discover.enabled ?? true,
        roots: stringArray(value.discover.roots, "discover.roots"),
      }
      : undefined,
    screenshot: value.screenshot
      ? {
        directory: typeof value.screenshot.directory === "string"
          ? value.screenshot.directory
          : DEFAULT_SCREENSHOT_DIR,
        identity: typeof value.screenshot.identity === "string"
          ? value.screenshot.identity
          : undefined,
        width: optionalPositiveInteger(value.screenshot.width, "screenshot.width"),
        height: optionalPositiveInteger(value.screenshot.height, "screenshot.height"),
        timeoutMs: optionalPositiveInteger(value.screenshot.timeoutMs, "screenshot.timeoutMs"),
      }
      : undefined,
  });
}

export function resolveConfiguredSource(
  config: NappletConfig,
  cwd: string = Deno.cwd(),
): string {
  return resolvePath(cwd, config.sourceDir);
}

export function setSigningKeyReference(config: NappletConfig, keyReference: string): NappletConfig {
  if (keyReference.trim() === "") throw new Error("keyReference cannot be empty");
  return defaultConfig({
    ...config,
    signing: {
      mode: "interactive",
      keyReference,
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

function optionalPositiveInteger(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value as number;
}
