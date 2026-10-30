import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', gamepad: 'src/gamepad.ts', navigation: 'src/navigation.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
