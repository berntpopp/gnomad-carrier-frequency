# Phase 10: Export + Templates + Logging - Research

**Researched:** 2026-01-19
**Domain:** File export, template editing, application logging
**Confidence:** HIGH

## Summary

Phase 10 implements three distinct feature areas: data export (JSON/Excel), template customization with variable highlighting, and application logging with a viewer panel. The export functionality requires SheetJS (xlsx) for Excel generation with multiple sheets. Template editing uses a contenteditable approach with custom highlighting for `{{variable}}` placeholders rendered as chips. Logging uses a Pinia store with circular buffer pattern persisted to localStorage.

The existing codebase already has strong foundations: `useTemplateStore` with persistence handles template state, the `template-renderer.ts` handles `{{variable}}` substitution, and the settings dialog already has a "Templates" tab placeholder. The logging system and export features require new implementations.

**Primary recommendation:** Use SheetJS (xlsx) for Excel export, implement a custom contenteditable editor with chip rendering for template variables, and create a dedicated log store with configurable ring buffer for logging.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| xlsx (SheetJS) | 0.20.3+ | Excel file generation | De-facto standard for browser Excel export, supports multi-sheet workbooks |
| pinia | 3.x (existing) | Log state management | Already used, supports persistence plugin |
| pinia-plugin-persistedstate | 4.x (existing) | Log persistence | Already configured in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-saver | 2.0.5 | Blob downloads (optional) | Alternative to native download, but native approach preferred |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xlsx | ExcelJS | ExcelJS heavier (400KB+ vs 200KB), xlsx more widely used |
| xlsx | vue-json-excel3 | vue-json-excel3 uses HTML tables (shows warning), xlsx creates native .xlsx |
| monaco-editor | contenteditable + highlighting | Monaco is overkill for template editing; contenteditable is lighter and sufficient |
| monaco-editor | vue-prism-editor | Prism is code-focused; contenteditable allows custom chip rendering |

**Installation:**
```bash
bun add xlsx
```

Note: xlsx is installed from the SheetJS CDN for the latest version:
```bash
bun add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── composables/
│   ├── useExport.ts           # Export composable for JSON/Excel
│   └── useLogger.ts           # Logging composable wrapping log store
├── stores/
│   ├── useLogStore.ts         # Log entries with ring buffer
│   └── useTemplateStore.ts    # Extended for template editing (existing)
├── components/
│   ├── LogViewer.vue          # Side panel component
│   ├── LogViewerPanel.vue     # Navigation drawer wrapper
│   ├── TemplateEditor.vue     # Contenteditable editor with chips
│   └── VariablePicker.vue     # Variable insertion picker
└── utils/
    └── export-utils.ts        # Pure export formatting functions
```

### Pattern 1: Export Composable
**What:** Centralized export logic separated from UI
**When to use:** Export from multiple locations (Results step, VariantModal)
**Example:**
```typescript
// src/composables/useExport.ts
import * as XLSX from 'xlsx';

export function useExport() {
  function exportToJson(data: ExportData, filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
  }

  function exportToExcel(data: ExportData, filename: string) {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryWs = XLSX.utils.json_to_sheet([data.summary]);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Populations sheet
    const populationsWs = XLSX.utils.json_to_sheet(data.populations);
    XLSX.utils.book_append_sheet(wb, populationsWs, 'Populations');

    // Variants sheet
    const variantsWs = XLSX.utils.json_to_sheet(data.variants);
    XLSX.utils.book_append_sheet(wb, variantsWs, 'Variants');

    // Metadata sheet
    const metadataWs = XLSX.utils.json_to_sheet([data.metadata]);
    XLSX.utils.book_append_sheet(wb, metadataWs, 'Metadata');

    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { exportToJson, exportToExcel };
}
```

### Pattern 2: Log Store with Ring Buffer
**What:** Pinia store managing log entries with automatic pruning
**When to use:** Application-wide logging with memory limits
**Example:**
```typescript
// src/stores/useLogStore.ts
import { defineStore } from 'pinia';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  details?: unknown;
}

interface LogSettings {
  maxEntries: number;
  autoClearOnStart: boolean;
  defaultFilterLevel: LogLevel;
  enabledCategories: string[];
}

interface LogStoreState {
  entries: LogEntry[];
  nextId: number;
  droppedCount: number;
  settings: LogSettings;
}

export const useLogStore = defineStore('logs', {
  state: (): LogStoreState => ({
    entries: [],
    nextId: 1,
    droppedCount: 0,
    settings: {
      maxEntries: 500,
      autoClearOnStart: false,
      defaultFilterLevel: 'INFO',
      enabledCategories: ['api', 'calculation', 'error'],
    },
  }),

  getters: {
    memoryEstimate: (state): string => {
      const bytes = JSON.stringify(state.entries).length;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    },
  },

  actions: {
    log(level: LogLevel, category: string, message: string, details?: unknown) {
      const entry: LogEntry = {
        id: this.nextId++,
        timestamp: Date.now(),
        level,
        category,
        message,
        details,
      };

      this.entries.push(entry);

      // Ring buffer: remove oldest when exceeding max
      while (this.entries.length > this.settings.maxEntries) {
        this.entries.shift();
        this.droppedCount++;
      }
    },

    clear() {
      this.entries = [];
      this.droppedCount = 0;
    },

    updateSettings(settings: Partial<LogSettings>) {
      Object.assign(this.settings, settings);
    },
  },

  persist: {
    key: 'carrier-freq-logs',
    storage: localStorage,
    paths: ['entries', 'nextId', 'droppedCount', 'settings'],
  },
});
```

### Pattern 3: Template Editor with Variable Chips
**What:** Contenteditable div with custom rendering of {{variables}} as chips
**When to use:** Template editing UI with visual variable highlighting
**Example:**
```typescript
// Component approach: Parse template into segments
interface TemplateSegment {
  type: 'text' | 'variable';
  content: string;
}

function parseTemplate(template: string): TemplateSegment[] {
  const regex = /(\{\{(\w+)\}\})/g;
  const segments: TemplateSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(template)) !== null) {
    // Text before variable
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: template.slice(lastIndex, match.index),
      });
    }
    // Variable
    segments.push({
      type: 'variable',
      content: match[2], // Variable name without braces
    });
    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < template.length) {
    segments.push({
      type: 'text',
      content: template.slice(lastIndex),
    });
  }

  return segments;
}
```

### Pattern 4: Right-Side Navigation Drawer for Logs
**What:** Temporary drawer sliding from right for log viewer
**When to use:** Non-primary UI that needs overlay access
**Example:**
```vue
<template>
  <v-navigation-drawer
    v-model="showLogViewer"
    location="right"
    temporary
    width="450"
  >
    <LogViewer @close="showLogViewer = false" />
  </v-navigation-drawer>
</template>
```

### Anti-Patterns to Avoid
- **Direct console.log everywhere:** Use logger composable for consistent logging
- **Storing full variant objects in exports:** Extract only needed fields to reduce file size
- **Using textarea for template editing:** Cannot render chips/rich formatting
- **Unbounded log growth:** Always use ring buffer pattern with configurable max
- **Blocking main thread with large Excel exports:** Consider web worker for very large datasets (future)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel file creation | Custom XML generation | SheetJS xlsx | Excel format is complex, xlsx handles all edge cases |
| File download in browser | Manual anchor creation (repeated) | Utility function once | Centralize download logic, handle cleanup properly |
| Timestamp formatting | Custom date logic | `toLocaleString()` with options | Handles localization, timezone, formatting |
| JSON serialization | Manual string building | `JSON.stringify(data, null, 2)` | Handles escaping, formatting, circular refs |

**Key insight:** Excel file format (.xlsx) is actually a complex ZIP archive with XML files. SheetJS abstracts this entirely. Custom solutions would require understanding OpenXML format.

## Common Pitfalls

### Pitfall 1: Excel Warning Message with HTML-based Approach
**What goes wrong:** Using HTML table-based Excel export shows "file format differs from extension" warning
**Why it happens:** HTML is not native Excel format; Excel detects mismatch
**How to avoid:** Use SheetJS which generates proper .xlsx OpenXML format
**Warning signs:** `vue-json-excel3` or similar HTML-based exporters

### Pitfall 2: Contenteditable Cursor Position Loss
**What goes wrong:** Cursor jumps to beginning or end after updating innerHTML
**Why it happens:** DOM manipulation resets selection state
**How to avoid:** Save cursor position before update, restore after with `nextTick()`
**Warning signs:** Template editor cursor behavior feels broken during typing

### Pitfall 3: Log Store Memory Growth
**What goes wrong:** Logs accumulate indefinitely, slowing app and filling localStorage
**Why it happens:** No maximum limit, persistence stores everything
**How to avoid:** Implement ring buffer pattern with configurable max entries
**Warning signs:** App becomes sluggish over time, localStorage quota errors

### Pitfall 4: Variable Picker Cursor Context
**What goes wrong:** Variable inserted at wrong position after clicking picker
**Why it happens:** Clicking picker moves focus away from editor, losing cursor position
**How to avoid:** Store selection range before picker gains focus, restore before insert
**Warning signs:** Variables always inserted at beginning or end instead of cursor position

### Pitfall 5: Template Custom Section Key Collision
**What goes wrong:** Custom template overwrites wrong section
**Why it happens:** Key structure `perspective.sectionId` not properly namespaced
**How to avoid:** Existing pattern `${perspective}.${sectionId}` is correct; maintain consistency
**Warning signs:** Editing "carrier.geneIntro" affects other perspectives

### Pitfall 6: Export Filename Special Characters
**What goes wrong:** Files fail to download or have corrupted names
**Why it happens:** Gene names may contain special characters not safe for filenames
**How to avoid:** Sanitize filenames, replace unsafe characters
**Warning signs:** Downloads fail silently for certain genes

## Code Examples

Verified patterns from official sources:

### SheetJS Multi-Sheet Export
```typescript
// Source: https://docs.sheetjs.com/docs/solutions/output/
import * as XLSX from 'xlsx';

function exportMultiSheet(data: {
  summary: object[];
  populations: object[];
  variants: object[];
  metadata: object[];
}, filename: string) {
  const wb = XLSX.utils.book_new();

  // Each sheet from array of objects
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.summary), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.populations), 'Populations');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.variants), 'Variants');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.metadata), 'Metadata');

  // writeFile handles browser download
  XLSX.writeFile(wb, filename);
}
```

### Vuetify Right-Side Temporary Drawer
```vue
<!-- Source: https://vuetifyjs.com/en/components/navigation-drawers/ -->
<template>
  <v-navigation-drawer
    v-model="drawer"
    location="right"
    temporary
    width="400"
  >
    <div class="pa-4">
      <div class="d-flex justify-space-between align-center mb-4">
        <h3>Application Logs</h3>
        <v-btn icon="mdi-close" variant="text" @click="drawer = false" />
      </div>
      <!-- Log content -->
    </div>
  </v-navigation-drawer>
</template>
```

### Pinia Store with Persistence
```typescript
// Source: https://pinia.vuejs.org/core-concepts/state.html
// Pattern: existing project stores (useAppStore, useTemplateStore)
import { defineStore } from 'pinia';

export const useLogStore = defineStore('logs', {
  state: () => ({
    entries: [],
    settings: {
      maxEntries: 500,
    },
  }),

  persist: {
    key: 'carrier-freq-logs',
    storage: localStorage,
  },
});
```

### vite-plugin-checker Configuration
```typescript
// Source: https://vite-plugin-checker.netlify.app/
// vite.config.ts
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [
    vue(),
    checker({
      vueTsc: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,vue}"',
      },
    }),
  ],
});
```

### Native Browser File Download
```typescript
// Pattern: No external library needed
function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Clean up
}

// Usage
downloadFile(jsonString, 'export.json', 'application/json');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FileSaver.js for downloads | Native Blob + URL.createObjectURL | 2020+ | No dependency needed for simple downloads |
| Separate type-check process | vite-plugin-checker parallel | 2022+ | Faster dev feedback, single terminal |
| Monaco for all editors | Lightweight contenteditable | Context-dependent | Monaco overkill for simple template editing |

**Deprecated/outdated:**
- `xlsx-populate`: Less maintained than SheetJS
- `exceljs` in browser: Better suited for Node.js, heavier than SheetJS
- `vue-json-excel`: Shows warning dialog, not native Excel format

## Open Questions

Things that couldn't be fully resolved:

1. **Template editor autocomplete implementation**
   - What we know: Should trigger on `{{` and show dropdown
   - What's unclear: Best UX pattern for contenteditable autocomplete
   - Recommendation: Start with picker panel only; add autocomplete as enhancement if time permits

2. **Log viewer performance with many entries**
   - What we know: Virtual scrolling would help with 500+ entries
   - What's unclear: Whether Vuetify's v-data-table virtual scroll is sufficient
   - Recommendation: Use expandable rows with pagination first; optimize if needed

3. **Large export handling**
   - What we know: SheetJS handles reasonably large datasets in main thread
   - What's unclear: Threshold for when to use web worker
   - Recommendation: Proceed with synchronous export; add loading indicator

## Sources

### Primary (HIGH confidence)
- SheetJS official documentation - https://docs.sheetjs.com/docs/solutions/output/
- SheetJS Vue 3 demo - https://docs.sheetjs.com/docs/demos/frontend/vue/
- Vuetify Navigation Drawer - https://vuetifyjs.com/en/components/navigation-drawers/
- Pinia State documentation - https://pinia.vuejs.org/core-concepts/state.html
- vite-plugin-checker GitHub - https://github.com/fi3ework/vite-plugin-checker

### Secondary (MEDIUM confidence)
- vite-plugin-checker npm - version 0.11.0 current
- vue-contenteditable patterns - https://github.com/hl037/vue-contenteditable
- Contenteditable with highlight.js - https://blog.gongjumi.com/en/blog/highlightjs-code-syntax-highlighting

### Tertiary (LOW confidence)
- Template autocomplete UX patterns - general web search results
- Monaco vs contenteditable tradeoffs - community discussions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SheetJS is well-documented, Pinia patterns established in codebase
- Architecture: HIGH - Patterns follow existing project conventions
- Export functionality: HIGH - SheetJS API is stable and well-documented
- Template editor: MEDIUM - Custom implementation needed, patterns verified but need refinement
- Logging system: HIGH - Standard Pinia store pattern with ring buffer
- vite-plugin-checker: MEDIUM - Documentation verified but parallel config needs testing

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable libraries)
