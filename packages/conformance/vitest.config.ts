import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default to node; DOM-dependent suites opt in per-file with
    // `// @vitest-environment happy-dom`.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
