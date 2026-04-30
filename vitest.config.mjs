import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/js/data/aggregate.js',
        'src/js/data/classify.js',
        'src/js/data/normalize.js',
        'src/js/utils/dates.js',
        'src/js/utils/format.js',
        'src/js/utils/search.js',
        'src/js/utils/strings.js',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
