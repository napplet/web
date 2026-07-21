import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/prelude.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: { prelude: 'src/prelude.ts' },
    format: ['iife'],
    platform: 'browser',
    target: 'es2022',
    globalName: 'NappletShimPrelude',
    noExternal: [/@napplet\//],
    esbuildOptions(options) {
      options.ignoreAnnotations = true;
    },
    sourcemap: true,
    clean: false,
  },
]);
