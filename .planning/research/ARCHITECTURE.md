# Architecture Research: v1.1

**Researched:** 2026-01-19
**Overall confidence:** HIGH (existing patterns well-established, new patterns use existing libraries)

## Summary

The v1.1 features integrate cleanly with the existing Vue 3/Pinia architecture. The current codebase follows consistent patterns:

1. **Composables** manage reactive state and API calls (`useWizard`, `useGeneSearch`, `useCarrierFrequency`)
2. **Pinia stores** with `pinia-plugin-persistedstate` for persisted user preferences (`useTemplateStore`)
3. **Config-driven** approach with JSON files in `src/config/` accessed via typed helpers
4. **Services/utils** are pure functions without reactive state (`variant-filters.ts`, `frequency-calc.ts`)

The v1.1 features map to these patterns:

| Feature | Pattern | Location |
|---------|---------|----------|
| ClinGen caching | New Pinia store with TTL | `src/stores/useClingenStore.ts` |
| Settings system | Extend existing Pinia store + new store | `src/stores/useSettingsStore.ts` |
| Browser logging | New composable + component | `src/composables/useLogger.ts` |
| App shell | Refactor `App.vue` with Vuetify layout | `src/App.vue`, `src/layouts/` |

---

## 1. ClinGen Data Caching

### Integration Pattern

Create a new Pinia store with TTL-based cache invalidation using the existing `pinia-plugin-persistedstate` plugin. The pattern extends what `useTemplateStore` already does, adding timestamp tracking for monthly expiry.

**Key insight:** ClinGen does not expose a public GraphQL API for gene-disease validity. Data is available only via CSV download from https://search.clinicalgenome.org/kb/downloads. The implementation must either:

1. **Option A (Recommended):** Pre-process CSV to JSON at build time, bundle as static asset
2. **Option B:** Fetch CSV at runtime, parse in browser (larger payload, slower)

### Data Flow

```
[Build Time / First Load]

clinicalgenome.org/kb/downloads
        |
        v (CSV download)
  Parse to JSON
        |
        v
useClingenStore (Pinia)
        |
        v (persist with timestamp)
  localStorage

[Subsequent Loads]

localStorage ─────────────────────────────────┐
        |                                     |
        v (check timestamp)                   |
  If expired (>30 days) ─── refetch ──────────┘
        |
        v (if valid)
  Return cached data
        |
        v
useCarrierFrequency (lookup gene)
        |
        v
Display inheritance warning if not AR
```

### New Components/Files

```
src/
├── stores/
│   └── useClingenStore.ts      # NEW: Cache store with TTL
├── services/
│   └── clingen-service.ts      # NEW: CSV fetch + parse logic
├── types/
│   └── clingen.ts              # NEW: TypeScript interfaces
└── config/
    └── clingen.json            # NEW: Cache settings (TTL, URL)
```

### Store Implementation Pattern

```typescript
// src/stores/useClingenStore.ts
interface ClingenCacheState {
  geneValidity: Record<string, ClingenGeneValidity>;
  lastUpdated: number | null;  // Unix timestamp
  isLoading: boolean;
  error: string | null;
}

export const useClingenStore = defineStore('clingen', {
  state: (): ClingenCacheState => ({
    geneValidity: {},
    lastUpdated: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    isExpired: (state) => {
      if (!state.lastUpdated) return true;
      const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
      return Date.now() - state.lastUpdated > TTL_MS;
    },

    getGeneValidity: (state) => (gene: string) => {
      return state.geneValidity[gene.toUpperCase()] ?? null;
    },
  },

  actions: {
    async refreshCache(force = false) {
      if (!force && !this.isExpired) return;
      // Fetch and parse ClinGen CSV
    },

    lookupGene(gene: string): ClingenGeneValidity | null {
      // Trigger refresh if expired, return cached data
    },
  },

  persist: {
    key: 'clingen-cache',
    storage: localStorage,
  },
});
```

### Dependencies

- Depends on: `pinia-plugin-persistedstate` (already installed)
- No new npm dependencies required
- ClinGen CSV parsing can use built-in `fetch` + simple CSV parser (or add `papaparse`)

---

## 2. Settings System

### Integration Pattern

Create a new `useSettingsStore` for application-wide settings (theme, filter defaults). This follows the existing `useTemplateStore` pattern but separates concerns:

- `useTemplateStore`: Clinical text preferences (language, gender style, sections)
- `useSettingsStore`: Application settings (theme, filter defaults, logging level)

### Data Flow

```
User interacts with Settings UI
        |
        v
useSettingsStore.setFilterDefaults()
        |
        v (auto-persist)
localStorage
        |
        v (reactive)
Components read via computed getters
```

### New Components/Files

```
src/
├── stores/
│   └── useSettingsStore.ts     # NEW: App settings store
├── components/
│   └── settings/
│       ├── SettingsDialog.vue  # NEW: Settings modal
│       ├── FilterSettings.vue  # NEW: Filter defaults panel
│       └── ThemeSettings.vue   # NEW: Theme toggle panel
└── config/
    └── settings.json           # EXTEND: Add filter default schema
```

### Store Implementation Pattern

```typescript
// src/stores/useSettingsStore.ts
interface SettingsState {
  // Theme
  theme: 'light' | 'dark' | 'system';

  // Filter defaults
  filterDefaults: {
    includeLofHC: boolean;
    includeMissense: boolean;
    includeClinVarPathogenic: boolean;
    includeClinVarLikelyPathogenic: boolean;
    minClinVarStars: number;
  };

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logRetentionDays: number;
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    theme: 'system',
    filterDefaults: {
      includeLofHC: true,
      includeMissense: false,
      includeClinVarPathogenic: true,
      includeClinVarLikelyPathogenic: true,
      minClinVarStars: 1,
    },
    logLevel: 'warn',
    logRetentionDays: 7,
  }),

  actions: {
    setTheme(theme: SettingsState['theme']) {
      this.theme = theme;
      this.applyTheme();
    },

    applyTheme() {
      // Update Vuetify theme via useTheme()
    },
  },

  persist: {
    key: 'app-settings',
    storage: localStorage,
  },
});
```

### Theme Integration with Vuetify

```typescript
// In component or App.vue setup
import { useTheme } from 'vuetify';
import { useSettingsStore } from '@/stores/useSettingsStore';

const theme = useTheme();
const settings = useSettingsStore();

// Apply stored theme on load
watch(() => settings.theme, (newTheme) => {
  if (newTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme.global.name.value = prefersDark ? 'dark' : 'light';
  } else {
    theme.global.name.value = newTheme;
  }
}, { immediate: true });
```

### Dependencies

- Vuetify `useTheme()` composable (already available)
- No new npm dependencies

---

## 3. Browser-Based Logging

### Integration Pattern

Create a logging composable that:
1. Captures log events with timestamps and context
2. Stores logs in a circular buffer (memory) with optional persistence
3. Provides a LogViewer component for debugging

This is NOT a Vue plugin approach (like `vue-logger-plugin`) because the existing codebase uses composables consistently. A composable fits the architecture better.

### Data Flow

```
Application code
        |
        v
useLogger().log('info', 'message', { context })
        |
        v
Log buffer (reactive ref, max N entries)
        |
        v (optional persist)
localStorage (pruned to retention period)
        |
        v
LogViewer component displays entries
```

### New Components/Files

```
src/
├── composables/
│   └── useLogger.ts            # NEW: Logging composable
├── components/
│   └── debug/
│       └── LogViewer.vue       # NEW: Log display component
└── types/
    └── logger.ts               # NEW: Log entry types
```

### Composable Implementation Pattern

```typescript
// src/composables/useLogger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  source?: string;
}

const LOG_BUFFER_SIZE = 500;
const logs = ref<LogEntry[]>([]);

export function useLogger(source?: string) {
  const settings = useSettingsStore();

  const shouldLog = (level: LogLevel): boolean => {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(settings.logLevel);
  };

  const log = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      source,
    };

    logs.value.push(entry);
    if (logs.value.length > LOG_BUFFER_SIZE) {
      logs.value.shift();
    }

    // Also log to console in dev
    if (import.meta.env.DEV) {
      console[level](message, context);
    }
  };

  return {
    logs: readonly(logs),
    log,
    debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
    info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
    clear: () => { logs.value = []; },
  };
}
```

### LogViewer Component Pattern

```vue
<!-- src/components/debug/LogViewer.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="800">
    <v-card>
      <v-card-title>
        Application Logs
        <v-spacer />
        <v-btn icon @click="logger.clear()">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-virtual-scroll :items="logs" height="400" item-height="48">
          <template #default="{ item }">
            <div class="log-entry" :class="item.level">
              <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
              <span class="level">{{ item.level }}</span>
              <span class="message">{{ item.message }}</span>
            </div>
          </template>
        </v-virtual-scroll>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
```

### Dependencies

- Vuetify `v-virtual-scroll` for performance with many log entries
- No new npm dependencies

---

## 4. App Shell with Navigation

### Integration Pattern

Refactor `App.vue` from a simple single-component layout to a proper Vuetify app shell with:

- `v-app-bar`: Logo, title, settings gear, theme toggle
- `v-navigation-drawer`: Navigation links (Calculator, Help, About)
- `v-main`: Current wizard content

This is a structural change that wraps the existing `WizardStepper` component.

### Data Flow

```
App.vue (shell)
    |
    ├── v-app-bar
    │   ├── Logo
    │   ├── Title
    │   ├── Theme toggle (reads/writes useSettingsStore)
    │   └── Settings gear (opens SettingsDialog)
    |
    ├── v-navigation-drawer
    │   ├── Calculator (current wizard)
    │   ├── Help/FAQ
    │   └── About
    |
    └── v-main
        └── <router-view> or WizardStepper
```

### New Components/Files

```
src/
├── App.vue                     # REFACTOR: Add shell structure
├── components/
│   ├── AppBar.vue              # NEW: Top bar with logo, actions
│   ├── AppDrawer.vue           # NEW: Navigation drawer
│   └── settings/
│       └── SettingsDialog.vue  # NEW: Settings modal
└── assets/
    ├── logo.svg                # NEW: App logo
    └── favicon.ico             # NEW: Favicon
```

### App.vue Refactored Structure

```vue
<!-- src/App.vue -->
<template>
  <v-app>
    <AppBar @toggle-drawer="drawer = !drawer" @open-settings="settingsOpen = true" />

    <AppDrawer v-model="drawer" />

    <v-main>
      <v-container max-width="900">
        <!-- If using vue-router -->
        <router-view />
        <!-- Or keep WizardStepper directly for now -->
        <WizardStepper />
      </v-container>
    </v-main>

    <SettingsDialog v-model="settingsOpen" />
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppBar from '@/components/AppBar.vue';
import AppDrawer from '@/components/AppDrawer.vue';
import SettingsDialog from '@/components/settings/SettingsDialog.vue';
import WizardStepper from '@/components/wizard/WizardStepper.vue';

const drawer = ref(false);
const settingsOpen = ref(false);
</script>
```

### AppBar Component Pattern

```vue
<!-- src/components/AppBar.vue -->
<template>
  <v-app-bar color="primary" density="comfortable">
    <v-app-bar-nav-icon @click="$emit('toggle-drawer')" />

    <v-img src="@/assets/logo.svg" max-height="32" max-width="32" class="ml-2" />

    <v-app-bar-title>gnomAD Carrier Frequency</v-app-bar-title>

    <v-spacer />

    <v-btn icon @click="toggleTheme">
      <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
    </v-btn>

    <v-btn icon @click="$emit('open-settings')">
      <v-icon>mdi-cog</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from 'vuetify';
import { useSettingsStore } from '@/stores/useSettingsStore';

defineEmits(['toggle-drawer', 'open-settings']);

const theme = useTheme();
const settings = useSettingsStore();

const isDark = computed(() => theme.global.name.value === 'dark');

const toggleTheme = () => {
  settings.setTheme(isDark.value ? 'light' : 'dark');
};
</script>
```

### Router Consideration

The current app has no router. For v1.1, consider adding `vue-router` if Help/About pages are desired. However, a simpler approach:

- Keep single-page architecture
- Use tabs or conditional rendering for Help/About content
- Avoid router complexity for a calculator tool

**Recommendation:** Defer `vue-router` unless multi-page navigation is truly needed.

### Dependencies

- No new npm dependencies (Vuetify layout components already available)
- Optional: `vue-router` if multi-page navigation desired

---

## 5. Template Editor

### Integration Pattern

Extend the existing `useTemplateStore` which already has `customSections` support. Add a UI component for editing templates.

### Data Flow

```
useTemplateStore (existing)
    |
    ├── customSections: Record<string, string>
    ├── setCustomSection(key, template)
    └── resetCustomSection(key)
        |
        v
TemplateEditor.vue (new)
    |
    ├── Shows default template text
    ├── Allows editing with preview
    └── Saves to customSections
```

### New Components/Files

```
src/
└── components/
    └── settings/
        └── TemplateEditor.vue  # NEW: Template editing UI
```

### Component Pattern

```vue
<!-- src/components/settings/TemplateEditor.vue -->
<template>
  <v-card>
    <v-card-title>Edit Templates</v-card-title>
    <v-card-text>
      <v-select
        v-model="selectedPerspective"
        :items="perspectives"
        label="Perspective"
      />
      <v-select
        v-model="selectedSection"
        :items="sections"
        label="Section"
      />
      <v-textarea
        v-model="editedTemplate"
        label="Template"
        rows="6"
        :hint="'Variables: {{gene}}, {{carrierFrequency}}, etc.'"
      />
      <v-card variant="tonal" class="mt-4">
        <v-card-subtitle>Preview</v-card-subtitle>
        <v-card-text>{{ renderedPreview }}</v-card-text>
      </v-card>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="resetToDefault">Reset to Default</v-btn>
      <v-spacer />
      <v-btn color="primary" @click="save">Save</v-btn>
    </v-card-actions>
  </v-card>
</template>
```

### Dependencies

- Uses existing `useTemplateStore` and `template-renderer.ts`
- No new npm dependencies

---

## 6. Filter Configuration

### Integration Pattern

The current `variant-filters.ts` has hardcoded filter logic. Refactor to:

1. Make filter criteria configurable via `useSettingsStore.filterDefaults`
2. Allow per-calculation override in the wizard UI
3. Keep pure functions but accept filter config as parameter

### Data Flow

```
useSettingsStore.filterDefaults (defaults)
        |
        v
StepFrequency.vue (optional override UI)
        |
        v
useCarrierFrequency (passes config to filter)
        |
        v
filterPathogenicVariants(variants, clinvar, filterConfig)
```

### Modified Files

```
src/
├── stores/
│   └── useSettingsStore.ts     # Has filterDefaults
├── utils/
│   └── variant-filters.ts      # MODIFY: Accept FilterConfig parameter
├── types/
│   └── filter.ts               # NEW: FilterConfig type
├── composables/
│   └── useCarrierFrequency.ts  # MODIFY: Pass filter config
└── components/
    └── wizard/
        └── StepFrequency.vue   # MODIFY: Add filter override UI
```

### Filter Config Type

```typescript
// src/types/filter.ts
export interface FilterConfig {
  includeLofHC: boolean;
  includeMissense: boolean;
  includeClinVarPathogenic: boolean;
  includeClinVarLikelyPathogenic: boolean;
  minClinVarStars: number;
}
```

### Modified Filter Function

```typescript
// src/utils/variant-filters.ts
export function filterPathogenicVariants(
  variants: GnomadVariant[],
  clinvarVariants: ClinVarVariant[],
  config: FilterConfig = defaultFilterConfig
): GnomadVariant[] {
  return variants.filter((v) => shouldIncludeVariant(v, clinvarVariants, config));
}
```

---

## Suggested Build Order

Based on dependencies between features:

### Phase 1: Foundation (Settings + Theme)

**Build first because other features depend on settings store.**

1. `useSettingsStore.ts` - New store with theme + filter defaults
2. `ThemeSettings.vue` - Theme toggle component
3. Refactor `main.ts` - Apply stored theme on load
4. Update `App.vue` - Add basic app bar with theme toggle

**Deliverable:** Working theme toggle, settings persistence

### Phase 2: App Shell

**Build second because it provides the UI container for other features.**

1. `AppBar.vue` - Full app bar with logo, actions
2. `AppDrawer.vue` - Navigation drawer (even if minimal)
3. `SettingsDialog.vue` - Modal for settings
4. Refactor `App.vue` - Full shell structure
5. Add logo/favicon assets

**Deliverable:** Complete app shell with navigation and settings access

### Phase 3: Filter Configuration

**Build third because it's isolated and improves core functionality.**

1. `FilterConfig` type in `types/filter.ts`
2. Refactor `variant-filters.ts` to accept config
3. `FilterSettings.vue` - Settings panel for defaults
4. Update `StepFrequency.vue` - Optional override UI
5. Wire through `useCarrierFrequency`

**Deliverable:** Configurable variant filtering

### Phase 4: ClinGen Integration

**Build fourth because it's independent and adds clinical value.**

1. `useClingenStore.ts` - Cache store with TTL
2. `clingen-service.ts` - CSV fetch/parse (or static JSON)
3. Type definitions in `types/clingen.ts`
4. Inheritance warning UI in `StepGene.vue` or `StepResults.vue`

**Deliverable:** ClinGen gene validity lookup with inheritance warnings

### Phase 5: Browser Logging

**Build fifth because it supports debugging of all previous features.**

1. `useLogger.ts` composable
2. `LogViewer.vue` component
3. Add logging to key composables (useGeneSearch, useCarrierFrequency)
4. Settings integration for log level

**Deliverable:** In-app log viewer for debugging

### Phase 6: Template Editor

**Build last because it extends existing functionality.**

1. `TemplateEditor.vue` component
2. Integrate into SettingsDialog
3. Preview functionality

**Deliverable:** User-editable clinical text templates

---

## Component Boundaries Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ App.vue (Shell)                                                 │
│   ├── AppBar.vue                                                │
│   │     └── reads: useSettingsStore (theme)                     │
│   │     └── emits: toggle-drawer, open-settings                 │
│   ├── AppDrawer.vue                                             │
│   │     └── Navigation links                                    │
│   ├── SettingsDialog.vue                                        │
│   │     ├── ThemeSettings.vue → useSettingsStore                │
│   │     ├── FilterSettings.vue → useSettingsStore               │
│   │     └── TemplateEditor.vue → useTemplateStore               │
│   └── v-main                                                    │
│         └── WizardStepper.vue (existing)                        │
│               └── reads: useSettingsStore.filterDefaults        │
│               └── queries: useClingenStore for warnings         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Stores                                                          │
│   ├── useSettingsStore (NEW)                                    │
│   │     ├── theme: 'light' | 'dark' | 'system'                  │
│   │     ├── filterDefaults: FilterConfig                        │
│   │     └── logLevel, logRetentionDays                          │
│   ├── useTemplateStore (EXISTING)                               │
│   │     ├── language, genderStyle, patientSex                   │
│   │     ├── enabledSections                                     │
│   │     └── customSections                                      │
│   └── useClingenStore (NEW)                                     │
│         ├── geneValidity: Record<string, ClingenGeneValidity>   │
│         ├── lastUpdated: timestamp                              │
│         └── isExpired, refreshCache(), lookupGene()             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Composables                                                     │
│   ├── useLogger (NEW)                                           │
│   │     └── log(), debug(), info(), warn(), error(), clear()    │
│   ├── useWizard (EXISTING)                                      │
│   ├── useGeneSearch (EXISTING, add logging)                     │
│   ├── useCarrierFrequency (MODIFY, accept FilterConfig)         │
│   └── useTextGenerator (EXISTING)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sources

### Pinia Persistence & Caching
- [Pinia Plugin Persistedstate - Advanced Usage](https://prazdevs.github.io/pinia-plugin-persistedstate/guide/advanced.html) - Custom serializers, hooks
- [Pinia State Documentation](https://pinia.vuejs.org/core-concepts/state.html) - $subscribe for persistence
- [vue-pinia-cache-composables](https://github.com/volkar/vue-pinia-cache-composables) - TTL-based caching pattern

### Vuetify Layout & Theming
- [Vuetify Application Layout](https://vuetifyjs.com/en/features/application-layout/) - v-app, v-main, layout components
- [Vuetify Navigation Drawers](https://vuetifyjs.com/en/components/navigation-drawers/) - Drawer patterns
- [Vuetify Theme](https://vuetifyjs.com/en/features/theme/) - Theme toggle patterns
- [Layouts & Theming in Vuetify 3](https://www.thisdot.co/blog/layouts-and-theming-in-vuetify-3) - Implementation guide

### Vue Logging
- [vue-logger-plugin](https://github.com/dev-tavern/vue-logger-plugin) - Logging patterns (reference only, using composable instead)
- [vuejs3-logger](https://github.com/MarcSchaetz/vuejs3-logger) - Log level patterns

### ClinGen Data
- [ClinGen File Downloads](https://search.clinicalgenome.org/kb/downloads) - Gene validity CSV available, no public API
- [ClinGen GitHub](https://github.com/clingen-data-model) - genegraph-api (internal use)

### Existing Codebase
- `/mnt/c/development/gnomad-carrier-frequency/src/stores/useTemplateStore.ts` - Pinia persist pattern
- `/mnt/c/development/gnomad-carrier-frequency/src/composables/useWizard.ts` - Composable pattern
- `/mnt/c/development/gnomad-carrier-frequency/src/utils/variant-filters.ts` - Pure function pattern
