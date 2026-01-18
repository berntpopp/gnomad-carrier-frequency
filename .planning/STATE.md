# Project State: gnomAD Carrier Frequency Calculator

---

## Project Reference

**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

**Current Focus:** Project initialization complete, ready to begin Phase 1

**Key Constraints:**
- Stack: Bun, Vue 3, Vuetify 3, Vite, TypeScript
- No backend - direct gnomAD GraphQL from browser
- German clinical text only for v1
- Single page wizard UI

---

## Current Position

**Milestone:** v1 MVP
**Phase:** Phase 1 - Foundation (pending)
**Plan:** Not yet created
**Status:** Ready to plan

### Progress

```
Phase 1: Foundation     [ ] 0/18 requirements
Phase 2: Wizard UI      [ ] 0/10 requirements
Phase 3: German Text    [ ] 0/4 requirements
Phase 4: Deploy         [ ] Validation only
```

**Overall:** `[..........] 0%`

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans Completed | 0 |
| Phases Completed | 0 |
| Requirements Done | 0/32 |
| Session Count | 1 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| 4-phase structure | Foundation -> UI -> Text -> Deploy matches delivery boundaries | 2026-01-18 |
| Heavy Phase 1 | API + filtering + calculation in Phase 1 to validate core logic early | 2026-01-18 |
| No deploy requirements | Phase 4 validates existing work, no new feature requirements | 2026-01-18 |

### Technical Notes

- gnomAD GraphQL endpoint: https://gnomad.broadinstitute.org/api
- Use villus (4KB) over Apollo (31KB) for GraphQL
- Carrier frequency formula: 2 x sum(pathogenic_AF)
- Population codes: afr, eas, nfe, amr, sas, fin, asj, mid
- Reference values: CFTR ~1:25 NFE, HEXA elevated in ASJ

### Blockers

(None currently)

### TODOs

- [ ] Plan Phase 1

---

## Session Continuity

### Last Session

**Date:** 2026-01-18
**Completed:** Roadmap created with 4 phases, 32 requirements mapped
**Next:** Plan Phase 1 (Foundation - API + Calculation)

### Handoff Notes

Phase 1 is the largest phase with 18 requirements covering:
- Gene input with validation (GENE-01, GENE-02, GENE-03)
- gnomAD API integration (API-01, API-02, API-03)
- Variant filtering logic (FILT-01, FILT-02, FILT-03, FILT-04)
- Carrier frequency calculation (CALC-01, CALC-02, CALC-03, CALC-04)
- Population handling (POP-01, POP-02, POP-03, POP-04)

Research indicates this phase should focus on testable pure functions before building UI. Key validation: CFTR should calculate ~1:25 carrier frequency for NFE population.

---

*State initialized: 2026-01-18*
*Last updated: 2026-01-18*
