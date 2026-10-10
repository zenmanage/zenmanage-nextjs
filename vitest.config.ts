import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Server, edge and middleware code runs in Node. Component tests opt into jsdom with a
    // `// @vitest-environment jsdom` comment, because @zenmanage/sdk takes a window to mean
    // "browser" and rejects server keys there.
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'examples/**',
        '**/*.d.ts',
        '**/*.config.ts',
      ],
      thresholds: {
        lines: 92,
        functions: 92,
        branches: 88,
        statements: 92,
      },
    },
  },
});
