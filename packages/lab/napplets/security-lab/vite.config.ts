import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { nip5aManifest } from '@napplet/vite-plugin';
import { NAPPLET_ID, NAPPLET_TITLE, NAPPLET_DESCRIPTION, REQUIRED_DOMAINS, OPTIONAL_DOMAINS } from './src/lib/manifest.ts';

export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    nip5aManifest({
      nappletType: NAPPLET_ID,
      title: NAPPLET_TITLE,
      description: NAPPLET_DESCRIPTION,
      requires: [...REQUIRED_DOMAINS],
      optional: [...OPTIONAL_DOMAINS],
      source: 'https://github.com/napplet/web',
      icon: { data: readFileSync(new URL('./icon.png', import.meta.url)), mimeType: 'image/png' },
      artifactMode: 'single-file',
    }),
  ],
  resolve: { dedupe: ['svelte'] },
  server: { port: 9504, strictPort: true, cors: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
