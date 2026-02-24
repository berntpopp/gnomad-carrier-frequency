import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index:        'src/index.ts',
    types:        'src/types/index.ts',
    config:       'src/config/index.ts',
    queries:      'src/queries/index.ts',
    filters:      'src/filters/index.ts',
    calculations: 'src/calculations/index.ts',
    templates:    'src/templates/index.ts',
    utils:        'src/utils/index.ts',
    client:       'src/client/index.ts',
  },
  format: ['esm'],
  dts: true,
  exports: true,
  clean: true,
  platform: 'neutral',
})
