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
    // No globalName: a top-level `var` would be a non-deletable global. The
    // entry defines a configurable NappletShimPrelude that install() removes.
    entry: { prelude: 'src/prelude-global.ts' },
    format: ['iife'],
    platform: 'browser',
    target: 'es2022',
    noExternal: [/@napplet\//],
    esbuildOptions(options) {
      options.ignoreAnnotations = true;
    },
    sourcemap: true,
    clean: false,
  },
]);
