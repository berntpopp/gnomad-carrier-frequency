# Phase 12: PWA - Research

**Researched:** 2026-01-19
**Domain:** Progressive Web App (PWA) implementation with Vite, Vue 3, and Workbox
**Confidence:** HIGH

## Summary

PWA implementation for Vue 3 + Vite applications is well-standardized with `vite-plugin-pwa` as the de facto solution. The plugin wraps Workbox under the hood, providing zero-config defaults while allowing deep customization of service worker behavior, caching strategies, and manifest generation.

The project already uses `@vueuse/core` which provides `useOnline` for network status detection. The existing Pinia store pattern with persistence can be extended to manage PWA-specific state (install prompt, cache status). The main implementation work involves: configuring the Vite plugin, generating PNG icons from the existing SVG favicon, implementing offline indicators, and adding install functionality to the Settings dialog.

**Primary recommendation:** Use `vite-plugin-pwa` with `generateSW` strategy (Workbox generates service worker automatically), `NetworkFirst` caching for gnomAD API calls with 24-hour expiration, and separate `any` and `maskable` purpose icons.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | ^0.20+ | PWA plugin for Vite | Official Vite PWA solution, wraps Workbox, zero-config |
| @vite-pwa/assets-generator | ^0.2+ | Icon generation from SVG | Official companion tool, generates all required sizes |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vueuse/core | ^12.7.0 | `useOnline` composable | Network status detection |
| pinia | ^3.0.4 | PWA state management | Install prompt state, cache status |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| generateSW strategy | injectManifest | injectManifest gives full control but requires writing custom service worker; generateSW sufficient for this app's needs |
| @vite-pwa/assets-generator | sharp scripts | Manual scripts work but assets-generator handles all sizes/formats automatically |

**Installation:**
```bash
bun add -D vite-plugin-pwa @vite-pwa/assets-generator
```

## Architecture Patterns

### Recommended Project Structure
```
public/
  icons/
    pwa-192x192.png       # Required for install
    pwa-512x512.png       # Required for install
    maskable-512x512.png  # For adaptive icons
    apple-touch-icon.png  # 180x180 for iOS
    favicon.ico           # 48x48 ICO
  favicon.svg             # Existing, keep
src/
  composables/
    usePwaInstall.ts      # Install prompt management
    useNetworkStatus.ts   # Online/offline state
  components/
    OfflineIndicator.vue  # Subtle offline badge
    PwaInstallCard.vue    # Settings dialog install section
```

### Pattern 1: Vite Plugin Configuration
**What:** Central PWA configuration in vite.config.ts
**When to use:** Always - single source of truth for manifest and service worker config
**Example:**
```typescript
// Source: https://vite-pwa-org.netlify.app/guide/
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/gnomad-carrier-frequency/',
  plugins: [
    VitePWA({
      registerType: 'prompt', // User decides when to update
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'gCFCalc - Carrier Frequency Calculator',
        short_name: 'gCFCalc',
        description: 'Calculate carrier frequency for autosomal recessive conditions',
        theme_color: '#a09588',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gnomad\.broadinstitute\.org\/api/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gnomad-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
```

### Pattern 2: Install Prompt Composable
**What:** Capture and manage beforeinstallprompt event
**When to use:** For non-intrusive install experience in Settings
**Example:**
```typescript
// Source: https://web.dev/learn/pwa/installation-prompt/
import { ref, onMounted, onUnmounted } from 'vue'

export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)
  const isInstalled = ref(false)

  function handleBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    canInstall.value = true
  }

  function handleAppInstalled() {
    isInstalled.value = true
    canInstall.value = false
    deferredPrompt.value = null
  }

  async function promptInstall() {
    if (!deferredPrompt.value) return false
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    deferredPrompt.value = null
    canInstall.value = false
    return outcome === 'accepted'
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    // Check if already installed (standalone mode)
    isInstalled.value = window.matchMedia('(display-mode: standalone)').matches
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return { canInstall, isInstalled, promptInstall }
}
```

### Pattern 3: Network Status with VueUse
**What:** Reactive online/offline state using existing dependency
**When to use:** For offline indicator and disabling search when offline
**Example:**
```typescript
// Source: https://vueuse.org/core/useonline/
import { useOnline } from '@vueuse/core'

// In component or composable
const isOnline = useOnline()

// Watch for changes
watch(isOnline, (online) => {
  if (online) {
    // Show "Back online" notification
  }
})
```

### Pattern 4: Service Worker Update Prompt
**What:** Prompt users when new app version available
**When to use:** With registerType: 'prompt'
**Example:**
```typescript
// Source: https://vite-pwa-org.netlify.app/guide/prompt-for-update.html
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // Show "New version available" notification
    // Call updateSW(true) when user accepts
  },
  onOfflineReady() {
    // Show "App ready for offline use" notification
  }
})
```

### Anti-Patterns to Avoid
- **`purpose: 'any maskable'`:** Chrome warns against this. Use separate icons with `any` and `maskable` purposes.
- **Auto-prompting for install:** User decided against this. Only show in Settings.
- **CacheFirst for API data:** gnomAD data changes; use NetworkFirst with expiration.
- **Skipping cleanupOutdatedCaches:** Causes bloated cache storage over time.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker generation | Custom service worker | vite-plugin-pwa + generateSW | Workbox handles precaching, versioning, cache invalidation |
| Icon generation | Manual PNG exports | @vite-pwa/assets-generator | Handles all sizes, maskable safe zones, naming conventions |
| Online/offline detection | Custom navigator.onLine listeners | @vueuse/core useOnline | Already in project, handles edge cases, reactive |
| Cache expiration/LRU | Custom cache management | Workbox ExpirationPlugin | Built into runtimeCaching options, handles quota pressure |
| Manifest injection | Manual link tags | vite-plugin-pwa | Auto-injects, handles base path, updates on build |

**Key insight:** PWA infrastructure has many edge cases (iOS quirks, quota limits, update timing). Workbox and vite-plugin-pwa encode years of browser compatibility fixes.

## Common Pitfalls

### Pitfall 1: GitHub Pages Base Path
**What goes wrong:** Service worker can't find assets, manifest not loading
**Why it happens:** Plugin doesn't account for `/repo-name/` base path in all contexts
**How to avoid:** Ensure `base: '/gnomad-carrier-frequency/'` is set in Vite config; vite-plugin-pwa will automatically use this
**Warning signs:** 404s for manifest.webmanifest, service worker registration fails

### Pitfall 2: Stale API Cache
**What goes wrong:** Users see outdated gene data indefinitely
**Why it happens:** CacheFirst strategy or no expiration configured
**How to avoid:** Use NetworkFirst for API calls with maxAgeSeconds: 86400 (24 hours per user decision)
**Warning signs:** Data doesn't update even when online

### Pitfall 3: iOS Safari PWA Limitations
**What goes wrong:** Install prompt never appears on iOS
**Why it happens:** iOS doesn't fire beforeinstallprompt; install is via Share > Add to Home Screen
**How to avoid:** Detect iOS and show manual instructions instead of install button
**Warning signs:** canInstall is always false on iOS Safari

### Pitfall 4: Service Worker Update Race Condition
**What goes wrong:** User sees old version even after refresh
**Why it happens:** workbox-window uses 1-minute heuristic; rapid rebuilds cause confusion
**How to avoid:** In dev, clear application storage; in production, use skipWaiting with prompt
**Warning signs:** Changes don't appear, multiple SW versions in DevTools

### Pitfall 5: Large Precache Size
**What goes wrong:** Build fails or service worker bloated
**Why it happens:** Precaching everything including large assets
**How to avoid:** Use globPatterns to limit precached files; keep under 3MB
**Warning signs:** maximumFileSizeToCacheInBytes warning in build

### Pitfall 6: Separate App Shell and Data Caches
**What goes wrong:** Gene data cleared when app updates
**Why it happens:** cleanupOutdatedCaches clears ALL old caches
**How to avoid:** Use separate cache names: app shell in precache, API data in named runtimeCaching cache
**Warning signs:** User loses cached gene data on every deploy

## Code Examples

Verified patterns from official sources:

### Complete Vite Config
```typescript
// vite.config.ts
// Source: https://vite-pwa-org.netlify.app/guide/
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/gnomad-carrier-frequency/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'gCFCalc - Carrier Frequency Calculator',
        short_name: 'gCFCalc',
        description: 'Calculate carrier frequency and recurrence risk for autosomal recessive conditions',
        theme_color: '#a09588',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/gnomad-carrier-frequency/',
        scope: '/gnomad-carrier-frequency/',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gnomad\.broadinstitute\.org\/api/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gnomad-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Enable for PWA testing in dev
      }
    })
  ]
})
```

### TypeScript Declaration for PWA Register
```typescript
// src/vite-env.d.ts (add to existing)
// Source: https://vite-pwa-org.netlify.app/guide/prompt-for-update.html

/// <reference types="vite-plugin-pwa/client" />

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}
```

### PWA Icon Generation Config
```typescript
// pwa-assets.config.ts
// Source: https://vite-pwa-org.netlify.app/assets-generator/
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023'
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.1 // 10% safe zone padding
    },
    apple: {
      sizes: [180],
      padding: 0
    }
  },
  images: ['public/favicon.svg']
})
```

### Offline Indicator Component
```vue
<!-- OfflineIndicator.vue -->
<template>
  <v-chip
    v-if="!isOnline"
    size="small"
    color="warning"
    variant="tonal"
    prepend-icon="mdi-wifi-off"
    class="offline-indicator"
  >
    Offline
  </v-chip>
</template>

<script setup lang="ts">
import { useOnline } from '@vueuse/core'

const isOnline = useOnline()
</script>
```

### Clear Cache Action (for Settings)
```typescript
// In a composable or store action
// Source: MDN Cache API documentation
async function clearGeneDataCache(): Promise<boolean> {
  try {
    const deleted = await caches.delete('gnomad-api-cache')
    return deleted
  } catch (error) {
    console.error('Failed to clear cache:', error)
    return false
  }
}

async function getCacheSize(): Promise<{ usage: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0
    }
  }
  return null
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual service worker | vite-plugin-pwa generateSW | 2020+ | 90% less boilerplate |
| `purpose: 'any maskable'` | Separate icons per purpose | 2023 | Chrome shows warning for combined |
| No expiration on API cache | ExpirationPlugin with maxAgeSeconds | Always recommended | Prevents stale data |
| Register immediately | Defer until page load complete | Best practice | Better user experience |

**Deprecated/outdated:**
- **webManifestUrl option:** Deprecated in v0.12.4, use navigateFallbackAllowlist instead
- **Workbox v6:** Plugin requires Workbox v7 (Node 16+) since v0.16.0
- **Vite 4:** Plugin requires Vite 5+ since v0.17.0 (project uses Vite 7, compatible)

## Open Questions

Things that couldn't be fully resolved:

1. **ClinGen API Caching**
   - What we know: Project uses ClinGen API via proxy
   - What's unclear: Should ClinGen responses also be cached? Different expiration?
   - Recommendation: Cache ClinGen with same 24-hour expiration; add separate cache name

2. **Splash Screen Customization**
   - What we know: Browser generates splash from manifest icons and colors
   - What's unclear: Extent of customization possible (user wants logo + app name)
   - Recommendation: Use maskable icon with proper padding; theme_color sets background; browser handles rest

3. **iOS Install Instructions**
   - What we know: iOS doesn't support beforeinstallprompt
   - What's unclear: Best UX pattern for iOS users in Settings
   - Recommendation: Detect iOS, show "Add to Home Screen via Share menu" instructions

## Sources

### Primary (HIGH confidence)
- [vite-plugin-pwa official documentation](https://vite-pwa-org.netlify.app/) - All configuration options, Vue examples
- [Chrome Workbox documentation](https://developer.chrome.com/docs/workbox/) - Caching strategies
- [MDN PWA documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) - Icons, manifest spec
- [VueUse useOnline](https://vueuse.org/core/useonline/) - Network status API

### Secondary (MEDIUM confidence)
- [web.dev PWA Learn course](https://web.dev/learn/pwa/) - Best practices
- [GitHub vite-pwa issues](https://github.com/vite-pwa/vite-plugin-pwa/issues) - Edge cases, GitHub Pages deployment

### Tertiary (LOW confidence)
- Various Medium articles on Vue 3 PWA - Community patterns, may need validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - vite-plugin-pwa is the official solution, well-documented
- Architecture: HIGH - Patterns directly from official docs and existing project structure
- Pitfalls: HIGH - Common issues documented in official guides and GitHub issues

**Research date:** 2026-01-19
**Valid until:** 2026-03-19 (60 days - PWA tooling is stable)
