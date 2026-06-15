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
});
