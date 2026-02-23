import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index:   'src/index.ts',
    types:   'src/types/index.ts',
    config:  'src/config/index.ts',
    queries: 'src/queries/index.ts',
  },
  format: ['esm'],
  dts: true,
  exports: true,
  clean: true,
  platform: 'neutral',
})
