import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: 'benchmark-napplet',
      artifactMode: 'single-file',
      requires: ['outbox'],
    }),
  ],
});
