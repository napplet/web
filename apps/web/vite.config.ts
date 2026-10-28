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
    // The paired runner supplies its actual docs origin. Standalone previews
    // fall back to published docs, without assuming another local listener.
    proxy: {
      '/docs': {
        target: process.env.NAPPLET_DOCS_ORIGIN ?? 'https://napplet.run',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
