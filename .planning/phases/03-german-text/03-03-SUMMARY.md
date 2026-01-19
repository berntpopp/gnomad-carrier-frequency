---
phase: 03-german-text
plan: 03
subsystem: text-generation-ui
tags: [vue-components, clipboard, vuetify, localization, user-interface]

# Dependency graph
requires:
  - phase: 03-02
    provides: useTextGenerator composable, useTemplateStore, text generation API
  - phase: 02-wizard-ui
    provides: StepResults component, wizard state and props
provides:
  - TextOutput component for clinical text generation UI
  - Complete Phase 3 German Text functionality
affects: [04-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chip-based section toggles with click handlers"
    - "Computed model proxies for Vuetify v-model binding"
    - "useClipboard with legacy fallback for broader browser support"
    - "Reactive text generation with computed properties"

key-files:
  created:
    - src/components/wizard/TextOutput.vue
  modified:
    - src/components/wizard/StepResults.vue

key-decisions:
  - "V-chip toggles over v-checkbox for compact section controls"
  - "Computed getter/setter for Vuetify two-way binding with store actions"
  - "useClipboard legacy: true for clipboard-write permission fallback"
  - "Gender style selector only visible in German mode"

patterns-established:
  - "Component receives calculation result via props, uses composable for text generation"
  - "Labels object computed from language for i18n without library"
  - "V-btn-toggle for mutually exclusive options (perspective, language)"

# Metrics
duration: 8min
completed: 2026-01-19
---

# Phase 3 Plan 3: Text Output UI Integration Summary

**TextOutput component with perspective selector, section toggles, live preview, and copy-to-clipboard completing Phase 3 German Text requirements**

## What Was Built

### TextOutput Component (src/components/wizard/TextOutput.vue)

**Component Structure:**

1. **Header Row**
   - Title: "Klinischer Text" (DE) / "Clinical Text" (EN)
   - Language toggle: DE/EN buttons (v-btn-toggle)
   - Gender style selector: Dropdown visible only in German mode

2. **Perspective Selector**
   - Three perspectives: Affected Patient, Carrier, Family Member
   - v-btn-toggle with mandatory selection
   - Defaults to 'affected'

3. **Section Toggles**
   - v-chip components for each available section
   - Click toggles section on/off
   - Visual feedback: elevated/primary when enabled, outlined when disabled
   - Sections filter based on selected perspective

4. **Text Preview**
   - v-card with tonal variant for visual distinction
   - pre-wrap styling preserves line breaks
   - Computed property triggers re-render on any setting change
   - Shows placeholder message when no sections enabled

5. **Copy Button**
   - Uses VueUse useClipboard with legacy: true fallback
   - Shows "Text kopieren" / "Copy text" normally
   - Shows "Kopiert!" / "Copied!" for 2 seconds after click
   - Disabled when no text generated

**Props Interface:**
```typescript
{
  result: CarrierFrequencyResult | null;
  frequencySource: FrequencySource;
  indexStatus: IndexPatientStatus;
  literatureFrequency: number | null;
  literaturePmid: string | null;
  usingDefault: boolean;
}
```

**Composable Integration:**
```typescript
const {
  generateText,
  getSections,
  language,
  genderStyle,
  setLanguage,
  setGenderStyle,
  toggleSection,
} = useTextGenerator(() => ({
  result: props.result,
  frequencySource: props.frequencySource,
  // ... other props
}));
```

### StepResults Integration

Added TextOutput below the results table with a divider:
```vue
<v-divider class="my-6" />

<TextOutput
  v-if="result"
  :result="result"
  :frequency-source="frequencySource"
  :index-status="indexStatus"
  :literature-frequency="literatureFrequency"
  :literature-pmid="literaturePmid"
  :using-default="usingDefault"
/>
```

## UI Features

| Feature | Implementation |
|---------|----------------|
| Language switch | DE/EN v-btn-toggle, persisted to localStorage |
| Perspective selection | Three-button toggle, changes text structure |
| Section toggles | v-chip click handlers, immediate preview update |
| Live preview | Computed property from generateText() |
| Copy feedback | 2-second "Kopiert!" state from useClipboard |
| Gender styles | Dropdown selector (*, :, /, traditional) |

## Phase 3 Requirements Satisfied

| Requirement | Implementation |
|-------------|----------------|
| TEXT-01: German clinical text | Templates in de.json, locale-aware formatting |
| TEXT-02: Perspective selection | Three perspectives with different text structures |
| TEXT-03: Text includes key data | Gene, carrier frequency, source, recurrence risk |
| TEXT-04: Copy-to-clipboard | useClipboard with visual feedback |

## Commits

| Commit | Description |
|--------|-------------|
| 3d72966 | feat(03-03): create TextOutput component with perspective selector and copy |
| 51fcef5 | feat(03-03): integrate TextOutput into StepResults |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed via Playwright automated testing:
- Perspective buttons work (Affected Patient / Carrier / Family Member)
- Generated text changes when switching perspectives
- Section chips toggle sections on/off
- Text preview updates immediately
- Copy button works and shows "Kopiert!" feedback
- Language switch works (DE/EN)
- German text uses proper clinical terminology
- German numbers use comma format (0,25%)
- Source attribution displays correctly

## Phase 3 Complete

Phase 3 German Text is now complete:
- **03-01**: Template system foundation (types, renderer, JSON templates)
- **03-02**: Pinia store and text generator composable
- **03-03**: TextOutput UI component integration

Ready for Phase 4: Deploy (validation and deployment).
