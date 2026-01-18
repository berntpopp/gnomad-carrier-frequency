# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

**Current Focus:** Phase 1 execution - config system complete, continuing with remaining plans

**Key Constraints:**
- Stack: Bun, Vue 3, Vuetify 3, Vite, TypeScript
- No backend - direct gnomAD GraphQL from browser
- German clinical text only for v1
- Single page wizard UI

---

## Current Position

**Milestone:** v1 MVP
**Phase:** Phase 1 - Foundation (1/5 plans complete)
**Plan:** 01-01 complete
**Status:** In progress

### Progress

```
Phase 1: Foundation     [#.........] 1/5 plans (01-01 done)
Phase 2: Wizard UI      [..........] 0/? plans
Phase 3: German Text    [..........] 0/? plans
Phase 4: Deploy         [..........] Validation only
```

**Overall:** `[#.........] ~10%`

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 1 |
| Phases Completed | 0 |
| Requirements Done | 0/32 (config is infrastructure) |
| Session Count | 2 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| 4-phase structure | Foundation -> UI -> Text -> Deploy matches delivery boundaries | 2026-01-18 |
| Heavy Phase 1 | API + filtering + calculation in Phase 1 to validate core logic early | 2026-01-18 |
| No deploy requirements | Phase 4 validates existing work, no new feature requirements | 2026-01-18 |
| Multi-version gnomAD | v4 default, v3/v2 available - population codes differ by version | 2026-01-18 |
| JSON config files | All thresholds/endpoints in JSON, TS loader provides type safety | 2026-01-18 |

### Technical Notes

- gnomAD GraphQL endpoint: https://gnomad.broadinstitute.org/api
- Use villus (4KB) over Apollo (31KB) for GraphQL
- Carrier frequency formula: 2 x sum(pathogenic_AF)
- Population codes vary by version:
  - v4: afr, amr, asj, eas, fin, mid, nfe, sas
  - v3: afr, ami, amr, asj, eas, fin, nfe, sas (has Amish)
  - v2: afr, amr, asj, eas, fin, nfe, oth, sas (GRCh37)
- Reference values: CFTR ~1:25 NFE, HEXA elevated in ASJ
- Config settings: founderEffectMultiplier=5, debounceMs=300, defaultCarrierFrequency=0.01

### Blockers

(None currently)

### TODOs

- [x] Plan Phase 1
- [x] Execute 01-01 (config system)
- [ ] Execute 01-02 (project setup)
- [ ] Execute 01-03 (types, calc functions, GraphQL client)
- [ ] Execute 01-04 (GraphQL queries, composables)
- [ ] Execute 01-05 (carrier frequency composable, test UI)

---

## Session Continuity

### Last Session

**Date:** 2026-01-18
**Completed:** Plan 01-01 (Config system) - centralized configuration for gnomAD versions and app settings
**Next:** Continue Phase 1 plans (01-02 through 01-05)

### Handoff Notes

Config system provides:
- `src/config/types.ts` - TypeScript types for config
- `src/config/gnomad.json` - Multi-version gnomAD API config
- `src/config/settings.json` - App thresholds and UI settings
- `src/config/index.ts` - Type-safe loader with helper functions

Usage: `import { config, getGnomadVersion, getPopulations } from '@/config'`

All subsequent plans should use config - no hardcoded values in application code.

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-18*
