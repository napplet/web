import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: ['src/bin.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: false,
    sourcemap: false,
    clean: false,
    outExtension: () => ({ js: '.cjs' }),
  },
  {
    entry: ['src/bin.ts'],
    format: ['cjs'],
    dts: false,
    sourcemap: false,
    clean: false,
    outExtension: () => ({ js: '.cjs' }),
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
