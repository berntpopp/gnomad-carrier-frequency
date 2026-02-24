import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'cli',
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**'],
      // Warn-only: vitest prints violation; CI uses continue-on-error
      thresholds: {
        lines: 80,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
})
