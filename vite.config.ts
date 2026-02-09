import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import { VitePWA } from 'vite-plugin-pwa'
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
    VitePWA({
      registerType: 'prompt', // User decides when to update
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'gCFCalc - Carrier Frequency Calculator',
        short_name: 'gCFCalc',
        description: 'Calculate carrier frequency and recurrence risk for autosomal recessive conditions',
        theme_color: '#a09588', // RequiForm palette
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/gnomad-carrier-frequency/',
        scope: '/gnomad-carrier-frequency/',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'apple touch icon',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/docs/],
        runtimeCaching: [
          {
            // gnomAD API caching
            urlPattern: /^https:\/\/gnomad\.broadinstitute\.org\/api/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gnomad-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // ClinGen API caching
            urlPattern: /^https:\/\/search\.clinicalgenome\.org\/api/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'clingen-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Don't enable PWA in dev by default
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
