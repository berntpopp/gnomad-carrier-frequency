---
phase: 27-cli-package
plan: 03
subsystem: cli
tags: [typescript, cli, tsdown, gnomad, formatters, tsv, json, clinical-text, templates]

# Dependency graph
requires:
  - phase: 27-01
    provides: CLI scaffold with QueryResult/VariantDetail/QueryOptions types in packages/cli/src/types.ts
  - phase: 26-01
    provides: formatCarrierFrequency, formatPrevalence from @gnomad-cf/core/calculations
  - phase: 25-xx
    provides: renderTemplate, template JSON (de.json/en.json) from @gnomad-cf/core/templates

provides:
  - loadTemplateContent(lang) in @gnomad-cf/core/templates — Node.js file-based template JSON loader
  - formatText(result, opts) — human-readable summary blocks with population grouping
  - formatJson(result|result[], opts) — JSON serializer with optional variant inclusion
  - formatTsv(results, opts) — quoted TSV with optional variant section
  - formatClinical(result, opts) — async German/English clinical text via core templates
affects: [27-02, 27-04, 27-05, 28-xx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Formatter pattern: all formatters accept QueryResult from ../types.js (shared Wave 1 types)"
    - "TSV escaping: double-quote all values, double internal quotes, replace newlines/tabs with spaces"
    - "loadTemplateContent: src path first (dev), dist fallback (built) — works in both contexts"
    - "Clinical formatter builds TemplateContext from QueryResult then delegates to core renderTemplate"

key-files:
  created:
    - packages/core/src/templates/load-templates.ts
    - packages/cli/src/output/text-formatter.ts
    - packages/cli/src/output/json-formatter.ts
    - packages/cli/src/output/tsv-formatter.ts
    - packages/cli/src/output/clinical-formatter.ts
  modified:
    - packages/core/src/templates/index.ts

key-decisions:
  - "loadTemplateContent added to @gnomad-cf/core/templates (not CLI-local) so any future consumer can load template JSON"
  - "node: built-in imports in load-templates.ts are external dependencies in neutral core build — resolved at runtime by Node.js CLI consumer"
  - "Population sumAF computed from AC/AN (alleleCount/alleleNumber) in formatters — no separate sumAF per population in QueryResult"
  - "formatJson pretty:true by default (human-friendly), can disable for piping"
  - "Bayesian prevalence per-population derived as geneticPrevalence * penetrance in formatters (not stored separately in PopulationFrequency)"
  - "Clinical formatter defaults: carrier perspective, * gender style, neutral patient sex"

patterns-established:
  - "All CLI formatters import QueryResult from ../types.js (not @gnomad-cf/core) to keep CLI types stable"
  - "TSV always quotes all fields — safe for Excel/spreadsheet import with any locale"

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 27 Plan 03: Output Formatters Summary

**Four CLI output formatters (text/JSON/TSV/clinical) plus loadTemplateContent in core, enabling --format flag and --clinical text output**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-24T07:47:54Z
- **Completed:** 2026-02-24T07:52:35Z
- **Tasks:** 2
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments

- Added `loadTemplateContent(lang)` to `@gnomad-cf/core/templates` for reliable Node.js-based template JSON loading (works in dev and built contexts)
- Built `formatText()` producing human-readable summary blocks with global + per-population sections, carrier frequency ratios, prevalence, allele counts, flags for founder effect / low sample size, and optional variant appendix
- Built `formatJson()` and `formatTsv()` for machine-readable output with proper quoting and optional variant inclusion
- Built `async formatClinical()` using core's `loadTemplateContent` + `renderTemplate` to produce German/English clinical documentation with configurable perspective, gender style, and patient sex

## Task Commits

1. **Task 1: Add loadTemplateContent to core and create text/JSON formatters** - `1d1d437` (feat)
2. **Task 2: Create TSV and clinical text formatters** - `f5d2e6b` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `packages/core/src/templates/load-templates.ts` - `loadTemplateContent(lang)`: reads template JSON from `src/config/templates/`, tries src path first (dev), falls back to dist-relative path (built)
- `packages/core/src/templates/index.ts` - Re-exports `load-templates.js` alongside existing template-renderer and template-parser
- `packages/cli/src/output/text-formatter.ts` - `formatText(result, opts?)`: summary blocks per population with `---Global---` / `===Pop===` separators, labeled key:value lines, flags for founder effect / low sample size
- `packages/cli/src/output/json-formatter.ts` - `formatJson(result|result[], opts?)`: JSON serializer, strips variants field by default, pretty-prints by default
- `packages/cli/src/output/tsv-formatter.ts` - `formatTsv(results, opts?)`: one row per gene-population, all fields double-quoted, optional `# Variants` section appended
- `packages/cli/src/output/clinical-formatter.ts` - `formatClinical(result, opts)`: async clinical text generator using core template system; builds TemplateContext from QueryResult

## Decisions Made

- `loadTemplateContent` placed in `@gnomad-cf/core/templates` (not CLI-local) — future consumers (web SSR, other CLI tools, tests) can use it without duplicating the path logic
- `node:fs/promises`, `node:path`, `node:url` produce UNRESOLVED_IMPORT warnings in core's neutral-platform build — this is expected and correct; they are treated as external and resolved at runtime by the Node.js consumer
- `formatJson` defaults to `pretty: true` — CLI output is for humans by default; pipe to `jq` is trivial if machine processing needed
- Population-level Bayesian prevalence computed as `geneticPrevalence * penetrance` inline in formatters — `PopulationFrequency` doesn't carry `bayesianPrevalence` separately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four formatters ready for wiring into `gene-query` command (Plan 02) and `batch` command (Plan 04)
- `loadTemplateContent` available from `@gnomad-cf/core/templates` for any consumer
- Clinical formatter supports all three perspectives (affected/carrier/familyMember) and both languages (de/en)
- No blockers for Plans 02, 04, 05

---
*Phase: 27-cli-package*
*Completed: 2026-02-24*
