import pluginVue from 'eslint-plugin-vue'
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
  {
    ignores: ['node_modules/**', 'dist/**', 'docs/.vitepress/cache/**', 'docs/.vitepress/dist/**'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
)
