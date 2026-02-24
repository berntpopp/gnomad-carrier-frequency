import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: ['test-gene-config-checkpoint.ts', 'test-debug.ts'],
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  reporter: [['line']],
});
