import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DEFAULTS, loadConfig, secretsFromEnv } from '../src/config.ts';

const write = (body: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'arch-config-'));
  const file = join(dir, 'config.yaml');
  writeFileSync(file, body);
  return { dir, file };
};

describe('loadConfig', () => {
  it('uses the defaults with no file', () => {
    const config = loadConfig();
    expect(config.crawl.backoffHours).toEqual([24, 72, 168, 336, 720]);
    expect(config.build.runtimeTopRelays).toBe(6);
    expect(config.discovery.monitorRelays.length).toBeGreaterThan(0);
  });

  it('treats an empty file as the defaults', () => {
    const { file } = write('');
    expect(loadConfig(file).crawl).toEqual(DEFAULTS.crawl);
  });

  it('deep-merges partial settings and replaces lists', () => {
    const { file, dir } = write('crawl:\n  concurrency: 2\n  backoffHours: [1, 2]\nbuild:\n  runtimePinnedRelays: ["wss://pinned.example"]\ndataDir: ./state\n');
    const config = loadConfig(file);
    expect(config.crawl.concurrency).toBe(2);
    expect(config.crawl.backoffHours).toEqual([1, 2]);
    expect(config.crawl.timeoutSeconds).toBe(DEFAULTS.crawl.timeoutSeconds);
    expect(config.build.runtimePinnedRelays).toEqual(['wss://pinned.example']);
    expect(config.dataDir).toBe(join(dir, 'state'));
  });

  it('rejects unknown keys, wrong types and bad values', () => {
    expect(() => loadConfig(write('crawl:\n  concurency: 2\n').file)).toThrow(/Unknown config key: crawl.concurency/);
    expect(() => loadConfig(write('crawl:\n  concurrency: "2"\n').file)).toThrow(/must be a number/);
    expect(() => loadConfig(write('crawl:\n  backoffHours: []\n').file)).toThrow(/backoffHours/);
    expect(() => loadConfig(write('build:\n  at: "25:00"\n').file)).toThrow(/HH:MM/);
    expect(() => loadConfig(write('crawl:\n  concurrency: 0\n').file)).toThrow(/positive/);
    expect(() => loadConfig(write('- a list\n').file)).toThrow(/mapping/);
    expect(() => loadConfig('/nonexistent/config.yaml')).toThrow(/not found/);
  });
});

describe('secretsFromEnv', () => {
  it('reads secrets and lets the environment name the Bunny zones', () => {
    const config = loadConfig();
    const secrets = secretsFromEnv({ BUNNY_STORAGE_PASSWORD: 'pw', BUNNY_API_KEY: 'key', BUNNY_STORAGE_ZONE: 'zone', BUNNY_STORAGE_ENDPOINT: 'https://ny.storage.bunnycdn.com/', BUNNY_PULLZONE_ID: '42' }, config);
    expect(secrets).toEqual({ bunnyStoragePassword: 'pw', bunnyApiKey: 'key' });
    expect(config.deploy.bunny).toMatchObject({ storageZone: 'zone', storageEndpoint: 'ny.storage.bunnycdn.com', pullZoneId: '42' });
  });

  it('leaves secrets undefined when unset', () => {
    expect(secretsFromEnv({}, loadConfig())).toEqual({ bunnyStoragePassword: undefined, bunnyApiKey: undefined });
  });
});
