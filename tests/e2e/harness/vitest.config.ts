import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['*.e2e.test.ts'],
    // Each case launches headless Chromium and boots a napplet twice (primary +
    // degraded), so give the suite generous time.
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
