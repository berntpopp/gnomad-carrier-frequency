---
phase: 27-cli-package
plan: 05
subsystem: cli
tags: [cli, batch, p-limit, concurrency, commander, typescript, gnomad]

# Dependency graph
requires:
  - phase: 27-02
    provides: queryGene pipeline, gene-query.ts, retry.ts, user-config.ts, population-aliases.ts
  - phase: 27-03
    provides: text-formatter.ts, json-formatter.ts, tsv-formatter.ts, clinical-formatter.ts

provides:
  - packages/cli/src/commands/batch.ts: batch subcommand with p-limit concurrency
  - parseGeneListFile: exported pure function for auto-detecting JSON/plaintext gene lists
  - batchCommand: Commander Command registered in cli.ts

affects:
  - 27-06 (interactive command — cli.ts registration pattern)
  - 27-07 (test suite — parseGeneListFile is exported for direct import)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exported parsing functions for CLI commands (parseGeneListFile) — enables unit testing without mocking Commander"
    - "p-limit concurrency wrapping of async tasks in Promise.all"
    - "Progress indicator to stderr with \r for in-place updates"
    - "Exit code semantics: 0 success, 1 partial failure, 2 fatal/fail-fast"

key-files:
  created:
    - packages/cli/src/commands/batch.ts
  modified:
    - packages/cli/src/cli.ts

key-decisions:
  - "parseGeneListFile exported as standalone function (not inline in action handler) for Plan 07 testability"
  - "JSON auto-detection tried first; SyntaxError triggers fallback to plain text; structural errors re-thrown"
  - "Text format batch output separates gene blocks with 60-char rule lines for readability"
  - "Progress written with \\r to stderr for live in-place updating; terminal newline forced after completion"
  - "cli.ts batch registration was pre-emptively done by plan 04 — no conflict, working tree clean"

patterns-established:
  - "Batch output: results array collected then formatted once — no streaming per-gene output"

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 27 Plan 05: Batch Command Summary

**Batch subcommand for multi-gene processing: p-limit concurrency, auto-detect JSON/plaintext gene lists, progress tracking to stderr, and partial-failure error handling with exit code semantics**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T07:57:30Z
- **Completed:** 2026-02-24T08:01:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `parseGeneListFile` exported function: auto-detects JSON string arrays, JSON object arrays with `gene` property, and plain text (one per line, with `#` comment support)
- `batchCommand` with p-limit concurrency (default 3, configurable 1-10), progress indicator to stderr, `--fail-fast` flag, error summary, and 3-tier exit codes
- All output formats supported: json (default), text (gene blocks separated by rule), tsv
- Registered in cli.ts alongside queryCommand

## Task Commits

Each task was committed atomically:

1. **Task 1: Create batch subcommand with file parsing and concurrency** - `0339051` (feat)
2. **Task 2: Register batch command and verify** - committed within `80c313b` by plan 04 (pre-emptive registration, no additional commit needed)

## Files Created/Modified

- `packages/cli/src/commands/batch.ts` (286 lines) - Batch subcommand: parseGeneListFile + batchCommand with full concurrency/progress/error handling
- `packages/cli/src/cli.ts` - batchCommand registration (already in place from plan 04)

## Decisions Made

- `parseGeneListFile` exported at module level (not inline) so Plan 07 tests can import it directly without Commander machinery
- JSON auto-detection: try JSON.parse first; if SyntaxError, fall back to plain text; if valid JSON but wrong shape, throw descriptive error with Zod
- Text format for multiple genes uses 60-char rule line separator between gene blocks
- Progress written with `\r` carriage return to stderr for live in-place updating; `\n` forced after loop completes

## Deviations from Plan

None - plan executed exactly as written.

Note: cli.ts Task 2 registration was already performed by plan 04 (which pre-emptively added both queryCommand and batchCommand imports). The working tree was clean when Task 2 was attempted. The verification passed correctly — batch appears in `--help` and `batch --help` shows all options.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `parseGeneListFile` exported and ready for Plan 07 unit tests
- `batchCommand` registered and functional; ready for end-to-end testing in Plan 07
- Plan 06 (interactive command) can follow the same cli.ts registration pattern

---
*Phase: 27-cli-package*
*Completed: 2026-02-24*
