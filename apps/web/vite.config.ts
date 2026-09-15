import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import pkg from './package.json'

function stripVuetifyLayoutTransitions() {
  const layoutPropsRegex = /\b(all|height|width|top|left|right|bottom|margin|padding|max-height|max-width|font-size)\b/i;
  return {
    name: 'strip-vuetify-layout-transitions',
    enforce: 'post' as const,
    transform(code: string, id: string) {
      if (id.endsWith('.css') || id.includes('vue&type=style') || id.includes('.scss')) {
        if (code.includes('transition') && layoutPropsRegex.test(code)) {
          return {
            code: code.replace(/transition(-property)?:\s*([^;]+);/g, (match, isProp, value) => {
              if (layoutPropsRegex.test(value)) {
                const parts = value.split(',').map((p: string) => p.trim()).filter((p: string) => !layoutPropsRegex.test(p));
                if (parts.length === 0) {
                  return isProp ? 'transition-property: transform, opacity, background-color, border-color, box-shadow;' : 'transition: transform 0.2s ease, opacity 0.2s ease;';
                }
                return `transition${isProp || ''}: ${parts.join(', ')};`;
              }
              return match;
            }),
            map: null,
          };
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    stripVuetifyLayoutTransitions(),
    checker({
      // Enable vue-tsc for TypeScript checking — point to app tsconfig
      // so watch mode only checks src/ files, not Vuetify .vue SFCs in
      // node_modules (skipLibCheck only covers .d.ts, not .vue files).
      vueTsc: {
        tsconfigPath: 'tsconfig.app.json',
      },
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
        theme_color: '#117A7F', // Teal CTA palette
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
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
          {
            // Gene config JSON from GitHub (runtime loading)
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/berntpopp\/gnomad-carrier-frequency\/main\/configs\/genes\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gene-config-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 3600, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Orphanet API caching — StaleWhileRevalidate for resilience
            urlPattern: /^https:\/\/api\.orphadata\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'orphanet-api-cache',
              expiration: {
                maxEntries: 50,
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
  base: '/',  // Custom domain serves from root
  resolve: {
    alias: [
      { find: '~gene-configs', replacement: fileURLToPath(new URL('../../configs/genes', import.meta.url)) },
      {
        find: /^@gnomad-cf\/core(\/.*)?$/,
        replacement: fileURLToPath(new URL('../../packages/core/src', import.meta.url)) + '$1',
      },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  build: {
    rollupOptions: {
      // Treat Node.js built-ins as external — they appear in @gnomad-cf/core/templates
      // (load-templates.ts) which is CLI-only code reachable only in Node.js contexts.
      // The browser never calls loadTemplateContent; tree-shaking removes the call sites
      // but rollup still resolves the module. Marking node:* as external prevents the
      // browser bundle error without requiring architectural changes to core.
      external: [/^node:/],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vuetify')) {
              return 'vendor-vuetify'
            }
            if (id.includes('write-excel-file')) {
              return 'vendor-xlsx'
            }
            if (id.includes('pinia') || id.includes('vue-router') || id.includes('/vue/') || id.includes('@vue/runtime-core') || id.includes('@vue/reactivity')) {
              return 'vendor-vue'
            }
            if (id.includes('@vueuse')) {
              return 'vendor-vueuse'
            }
          }
        },
      },
    },
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
