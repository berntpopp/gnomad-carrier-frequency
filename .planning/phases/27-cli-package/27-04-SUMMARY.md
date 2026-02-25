---
phase: 27-cli-package
plan: 04
subsystem: cli
tags: [commander, cli, query, gnomad, carrier-frequency, typescript]

# Dependency graph
requires:
  - phase: 27-02
    provides: queryGene function, gene-query pipeline, user-config, population-aliases
  - phase: 27-03
    provides: text-formatter, json-formatter, tsv-formatter, clinical-formatter
provides:
  - packages/cli/src/commands/query.ts — full query subcommand with 15 options
  - CLI-02: single gene lookup from terminal
  - CLI-04: text/json/tsv output formats
  - CLI-05: clinical text generation flag (--text/--clinical)
  - CLI-06: population filter (--population with alias resolution)
  - CLI-07: variant filter flags (--lof, --clinvar, --star-threshold)
  - CLI-08: homozygote exclusion flag (--exclude-homozygotes)
  - CLI-09: file output (--output)
  - CLI-13 stub: --config flag with Phase 28 deferral message
affects:
  - 27-05 (batch command — shares cli.ts entry point)
  - 27-06 (interactive command — shares cli.ts entry point)
  - 28-03 (will replace CLI-13 stub with real gene config integration)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Commander v14 negatable boolean options (--hwe/--no-hwe pattern)
    - mergeConfig + filterConfig override pattern for CLI flag merging
    - CLI-13 stub pattern: print deferral message to stderr, continue with defaults

key-files:
  created:
    - packages/cli/src/commands/query.ts
  modified:
    - packages/cli/src/cli.ts

key-decisions:
  - "CLI-13 stub: --config flag prints deferral message to stderr and continues with defaults (not exit 1)"
  - "gnomadVersion CLI flag mapped to 'version' key before mergeConfig — matches mergeConfig's expected key"
  - "filterConfig overrides applied after mergeConfig — allows --lof/--no-lof to override merged defaults"

patterns-established:
  - "Query subcommand pattern: loadUserConfig -> mergeConfig -> queryGene -> format -> write"
  - "Negatable boolean options: Commander --hwe/--no-hwe with default true"
  - "Stub flag pattern: check opts['flag'], print stderr note, continue (not exit)"

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 27 Plan 04: Query Subcommand Summary

**Commander-based `gnomad-cf query <gene>` command with 15 options: text/json/tsv formats, population filter, variant filter flags, homozygote exclusion, file output, clinical text generation, and CLI-13 stub for Phase 28 gene configs**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-24T07:56:52Z
- **Completed:** 2026-02-24T08:00:35Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `packages/cli/src/commands/query.ts` (182 lines) — full query subcommand wiring all CLI options to the queryGene pipeline and formatters from Plans 02 and 03
- Registered query command in `cli.ts` via `program.addCommand(queryCommand)`
- Verified end-to-end with real gnomAD API: CFTR query returns 605 variants, JSON/TSV/text formats all work, --population nfe correctly filters, --output writes to file
- CLI-13 stub: `--config` prints deferral message to stderr and continues with default settings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create query subcommand** - `b86e3f6` (feat)
2. **Task 2: Register query command in CLI entry point** - `80c313b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/cli/src/commands/query.ts` — Full query subcommand: argument `<gene>`, 15 options, action handler wiring loadUserConfig/mergeConfig/queryGene/formatters; error handling with user-friendly messages; CLI-13 stub
- `packages/cli/src/cli.ts` — Added `import { queryCommand }` and `program.addCommand(queryCommand)`

## Decisions Made

- **CLI-13 stub approach:** `--config` flag prints `"Note: Gene configs (--config) will be available in a future version. Proceeding with default settings."` to stderr and continues normally (does not exit). This ensures the flag is parseable and documented while Phase 28 implements the real behavior.
- **gnomadVersion flag mapping:** The `--gnomad-version` flag (camelCase: `gnomadVersion`) is remapped to `version` key before calling `mergeConfig()` — matching the key mergeConfig expects from user config (`defaultVersion`).
- **filterConfig after merge:** LoF/ClinVar flag overrides are applied after `mergeConfig()` to ensure explicit CLI flags always win over user config defaults for filter settings.

## Deviations from Plan

None — plan executed exactly as written. The plan's action handler spec was followed precisely. No bugs or blocking issues encountered.

## Issues Encountered

None. The gnomAD API responded successfully for CFTR. All format outputs (text, json, tsv) verified correct.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `gnomad-cf query <gene>` fully operational for any gene accessible via gnomAD v4 API
- All format options (text/json/tsv) verified working
- CLI-13 stub in place — Phase 28 can replace with real `loadGeneConfig()` call when gene config system is ready
- Plans 27-05 (batch) and 27-06 (interactive) can run independently — they add to cli.ts without conflicting

---
*Phase: 27-cli-package*
*Completed: 2026-02-24*
