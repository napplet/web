import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The marketing SPA ships at the site root; VitePress docs are stitched in at
// /docs by the deploy workflow. Keep base '/' so asset URLs resolve on both
// Bunny and nsite.
export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    // Serve the VitePress docs under /docs from this single dev server, the
    // same way the deploy workflow stitches them in production. Requires the
    // docs dev server (`pnpm --filter @napplet/docs dev`) running on 5174 —
    // `pnpm dev:site` from the repo root starts both together. The web port is
    // left to Vite's default (auto-increments if busy); only the docs target
    // port is fixed so this proxy can find it.
    proxy: {
      '/docs': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
