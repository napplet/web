// ─── Indexer configuration ──────────────────────────────────────────────────
// One YAML file holds every tunable. Every key is optional: an empty file (or
// none at all) is a working minimal deployment. Secrets never live in the file;
// they come from the environment (see `secretsFromEnv`).

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export interface Config {
  /** Directory that holds the SQLite database and build scratch space. */
  dataDir: string;
  http: { host: string; port: number };
  discovery: {
    /** Relays that carry NIP-66 kind 30166 relay discovery events. */
    monitorRelays: string[];
    /** Relays always tracked, whether or not a monitor lists them. */
    seedRelays: string[];
    intervalHours: number;
    /** Only discovery events newer than this count as evidence a relay exists. */
    lookbackDays: number;
    pageLimit: number;
    maxEvents: number;
  };
  crawl: {
    /** Wait between checks, in hours, by consecutive zero-point checks: the first entry is the normal cadence. */
    backoffHours: number[];
    /** Consecutive failed connections after which a relay is removed as offline. */
    offlineAfterFailures: number;
    concurrency: number;
    pageLimit: number;
    maxEventsPerRelay: number;
    timeoutSeconds: number;
    /** Incremental crawls re-read this much history before the last successful crawl. */
    overlapHours: number;
    tickMinutes: number;
    /** Points a relay earns for each distinct napplet manifest it serves in one crawl. */
    pointsPerNapplet: number;
    maxFrameBytes: number;
    allowPrivateHosts: boolean;
  };
  build: {
    enabled: boolean;
    /** Daily build time, `HH:MM` in UTC. */
    at: string;
    /** Path to the Astro site package, relative to this file's directory or absolute. */
    siteDir: string;
    siteUrl: string;
    /** Highest-scored relays handed to the browser for live top-up. */
    runtimeTopRelays: number;
    /** Relays always handed to the browser, in addition to the top-scored ones. */
    runtimePinnedRelays: string[];
    /** Milliseconds the browser waits on each relay during live top-up. */
    runtimeTimeoutMs: number;
    /** Build after startup when no build has happened yet. */
    buildOnStart: boolean;
    timeoutMinutes: number;
  };
  deploy: {
    bunny: {
      storageZone: string;
      storageEndpoint: string;
      pullZoneId: string;
      concurrency: number;
      deleteStale: boolean;
    };
  };
}

export interface Secrets {
  bunnyStoragePassword?: string;
  bunnyApiKey?: string;
}

/** The defaults every deployment starts from. */
export const DEFAULTS: Config = {
  dataDir: './data',
  http: { host: '0.0.0.0', port: 8080 },
  discovery: {
    monitorRelays: ['wss://relay.nostr.watch', 'wss://relaypag.es', 'wss://monitorlizard.nostr1.com'],
    seedRelays: ['wss://relay.napplet.soy', 'wss://relay.damus.io', 'wss://relay.ditto.pub', 'wss://relay.primal.net', 'wss://relay.nostr.com', 'wss://nos.lol'],
    intervalHours: 24,
    lookbackDays: 7,
    pageLimit: 500,
    maxEvents: 20_000,
  },
  crawl: {
    backoffHours: [24, 72, 168, 336, 720],
    offlineAfterFailures: 3,
    concurrency: 8,
    pageLimit: 500,
    maxEventsPerRelay: 5000,
    timeoutSeconds: 15,
    overlapHours: 24,
    tickMinutes: 5,
    pointsPerNapplet: 1,
    maxFrameBytes: 512 * 1024,
    allowPrivateHosts: false,
  },
  build: {
    enabled: true,
    at: '05:30',
    siteDir: '../archetypes',
    siteUrl: 'https://archetypes.napplet.run',
    runtimeTopRelays: 6,
    runtimePinnedRelays: [],
    runtimeTimeoutMs: 8000,
    buildOnStart: true,
    timeoutMinutes: 15,
  },
  deploy: {
    bunny: { storageZone: '', storageEndpoint: 'storage.bunnycdn.com', pullZoneId: '', concurrency: 8, deleteStale: true },
  },
};

type Plain = Record<string, unknown>;
const isPlain = (value: unknown): value is Plain => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Deep-merge `override` onto `base`; arrays and scalars replace, unknown keys are rejected. */
function merge(base: Plain, override: Plain, path: string): Plain {
  const out: Plain = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const where = path ? `${path}.${key}` : key;
    if (!(key in base)) throw new Error(`Unknown config key: ${where}`);
    const current = base[key];
    if (value === null || value === undefined) continue;
    if (isPlain(current)) {
      if (!isPlain(value)) throw new Error(`Config key ${where} must be a mapping`);
      out[key] = merge(current, value, where);
    } else if (Array.isArray(current)) {
      if (!Array.isArray(value)) throw new Error(`Config key ${where} must be a list`);
      out[key] = value;
    } else {
      if (typeof value !== typeof current) throw new Error(`Config key ${where} must be a ${typeof current}`);
      out[key] = value;
    }
  }
  return out;
}

/** Reject values that would make the service misbehave instead of failing later. */
export function validate(config: Config): Config {
  const positive: Array<[string, number]> = [
    ['http.port', config.http.port], ['discovery.intervalHours', config.discovery.intervalHours],
    ['discovery.pageLimit', config.discovery.pageLimit], ['discovery.maxEvents', config.discovery.maxEvents],
    ['crawl.offlineAfterFailures', config.crawl.offlineAfterFailures], ['crawl.concurrency', config.crawl.concurrency],
    ['crawl.pageLimit', config.crawl.pageLimit], ['crawl.maxEventsPerRelay', config.crawl.maxEventsPerRelay],
    ['crawl.timeoutSeconds', config.crawl.timeoutSeconds], ['crawl.tickMinutes', config.crawl.tickMinutes],
    ['crawl.maxFrameBytes', config.crawl.maxFrameBytes], ['build.runtimeTimeoutMs', config.build.runtimeTimeoutMs],
    ['build.timeoutMinutes', config.build.timeoutMinutes], ['deploy.bunny.concurrency', config.deploy.bunny.concurrency],
  ];
  for (const [name, value] of positive) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Config ${name} must be a positive number`);
  }
  if (config.crawl.overlapHours < 0) throw new Error('Config crawl.overlapHours must not be negative');
  if (config.crawl.pointsPerNapplet < 0) throw new Error('Config crawl.pointsPerNapplet must not be negative');
  if (config.build.runtimeTopRelays < 0) throw new Error('Config build.runtimeTopRelays must not be negative');
  if (!config.crawl.backoffHours.length || config.crawl.backoffHours.some(hours => !(hours > 0))) {
    throw new Error('Config crawl.backoffHours must be a non-empty list of positive hours');
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(config.build.at)) throw new Error('Config build.at must be HH:MM (UTC)');
  if (!/^https:\/\//.test(config.build.siteUrl)) throw new Error('Config build.siteUrl must be an https URL');
  return config;
}

/** The indexer package directory; default paths are relative to it. */
const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Merge YAML text over the defaults. Paths set in the YAML resolve against `base`; default paths against the package.
 * @param source YAML text (may be empty).
 * @param base Directory relative paths in the YAML resolve against.
 * @returns The validated configuration.
 * @example parseConfig('crawl:\n  concurrency: 4\n', process.cwd())
 */
export function parseConfig(source: string, base: string): Config {
  const raw: unknown = parse(source) ?? {};
  if (!isPlain(raw)) throw new Error('Config file must contain a mapping');
  const merged = merge(DEFAULTS as unknown as Plain, raw, '') as unknown as Config;
  const build = isPlain(raw.build) ? raw.build : {};
  merged.dataDir = resolve('dataDir' in raw ? base : PACKAGE_DIR, merged.dataDir);
  merged.build.siteDir = resolve('siteDir' in build ? base : PACKAGE_DIR, merged.build.siteDir);
  return validate(merged);
}

/**
 * Load the YAML config file, merged over the defaults.
 * @param path Config file path; when absent, the defaults are used as-is.
 * @returns The validated configuration.
 * @example const config = loadConfig('/config/archetypes.yaml');
 */
export function loadConfig(path?: string): Config {
  if (!path) return parseConfig('', process.cwd());
  const file = resolve(path);
  if (!existsSync(file)) throw new Error(`Config file not found: ${file}`);
  return parseConfig(readFileSync(file, 'utf8'), dirname(file));
}

/**
 * Load configuration the way the service does: inline `ARCHETYPES_YAML` wins over the
 * `ARCHETYPES_CONFIG` file, and `ARCHETYPES_DATA_DIR` overrides the data directory.
 * @param env Process environment.
 * @returns The validated configuration.
 * @example const config = configFromEnv(process.env);
 */
export function configFromEnv(env: NodeJS.ProcessEnv): Config {
  const config = env.ARCHETYPES_YAML?.trim() ? parseConfig(env.ARCHETYPES_YAML, process.cwd()) : loadConfig(env.ARCHETYPES_CONFIG || undefined);
  if (env.ARCHETYPES_DATA_DIR) config.dataDir = resolve(env.ARCHETYPES_DATA_DIR);
  return config;
}

/**
 * Read deployment secrets and non-secret Bunny identifiers from the environment.
 * Environment values for the storage zone and pull zone override the file.
 * @param env Process environment.
 * @param config Loaded configuration, updated in place for Bunny identifiers.
 * @returns Secrets that must never be written to disk or logs.
 * @example const secrets = secretsFromEnv(process.env, config);
 */
export function secretsFromEnv(env: NodeJS.ProcessEnv, config: Config): Secrets {
  if (env.BUNNY_STORAGE_ZONE) config.deploy.bunny.storageZone = env.BUNNY_STORAGE_ZONE;
  if (env.BUNNY_STORAGE_ENDPOINT) config.deploy.bunny.storageEndpoint = env.BUNNY_STORAGE_ENDPOINT.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (env.BUNNY_PULLZONE_ID) config.deploy.bunny.pullZoneId = env.BUNNY_PULLZONE_ID;
  return {
    bunnyStoragePassword: env.BUNNY_STORAGE_PASSWORD || undefined,
    bunnyApiKey: env.BUNNY_API_KEY || undefined,
  };
}
