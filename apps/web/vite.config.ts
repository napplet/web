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
  // Pre-bundle deps for the same modern target the build uses. Without this the
  // optimizer falls back to an old browser baseline (chrome87 …) and esbuild
  // 0.28+ aborts dep optimization with "Transforming destructuring … is not
  // supported yet" on Svelte's internals — which crashes `vite dev`. es2022
  // supports destructuring natively, so nothing has to be down-transformed.
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
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
