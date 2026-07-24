import { defineConfig } from 'vitest/config';

// Pure-logic unit tests only (movement timings, LayerManager state). No canvas
// / rendering tests — those would be test theater for this prototype.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
