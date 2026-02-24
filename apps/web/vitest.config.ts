import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    name: 'web',
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    // Mock CSS imports — Vuetify components import CSS files that vitest cannot transform
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/test/**',
        'src/main.ts',
        'src/api/client.ts',
        'src/vite-env.d.ts',
      ],
      // Warn-only: vitest prints violation; CI uses continue-on-error
      thresholds: {
        lines: 40,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
  resolve: {
    alias: [
      // Mirror all alias groups from vite.config.ts exactly
      { find: '~gene-configs', replacement: fileURLToPath(new URL('../../configs/genes', import.meta.url)) },
      {
        find: /^@gnomad-cf\/core(\/.*)?$/,
        replacement: fileURLToPath(new URL('../../packages/core/src', import.meta.url)) + '$1',
      },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // Mock Vite virtual modules that don't exist in test environment
      { find: 'virtual:pwa-register', replacement: fileURLToPath(new URL('./src/test/mocks/virtual-pwa-register.ts', import.meta.url)) },
    ],
  },
})
