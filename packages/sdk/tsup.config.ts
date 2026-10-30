import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', gamepad: 'src/gamepad.ts', torrent: 'src/torrent.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
