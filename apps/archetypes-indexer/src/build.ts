import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Config, Secrets } from './config.ts';
import type { Log } from './crawl.ts';
import { deployToBunny } from './deploy.ts';
import { buildSnapshot } from './export.ts';
import type { EventStore } from './store.ts';

/**
 * The most recent scheduled build time at or before `now`.
 * @param now Unix seconds.
 * @param at `HH:MM` in UTC.
 * @returns Unix seconds of the latest daily slot that has passed.
 * @example lastSlot(Date.parse('2026-11-25T06:00:00Z') / 1000, '05:30')
 */
export function lastSlot(now: number, at: string): number {
  const [hours, minutes] = at.split(':').map(Number);
  const date = new Date(now * 1000);
  const slot = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes) / 1000;
  return slot <= now ? slot : slot - 86_400;
}

/**
 * Whether a build is owed: never built (and building on start), or the daily slot passed since the last build.
 * @param now Unix seconds.
 * @param at `HH:MM` in UTC.
 * @param lastBuildAt Unix seconds of the last successful build.
 * @param buildOnStart Build when there has never been one.
 * @returns True when a build should run.
 * @example buildDue(now, '05:30', undefined, true) // true
 */
export function buildDue(now: number, at: string, lastBuildAt: number | undefined, buildOnStart: boolean): boolean {
  if (lastBuildAt === undefined) return buildOnStart;
  return lastBuildAt < lastSlot(now, at);
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error(`${command} timed out`)); }, timeoutMs);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error(`${command} exited with ${code}`)); });
  });
}

/**
 * Export the snapshot, run the Astro build, and deploy when Bunny is configured.
 * @param store Event store.
 * @param config Configuration.
 * @param secrets Deployment credentials.
 * @param now Unix seconds.
 * @param log Logger.
 * @returns Where the site was built and whether it was deployed.
 * @example await runBuild(store, config, secrets, now, log)
 */
export async function runBuild(store: EventStore, config: Config, secrets: Secrets, now: number, log: Log): Promise<{ outDir: string; deployed: boolean }> {
  const snapshotPath = join(config.dataDir, 'snapshot.json');
  const outDir = join(config.dataDir, 'site');
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(snapshotPath, JSON.stringify(buildSnapshot(store, config, now)));
  rmSync(outDir, { recursive: true, force: true });
  const astro = join(config.build.siteDir, 'node_modules', '.bin', 'astro');
  if (!existsSync(astro)) throw new Error(`Astro not installed in ${config.build.siteDir}`);
  await run(astro, ['build', '--outDir', outDir], config.build.siteDir, { ...process.env, ARCHETYPES_SNAPSHOT: snapshotPath, ASTRO_TELEMETRY_DISABLED: '1' }, config.build.timeoutMinutes * 60_000);
  log('build', { outDir, events: store.eventCount() });
  const bunny = config.deploy.bunny;
  let deployed = false;
  if (bunny.storageZone && secrets.bunnyStoragePassword) {
    await deployToBunny(outDir, {
      storageZone: bunny.storageZone,
      storageEndpoint: bunny.storageEndpoint,
      apiBase: bunny.apiBase,
      storagePassword: secrets.bunnyStoragePassword,
      ...(bunny.pullZoneId ? { pullZoneId: bunny.pullZoneId } : {}),
      ...(secrets.bunnyApiKey ? { apiKey: secrets.bunnyApiKey } : {}),
      concurrency: bunny.concurrency,
      deleteStale: bunny.deleteStale,
    }, log);
    deployed = true;
  } else {
    log('deploy-skipped', { reason: 'BUNNY_STORAGE_ZONE or BUNNY_STORAGE_PASSWORD not set' });
  }
  store.setMeta('lastBuildAt', String(now));
  return { outDir, deployed };
}
