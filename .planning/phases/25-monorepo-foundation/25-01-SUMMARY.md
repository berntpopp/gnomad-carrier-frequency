---
phase: 25-monorepo-foundation
plan: 01
status: complete
subsystem: monorepo-infrastructure
tags: [bun-workspaces, monorepo, tsdown, vitest, vite, typescript-project-references]
completed: 2026-02-24
duration: 17 minutes
---

# Plan 25-01 Summary: Scaffold monorepo structure and move web app

## What Was Built

Established a bun workspaces monorepo with `packages/core` (empty scaffold) and `apps/web` (the existing web app relocated from the repo root). All configuration files for the monorepo were created (root package.json with workspace scripts, root tsconfig.json with project references, root vitest.config.ts with workspace projects). The web app was moved via `git mv` to preserve file history and reconfigured with new path aliases for `@gnomad-cf/core`. Both `bun run dev` and `bun run build` were verified working from the monorepo root.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Scaffold monorepo structure and config files | 6563626 | package.json, tsconfig.json, vitest.config.ts, packages/core/*, bun.lock, .gitignore |
| 2 | Move web app into apps/web/ and verify builds | c613a9a | apps/web/** (167 files renamed/created), apps/web/package.json, apps/web/tsconfig.json |

## Deviations

### Auto-fixed Issues

**1. [Rule 1 - Bug] tsdown.config.ts listed 7 non-existent entry points**

- **Found during:** Task 2 verification (bun run build)
- **Issue:** The plan's tsdown config included entry points for `src/types/index.ts`, `src/config/index.ts`, `src/queries/index.ts`, etc. — all of which don't exist yet (they'll be created in Phase 26 during module extraction). tsdown/rolldown throws `UNRESOLVED_ENTRY` errors.
- **Fix:** Reduced `packages/core/tsdown.config.ts` to only include the single existing entry `src/index.ts`. Added a comment explaining the other entries will be added in Phase 26.
- **Files modified:** `packages/core/tsdown.config.ts`
- **Commit:** c613a9a

**2. [Rule 2 - Missing Critical] vitest exits with code 1 when no test files found**

- **Found during:** Task 2 verification (bun run test)
- **Issue:** vitest exits code 1 with "No test files found" — this would break CI before any tests are written.
- **Fix:** Added `--passWithNoTests` flag to root `package.json` test script.
- **Files modified:** `package.json`
- **Commit:** c613a9a

**3. [Rule 3 - Blocking] bun not installed on system**

- **Found during:** Task 1 (Step 1 — bun install)
- **Issue:** bun binary not found in PATH. Project's `package.json` specifies `"packageManager": "bun@1.3.9"` but bun wasn't installed.
- **Fix:** Installed bun 1.3.9 via `npm install -g bun`. Bun was available for all subsequent commands.
- **Commit:** N/A (environment fix, not committed)

## Verification

- `bun install` completed without errors (resolved 68 workspace packages)
- `bun run dev` (from root): Vite dev server starts at localhost:5176, vue-tsc found 0 errors
- `bun run dev` (from apps/web): Same, confirmed workspace filter works
- `bun run build`: Core built (empty barrel, 0.01 kB), web built (920 modules, dist/index.html produced)
- `bun run test`: Exits code 0 with "No test files found" (passWithNoTests)
- `ls apps/web/dist/index.html`: Exists
- `ls src/` at root: Directory removed (all files moved to apps/web/src/)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| tsdown entry points deferred to Phase 26 | Only `src/index.ts` exists in Phase 25; adding non-existent entries causes build failure |
| `--passWithNoTests` for vitest | Prevents CI failures before tests are written in Phase 29 |
| Text lockfile `bun.lock` (not binary `bun.lockb`) | Human-readable format, better for code review and git diff |

## Next Phase Readiness

Phase 26 (Calculation Improvements) can begin extracting modules into `packages/core/src/`. The monorepo scaffold is stable:
- `@gnomad-cf/core` workspace dependency is linked in apps/web
- Vite alias resolves `@gnomad-cf/core` to `packages/core/src/` during dev
- TypeScript path aliases in `tsconfig.app.json` point to `packages/core/src/index.ts`
- tsdown will build from `packages/core/` when entry points are added
