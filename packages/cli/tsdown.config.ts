import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  dts: false,
  clean: true,
  platform: 'node',
  external: ['zod'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
