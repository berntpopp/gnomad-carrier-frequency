---
phase: 28-gene-config-system
plan: 03
subsystem: web
tags: [gene-config, vue, composable, filter-panel, chip, profile-selector, vite-alias]

# Dependency graph
requires:
  - phase: 28-gene-config-system/28-01
    provides: GeneConfigSchema, loadGeneConfig, registerGeneConfig, @gnomad-cf/core/gene-config subpath
  - phase: 28-gene-config-system/28-02
    provides: Seed gene config JSON files (CFTR, HEXA, GJB2) in configs/genes/
provides:
  - useGeneConfig composable (singleton, module-level refs, watches selectedGene)
  - FilterPanel gene config indicator chip and condition profile dropdown
  - Vite alias ~gene-configs for JSON config imports
  - Seed config registration in main.ts
affects:
  - Downstream phases using gene config system in the web app
  - Any future composable that needs to react to active gene config state

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton composable with module-level refs — matches useGeneSearch pattern, NOT Pinia persisted"
    - "Watch with immediate:true on module-level selectedGene — triggers on mount with current value"
    - "Factory-default reset on gene switch — prevents filter state bleed between config/non-config genes"
    - "Vite alias ~gene-configs for cross-workspace JSON imports from repo-root configs/"

key-files:
  created:
    - apps/web/src/composables/useGeneConfig.ts
  modified:
    - apps/web/vite.config.ts
    - apps/web/src/main.ts
    - apps/web/src/composables/index.ts
    - apps/web/src/components/FilterPanel.vue
    - apps/web/src/components/wizard/WizardStepper.vue
    - packages/core/src/templates/load-templates.ts

key-decisions:
  - "Module-level refs (not Pinia store) — config applies per-session, not persisted to localStorage"
  - "useGeneConfig initialized in WizardStepper.vue — watcher activates when gene selected, not deferred to step 4"
  - "Factory defaults applied on every profile switch — clean slate prevents override accumulation"
  - "Closable v-chip with mdi-dna icon — consistent Vuetify chip pattern, resets to factory defaults"
  - "v-select only rendered for multi-profile genes — HEXA/GJB2 show chip only, no dropdown"

patterns-established:
  - "Pattern: Composables that need early initialization are called in WizardStepper.vue setup"
  - "Pattern: filterStore.resetToFactoryDefaults() before applying profile overrides (clean slate)"
  - "Pattern: Gene config state resets completely when switching to non-config gene"

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 28 Plan 03: Gene Config Web Integration Summary

**useGeneConfig composable auto-applies curated filter/penetrance overrides when a configured gene is selected, with visual chip indicator and condition profile dropdown in FilterPanel**

## Performance

- **Duration:** 3 min (agent execution) + checkpoint verification via Playwright
- **Started:** 2026-02-24
- **Completed:** 2026-02-24
- **Tasks:** 2 (auto) + 1 (checkpoint, Playwright-verified)
- **Files modified:** 7

## Accomplishments
- useGeneConfig composable watches selectedGene and auto-loads gene config from registry
- Seed configs (CFTR, HEXA, GJB2) registered at app startup via ~gene-configs Vite alias
- "Gene config loaded" chip with mdi-dna icon appears in FilterPanel when config gene selected
- Condition profile dropdown (v-select) shows for multi-profile genes (CFTR: Classic CF + CFTR-RD)
- Profile switching applies filter overrides and penetrance (Classic CF → 100%, CFTR-RD → 3%)
- Closing chip resets to factory defaults
- No state bleed when switching from config gene to non-config gene

## Bugs Fixed During Verification
- **load-templates.ts browser crash**: Top-level `import { readFile } from 'node:fs/promises'` in `packages/core/src/templates/load-templates.ts` caused the browser bundle to fail (Vite externalizes Node built-ins). Converted to dynamic `await import()` inside the function body. Pre-existing bug from Phase 27.
- **useGeneConfig watcher not active at gene selection**: FilterPanel (step 4) was the only caller of useGeneConfig(), but genes are selected at step 1. Added useGeneConfig() call to WizardStepper.vue for early initialization.

## Checkpoint Verification (Playwright)

All 10 checkpoint tests passed:
1. App loads and renders ✓
2. CFTR selection shows "Gene config loaded" chip ✓
3. CFTR profile dropdown shows 2 condition profiles ✓
4. Switching to CFTR-RD changes penetrance to ~5% (3% rounded to step=5) ✓
5. Switching back to Classic CF restores penetrance to 100% ✓
6. Closing chip resets filters to defaults ✓
7. HEXA shows chip but no profile dropdown ✓
8. Non-config gene (PKD1) shows no chip ✓
9. No state bleed: CFTR-RD → PKD1 resets penetrance to 100% ✓
10. GJB2 shows chip (third seed config works) ✓

## Task Commits

1. **Task 1: Vite alias, seed registration, and useGeneConfig composable** - `159ef4d` (feat)
2. **Task 2: FilterPanel gene config indicator chip and profile selector** - `63f6d5a` (feat)
3. **Bug fixes during checkpoint verification** - `64ee369` (fix)

## Files Created/Modified
- `apps/web/src/composables/useGeneConfig.ts` — New singleton composable
- `apps/web/vite.config.ts` — Added ~gene-configs Vite alias
- `apps/web/src/main.ts` — Seed config registration at startup
- `apps/web/src/composables/index.ts` — Added useGeneConfig export
- `apps/web/src/components/FilterPanel.vue` — Gene config chip + profile dropdown
- `apps/web/src/components/wizard/WizardStepper.vue` — Early useGeneConfig initialization
- `packages/core/src/templates/load-templates.ts` — Dynamic imports fix

## Deviations from Plan

- **Early initialization in WizardStepper**: Plan assumed FilterPanel lazy initialization was sufficient; in practice, the watcher needs to be active before step 4 to load configs at gene selection time.
- **Dynamic imports in load-templates.ts**: Not in the plan — pre-existing bug found and fixed during testing.

## Issues Encountered

- Vuetify 3 slider uses `role="slider"` with `aria-valuenow` instead of native `<input type="range">` — required updating Playwright locator strategy.
- Clinical Disclaimer dialog blocks Playwright interactions — tests dismiss it before proceeding.

---
*Phase: 28-gene-config-system*
*Completed: 2026-02-24*
