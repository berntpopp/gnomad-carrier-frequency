# Phase 5: Foundation (Settings + Theme) - Research

**Researched:** 2026-01-19
**Domain:** Vue 3 + Vuetify 3 theming, Pinia persistence, app configuration
**Confidence:** HIGH

## Summary

This phase implements theme switching (dark/light) with persistence and version display. The project already has the required infrastructure: Vuetify 3 (v3.11.6) with theme support, Pinia with pinia-plugin-persistedstate (v4.7.1), and @vueuse/core (v12.7.0).

The recommended approach combines VueUse's `useDark` composable (for system preference detection and localStorage persistence) with Vuetify's `useTheme` composable (for actual theme application). This provides the best of both worlds: automatic system preference detection, persistence, and proper Vuetify component theming.

For version display, the standard Vite pattern is injecting the version from package.json via `vite.config.ts` using the `define` option, making it available as `import.meta.env.VITE_APP_VERSION`.

**Primary recommendation:** Use VueUse's `useDark` synced with Vuetify's `useTheme` via a watcher. Create a dedicated `useThemeStore` Pinia store to manage theme state with persistence, or use VueUse's built-in localStorage persistence.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vuetify | 3.11.6 | UI framework with theming | Already used, has built-in light/dark themes |
| @vueuse/core | 12.7.0 | Vue composition utilities | `useDark` handles system preference + persistence |
| pinia | 3.0.4 | State management | Already used for template store |
| pinia-plugin-persistedstate | 4.7.1 | localStorage persistence | Already configured in project |
| @mdi/font | 7.4.47 | Material Design Icons | Icons for sun/moon toggle |

### Supporting (No Additional Installation Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite define | built-in | Inject version at build time | Version display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| VueUse useDark | Manual localStorage + matchMedia | More code, reinventing the wheel |
| Pinia for theme | VueUse built-in persistence | VueUse already handles persistence well |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── composables/
│   └── useTheme.ts         # Theme composable (wraps VueUse + Vuetify)
├── stores/
│   ├── useThemeStore.ts    # Theme state (optional, VueUse may suffice)
│   ├── useFilterStore.ts   # Stub for future phase
│   └── useTemplateStore.ts # Existing
├── components/
│   ├── AppBar.vue          # New: contains theme toggle
│   └── AppFooter.vue       # New: contains version display
└── main.ts                 # Vuetify theme configuration
```

### Pattern 1: VueUse + Vuetify Theme Sync
**What:** Use VueUse's `useDark` for detection/persistence, sync to Vuetify's `useTheme`
**When to use:** Always - this is the recommended approach
**Example:**
```typescript
// Source: VueUse docs + Vuetify Nuxt Module docs
import { useDark, useToggle } from '@vueuse/core'
import { useTheme } from 'vuetify'
import { watch } from 'vue'

export function useAppTheme() {
  const vuetifyTheme = useTheme()

  // VueUse handles: system preference detection, localStorage persistence
  const isDark = useDark({
    storageKey: 'carrier-freq-theme',
    // Once user toggles, don't follow system changes
    // (VueUse stores explicit choice, won't auto-update)
  })
  const toggleTheme = useToggle(isDark)

  // Sync VueUse state with Vuetify theme
  watch(isDark, (dark) => {
    vuetifyTheme.global.name.value = dark ? 'dark' : 'light'
  }, { immediate: true })

  return { isDark, toggleTheme }
}
```

### Pattern 2: Vuetify Dark Theme Configuration
**What:** Configure both light and dark themes in Vuetify initialization
**When to use:** Required for Vuetify components to style correctly
**Example:**
```typescript
// Source: Vuetify 3 docs
import { createVuetify } from 'vuetify'

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',  // VueUse will override on mount
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#2196F3',
          secondary: '#424242',
        }
      }
    }
  }
})
```

### Pattern 3: Version Injection via Vite
**What:** Inject package.json version at build time
**When to use:** For displaying version in UI
**Example:**
```typescript
// vite.config.ts
// Source: Vite docs
import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version)
  }
})
```

```typescript
// src/vite-env.d.ts - add type definition
interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
}
```

```vue
<!-- AppFooter.vue -->
<template>
  <v-footer app class="text-caption">
    <a :href="releasesUrl" target="_blank" rel="noopener">
      v{{ version }}
    </a>
  </v-footer>
</template>

<script setup lang="ts">
const version = import.meta.env.VITE_APP_VERSION
const releasesUrl = 'https://github.com/berntpopp/gnomad-carrier-frequency/releases'
</script>
```

### Pattern 4: Theme Toggle Button
**What:** Icon button in app bar that toggles theme
**When to use:** User-facing theme control
**Example:**
```vue
<!-- Source: Vuetify + MDI icons -->
<template>
  <v-btn
    icon
    @click="toggleTheme()"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
  </v-btn>
</template>

<script setup lang="ts">
import { useAppTheme } from '@/composables/useTheme'
const { isDark, toggleTheme } = useAppTheme()
</script>
```

### Anti-Patterns to Avoid
- **Using only Vuetify useTheme without persistence:** Theme resets on page reload
- **Using only VueUse useDark without Vuetify sync:** Vuetify components won't style correctly
- **Directly reading/writing localStorage for theme:** Reinvents what VueUse provides
- **Three-option toggle (light/dark/system):** User decision says two options only

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| System preference detection | Manual `matchMedia` listener | `useDark` from @vueuse/core | Handles edge cases, reactivity, cleanup |
| Theme persistence | Manual localStorage read/write | `useDark` built-in persistence | Automatic, tested, handles SSR |
| Theme toggle state | Custom ref + localStorage | `useDark` + `useToggle` | Already integrated, less code |
| Version from package.json | Runtime fetch | Vite `define` at build time | Build-time is simpler, no async |

**Key insight:** VueUse's `useDark` handles the three hardest parts of dark mode: system preference detection, localStorage persistence, and the "user override" logic where manual choice stops following system changes.

## Common Pitfalls

### Pitfall 1: Theme Flash on Load (FOUC)
**What goes wrong:** Page loads with light theme, then flashes to dark after JS hydrates
**Why it happens:** Vuetify's defaultTheme is 'light', VueUse reads from localStorage after mount
**How to avoid:**
1. Add inline script in index.html that reads localStorage and sets class before body renders
2. Or accept brief flash (acceptable for this app's context)
**Warning signs:** Users report flickering when opening app in dark mode

### Pitfall 2: Vuetify/VueUse Theme Desync
**What goes wrong:** Toggle button shows dark icon but Vuetify renders light theme
**Why it happens:** VueUse state and Vuetify theme not properly synced
**How to avoid:** Use `watch` with `immediate: true` to sync on initialization
**Warning signs:** Visual inconsistency between toggle icon and actual theme

### Pitfall 3: System Preference Override Not Working
**What goes wrong:** User selects dark mode, but app switches back to light when system changes
**Why it happens:** Incorrectly listening to system changes after user made explicit choice
**How to avoid:** VueUse's `useDark` handles this correctly by default - once value is stored in localStorage, it stops following system preference
**Warning signs:** Theme changes unexpectedly

### Pitfall 4: Theme Toggle Tooltip Stale
**What goes wrong:** Tooltip says "Switch to dark mode" when already in dark mode
**Why it happens:** Tooltip text not reactive to theme state
**How to avoid:** Use computed or template expression based on `isDark` ref
**Warning signs:** Tooltip text doesn't match current state

### Pitfall 5: Version Not Updating in Build
**What goes wrong:** Version shows old value after version bump
**Why it happens:** Vite caches `define` values, or package.json not re-read
**How to avoid:** Clean build after version change, or use plugin that forces reload
**Warning signs:** UI version doesn't match package.json

## Code Examples

Verified patterns from official sources:

### Complete Theme Composable
```typescript
// src/composables/useTheme.ts
// Source: VueUse docs, Vuetify docs, combined pattern
import { useDark, useToggle } from '@vueuse/core'
import { useTheme as useVuetifyTheme } from 'vuetify'
import { watch, computed } from 'vue'

export function useAppTheme() {
  const vuetifyTheme = useVuetifyTheme()

  // VueUse: detects system preference, persists to localStorage
  // Once user makes a choice, stops following system preference
  const isDark = useDark({
    storageKey: 'carrier-freq-theme',
  })

  const toggleTheme = useToggle(isDark)

  // Sync to Vuetify's theme system
  watch(isDark, (dark) => {
    vuetifyTheme.global.name.value = dark ? 'dark' : 'light'
  }, { immediate: true })

  const tooltipText = computed(() =>
    isDark.value ? 'Switch to light mode' : 'Switch to dark mode'
  )

  const themeIcon = computed(() =>
    isDark.value ? 'mdi-weather-sunny' : 'mdi-weather-night'
  )

  return {
    isDark,
    toggleTheme,
    tooltipText,
    themeIcon
  }
}
```

### Vuetify Configuration with Both Themes
```typescript
// src/main.ts (updated)
// Source: Vuetify 3 docs
import { createVuetify } from 'vuetify'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#2196F3',
          secondary: '#616161',
        }
      }
    }
  }
})
```

### App Bar Component
```vue
<!-- src/components/AppBar.vue -->
<!-- Source: Vuetify App Bar docs -->
<template>
  <v-app-bar>
    <v-toolbar-title>gnomAD Carrier Frequency Calculator</v-toolbar-title>
    <v-spacer />
    <v-btn
      icon
      @click="toggleTheme()"
      :title="tooltipText"
    >
      <v-icon>{{ themeIcon }}</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useAppTheme } from '@/composables/useTheme'
const { toggleTheme, tooltipText, themeIcon } = useAppTheme()
</script>
```

### App Footer with Version
```vue
<!-- src/components/AppFooter.vue -->
<!-- Source: Vuetify Footer docs -->
<template>
  <v-footer app class="justify-center text-caption text-medium-emphasis pa-2">
    <a
      :href="releasesUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="text-decoration-none"
    >
      v{{ version }}
    </a>
  </v-footer>
</template>

<script setup lang="ts">
const version = import.meta.env.VITE_APP_VERSION
const releasesUrl = 'https://github.com/berntpopp/gnomad-carrier-frequency/releases'
</script>
```

### Settings Export/Import Pattern
```typescript
// For future: export/import settings backup
// Source: Pinia docs, standard Blob API pattern
function exportSettings() {
  const data = {
    theme: localStorage.getItem('carrier-freq-theme'),
    templates: localStorage.getItem('carrier-freq-templates'),
    // ... other stores
    exportedAt: new Date().toISOString(),
    version: import.meta.env.VITE_APP_VERSION,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `carrier-freq-settings-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importSettings(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = JSON.parse(e.target?.result as string)
    // Validate and apply settings
    if (data.theme) localStorage.setItem('carrier-freq-theme', data.theme)
    if (data.templates) localStorage.setItem('carrier-freq-templates', data.templates)
    // Reload to apply
    window.location.reload()
  }
  reader.readAsText(file)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `this.$vuetify.theme.dark = true` | `useTheme().global.name.value = 'dark'` | Vuetify 3.0 | Options API to Composition API |
| Manual localStorage + matchMedia | VueUse `useDark` | VueUse 4.0+ | Composable handles all edge cases |
| `theme.toggle()`, `theme.change()` | Available in Vuetify 3.9+ | Vuetify 3.9 | Simpler API, but watcher pattern works for all versions |

**Deprecated/outdated:**
- Vuetify 2.x syntax (`this.$vuetify.theme.dark`) - not compatible with Vue 3/Vuetify 3
- Direct CSS class manipulation without Vuetify sync - components won't style correctly

## Open Questions

Things that couldn't be fully resolved:

1. **Exact dark theme colors**
   - What we know: Vuetify provides default dark theme colors
   - What's unclear: Whether to customize colors or use Vuetify defaults
   - Recommendation: Start with Vuetify defaults, customize if needed

2. **Settings page vs inline toggles**
   - What we know: Context says toggle in app bar, export/import for backup
   - What's unclear: Whether a dedicated settings page is needed in this phase
   - Recommendation: Phase 5 focuses on app bar toggle + footer version; settings page can be future phase

3. **Empty store stubs scope**
   - What we know: Context mentions "empty stubs for filterStore and templateStore"
   - What's unclear: templateStore already exists - should it be refactored?
   - Recommendation: filterStore stub only; templateStore already exists

## Sources

### Primary (HIGH confidence)
- VueUse docs - `useDark`, `useToggle` composables
- Vuetify 3 docs - Theme feature, useTheme composable
- Vite docs - `define` option for environment variables
- pinia-plugin-persistedstate docs - Configuration options

### Secondary (MEDIUM confidence)
- Vuetify GitHub - theme.md source file for toggle/change/cycle API
- LogRocket Blog - Vuetify theme patterns
- MDI Pictogrammers - Icon names for sun/moon

### Tertiary (LOW confidence)
- Various dev.to articles - Pattern validation only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and documented
- Architecture: HIGH - pattern verified against VueUse and Vuetify official docs
- Pitfalls: MEDIUM - based on common patterns, not project-specific testing

**Research date:** 2026-01-19
**Valid until:** 60 days (stable libraries, well-documented patterns)
