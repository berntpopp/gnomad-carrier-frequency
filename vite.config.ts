import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import { fileURLToPath, URL } from 'node:url'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    checker({
      // Enable vue-tsc for TypeScript checking
      vueTsc: true,
      // Enable ESLint checking
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,vue}"',
        useFlatConfig: true, // Use flat config format (eslint.config.js)
      },
      // Show overlay in browser for errors
      overlay: {
        initialIsOpen: false, // Don't auto-open, but show badge
        position: 'br', // Bottom-right
      },
    }),
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  base: '/gnomad-carrier-frequency/',  // GitHub Pages subdirectory
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // WSL2 with Windows filesystem requires polling for file watching
    // See: https://vite.dev/config/server-options.html#server-watch
    watch: {
      usePolling: true,
      interval: 100, // Polling interval in ms
    },
    // HMR configuration
    hmr: {
      overlay: true, // Show error overlay in browser
    },
    // Proxy for ClinGen API to avoid CORS issues in development
    proxy: {
      '/api/clingen': {
        target: 'https://search.clinicalgenome.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/clingen/, '/api'),
      },
    },
  },
})
