---
phase: 03-german-text
plan: 02
subsystem: text-generation
tags: [pinia, state-management, persistence, composables, localization]

# Dependency graph
requires:
  - phase: 03-01
    provides: TemplateContext types, renderTemplate utility, JSON templates
  - phase: 02-wizard-ui
    provides: Wizard state (indexStatus, frequencySource, literatureFrequency)
provides:
  - useTemplateStore for template state and persistence
  - useTextGenerator composable for text generation API
affects: [03-03-ui]

# Tech tracking
tech-stack:
  added:
    - pinia@3.0.4
    - pinia-plugin-persistedstate@4.7.1
  patterns:
    - "Pinia store with options API (state/getters/actions)"
    - "localStorage persistence with pinia-plugin-persistedstate"
    - "Browser language detection for default"
    - "Composable returns reactive computed + store action proxies"

key-files:
  created:
    - src/stores/useTemplateStore.ts
    - src/composables/useTextGenerator.ts
  modified:
    - src/main.ts
    - src/composables/index.ts
    - package.json
    - package-lock.json

key-decisions:
  - "Pinia options API over setup API for persistence plugin compatibility"
  - "localStorage key 'carrier-freq-templates' for persistence"
  - "Browser language detection defaults to English unless German"
  - "genderSuffix computed from genderStyle in store getter"
  - "Recurrence risk divisor: 4 for carriers, 2 for affected"

patterns-established:
  - "Store getter returns language-appropriate template config"
  - "Composable accepts getter function for reactive input"
  - "Locale-aware number formatting (German comma, English period)"
  - "Source attribution formats differ by source type"

# Metrics
duration: 12min
completed: 2026-01-19
---

# Phase 3 Plan 2: Pinia Store and Text Generator Summary

**Pinia store for template state persistence and useTextGenerator composable for combining templates with calculation context**

## What Was Built

### Pinia Store (src/stores/useTemplateStore.ts)

**State:**
```typescript
{
  language: 'de' | 'en',              // Browser-detected default
  genderStyle: GenderStyle,           // '*' | ':' | '/' | 'traditional'
  enabledSections: Record<Perspective, string[]>,  // Per-perspective enabled sections
  customSections: Record<string, string>           // Custom template overrides
}
```

**Getters:**
- `defaultTemplates`: Returns `de.json` or `en.json` based on language
- `genderSuffix`: Returns '*innen', ':innen', '/-innen', or 'innen' based on genderStyle

**Actions:**
- `setLanguage(lang)`: Switch between German/English
- `setGenderStyle(style)`: Update gender-inclusive style
- `toggleSection(perspective, sectionId)`: Toggle section on/off
- `setSectionEnabled(perspective, sectionId, enabled)`: Set section state
- `setCustomSection(key, template)`: Override a template
- `resetCustomSection(key)`: Remove override
- `resetAllCustomizations()`: Clear all overrides

**Persistence:**
- Uses `pinia-plugin-persistedstate`
- localStorage key: `carrier-freq-templates`
- Survives page refresh

### Text Generator Composable (src/composables/useTextGenerator.ts)

**Input Interface:**
```typescript
interface TextGeneratorInput {
  result: CarrierFrequencyResult | null;
  frequencySource: FrequencySource;
  indexStatus: IndexPatientStatus;
  literatureFrequency: number | null;
  literaturePmid: string | null;
  usingDefault: boolean;
}
```

**Returns:**
```typescript
{
  templateContext: ComputedRef<TemplateContext | null>,  // Built from input
  generateText: (perspective: Perspective) => string,    // Main text generation
  getSections: (perspective: Perspective) => SectionInfo[], // For UI toggles
  language: ComputedRef<'de' | 'en'>,
  genderStyle: ComputedRef<GenderStyle>,
  setLanguage: (lang) => void,
  setGenderStyle: (style) => void,
  toggleSection: (perspective, sectionId) => void,
}
```

**Key Behaviors:**
1. **Frequency Resolution**: gnomAD -> uses globalCarrierFrequency; literature -> uses literatureFrequency; default -> uses config value
2. **Recurrence Risk**: Divides frequency by 4 (carrier) or 2 (affected)
3. **Locale Formatting**: German uses comma (0,25%), English uses period (0.25%)
4. **Source Attribution**:
   - gnomAD: "(gnomAD v4, https://gnomad.broadinstitute.org, abgerufen am DD.MM.YYYY)"
   - Literature: "(PMID: xxxxx)"
   - Default: "(Standardannahme)"

### Main.ts Integration

Pinia installed before Vuetify:
```typescript
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
// ...
app.use(pinia)  // Must be before other plugins
app.use(vuetify)
```

## Locale-Aware Formatting

| Format | German (de-DE) | English (en-US) |
|--------|----------------|-----------------|
| Percentage | 0,25% | 0.25% |
| Ratio | 1:400 | 1:400 |
| Date | 19.01.2026 | January 19, 2026 |

## Commits

| Commit | Description |
|--------|-------------|
| 783e333 | chore(03-02): install Pinia and persistence plugin |
| 5a6847a | feat(03-02): create Pinia template store with persistence |
| 66859aa | feat(03-02): create useTextGenerator composable |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 03-03 (UI integration):
- `useTemplateStore` provides reactive template state
- `useTextGenerator` provides text generation API
- Both exported from their respective barrels
- Persistence works across page refresh
- Language detection operational
