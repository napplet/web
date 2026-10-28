// Run the paired site servers in the foreground, with OS-assigned ports.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
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

async function websiteApi() {
  const metadata = JSON.parse(await readFile(new URL('apps/web/package.json', root), 'utf8'));
  if (metadata.devDependencies?.astro) return importFromApp('web', 'astro');
  const { createServer } = await importFromApp('web', 'vite');
  return { dev: async (options) => {
    const server = await createServer({
      ...options.vite,
      root: fileURLToPath(options.root),
      server: { ...options.vite?.server, ...options.server, strictPort: false },
    });
    try {
      await server.listen();
    } catch (error) {
      try { await server.close(); }
      catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Website startup and cleanup failed'); }
      throw error;
    }
    return { address: server.httpServer.address(), stop: () => server.close() };
  } };
}

/**
 * Start docs before the website so redirects use the actual listening address.
 * @param {object} [apis] Server factories; defaults to the workspace packages.
 * @param {'both'|'docs'|'web'} [mode] Which local servers to start.
 * @returns {Promise<object>} Bound URLs and a stop function for both servers.
 * @example const site = await startSite(); await site.stop();
 */
export async function startSite(apis, mode = 'both') {
  const docsApi = mode === 'web' ? undefined : apis?.docs ?? await importFromApp('docs', 'vitepress');
  const webApi = mode === 'docs' ? undefined : apis?.web ?? await websiteApi();
  let docs;
  let web;
  const stop = async () => {
    const results = await Promise.allSettled([web?.stop(), docs?.close()]);
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) throw new AggregateError(failures.map((result) => result.reason), 'Could not stop site servers');
  };
  try {
    if (mode !== 'web') {
      const { createServer } = docsApi;
      docs = await createServer(fileURLToPath(new URL('apps/docs/', root)), {
        // Vite 6 treats port 0 as its default, so select a candidate via the OS.
        host: '127.0.0.1', port: await availablePort(), strictPort: false,
      });
      await docs.listen();
    }
    const docsOrigin = docs ? `http://127.0.0.1:${docs.httpServer.address().port}` : process.env.NAPPLET_DOCS_ORIGIN ?? 'https://napplet.run';
    process.env.NAPPLET_DOCS_ORIGIN = docsOrigin;
    if (mode !== 'docs') {
      const { dev } = webApi;
      web = await dev({
        root: new URL('apps/web/', root),
        server: { host: '127.0.0.1', port: await availablePort() },
        vite: { server: { strictPort: false, proxy: {
          '/docs': { target: docsOrigin, changeOrigin: true, ws: true },
        } } },
      });
    }
    return {
      webUrl: web ? `http://127.0.0.1:${web.address.port}/` : undefined,
      docsUrl: docs ? `${docsOrigin}/docs/` : undefined,
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
  const mode = process.argv.includes('--docs') ? 'docs' : process.argv.includes('--web') ? 'web' : 'both';
  const site = startSite(undefined, mode);
  let stopping;
  const shutdown = () => {
    stopping ??= site.then(({ stop }) => stop()).then(() => process.exit(0));
    stopping.catch((error) => { console.error(error); process.exit(1); });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  site.then(({ webUrl, docsUrl }) => {
    if (webUrl) console.log(`\nWebsite: ${webUrl}`);
    if (docsUrl) console.log(`Docs:    ${docsUrl}`);
    console.log('Press Ctrl+C to stop the servers started by this command.');
  }).catch((error) => { console.error(error); process.exit(1); });
}
