import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
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
  },
})
