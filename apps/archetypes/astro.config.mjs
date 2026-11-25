import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Directory routes are real index.html files on static storage, without SPA rewrites.
export default defineConfig({
  site: process.env.ARCHETYPES_SITE_URL || 'https://archetypes.napplet.run',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: page => !page.endsWith('/404/') })],
  build: { format: 'directory' },
  vite: { build: { target: 'es2022' } },
});
