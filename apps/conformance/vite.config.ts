import { defineConfig } from 'vite';

// Single-window conformance runtime. es2022 everywhere so esbuild's dep optimizer
// doesn't down-transform to an old baseline (mirrors apps/web).
export default defineConfig({
  base: '/',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
});
