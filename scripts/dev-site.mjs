// Run the paired site servers in the foreground, with OS-assigned ports.
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);

async function importFromApp(app, name) {
  const require = createRequire(new URL(`apps/${app}/package.json`, root));
  return import(pathToFileURL(require.resolve(name)).href);
}

async function availablePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

/**
 * Start docs before the website so redirects use the actual listening address.
 * @param {object} [apis] Server factories; defaults to the workspace packages.
 * @returns {Promise<object>} Bound URLs and a stop function for both servers.
 * @example const site = await startSite(); await site.stop();
 */
export async function startSite(apis) {
  const { createServer } = apis?.docs ?? await importFromApp('docs', 'vitepress');
  const { dev } = apis?.web ?? await importFromApp('web', 'astro');
  let docs;
  let web;
  const stop = async () => {
    const results = await Promise.allSettled([web?.stop(), docs?.close()]);
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) throw new AggregateError(failures.map((result) => result.reason), 'Could not stop site servers');
  };
  try {
    docs = await createServer(fileURLToPath(new URL('apps/docs/', root)), {
      // Vite 6 treats port 0 as its default; supply an OS-selected candidate.
      // Leave fallback enabled in case another process takes it before listen.
      host: '127.0.0.1', port: await availablePort(), strictPort: false,
    });
    await docs.listen();
    const docsOrigin = `http://127.0.0.1:${docs.httpServer.address().port}`;
    // The Astro config reads this for its /docs redirect, including on restart.
    process.env.NAPPLET_DOCS_ORIGIN = docsOrigin;
    web = await dev({
      root: new URL('apps/web/', root),
      server: { host: '127.0.0.1', port: 0 },
      vite: { server: { strictPort: false } },
    });
    return {
      webUrl: `http://127.0.0.1:${web.address.port}/`,
      docsUrl: `${docsOrigin}/docs/`,
      stop,
    };
  } catch (error) {
    try {
      await stop();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Site startup and cleanup failed');
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const site = startSite();
  let stopping;
  const shutdown = () => {
    stopping ??= site.then(({ stop }) => stop()).then(() => process.exit(0));
    stopping.catch((error) => { console.error(error); process.exit(1); });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  site.then(({ webUrl, docsUrl }) => {
    console.log(`\nWebsite: ${webUrl}\nDocs:    ${docsUrl}\nPress Ctrl+C to stop both servers.`);
  }).catch((error) => { console.error(error); process.exit(1); });
}
