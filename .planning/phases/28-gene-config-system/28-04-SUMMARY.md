---
phase: 28-gene-config-system
plan: 04
subsystem: docs
tags: [vitepress, documentation, gene-config, contributing, omim, mondo, schema-reference]

# Dependency graph
requires:
  - phase: 28-01
    provides: GeneConfigSchema with all field names and constraints documented in schema.ts
provides:
  - configs/CONTRIBUTING.md: comprehensive gene config contributing guide for clinical geneticists
  - apps/web/docs/guide/contributing-gene-configs.md: VitePress docs page mirroring the contributing guide
  - apps/web/docs/.vitepress/config.ts: updated sidebar with Contributing Gene Configs entry
affects:
  - Community contributors submitting gene configs via PR
  - Future phases adding CI validation script (docs what CI will check)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "VitePress docs pattern: :::tip/:::warning/:::danger containers for important notes, :::details for collapsible FAQ"
    - "Dual-location docs pattern: primary guide in configs/ for GitHub contributors, mirrored VitePress page for web readers"

key-files:
  created:
    - configs/CONTRIBUTING.md
    - apps/web/docs/guide/contributing-gene-configs.md
  modified:
    - apps/web/docs/.vitepress/config.ts

key-decisions:
  - "configs/CONTRIBUTING.md is the canonical source; VitePress page closely mirrors it with VitePress-specific formatting"
  - "OMIM gene vs phenotype ID disambiguation given prominent dedicated section with table and danger callout"
  - "FAQ implemented as VitePress :::details collapsible blocks in docs page, plain section in CONTRIBUTING.md"

patterns-established:
  - "Gene config contributing guide pattern: schema reference, OMIM disambiguation, complete examples, submission process, CI validation table, FAQ, resources"

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 28 Plan 04: Contributing Gene Configs Guide Summary

**Comprehensive gene config contributing guide in configs/CONTRIBUTING.md and VitePress docs page at /guide/contributing-gene-configs — written for clinical geneticists with field-by-field schema reference, OMIM gene vs phenotype ID disambiguation, and complete HEXA/CFTR/PAH examples**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-24T07:59:12Z
- **Completed:** 2026-02-24T08:04:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- configs/CONTRIBUTING.md (660 lines): 12-section guide for non-developer clinical geneticists including field-by-field schema reference, OMIM gene vs phenotype ID disambiguation table, three complete examples (HEXA simple, CFTR multi-profile, PAH minimal), penetrance guidance, disease identifier lookup instructions, CI validation table, FAQ, and resources table
- apps/web/docs/guide/contributing-gene-configs.md: VitePress-formatted mirror with frontmatter, :::tip/:::warning/:::danger containers for important notes, :::details collapsible FAQ blocks, and links to GitHub configs/genes/ and the calculator app
- apps/web/docs/.vitepress/config.ts: Contributing Gene Configs added as last item in /guide/ sidebar; docs build produces contributing-gene-configs.html with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create comprehensive contributing guide for gene configs** - `0e6a40b` (docs)
2. **Task 2: VitePress docs page and sidebar update** - `19e0ece` (docs)

**Plan metadata:** `(pending docs commit)` (docs: complete plan)

## Files Created/Modified
- `configs/CONTRIBUTING.md` - Primary contributing guide: schema reference, OMIM disambiguation, examples, submission process, CI validation, FAQ, resources
- `apps/web/docs/guide/contributing-gene-configs.md` - VitePress page mirroring the contributing guide with VitePress containers and collapsible FAQ
- `apps/web/docs/.vitepress/config.ts` - Added `{ text: 'Contributing Gene Configs', link: '/guide/contributing-gene-configs' }` to /guide/ sidebar

## Decisions Made
- configs/CONTRIBUTING.md is the canonical location; VitePress page closely mirrors it rather than being a separate document — reduces maintenance drift
- OMIM gene vs phenotype ID confusion given a dedicated section with comparison table and danger-level callout in VitePress page — this is the most common contributor error
- FAQ section uses plain markdown in configs/CONTRIBUTING.md (accessible via GitHub) and VitePress :::details blocks in the docs page (collapsible for cleaner reading)
- Three example levels provided: HEXA (simple single-profile), CFTR (multi-profile with different penetrance), PAH (minimal valid) — covering the main contributor use cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- contributing-gene-configs.md and configs/CONTRIBUTING.md are both complete and live
- VitePress docs site builds without errors; new page in sidebar at /guide/contributing-gene-configs
- Phase 28 docs deliverable complete; remaining: 28-02 (seed gene configs), 28-03 (web auto-apply), and a CI validation script if planned

---
*Phase: 28-gene-config-system*
*Completed: 2026-02-24*
