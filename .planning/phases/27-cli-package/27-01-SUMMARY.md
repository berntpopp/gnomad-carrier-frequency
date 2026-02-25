---
phase: 27-cli-package
plan: 01
subsystem: cli
tags: [commander, tsdown, typescript, bun, monorepo, cli, p-limit, clack]

# Dependency graph
requires:
  - phase: 25-monorepo-foundation
    provides: packages/core with @gnomad-cf/core workspace; monorepo bun workspace structure
provides:
  - "@gnomad-cf/cli workspace package with gnomad-cf binary entry point"
  - "packages/cli/src/types.ts: QueryResult, VariantDetail, QueryOptions interfaces"
  - "CLI package builds to dist/cli.mjs with shebang via tsdown"
  - "gnomad-cf --version and --help work"
  - "build:cli convenience script in root package.json"
affects:
  - 27-02 (gene-query command — imports QueryResult, QueryOptions from types.ts)
  - 27-03 (formatters — imports QueryResult from types.ts)
  - 27-04 (batch command — imports QueryOptions, p-limit)
  - 27-05 (integration — uses gnomad-cf binary)

# Tech tracking
tech-stack:
  added:
    - commander@14.x (CLI argument parsing framework)
    - "@clack/prompts@1.x (interactive terminal prompts)"
    - p-limit@7.x (concurrency limiting for batch operations)
    - tsdown@0.20.3 (already in root, now used for CLI package too)
  patterns:
    - "CLI package follows same standalone tsconfig pattern as packages/core (no root tsconfig extension)"
    - "tsdown platform:node + dts:false for CLI binary (vs platform:neutral + dts:true for library)"
    - "ESM output with shebang banner for Unix portability"
    - "Shared types defined in Wave 1 plan to prevent cross-plan dependencies in Wave 2"

key-files:
  created:
    - packages/cli/package.json
    - packages/cli/tsconfig.json
    - packages/cli/tsdown.config.ts
    - packages/cli/src/cli.ts
    - packages/cli/src/types.ts
  modified:
    - package.json (added build:cli script; CLI added to build chain)
    - bun.lock (updated with new CLI package dependencies)

key-decisions:
  - "tsdown outputs dist/cli.mjs (not cli.js) for ESM on Windows — bin path updated to match actual output"
  - "CLI tsconfig is standalone (not extending root) — root tsconfig.json is references-only with no compilerOptions"
  - "platform:node in tsdown (not neutral) — CLI is Node.js-specific, needs fs/os/path built-ins"
  - "dts:false for CLI — binary, not library; no .d.ts declarations needed"
  - "p-limit chosen over p-queue — simpler API sufficient for batch concurrency; no queue introspection needed"
  - "#!/usr/bin/env node (not bun) in shebang for portability when installed via npm/npx"

patterns-established:
  - "CLI package structure: packages/cli/src/ with types.ts as shared type hub, cli.ts as Commander entry"
  - "Wave 1 plan creates shared types; Wave 2 plans import without cross-plan dependency risk"

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 27 Plan 01: CLI Package Scaffold Summary

**@gnomad-cf/cli workspace package with Commander skeleton, tsdown shebang build, and shared QueryResult/VariantDetail/QueryOptions types for Wave 2 plans**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T07:39:42Z
- **Completed:** 2026-02-24T07:42:46Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- @gnomad-cf/cli workspace package created with commander, @clack/prompts, p-limit dependencies resolved via bun install
- gnomad-cf --version prints 1.5.0; gnomad-cf --help prints usage with description; both work via bun run and node
- tsdown builds packages/cli/src/cli.ts to dist/cli.mjs with `#!/usr/bin/env node` shebang; build:cli script chains core + CLI build
- Shared types.ts established in Wave 1 with QueryResult, VariantDetail, QueryOptions — ready for Wave 2 imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CLI package structure and build config** - `0563134` (chore)
2. **Task 2: Create shared types and commander entry point** - `4f83339` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/cli/package.json` - CLI workspace config: @gnomad-cf/cli name, bin:gnomad-cf, commander/clack/p-limit deps
- `packages/cli/tsconfig.json` - Standalone tsconfig: ESNext, bundler resolution, composite, references packages/core
- `packages/cli/tsdown.config.ts` - Build config: platform:node, dts:false, shebang banner, entry src/cli.ts
- `packages/cli/src/cli.ts` - Commander program skeleton: gnomad-cf name, version 1.5.0, description; --version and --help work
- `packages/cli/src/types.ts` - Shared CLI types: QueryResult, VariantDetail, QueryOptions; imports from @gnomad-cf/core
- `package.json` - Added build:cli script; CLI added to main build chain between core and web
- `bun.lock` - Updated with CLI workspace package + new dependencies

## Decisions Made

- **tsdown outputs dist/cli.mjs not dist/cli.js**: On Windows with `"type": "module"`, tsdown/rolldown uses `.mjs` extension for ESM. Updated bin path to `dist/cli.mjs` to match actual output. Verified `node dist/cli.mjs --version` works correctly.
- **CLI tsconfig standalone (not extending root)**: Root tsconfig.json is a references-only file with no `compilerOptions`. Mirrors the same standalone pattern used by packages/core.
- **platform:node for CLI tsdown**: CLI needs Node.js built-ins (fs, os, path) — use `platform: 'node'` not `'neutral'`. Core uses neutral because it targets both Node and browser.
- **p-limit over p-queue**: Simpler API sufficient for limiting concurrent gnomAD API calls; no queue introspection needed. Consistent with all Wave 2 plans.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated bin path from dist/cli.js to dist/cli.mjs**

- **Found during:** Task 2 (Build verification)
- **Issue:** Plan specified `"bin": { "gnomad-cf": "dist/cli.js" }` but tsdown outputs `dist/cli.mjs` on Windows with ESM (`"type": "module"`)
- **Fix:** Updated package.json bin path to `dist/cli.mjs` to match actual build output
- **Files modified:** packages/cli/package.json
- **Verification:** `node packages/cli/dist/cli.mjs --version` prints 1.5.0
- **Committed in:** 4f83339 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — output extension mismatch)
**Impact on plan:** Minor fix to match actual tsdown behavior. Bin path corrected; all success criteria met.

## Issues Encountered

None beyond the `.mjs` extension deviation documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- @gnomad-cf/cli package scaffolded; Wave 2 plans (27-02, 27-03, 27-04) can add commands without touching package/build config
- types.ts exports QueryResult, VariantDetail, QueryOptions — ready for import in gene-query and formatters plans
- `bun run build:cli` works end-to-end: builds core first, then CLI
- Concern (from STATE.md): gnomAD API rate limits undocumented — default concurrency will be user-configurable via --concurrency flag (plan 27-04)

---
*Phase: 27-cli-package*
*Completed: 2026-02-24*
