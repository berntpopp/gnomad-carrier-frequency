---
phase: 31-runtime-gene-config
plan: 01
subsystem: web, core
tags: [gene-config, runtime-loading, github-issues, pwa, vue, composable]

# Dependency graph
requires:
  - phase: 28-gene-config-system
    provides: Gene config schema, loader, registerGeneConfig, setPlatformLoader, seed configs (CFTR, HEXA, GJB2)
  - phase: 29-test-suite
    provides: FilterPanel test with composable mocks, mountWithPlugins helper
provides:
  - Runtime gene config loading from GitHub (no code change needed for new configs)
  - Auto-caching of platform loader results in core registry
  - Glob-based auto-discovery of bundled configs (no manual imports in main.ts)
  - Config loading indicator in FilterPanel
  - Gene config submission dialog (pre-filled GitHub issue URL)
  - Variant exclusions included in submission dialog
  - PWA cache rule for GitHub raw gene config URLs
affects: [gene-config-workflow, community-contributions, pwa-caching]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "import.meta.glob for auto-discovering bundled JSON configs at build time"
    - "setPlatformLoader with fetch for runtime GitHub raw URL loading"
    - "Auto-cache in core loader: registry.set() after successful Zod validation"
    - "Vuetify v-dialog activator slot pattern for GeneConfigSubmitDialog"
    - "URLSearchParams for constructing pre-filled GitHub issue template URLs"

key-files:
  created:
    - apps/web/src/components/GeneConfigSubmitDialog.vue
  modified:
    - packages/core/src/gene-config/loader.ts
    - packages/core/tests/gene-config.test.ts
    - apps/web/src/main.ts
    - apps/web/src/composables/useGeneConfig.ts
    - apps/web/src/components/FilterPanel.vue
    - apps/web/src/components/__tests__/FilterPanel.test.ts
    - apps/web/vite.config.ts

key-decisions:
  - "Glob import with eager:true for offline/PWA support — all bundled configs registered at startup"
  - "Platform loader fetches from GitHub raw main branch — merged configs available immediately without app redeploy"
  - "Auto-cache in core prevents redundant fetches — first load caches, subsequent calls serve from registry"
  - "Submission dialog uses URL params to pre-fill GitHub issue template — no API auth needed"
  - "Excluded variants (from useExclusionState) included in filter-recommendations field of issue"
  - "PWA StaleWhileRevalidate with 1h TTL for gene config URLs — instant on revisit"

patterns-established:
  - "import.meta.glob for auto-discovering config files at build time"
  - "Dual loading: bundled configs (offline) + runtime GitHub fetch (live updates)"

# Metrics
completed: 2026-02-25
---

# Phase 31 Plan 01: Runtime Gene Config Loading + Submission Modal

**Two features: (1) app fetches gene configs from GitHub at runtime so merged configs are immediately available without redeploy, (2) users can propose new configs via a pre-filled GitHub issue directly from the app.**

## Accomplishments

### Feature 1: Runtime Gene Config Loading

- **Auto-cache in core** (`loader.ts`): Added `registry.set(upperSymbol, result.data)` after successful Zod validation from platform loader — prevents re-fetching the same gene config
- **Glob imports** (`main.ts`): Replaced 3 hardcoded `import cftrConfig from '~gene-configs/CFTR.json'` with `import.meta.glob('../../../configs/genes/*.json', { eager: true })` — auto-discovers all bundled configs at build time
- **Runtime loader** (`main.ts`): `setPlatformLoader` fetches from `https://raw.githubusercontent.com/berntpopp/gnomad-carrier-frequency/main/configs/genes/{GENE}.json` for registry misses
- **Loading state** (`useGeneConfig.ts`): Added `configLoading` ref — true during async `loadGeneConfig()` call
- **Loading indicator** (`FilterPanel.vue`): Shows `v-progress-circular` spinner chip while config loads
- **PWA cache** (`vite.config.ts`): `StaleWhileRevalidate` rule for GitHub raw URLs — 1h TTL, 100 max entries

### Feature 2: Gene Config Submission Modal

- **GeneConfigSubmitDialog.vue** (new): Vuetify `v-dialog` with activator slot pattern
  - Read-only fields pre-filled from app state: gene symbol, filter settings summary, penetrance, excluded variants
  - Editable fields: condition name (required), inheritance pattern dropdown, OMIM phenotype ID, will-submit-PR dropdown
  - "Open on GitHub" button constructs `URLSearchParams` URL targeting the `gene-config.yml` issue template
  - Opens in new tab — no API auth needed
- **FilterPanel integration**: "Suggest Gene Config" button (or "Suggest Config Update" when config exists) in bottom action bar, disabled when no gene selected
- **Variant exclusions**: Excluded variant IDs from `useExclusionState` displayed in dialog and included in filter-recommendations field

### Test Updates

- Added `configLoading: ref(false)` to `useGeneConfig` mock in FilterPanel test
- Added `useGeneSearch` mock (FilterPanel now imports it directly for `selectedGene`)
- Added auto-cache unit test in core: proves platform loader called exactly once per gene

## Verification

- `bun run typecheck` — all 3 packages pass (0 errors)
- `bun run test` — 388/388 tests pass (26 files)
- `bun run lint` — 0 errors, 0 warnings
- `bun run dev` — dev server starts cleanly on Node 22.14.0

## Files Created/Modified

| File | Change |
|------|--------|
| `packages/core/src/gene-config/loader.ts` | +1 line: `registry.set(upperSymbol, result.data)` after Zod validation |
| `packages/core/tests/gene-config.test.ts` | +1 test: auto-cache proves loader called once per gene |
| `apps/web/src/main.ts` | Replaced 3 hardcoded imports with glob + setPlatformLoader |
| `apps/web/src/composables/useGeneConfig.ts` | Added `configLoading` ref + interface + return |
| `apps/web/src/components/FilterPanel.vue` | Loading chip, suggest button, GeneConfigSubmitDialog import |
| `apps/web/src/components/GeneConfigSubmitDialog.vue` | **New** — submission dialog with pre-filled GitHub issue URL |
| `apps/web/src/components/__tests__/FilterPanel.test.ts` | Added useGeneSearch mock + configLoading to useGeneConfig mock |
| `apps/web/vite.config.ts` | StaleWhileRevalidate PWA cache for GitHub raw gene config URLs |

## Deviations from Plan

None.

---
*Phase: 31-runtime-gene-config*
*Completed: 2026-02-25*
