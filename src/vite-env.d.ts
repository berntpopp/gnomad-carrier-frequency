/// <reference types="vite/client" />

// Extend ImportMetaEnv with custom environment variables
interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Vuetify styles module declaration
declare module 'vuetify/styles' {
  const styles: string
  export default styles
}

declare module 'vuetify/components' {
  import type { DefineComponent } from 'vue'
  const components: Record<string, DefineComponent>
  export = components
}

declare module 'vuetify/directives' {
  import type { Directive } from 'vue'
  const directives: Record<string, Directive>
  export = directives
}
