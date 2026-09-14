import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'cli',
    include: ['src/__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'tests/**'],
      thresholds: {
        lines: 70,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
})
