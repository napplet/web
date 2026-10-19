import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

// Directory routes are real index.html files on Bunny, without SPA rewrites.
export default defineConfig({
  site: 'https://napplet.run',
  output: 'static',
  trailingSlash: 'always',
  integrations: [svelte(), sitemap(), {
    name: 'local-development',
    hooks: {
      'astro:config:setup': ({ command, updateConfig }) => {
        // astro check runs sync; its optimizer must not replace the live dev cache.
        updateConfig({ vite: { cacheDir: `node_modules/.vite/astro-${command}` } });
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (!/^\/docs(?:\/|\?|$)/.test(req.url ?? '')) return next();
          res.writeHead(307, { Location: `http://localhost:5174${req.url}` });
          res.end();
        });
      },
    },
  }],
  vite: {
    build: { target: 'es2022' },
  },
});
