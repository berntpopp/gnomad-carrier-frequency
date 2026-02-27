---
phase: 36-orphanet-prevalence-integration
plan: 01
subsystem: api
tags: [orphanet, rest-api, fetch, abortcontroller, typescript, tsdown, subpath-export]

# Dependency graph
requires: []
provides:
  - "@gnomad-cf/core/orphanet subpath with platform-neutral Orphanet REST API client"
  - "fetchOrphanetData(geneSymbol) orchestrator: gene-to-disease-to-prevalence two-step fetch"
  - "fetchDiseasesByGeneSymbol, fetchEpidemiology, fetchNaturalHistory individual fetch functions"
  - "selectBestPrevalence (Validated > Point prevalence > Europe priority logic)"
  - "selectPrimaryDisease (AR-first > highest ValMoy sorting)"
  - "OrphanetDisease, OrphanetResult, OrphanetPrevalenceEntry, OrphanetGeneResult TypeScript types"
affects:
  - 36-02  # Pinia store + useOrphanetData composable consumes fetchOrphanetData
  - 36-03  # OrphanetSection.vue + StepResults.vue integration consumes OrphanetDisease

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fetchWithTimeout: AbortController + setTimeout for 5-second fetch timeout, clearTimeout in both success and failure paths"
    - "Graceful 404 handling: fetchEpidemiology and fetchNaturalHistory return [] on any error (never throw)"
    - "Promise.allSettled across orphacodes, Promise.all within each orphacode for epi+inheritance"
    - "Exact string match for AR inheritance: inheritanceTypes.includes('Autosomal recessive') per CONTEXT.md"
    - "tsdown exports:true auto-maintains package.json exports on build"

key-files:
  created:
    - packages/core/src/orphanet/types.ts
    - packages/core/src/orphanet/client.ts
    - packages/core/src/orphanet/index.ts
  modified:
    - packages/core/tsdown.config.ts
    - packages/core/package.json

key-decisions:
  - "Gene symbol always lowercased before API call — uppercase returns 404 from Orphanet (verified empirically)"
  - "fetchEpidemiology and fetchNaturalHistory return [] on any error (including 404) — disease subtypes commonly lack epi data"
  - "OrphanetURL constructed from orphacode as safe fallback: https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert={orphacode}"
  - "selectBestPrevalence priority: Validated first, then Point prevalence > Prevalence at birth, then Europe preferred, Specific population deprioritized"
  - "selectPrimaryDisease: AR diseases preferred over non-AR; among candidates sort by valMoy descending"
  - "tsdown exports:true auto-rewrites package.json on build — manual ./orphanet entry reconciled by build"
  - "Promise.allSettled across orphacodes prevents single 404 failure from blocking all disease enrichment"

patterns-established:
  - "Orphanet API pattern: always lowercase gene symbol, graceful 404 on epi/inheritance endpoints"
  - "Two-step API orchestration: gene→orphacodes first, then parallel enrichment per orphacode"

# Metrics
duration: 7min
completed: 2026-02-27
---

# Phase 36 Plan 01: Orphanet Core Client Summary

**Platform-neutral Orphanet REST API client in @gnomad-cf/core/orphanet with fetchOrphanetData orchestrator, selectBestPrevalence, and selectPrimaryDisease — usable from both web and CLI**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T08:22:55Z
- **Completed:** 2026-02-27T08:29:56Z
- **Tasks:** 2
- **Files created/modified:** 5

## Accomplishments
- Created `packages/core/src/orphanet/` with three files: types.ts (5 interfaces), client.ts (7 exported functions), index.ts (barrel re-export)
- Implemented fetchOrphanetData orchestrator using Promise.allSettled across orphacodes and Promise.all per orphacode for parallel epi+inheritance fetch
- Added `orphanet` entry to tsdown.config.ts; tsdown `exports:true` auto-added `"./orphanet": "./dist/orphanet.js"` to package.json — both `dist/orphanet.js` (5.47 kB) and `dist/orphanet.d.ts` (3.76 kB) produced
- All typechecks pass (core build + CLI tsc + web typecheck)

## Task Commits

Each task was committed atomically:

1. **Task 1: Orphanet types and client functions** - `3c04a1d` (feat)
2. **Task 2: tsdown entry and package.json export** - `1c10869` (feat)

## Files Created/Modified
- `packages/core/src/orphanet/types.ts` - OrphanetGeneResult, OrphanetGeneAssociation, OrphanetPrevalenceEntry, OrphanetDisease, OrphanetResult interfaces
- `packages/core/src/orphanet/client.ts` - fetchWithTimeout, fetchDiseasesByGeneSymbol, fetchEpidemiology, fetchNaturalHistory, selectBestPrevalence, selectPrimaryDisease, fetchOrphanetData
- `packages/core/src/orphanet/index.ts` - barrel re-exports all types and public API functions
- `packages/core/tsdown.config.ts` - added `orphanet: 'src/orphanet/index.ts'` entry
- `packages/core/package.json` - `"./orphanet": "./dist/orphanet.js"` export (auto-maintained by tsdown)

## Decisions Made
- Gene symbol always lowercased before API call — uppercase returns 404 (empirically verified per RESEARCH.md Pitfall 1)
- `fetchEpidemiology` and `fetchNaturalHistory` return `[]` on any error including 404 — disease subtypes commonly lack epidemiology data (HEXA case per RESEARCH.md Pitfall 2)
- OrphanetURL constructed from orphacode as safe fallback: `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert={orphacode}` (per RESEARCH.md Open Question 2)
- `selectBestPrevalence` sort priority: Validated > Point prevalence > Europe geographic (Specific population deprioritized)
- `selectPrimaryDisease`: AR-matching diseases take precedence; sort by valMoy descending for clinical relevance
- `Promise.allSettled` across all orphacodes — single 404 on one disease doesn't block enrichment of others
- tsdown `exports:true` auto-rewrites package.json exports on each build; the manually added `./orphanet` entry is reconciled automatically

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- tsdown `exports:true` auto-rewrote package.json during build, removing the manually-added `./orphanet` entry and then re-adding it in the correct alphabetical position. This is expected behavior documented in RESEARCH.md — tsdown owns the exports field. Result is identical to the manually written entry.

## User Setup Required

None - no external service configuration required. The Orphanet API is public with `access-control-allow-origin: *`, no API key needed.

## Next Phase Readiness

- `@gnomad-cf/core/orphanet` subpath is importable. Plan 36-02 (Pinia store + composable) can import `fetchOrphanetData` and `OrphanetResult` directly.
- Types `OrphanetDisease` and `OrphanetResult` are exported for use in store state typing.
- No blockers. Plan 36-02 ready to proceed.

---
*Phase: 36-orphanet-prevalence-integration*
*Completed: 2026-02-27*
