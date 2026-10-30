import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', gamepad: 'src/gamepad.ts', catalog: 'src/catalog.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
