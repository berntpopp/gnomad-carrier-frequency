# Stack Research: v1.1 Features

**Project:** gnomAD Carrier Frequency Calculator v1.1
**Researched:** 2026-01-19
**Overall Confidence:** HIGH

## Summary

v1.1 adds five feature areas to the existing Vue 3/Vuetify 3/TypeScript stack:

| Feature | Recommendation | Confidence |
|---------|----------------|------------|
| ClinGen Integration | Direct fetch to CSV endpoint, cache in Pinia store | HIGH |
| Excel/JSON Export | SheetJS (xlsx) 0.20.3 via CDN + file-saver | HIGH |
| Browser Logging | loglevel 1.9.2 | HIGH |
| Build Speed | Rolldown (Vite 7 experimental), ESLint flat config optimizations | MEDIUM |
| Dark/Light Theme | VueUse useDark + Vuetify useTheme sync | HIGH |

**Key insight:** All v1.1 features can be implemented with minimal new dependencies. The existing stack (Vue 3.5+, Vuetify 3.8+, VueUse 12.x, Pinia 3.x) already provides most needed infrastructure.

---

## 1. ClinGen Gene-Disease Validity Integration

### Recommendation

**Approach:** Direct fetch to ClinGen CSV download endpoint with client-side parsing and Pinia-persisted caching.

**Endpoint:** `https://search.clinicalgenome.org/kb/gene-validity/download`
- Returns real-time CSV of all gene-disease validity curations
- No authentication required for public download
- CORS-enabled for browser requests

### Rationale

ClinGen provides two data access methods:

1. **GCI API** (requires API key, restricted to GCEP members)
2. **Public CSV download** (no auth, real-time, open access)

For a genetic counselor tool, the public CSV download is appropriate:
- Contains all published gene-disease validity classifications
- Includes gene symbol, disease, mode of inheritance, classification (Definitive, Strong, Moderate, Limited, etc.)
- Updated in real-time as new curations are published

### Implementation Details

```typescript
// Fetch and parse ClinGen data
const response = await fetch('https://search.clinicalgenome.org/kb/gene-validity/download');
const csvText = await response.text();
// Parse CSV (use built-in or lightweight parser)
```

**Caching Strategy:**
- Store parsed data in Pinia store with `pinia-plugin-persistedstate`
- Add timestamp to track freshness
- Cache TTL: 24 hours (curations don't change frequently)
- Manual refresh button for users who need latest data

**CSV Parsing Options:**

| Library | Size | Recommendation |
|---------|------|----------------|
| Built-in (split/map) | 0 KB | Use for simple CSV structure |
| papaparse | ~6 KB gzip | Only if CSV has edge cases (quoted fields, etc.) |

**Confidence:** HIGH - Verified endpoint exists and returns CSV. No authentication required for public data.

### What NOT to Use

- **GCI API**: Requires API key, intended for ClinGen internal tools and GCEP members
- **GraphQL (GeneGraph)**: Not yet publicly released as of research date

### Sources

- [ClinGen Downloads Page](https://search.clinicalgenome.org/kb/downloads)
- [GCI API Documentation](https://vci-gci-docs.clinicalgenome.org/vci-gci-docs/gci-help/gci-api)

---

## 2. Excel/JSON Export

### Recommendation

**Primary:** SheetJS (xlsx) v0.20.3 + file-saver v2.0.5

### Rationale

SheetJS is the de facto standard for browser-based Excel generation. Critical note: the npm registry version (0.18.5) is outdated and has security vulnerabilities. Must install from SheetJS CDN.

**Why SheetJS over ExcelJS:**

| Criterion | SheetJS | ExcelJS |
|-----------|---------|---------|
| Bundle size | ~200 KB | ~400 KB |
| Excel styling | Pro version only | Included |
| Browser support | Excellent | Requires polyfills |
| Maintenance | Active | Active |

For this use case (simple data export without styling), SheetJS is sufficient and smaller.

### Installation

```bash
# CRITICAL: Do NOT use npm install xlsx (outdated, vulnerable)
npm rm xlsx 2>/dev/null
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npm install file-saver
npm install -D @types/file-saver
```

### Implementation Pattern

```typescript
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Excel export
function exportToExcel(data: CarrierResult[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${filename}.xlsx`);
}

// JSON export
function exportToJSON(data: CarrierResult[], filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, `${filename}.json`);
}
```

### Version Details

| Package | Version | Source |
|---------|---------|--------|
| xlsx | 0.20.3 | SheetJS CDN (NOT npm) |
| file-saver | 2.0.5 | npm |
| @types/file-saver | 2.0.7 | npm |

**Confidence:** HIGH - SheetJS is widely used, well-documented. CDN installation verified.

### What NOT to Use

- **xlsx from npm registry**: Version 0.18.5 has known vulnerabilities (Prototype Pollution, DoS)
- **ExcelJS**: Larger bundle, requires polyfills, overkill for simple exports
- **vue3-xlsx**: Thin wrapper, adds unnecessary abstraction

### Sources

- [SheetJS Documentation](https://docs.sheetjs.com/)
- [SheetJS CDN Migration](https://cdn.sheetjs.com/xlsx/)
- [SheetJS Vue Integration](https://docs.sheetjs.com/docs/demos/frontend/vue/)
- [file-saver npm](https://www.npmjs.com/package/file-saver)

---

## 3. Browser-Based Logging System

### Recommendation

**Library:** loglevel v1.9.2

### Rationale

loglevel is the best fit for browser logging:

| Criterion | loglevel | Pino (browser) | LogTape |
|-----------|----------|----------------|---------|
| Bundle size | 1.4 KB gzip | 3 KB gzip | Larger |
| Dependencies | 0 | 0 | 0 |
| Browser-native | Yes | Adapted | Yes |
| TypeScript | Included | Included | Included |
| npm downloads/week | 9M+ | Lower | Lower |
| Line numbers preserved | Yes | No | Varies |

Key advantage: loglevel preserves stack traces and line numbers in browser console, critical for debugging.

### Installation

```bash
npm install loglevel
# TypeScript types are included
```

### Implementation Pattern

```typescript
// src/utils/logger.ts
import log from 'loglevel';

// Configure based on environment
if (import.meta.env.DEV) {
  log.setLevel('debug');
} else {
  log.setLevel('warn'); // Production: only warn and error
}

export const logger = log;

// Usage throughout app
import { logger } from '@/utils/logger';

logger.debug('Fetching gene variants', { gene: 'CFTR' });
logger.info('Carrier frequency calculated', { frequency: 0.022 });
logger.warn('ClinGen cache expired, refetching');
logger.error('gnomAD API request failed', error);
```

### Optional: Log Persistence Plugin

For persisting logs to localStorage (useful for debugging user-reported issues):

```bash
npm install loglevel-plugin-remote  # If remote logging needed later
```

**Confidence:** HIGH - loglevel is mature, widely used, minimal footprint.

### What NOT to Use

- **winston**: Node.js-focused, requires polyfills for browser
- **console.log directly**: No level filtering, no production control
- **Custom solution**: Unnecessary when loglevel exists

### Sources

- [loglevel npm](https://www.npmjs.com/package/loglevel)
- [loglevel GitHub](https://github.com/pimterry/loglevel)
- [Browser Logging Best Practices](https://gajus.medium.com/logging-in-browser-2f053dbe69df)

---

## 4. Build/Lint/Typecheck Speed Improvements

### Recommendation

**Multi-pronged approach:**

1. **Vite 7 Rolldown** (experimental) - 3-16x faster builds
2. **ESLint flat config optimizations** - Already using, add global ignores
3. **vue-tsc parallelization** - Use vite-plugin-checker
4. **TypeScript isolatedDeclarations** - Future consideration (not yet stable for Vue)

### 4.1 Vite 7 Rolldown (Experimental)

Vite 7.x includes experimental Rolldown bundler support. Rolldown is Rust-based, providing:
- 45% faster cold starts
- 3-16x faster production builds
- 100x reduction in peak memory for large apps

**Current Status:** Experimental in Vite 7. Production-ready expected in Vite 8.

**Configuration:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  // Enable Rolldown (experimental)
  experimental: {
    rolldownDev: true,  // Use Rolldown in dev
    rolldownBuild: true // Use Rolldown for production builds
  }
});
```

**Confidence:** MEDIUM - Experimental flag. Test thoroughly before enabling.

### 4.2 ESLint Flat Config Optimizations

The project already uses ESLint 9 flat config. Optimizations:

```javascript
// eslint.config.js
import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

export default defineConfigWithVueTs(
  {
    // Global ignores - prevents wasting time on generated files
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.d.ts',
      '.planning/**'  // Don't lint planning docs
    ]
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended
);
```

**Performance tips:**
- Use `--quiet` flag in CI (skips warn-level rules entirely in ESLint 9)
- Global ignores prevent scanning irrelevant directories
- Flat config inherently faster than legacy cascading config

**Confidence:** HIGH - Already on ESLint 9, just needs ignore optimization.

### 4.3 vue-tsc Parallelization

vue-tsc is inherently slow for large projects. Options:

**Option A: vite-plugin-checker (Recommended)**

Run type checking in parallel worker thread:

```bash
npm install -D vite-plugin-checker
```

```typescript
// vite.config.ts
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [
    vue(),
    checker({
      vueTsc: true,
      typescript: true
    })
  ]
});
```

**Option B: Skip vue-tsc in dev, run in CI only**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "vue-tsc --noEmit",
    "build:ci": "vue-tsc -b && vite build"
  }
}
```

**Confidence:** HIGH for vite-plugin-checker approach.

### 4.4 TypeScript isolatedDeclarations

TypeScript 5.5+ `isolatedDeclarations` can dramatically speed up type generation (20-100x). However:

- Vue SFC support is experimental
- Requires explicit type annotations on all exports
- Known issues with `<script setup>` implicit types

**Recommendation:** Monitor vuejs/language-tools for stable support. Not ready for production Vue projects yet.

**Confidence:** LOW for Vue projects currently.

### Sources

- [Vite 7 Performance](https://vite.dev/guide/performance)
- [Vite 7 Rolldown Announcement](https://dev.to/aggarwal_gaurav_1012/vite-70-is-here-rust-powered-speed-smarter-tooling-a-cleaner-build-experience-1k9j)
- [ESLint Flat Config Best Practices](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/)
- [vue-tsc Performance Issues](https://github.com/vuejs/language-tools/issues/2533)
- [vite-plugin-checker](https://github.com/fi3ework/vite-plugin-checker)
- [TypeScript isolatedDeclarations](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-10/)

---

## 5. Dark/Light Theme Switching

### Recommendation

**Approach:** VueUse `useDark` composable + Vuetify `useTheme` synchronization

### Rationale

The project already uses VueUse 12.x. The `useDark` composable provides:
- System preference detection (prefers-color-scheme)
- Automatic localStorage persistence
- Reactive toggle

However, Vuetify maintains its own theme state via `useTheme`. These must be synchronized.

### Implementation Pattern

```typescript
// src/composables/useAppTheme.ts
import { useDark, useToggle } from '@vueuse/core';
import { useTheme } from 'vuetify';
import { watch } from 'vue';

export function useAppTheme() {
  const vuetifyTheme = useTheme();

  // useDark handles localStorage persistence and system preference
  const isDark = useDark({
    // Sync to Vuetify when useDark changes
    onChanged(dark: boolean) {
      vuetifyTheme.global.name.value = dark ? 'dark' : 'light';
    }
  });

  const toggleDark = useToggle(isDark);

  return {
    isDark,
    toggleDark
  };
}
```

### Vuetify Theme Configuration

Update `src/main.ts` to define both light and dark themes:

```typescript
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
          background: '#FFFFFF',
          surface: '#FFFFFF'
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#2196F3',
          secondary: '#424242',
          background: '#121212',
          surface: '#1E1E1E'
        }
      }
    }
  }
});
```

### UI Component

```vue
<template>
  <v-btn icon @click="toggleDark()">
    <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
  </v-btn>
</template>

<script setup lang="ts">
import { useAppTheme } from '@/composables/useAppTheme';

const { isDark, toggleDark } = useAppTheme();
</script>
```

**No new dependencies required** - VueUse is already installed.

**Confidence:** HIGH - Both VueUse and Vuetify APIs are well-documented.

### What NOT to Use

- **Manual localStorage**: VueUse handles this with proper reactivity
- **CSS-only solution**: Won't sync with Vuetify component themes
- **Vuetify alone**: Doesn't provide system preference detection or persistence

### Sources

- [VueUse useDark](https://vueuse.org/core/usedark/)
- [Vuetify Theme Documentation](https://vuetifyjs.com/en/features/theme/)
- [Implementing Dark Mode with VueUse](https://www.vuemastery.com/blog/implementing-dark-mode-with-vueuse/)

---

## Complete Dependency Summary

### New Production Dependencies

```bash
# Excel/JSON Export
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npm install file-saver

# Browser Logging
npm install loglevel
```

### New Dev Dependencies

```bash
npm install -D @types/file-saver
npm install -D vite-plugin-checker  # Optional: parallel type checking
```

### No New Dependencies Needed For

- ClinGen integration (use native fetch)
- Dark/light theme (VueUse already installed)
- ESLint optimizations (already on ESLint 9)

### Updated package.json

```json
{
  "dependencies": {
    "file-saver": "^2.0.5",
    "loglevel": "^1.9.2",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7",
    "vite-plugin-checker": "^0.8.0"
  }
}
```

---

## Verification Checklist

| Feature | Library | Version | Verified Source |
|---------|---------|---------|-----------------|
| ClinGen | fetch (native) | N/A | ClinGen downloads page |
| Excel export | xlsx | 0.20.3 | SheetJS CDN |
| File download | file-saver | 2.0.5 | npm registry |
| Logging | loglevel | 1.9.2 | npm registry |
| Theme toggle | @vueuse/core | 12.x (existing) | VueUse docs |
| Build speed | vite | 7.x (existing) | Vite docs |
| Type checking | vite-plugin-checker | 0.8.x | npm registry |

---

## Sources

### Official Documentation
- [ClinGen Downloads](https://search.clinicalgenome.org/kb/downloads)
- [SheetJS Documentation](https://docs.sheetjs.com/)
- [loglevel GitHub](https://github.com/pimterry/loglevel)
- [VueUse useDark](https://vueuse.org/core/usedark/)
- [Vuetify Theme](https://vuetifyjs.com/en/features/theme/)
- [Vite Performance Guide](https://vite.dev/guide/performance)

### Articles and Guides
- [Vite 7 Rolldown](https://dev.to/aggarwal_gaurav_1012/vite-70-is-here-rust-powered-speed-smarter-tooling-a-cleaner-build-experience-1k9j)
- [ESLint 2025 Review](https://eslint.org/blog/2026/01/eslint-2025-year-review/)
- [Browser Logging Best Practices](https://gajus.medium.com/logging-in-browser-2f053dbe69df)
- [Vue Mastery Dark Mode](https://www.vuemastery.com/blog/implementing-dark-mode-with-vueuse/)

### npm Packages
- [xlsx npm (outdated warning)](https://www.npmjs.com/package/xlsx)
- [file-saver npm](https://www.npmjs.com/package/file-saver)
- [loglevel npm](https://www.npmjs.com/package/loglevel)
