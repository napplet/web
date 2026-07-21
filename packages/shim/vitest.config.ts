import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Runtime guard renders into the DOM; needs a browser-like environment.
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
