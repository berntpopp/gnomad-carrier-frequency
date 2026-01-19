import { createApp } from 'vue'

// Pinia
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import { graphqlClient } from '@/api'

// Pinia setup
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Vuetify setup
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#a09588',
          secondary: '#424242',
          surface: '#FFFFFF',
          background: '#FAFAFA',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#BDBDBD',
          secondary: '#757575',
        }
      }
    }
  }
})

const app = createApp(App)
app.use(pinia)  // Must be before other plugins that might use stores
app.use(vuetify)
app.use(graphqlClient)
app.mount('#app')
