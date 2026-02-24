---
phase: 28-gene-config-system
plan: 01
subsystem: config
tags: [zod, zod-v4, gene-config, schema-validation, registry, platform-loader, tsdown]

# Dependency graph
requires:
  - phase: 26-calculations
    provides: FilterConfig interface (field names matched in FilterConfigOverrideSchema)
  - phase: 25-core-extraction
    provides: tsdown build infrastructure, packages/core workspace structure
provides:
  - GeneConfigSchema: Zod v4 schema enforcing exactly-one-default-profile and at-least-one-disease-identifier
  - ConditionProfileSchema, DiseaseIdentifierSchema, FilterConfigOverrideSchema
  - registerGeneConfig, setPlatformLoader, loadGeneConfig, getRegisteredGenes
  - "@gnomad-cf/core/gene-config" subpath export (dist/gene-config.js + .d.ts)
  - 24 passing unit tests covering schema validation and loader behavior
affects:
  - 28-02-PLAN.md (seed configs — uses registerGeneConfig and GeneConfig type)
  - 28-03-PLAN.md (web auto-apply — imports from @gnomad-cf/core/gene-config)
  - 28-04-PLAN.md (CI validation — uses GeneConfigSchema.safeParse)
  - 27-02-PLAN.md (CLI gene-query — may use setPlatformLoader for fs-based loading)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform-neutral loader pattern: registry + injectable platformLoader for CLI/fs contexts"
    - "Zod v4 .refine() for cross-field constraints (exactly-one-default, at-least-one-disease-id)"
    - "Self-contained schema: FilterConfigOverrideSchema defined independently (no cross-entry-point import)"
    - "Case-insensitive registry: keys stored and looked up as uppercase"

key-files:
  created:
    - packages/core/src/gene-config/schema.ts
    - packages/core/src/gene-config/loader.ts
    - packages/core/src/gene-config/index.ts
    - packages/core/tests/gene-config.test.ts
  modified:
    - packages/core/src/index.ts
    - packages/core/tsdown.config.ts
    - packages/core/package.json

key-decisions:
  - "FilterConfigOverrideSchema defined independently in schema.ts (not imported from types/filter.ts) to avoid circular imports between tsdown entry points"
  - "Registry keys stored as uppercase; loadGeneConfig accepts any case and normalizes with toUpperCase()"
  - "setPlatformLoader uses a simple module-level variable (not a class or DI container) — sufficient for CLI injection use case"
  - "Platform loader errors caught and logged as warnings; returns null on failure (not throw)"

patterns-established:
  - "Gene config pattern: JSON files validated by GeneConfigSchema, registered via registerGeneConfig"
  - "Platform loader injection: CLI calls setPlatformLoader with fs.readFile-based function before querying"

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 28 Plan 01: Gene Config System Summary

**Zod v4 GeneConfigSchema with exactly-one-default and at-least-one-disease-id constraints, platform-neutral loader with registry and injectable fs loader, exposed as @gnomad-cf/core/gene-config subpath**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T07:48:53Z
- **Completed:** 2026-02-24T07:53:04Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- GeneConfigSchema with Zod v4 refine constraints: exactly one default profile, at least one OMIM or MONDO disease identifier, penetrance 0-1, clinvarStarThreshold 0-4, valid URL references
- Platform-neutral loader: in-memory registry with case-insensitive symbol lookup, injectable platformLoader for CLI/Node filesystem contexts
- @gnomad-cf/core/gene-config subpath added to tsdown entry points and package.json exports map; dist/gene-config.js and dist/gene-config.d.ts verified
- 24 passing unit tests: 13 schema tests (valid configs, constraints, boundary values, format validation) + 8 loader tests (null for unknown, registry hit, case-insensitive, platform loader called, invalid data returns null)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create gene-config schema, loader, and barrel** - `9b3c500` (feat)
2. **Task 2: Unit tests for gene config schema and loader** - `0450c1b` (test)

**Plan metadata:** `(pending docs commit)` (docs: complete plan)

## Files Created/Modified
- `packages/core/src/gene-config/schema.ts` - GeneConfigSchema, ConditionProfileSchema, DiseaseIdentifierSchema, FilterConfigOverrideSchema with Zod v4 refine constraints
- `packages/core/src/gene-config/loader.ts` - Registry, setPlatformLoader, registerGeneConfig, loadGeneConfig, getRegisteredGenes
- `packages/core/src/gene-config/index.ts` - Barrel re-exporting schema and loader
- `packages/core/tests/gene-config.test.ts` - 24 unit tests
- `packages/core/src/index.ts` - Added gene-config re-export
- `packages/core/tsdown.config.ts` - Added gene-config entry point
- `packages/core/package.json` - Added ./gene-config export

## Decisions Made
- FilterConfigOverrideSchema defined independently in schema.ts (not imported from types/filter.ts) to avoid circular imports between tsdown entry points
- Registry keys stored as uppercase; loadGeneConfig normalizes with toUpperCase() for case-insensitive lookup
- Platform loader uses a module-level variable — simple injection sufficient for CLI use, no DI container needed
- Platform loader errors caught and logged as warnings; returns null on failure rather than throwing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Web build has a pre-existing TypeScript error (`node:fs/promises` in load-templates.ts unresolvable in browser tsconfig) unrelated to this plan's changes — verified by confirming the error existed before any edits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- @gnomad-cf/core/gene-config is fully operational: schema, loader, tests, and build verified
- Ready for 28-02: seed gene config JSON files (CFTR, HEXA) using registerGeneConfig
- Ready for 28-03: web auto-apply of gene configs using loadGeneConfig
- Ready for 28-04: CI validation script using GeneConfigSchema.safeParse
- setPlatformLoader API ready for 27-02 CLI gene-query command to inject fs-based loader

---
*Phase: 28-gene-config-system*
*Completed: 2026-02-24*
