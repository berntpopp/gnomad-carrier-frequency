---
phase: 36-orphanet-prevalence-integration
plan: "02"
subsystem: ui
tags: [pinia, vue3, composable, orphanet, prevalence, skeleton, expand-transition]

requires:
  - phase: 36-01
    provides: "@gnomad-cf/core/orphanet subpath with fetchOrphanetData, selectPrimaryDisease, OrphanetDisease, OrphanetResult types"

provides:
  - "useOrphanetStore: Pinia session cache for OrphanetResult per gene symbol (no persistence)"
  - "useOrphanetData: reactive composable with loading/diseases/primaryDisease/additionalDiseases/error/hasData and cache-first fetchForGene"
  - "OrphanetSection.vue: skeleton loading, primary disease link + AR badge + prevalence, +N more expand, disclaimer"

affects:
  - "36-03: wires fetchForGene trigger into wizard gene-selection watch and embeds OrphanetSection in StepResults"

tech-stack:
  added: []
  patterns:
    - "Session cache via Pinia store with Record<string,T> (not Map — Map not Pinia-reactive)"
    - "Composable-local reactive refs + shared Pinia store for session cache — each component gets own loading/diseases state, network is deduplicated"
    - "Cache-first fetchForGene: populate from Pinia store instantly on hit, skip if pending, else fetch and store"
    - "Component hides entirely (no empty state) on error/timeout/zero diseases per CONTEXT.md"

key-files:
  created:
    - apps/web/src/stores/useOrphanetStore.ts
    - apps/web/src/composables/useOrphanetData.ts
    - apps/web/src/components/OrphanetSection.vue
  modified: []

key-decisions:
  - "Record<string, OrphanetResult> in store state (not Map) — Pinia reactivity and persistence serialization both require plain objects"
  - "additionalDiseases filtered to diseases with bestPrevalence !== null — only show prevalence data when it exists"
  - "expanded local ref in OrphanetSection (not lifted to composable) — expand state is purely display concern"
  - "v-expand-transition wrapping div for +N more list — matches Vuetify animation conventions used elsewhere in app"
  - "No persist on useOrphanetStore — session-level cache only per CONTEXT.md decision"

patterns-established:
  - "Orphanet data fetch: always use fetchForGene which checks Pinia cache first, then in-flight pending check, then network"
  - "useOrphanetStore keys always lowercased to match Orphanet API requirement (uppercase returns 404)"

duration: 4min
completed: "2026-02-27"
---

# Phase 36 Plan 02: Pinia Orphanet Store, Composable, and Component Summary

**Pinia session-cache store + reactive useOrphanetData composable + OrphanetSection.vue with skeleton, AR-tagged primary disease link, +N more expansion, and clinical prevalence disclaimer**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T08:34:55Z
- **Completed:** 2026-02-27T08:38:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `useOrphanetStore` provides session-level Record-based cache (no persistence) with getCached/setCached/isPending/setPending actions; lowercase keys match Orphanet API requirement
- `useOrphanetData` composable exposes loading, diseases, primaryDisease (ComputedRef via selectPrimaryDisease), additionalDiseases (filtered to those with bestPrevalence), error, hasData, and cache-first fetchForGene that populates local refs from Pinia cache instantly on hit
- `OrphanetSection.vue` renders three distinct states: skeleton placeholder (55% width) while loading, full content (primary disease link + [AR] badge + prevalence + +N more chip + v-expand-transition + disclaimer) when primaryDisease exists, and nothing when error/empty — per CONTEXT.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Pinia store and composable** - `6c3e45c` (feat)
2. **Task 2: OrphanetSection.vue component** - `ad96b52` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/src/stores/useOrphanetStore.ts` - Pinia store: Record<string, OrphanetResult> session cache, pending map, no persist
- `apps/web/src/composables/useOrphanetData.ts` - Composable: reactive state, cache-first fetchForGene, primaryDisease/additionalDiseases computed from selectPrimaryDisease
- `apps/web/src/components/OrphanetSection.vue` - Component: skeleton, primary disease row, +N more chip with v-expand-transition, disclaimer

## Decisions Made

- **Record vs Map in store state:** Used `Record<string, OrphanetResult>` not `Map` — Pinia reactive state and persist serialization both work correctly with plain objects; Maps are not straightforwardly reactive in Vue 3 without `reactive(new Map())` and don't serialize with `JSON.stringify`.
- **additionalDiseases filter:** Only diseases with `bestPrevalence !== null` shown in expansion. Diseases without prevalence data add no clinical value and clutter the UI.
- **expand state local to component:** `expanded` ref stays inside OrphanetSection.vue rather than being lifted to the composable — it's a pure display concern with no data implications.
- **v-expand-transition:** Used Vuetify's built-in transition component for +N more expansion, consistent with the rest of the app (FilterPanel uses same pattern).
- **No @/ alias for composable-to-store import:** OrphanetSection imports only from the composable; the store-to-core import in the composable uses `@/stores/useOrphanetStore` (correct alias).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 36-03 can now wire `fetchForGene` into the wizard's gene-selection watch (when step 1 completes, call fetchForGene to eagerly start Orphanet fetch before user reaches results)
- `OrphanetSection.vue` ready to embed in `StepResults.vue` — accepts props directly from `useOrphanetData()` return values
- `useOrphanetStore` and `useOrphanetData` ready to use; no additional setup required

---
*Phase: 36-orphanet-prevalence-integration*
*Completed: 2026-02-27*
