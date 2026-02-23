import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    // Currently only barrel export — entries added as modules are extracted in Phase 26
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  exports: true,
  clean: true,
  platform: 'neutral',
})
