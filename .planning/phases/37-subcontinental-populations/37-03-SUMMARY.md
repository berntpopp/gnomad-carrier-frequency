---
phase: 37-subcontinental-populations
plan: 03
subsystem: ui
tags: [vue3, vuetify, subcontinental, populations, gnomad-v2, carrier-frequency, composables]

# Dependency graph
requires:
  - phase: 37-01
    provides: getSubpopulations, getSubpopulationParent, getSubpopulationLabel from @gnomad-cf/core/config; SubpopulationConfig in gnomad.json
  - phase: 37-02
    provides: useSubcontinentalData composable, SubcontinentalPopulationFrequency interface, useSubcontinentalStore Pinia cache
provides:
  - Subcontinental toggle in population table toolbar (v2 only, disabled for v3/v4 with tooltip chip)
  - Nested population rows under NFE (6 subgroups) and EAS (3 subgroups)
  - Progress indicator during N+1 subcontinental fetch
  - Quality warning chips: Low sample (warning) and Founder effect (info)
  - v2-only gating: toggle hidden, replaced by disabled chip with explanatory tooltip for non-v2 versions
  - Gene switching resets toggle and clears subcontinental cache via clearSubcontinental()
affects:
  - Future export plans (subcontinental data not yet exported, could be added later)
  - Clinical text (subcontinental data deliberately excluded from text output per CONTEXT.md)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isV2 computed from props.result.version (NOT useGnomadVersion) — version from result prop is single source of truth"
    - "subcontinental toggle reset in existing props.result watcher — avoids duplicate watchers"
    - "hasSubpopulations() checks v2 config to gate template rendering — only NFE/EAS get subcontinental rows"
    - "getSubcontinentalRows(parentCode) filters subcontinentalFrequencies by parentCode — clean data binding"

key-files:
  created: []
  modified:
    - apps/web/src/components/wizard/StepResults.vue

key-decisions:
  - "isLoading from useCarrierFrequency added to disabled condition on subcontinental toggle — prevents toggling while main gnomAD data is still loading"
  - "subcontinental rows render for ALL items in table slot but filtered via hasSubpopulations() — only NFE/EAS show loading/error/data rows"
  - "Last td uses empty <td /> (not v-if=\"hasNotes\") in subcontinental rows — col count always matches headers.length"
  - "toggle is disabled when qualifyingVariantCount === 0 — no variants means no subcontinental data to fetch"

patterns-established:
  - "subcontinental data lifecycle: toggle ON → fetch → rows appear; result change → toggle reset + clear"
  - "quality warnings in subcontinental rows: Low sample (warning tonal) and Founder effect (info tonal) chips"

# Metrics
duration: 15min
completed: 2026-02-27
---

# Phase 37 Plan 03: Subcontinental Populations UI Summary

**Subcontinental v2.1.1 population breakdowns wired into StepResults: toggle in toolbar, nested NFE/EAS rows with Low sample/Founder effect quality chips, progress bar, and v2-only version gating**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-27T10:31:44Z
- **Completed:** 2026-02-27T10:46:00Z (pending human verification at Task 3 checkpoint)
- **Tasks:** 2/3 complete (Task 3 = checkpoint:human-verify, awaiting user approval)
- **Files modified:** 1

## Accomplishments
- Subcontinental toggle (v-switch) added to population table toolbar, visible only for v2 results
- Non-v2 versions show a "Subcontinental (v2 only)" chip with tooltip explaining v2.1.1 constraint
- Nested subcontinental rows appear under NFE and EAS when toggle is enabled and data loads
- Progress bar during N+1 fetch, error alert if fetch partially fails
- Low sample size and founder effect quality warning chips on individual subpopulation rows
- Toggle resets and cache clears on gene/result change (integrated into existing props.result watcher)

## Task Commits

Each task was committed atomically:

1. **Task 1: Toggle, progress bar, and version gating in StepResults toolbar** - `5ec9378` (feat)
2. **Task 2: Nested subcontinental rows with quality warnings in population table** - `d14042e` (feat)
3. **Task 3: Human verification checkpoint** - pending (awaiting "approved" signal)

**Plan metadata:** TBD (pending checkpoint approval)

## Files Created/Modified
- `apps/web/src/components/wizard/StepResults.vue` - Subcontinental toggle, nested rows, progress bar, v2-only chip, quality warning chips, CSS

## Decisions Made
- `isLoading` from `useCarrierFrequency()` added to destructure — used for toggle `:disabled` condition; prevents enabling subcontinental while main gnomAD query is in progress
- `isV2` computed from `props.result?.version === 'v2'` (NOT `useGnomadVersion`) — result prop is authoritative source per plan specification
- Subcontinental toggle reset added to existing `watch(() => props.result, ...)` callback — avoids creating a second watcher for the same signal
- Last column in subcontinental row uses `<td />` (no `v-if="hasNotes"`) — subcontinental rows always emit a fixed number of columns matching `headers.length`; the notes column conditional only matters for main rows

## Deviations from Plan

None - plan executed exactly as written. One minor observation: the plan's subcontinental row template shows `<td v-if="hasNotes" />` for the last column but the plan's task description says `<td />`. Used unconditional `<td />` to always match headers.length regardless of notes presence (more robust).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 37 (Subcontinental Populations) complete pending user verification at checkpoint
- All 7 SUBP requirements addressed: SUBP-01 through SUBP-07
- After checkpoint approval: Phase 37 is complete, v1.6 milestone is ready for final review
- No blockers for other phases

---
*Phase: 37-subcontinental-populations*
*Completed: 2026-02-27*
