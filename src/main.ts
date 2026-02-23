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

// Accessibility
import VueAnnouncer from '@vue-a11y/announcer'
import '@vue-a11y/announcer/dist/style.css'

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
          primary: '#117A7F',
          secondary: '#a09588',
          surface: '#FFFFFF',
          background: '#FAFAFA',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#4DB6AC',
          secondary: '#a09588',
        }
      }
    }
  }
})

const app = createApp(App)
app.use(VueAnnouncer)  // Register before pinia for route announcements (if router added later)
app.use(pinia)
app.use(vuetify)
app.use(graphqlClient)
app.mount('#app')
