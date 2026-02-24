import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    name: 'core',
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts'], // re-export barrels
      // Warn-only: vitest prints violation; CI uses continue-on-error
      thresholds: {
        lines: 90,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
})
