---
phase: 18-documentation-content
plan: 03
subsystem: documentation
tags: [vitepress, markdown, hardy-weinberg, gnomad, clinical-text, templates]

# Dependency graph
requires:
  - phase: 18-01
    provides: screenshot-frame CSS pattern and VitePress content infrastructure

provides:
  - Reference section overview page with navigation links to all 4 sub-pages
  - Methodology page with HWE genotype table, carrier frequency approximation, and both recurrence risk formulas (÷4 het, ÷2 affected)
  - Data Sources page with gnomAD version comparison table, population codes by version, and ClinVar/ClinGen explanations
  - Filters page with all defaults, LoF HC vs. missense evidence distinction, and per-calculation override documentation
  - Templates page with all 14 variables, 3 perspectives, 8 sections, 4 German gender styles, and customization guide

affects:
  - Future documentation readers and genetic counselors citing methodology
  - 18-02 (use cases) which cross-links to these reference pages
  - 18-04 (about) which may reference methodology or data sources

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use <span v-pre>{{variable}}</span> to escape Vue template interpolation in VitePress markdown (not backtick inline code, which VitePress alpha 16 still processes as Vue)"
    - "Avoid {{}} outside code blocks in ::: tip/warning/info containers — Vue compiler processes container content as Vue template"

key-files:
  created: []
  modified:
    - docs/reference/index.md
    - docs/reference/methodology.md
    - docs/reference/data-sources.md
    - docs/reference/filters.md
    - docs/reference/templates.md

key-decisions:
  - "Used <span v-pre> HTML wrapper instead of backtick code spans for {{variable}} references in tables and prose — VitePress alpha 16 processes backtick content inside markdown tables as Vue template interpolation"
  - "Simplified ::: tip callout text to avoid {{}} entirely (described variables in prose rather than showing syntax) to prevent Vue compilation errors in container blocks"
  - "Kept methodology 2pq approximation explanation inline with a ::: info callout showing exact numerical comparison (q=0.02 yields 0.0392 exact vs 0.04 approximation)"

patterns-established:
  - "Template variable reference pattern: use <span v-pre>`{{variableName}}`</span> in markdown tables and prose"
  - "Risk formula documentation: always document both divisors (÷4 and ÷2) with explicit patient status triggers"
  - "Population table pattern: show Yes/No matrix with version columns for comparing feature availability"

# Metrics
duration: 6min
completed: 2026-02-23
---

# Phase 18 Plan 03: Reference Section Summary

**Five reference pages written covering HWE methodology, gnomAD version comparison, LoF HC vs. missense filter logic, and complete 14-variable template reference with v-pre escaping for Vue interpolation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-23T13:47:26Z
- **Completed:** 2026-02-23T13:53:42Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Methodology page documents Hardy-Weinberg equilibrium with genotype frequency table, carrier frequency approximation (2pq ≈ 2q), and both risk divisors (÷4 for heterozygous carriers, ÷2 for affected individuals)
- Data Sources page provides gnomAD version comparison table with correct reference genomes (v4.1/v3.1.2 = GRCh38, v2.1.1 = GRCh37) and population codes by version
- Filters page clearly distinguishes LoF HC independence from ClinVar vs. missense requirement for ClinVar P/LP evidence, with all 6 filter defaults documented
- Templates page is a complete reference: all 14 variables with example values, 3 perspectives, 8 sections, 4 German gender styles, and customization guide
- Fixed Vue template compilation error caused by `{{variable}}` syntax being parsed as interpolation by VitePress alpha 16 — resolved with `<span v-pre>` wrappers

## Task Commits

Each task was committed atomically:

1. **Task 1: Reference overview, Methodology, and Data Sources pages** - `d514b62` (docs)
2. **Task 2: Filters and Templates reference pages** - `369b65a` (docs)

**Plan metadata:** (see STATE.md update commit)

## Files Created/Modified

- `docs/reference/index.md` — Overview linking to all 4 reference sub-pages, cross-links to guide and use cases
- `docs/reference/methodology.md` — HWE table, carrier frequency aggregation formula, approximation explanation, both risk formulas with clinical context, assumptions and limitations
- `docs/reference/data-sources.md` — gnomAD version comparison table (samples, reference genome, data types, unique populations), population codes by version matrix, ClinVar star rating table, ClinGen advisory explanation
- `docs/reference/filters.md` — All 6 filter defaults, LoF HC mechanism-based inclusion, missense ClinVar dependency, star threshold levels, conflicting classification logic, per-calculation override documentation
- `docs/reference/templates.md` — All 14 template variables with categories and examples, 3 perspectives with clinical descriptions, 8 sections with purpose and typical content, 4 German gender styles, customization guide

## Decisions Made

- **`<span v-pre>` escaping for template variables**: VitePress alpha 16 processes `{{...}}` even inside backtick inline code within markdown tables and `::: tip` containers. Used `<span v-pre>{{variable}}</span>` as the escape mechanism, which is the standard VitePress approach.
- **::: tip container text simplified**: Removed `{{}}` syntax from tip callout body text — described the variable system in prose rather than showing the literal `{{variableName}}` syntax to avoid Vue compilation errors in container blocks.
- **Asterisk escaping in tables**: Used `\*innen` to prevent markdown from interpreting `*innen` as italic emphasis start in the gender style table.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Vue template interpolation compilation error in templates.md**

- **Found during:** Task 2 (Templates reference page) — build failed with "Error parsing JavaScript expression: Unexpected token"
- **Issue:** VitePress alpha 16 processes `{{variable}}` as Vue template interpolation even inside backtick inline code within markdown table cells and `::: tip` container blocks
- **Fix:** Replaced all `{{...}}` instances in table cells and prose with `<span v-pre>{{variable}}</span>` HTML; simplified `::: tip` callout to describe the variable system in prose without showing `{{}}` syntax literally
- **Files modified:** `docs/reference/templates.md`
- **Verification:** `npx vitepress build docs` completes without errors
- **Committed in:** 369b65a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for build success. All 14 variables still documented clearly. No content was removed — only the presentation mechanism changed from backtick code to `<span v-pre>` wrapper.

## Issues Encountered

VitePress alpha 16 Vue template processing is more aggressive than expected — it parses `{{}}` even inside markdown table cells with backtick code spans and inside custom container (`::: tip`) blocks. The `<span v-pre>` wrapper is the correct escape mechanism and is documented in VitePress's official troubleshooting guide.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 5 reference pages are complete, accurate, and cross-linked
- VitePress build passes with no errors or warnings
- The `<span v-pre>` pattern is now established for any future documentation pages that reference `{{variable}}` syntax
- Use cases (18-02) already exist and cross-link to these reference pages
- About section (18-04) is ready to proceed independently

---
*Phase: 18-documentation-content*
*Completed: 2026-02-23*
