---
phase: 27-cli-package
plan: 06
subsystem: cli
tags: [typescript, commander, clack, prompts, interactive, wizard, autocomplete, multiselect]

# Dependency graph
requires:
  - phase: 27-02
    provides: gene-query.ts (queryGene, searchGenes), population-aliases.ts (getPopulationOptions), user-config.ts (loadUserConfig, mergeConfig)
  - phase: 27-03
    provides: formatText, formatJson, formatTsv output formatters
provides:
  - interactiveCommand: Commander subcommand 'gnomad-cf interactive'
  - runInteractive(): exported async function for wizard flow
  - No-args TTY fallback in cli.ts (launches interactive when run with no arguments)
  - buildEquivalentCommand(): helper to echo minimal CLI command from wizard selections
affects: [phase-28-gene-config-system, phase-29-test-suite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@clack/prompts wizard pattern: p.isCancel() checked after every prompt for clean Ctrl+C"
    - "Two-step gene selection: p.text input -> searchGenes -> p.autocomplete confirmation"
    - "Multi-population client-side filter: queryGene with single pop, re-filter result.populations for multi"
    - "Equivalent-command echo: buildEquivalentCommand omits default flags for minimal output"

key-files:
  created:
    - packages/cli/src/commands/interactive.ts
  modified:
    - packages/cli/src/cli.ts

key-decisions:
  - "p.text used for initial gene input (more reliable than autocomplete for short inputs); autocomplete follows as confirmation step from searchGenes results"
  - "Multi-population selection filters result.populations client-side rather than making multiple API calls"
  - "buildEquivalentCommand omits flags matching defaults (v4, text format, hwe:true, excludeHomozygotes:true, penetrance:1.0) for minimal command output"
  - "No-args TTY guard in cli.ts checks process.argv.length === 2 before parseAsync; pushes 'interactive' to argv on TTY, prints help on non-TTY"

patterns-established:
  - "Clack wizard pattern: intro -> prompts with isCancel guards -> spinner -> output -> note -> outro"
  - "All prompts guarded with p.isCancel() immediately after await"

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 27 Plan 06: Interactive Wizard Summary

**`gnomad-cf interactive` wizard with @clack/prompts: gene autocomplete, population multiselect, format selection, spinner during query, and equivalent-command echo**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T07:58:20Z
- **Completed:** 2026-02-24T08:02:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Full 10-step interactive wizard: intro, gene input with search autocomplete, version select, population multiselect, format select, advanced options (HWE/hom/penetrance/variants), spinner query, result display, equivalent-command echo, outro
- Non-TTY guard exits immediately with usage hint; all prompts have Ctrl+C handling via p.isCancel()
- No-args fallback in cli.ts routes TTY sessions to interactive, non-TTY to help+exit(1)
- All three subcommands (query, batch, interactive) listed in --help and built CLI binary

## Task Commits

Each task was committed atomically:

1. **Task 1: Create interactive wizard with clack prompts** - `12f6d70` (feat — bundled in 28-02 docs commit)
2. **Task 2: Register interactive command and wire no-args fallback** - `984e8ca` (feat)

**Plan metadata:** pending final commit (docs)

## Files Created/Modified
- `packages/cli/src/commands/interactive.ts` - Full @clack/prompts wizard (383 lines): gene input, version/population/format selects, advanced options, query with spinner, equivalent-command builder
- `packages/cli/src/cli.ts` - Added interactiveCommand import, addCommand(), no-args TTY/non-TTY fallback before parseAsync

## Decisions Made
- `p.text` used for gene entry (users know their gene); `p.autocomplete` used as a confirmation/disambiguation step after `searchGenes()` to show matching options when multiple results exist
- Multi-population selections handled client-side: `queryGene` receives `population: undefined` (all populations), then `result.populations` is filtered to selected codes before formatting
- `buildEquivalentCommand()` omits flags that match their defaults, producing the minimal shell command needed to reproduce the wizard's output non-interactively
- No-args detection checks `process.argv.length === 2` — reliable before parseAsync modifies argv; pushes `'interactive'` string so commander routes normally

## Deviations from Plan

None - plan executed exactly as written. The autocomplete API (with `options` as static array + `filter` callback) required a slight adaptation: gene typeahead implemented as two-step (text input then autocomplete from search results) rather than live-async options, which is actually more robust for slow network conditions.

## Issues Encountered

None - `@clack/prompts` v1.0.1 `autocomplete` was available as documented. The `options` parameter accepts a static array (not async callback), so the wizard uses `p.text` for initial gene input followed by `searchGenes()` then `p.autocomplete` for disambiguation — a cleaner UX pattern that also handles offline/slow-network gracefully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Interactive wizard is complete and wired to the CLI entry point
- Phase 27 Wave 3 (plans 04, 05, 06) are all complete: query, batch, and interactive commands all registered
- Phase 27 CLI package is feature-complete; ready for Phase 29 comprehensive test suite
- Gene config integration (Phase 28) can add `--config <gene>` to interactive wizard in a future iteration

---
*Phase: 27-cli-package*
*Completed: 2026-02-24*
