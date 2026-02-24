---
phase: 25-monorepo-foundation
plan: "04"
subsystem: api
tags: [typescript, monorepo, bun, tsdown, fetch, graphql, vue3, vite]

# Dependency graph
requires:
  - phase: 25-03
    provides: filters, calculations, templates, utils all extracted to packages/core/src/

provides:
  - Fetch-based GraphQL client at packages/core/src/client/index.ts (executeGraphQLQuery)
  - All web app imports rewired from @/ local paths to @gnomad-cf/core/* subpath imports
  - Deletion of 37 duplicate source files from apps/web/src/
  - apps/web/src/ now contains only Vue-specific code (composables, stores, components, api/client.ts)

affects:
  - phase 26 (calculations) — core API is now stable and fully wired
  - phase 27 (CLI) — CLI can import from @gnomad-cf/core/* directly
  - phase 28 (gene configs) — uses same core package API
  - phase 29 (tests) — test suite imports from @gnomad-cf/core/*

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fetch-based GraphQL client in core (no villus dependency — neutral platform)"
    - "Web app imports from @gnomad-cf/core/* subpaths (Vite alias + tsconfig paths)"
    - "JSON template files imported via @gnomad-cf/core/config/templates/*.json"
    - "Direct JSON imports for FAQ/methodology via @gnomad-cf/core/config/help/*.json"

key-files:
  created:
    - packages/core/src/client/index.ts
  modified:
    - packages/core/src/index.ts
    - packages/core/src/queries/index.ts
    - packages/core/tsdown.config.ts
    - apps/web/src/api/client.ts
    - apps/web/src/utils/export-utils.ts
    - apps/web/src/composables/useCarrierFrequency.ts
    - apps/web/src/composables/useClingenValidity.ts
    - apps/web/src/composables/useClinvarSubmissions.ts
    - apps/web/src/composables/useExclusionState.ts
    - apps/web/src/composables/useExport.ts
    - apps/web/src/composables/useGeneSearch.ts
    - apps/web/src/composables/useGeneVariants.ts
    - apps/web/src/composables/useLogger.ts
    - apps/web/src/composables/useTextGenerator.ts
    - apps/web/src/composables/useUrlState.ts
    - apps/web/src/composables/useVariantFilters.ts
    - apps/web/src/composables/useWizard.ts
    - apps/web/src/stores/useClingenStore.ts
    - apps/web/src/stores/useFilterStore.ts
    - apps/web/src/stores/useHistoryStore.ts
    - apps/web/src/stores/useLogStore.ts
    - apps/web/src/stores/useTemplateStore.ts
    - "[15 components rewired: ClingenWarning, FaqDialog, FilterChips, FilterPanel, FrequencyResults, GeneConstraintCard, GeneSearch, LogViewer, MethodologyDialog, TemplateEditor, VariablePicker, VariantModal, VariantTable, VersionSelector + 5 wizard components]"

key-decisions:
  - "Fetch-based core client uses GnomadVersion type parameter matching getApiEndpoint signature (optional string union)"
  - "GENE_DETAILS_QUERY and GeneDetailsResponse added to core/queries/index.ts exports (were missing)"
  - "JSON files (templates, faq, methodology) imported via @gnomad-cf/core/config/* path — works because Vite alias maps to src/ and tsconfig paths allow deep traversal"

patterns-established:
  - "Core package imports use @gnomad-cf/core/subpath (not @/ aliases)"
  - "Web-specific code stays in apps/web/src/: composables, stores, components, api/client.ts (villus), utils/export-utils.ts"
  - "JSON deep-path imports via @gnomad-cf/core/config/templates/de.json are valid with resolveJsonModule + path aliases"

# Metrics
duration: 25min
completed: 2026-02-24
---

# Phase 25 Plan 04: Import Rewiring and Duplicate Deletion Summary

**Fetch-based core GraphQL client created, all 37 web app duplicate source files deleted, 100% of @/ imports rewired to @gnomad-cf/core/* across 30+ files — monorepo extraction complete**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-24T00:00:00Z
- **Completed:** 2026-02-24T00:25:00Z
- **Tasks:** 2
- **Files modified:** 76 (30 modified, 37 deleted, 1 created)

## Accomplishments

- Created `packages/core/src/client/index.ts` with `executeGraphQLQuery` — pure fetch-based, platform-neutral GraphQL client
- Rewired ALL web app imports across 12 composables, 5 stores, 15 components, api/client.ts, and export-utils.ts
- Deleted 37 duplicate source files: `apps/web/src/types/` (14), `apps/web/src/config/` (10), `apps/web/src/api/queries/` (5), `apps/web/src/utils/` (7 extracted files)
- Added missing `GENE_DETAILS_QUERY` and `GeneDetailsResponse` exports to core queries index
- `vue-tsc --noEmit` passes with zero errors; `bun run build` succeeds for both packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fetch-based GraphQL client in core** - `6c18f12` (feat)
2. **Task 2: Rewire all web imports and delete duplicates** - `d05af1c` (feat)

**Plan metadata:** (pending — created after this summary)

## Files Created/Modified

- `packages/core/src/client/index.ts` - Pure fetch-based executeGraphQLQuery with GnomadVersion parameter
- `packages/core/tsdown.config.ts` - Added `client: 'src/client/index.ts'` as 9th entry point
- `packages/core/src/index.ts` - Added `export * from './client/index.js'`
- `packages/core/src/queries/index.ts` - Added GENE_DETAILS_QUERY, GeneDetailsResponse exports
- `apps/web/src/api/client.ts` - Now imports from @gnomad-cf/core/config instead of @/config
- `apps/web/src/utils/export-utils.ts` - Now imports from @gnomad-cf/core/types and @gnomad-cf/core/config (stays in web for import.meta.env.VITE_APP_VERSION)
- All 12 composables, 5 stores, 20 components — all @/ local type/config imports replaced

## Decisions Made

- `GENE_DETAILS_QUERY` and `GeneDetailsResponse` were not exported from core queries index (only defined in gene-search.ts and types.ts respectively). Added both exports to unblock useGeneSearch composable rewiring.
- JSON config files (templates, help) imported via deep path `@gnomad-cf/core/config/templates/de.json` — this works with Vite's regex alias and tsconfig's `"@gnomad-cf/core/*": ["../../packages/core/src/*"]` path mapping with `resolveJsonModule: true`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added missing GENE_DETAILS_QUERY and GeneDetailsResponse to core queries exports**
- **Found during:** Task 2 (rewiring useGeneSearch.ts)
- **Issue:** `useGeneSearch.ts` imported `GENE_DETAILS_QUERY` from `@/api/queries/gene-search` and `GeneDetailsResponse` from `@/api/queries/types`. Both were defined in core but not exported from core's queries/index.ts.
- **Fix:** Added `GENE_DETAILS_QUERY` to the query exports and `GeneDetailsResponse`/`GeneDetailsResult`/`GnomadConstraint` to the response type exports in `packages/core/src/queries/index.ts`
- **Files modified:** packages/core/src/queries/index.ts
- **Verification:** vue-tsc --noEmit passes, bun run build succeeds
- **Committed in:** d05af1c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical export)
**Impact on plan:** Essential fix — without it useGeneSearch couldn't be rewired. No scope creep.

## Issues Encountered

None — all import rewiring worked cleanly. The Vite alias regex `@gnomad-cf/core(/.*)?` and tsconfig path `@gnomad-cf/core/*` both handle deep JSON path imports correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 25 plan 4/5 complete. Plan 25-05 (final verification/cleanup) is next.
- Monorepo extraction is functionally complete: core has all logic, web has only Vue-specific code.
- Both `vue-tsc --noEmit` and `bun run build` verified green.
- No blockers for Phase 26 (calculation improvements) or Phase 27 (CLI).

---
*Phase: 25-monorepo-foundation*
*Completed: 2026-02-24*
