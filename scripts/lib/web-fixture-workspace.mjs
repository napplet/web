import { cp, mkdir, mkdtemp, readdir, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';

/**
 * Run a fixture build against a disposable web-app copy, leaving checkout data and build output untouched.
 * Installed packages are linked individually so the copy owns its build caches.
 * @param {string} source Absolute path to the installed web app.
 * @param {(root: string) => Promise<void>} run Fixture setup, build and checks.
 * @returns {Promise<void>} Resolves when the checks and temporary-directory cleanup finish.
 * @example await withWebFixture(appRoot, async root => { await writeFixtureData(root); });
 */
export async function withWebFixture(source, run) {
  const workspace = await realpath(await mkdtemp(join(tmpdir(), 'napplet-web-fixture-')));
  const root = join(workspace, 'apps/web');
  try {
    await mkdir(join(workspace, 'apps'));
    await symlink(resolve(source, '../../packages'), join(workspace, 'packages'), 'junction');
    const excluded = new Set(['node_modules', 'dist', '.astro', '.turbo', '.git']);
    await cp(source, root, { recursive: true, filter: path => !excluded.has(relative(source, path).split(sep)[0]) });
    await mkdir(join(root, 'node_modules'));
    for (const name of await readdir(join(source, 'node_modules'))) {
      if (!name.startsWith('.')) await symlink(join(source, 'node_modules', name), join(root, 'node_modules', name), 'junction');
    }
    await run(root);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
