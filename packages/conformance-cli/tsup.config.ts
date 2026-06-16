import { defineConfig } from 'tsup';

export default defineConfig([
  // Node CLI entry. Playwright stays external (heavy, resolved at runtime).
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node20',
    dts: false,
    sourcemap: true,
    clean: true,
    banner: { js: '#!/usr/bin/env node' },
    external: ['playwright'],
  },
  // Browser bundle served to the host harness page. Inlines the @napplet engine
  // so the page can `bootAndCollect` without a bundler/importmap.
  {
    entry: { 'host-bundle': 'src/host-entry.ts' },
    format: ['iife'],
    platform: 'browser',
    target: 'es2022',
    globalName: 'NappletConformanceHostBundle',
    noExternal: [/@napplet\//],
    dts: false,
    sourcemap: false,
  },
]);
