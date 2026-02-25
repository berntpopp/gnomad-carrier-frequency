---
phase: 28-gene-config-system
plan: 02
subsystem: config
tags: [gene-config, json, zod, validation, github-actions, cftr, hexa, gjb2, ci]

# Dependency graph
requires:
  - phase: 28-gene-config-system/28-01
    provides: GeneConfigSchema (Zod v4), loader registry, @gnomad-cf/core/gene-config subpath
provides:
  - Three seed gene config JSON files (CFTR, HEXA, GJB2) in configs/genes/
  - CI validation script (scripts/validate-gene-configs.ts) using Bun native TS execution
  - GitHub Actions workflow validating PRs touching gene configs or schema source
affects:
  - 28-03 (web auto-apply — loads CFTR/HEXA/GJB2 configs via registerGeneConfig)
  - 28-04 (any further CI/tooling for gene config ecosystem)
  - Community contributors adding new gene configs to configs/genes/

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bun native TypeScript execution for CI scripts — no build step, imports from packages/core/src directly"
    - "GitHub Actions path filter — workflow triggers only on relevant file changes"
    - "Schema-validated JSON configs at repo root configs/genes/ — not inside any package"

key-files:
  created:
    - configs/genes/CFTR.json
    - configs/genes/HEXA.json
    - configs/genes/GJB2.json
    - scripts/validate-gene-configs.ts
    - .github/workflows/validate-gene-configs.yml
  modified: []

key-decisions:
  - "configs/genes/ placed at repo root (not inside any package) — accessible to CLI, web, and scripts without cross-package imports"
  - "ClinVar star threshold 2 for Classic CF (expert panel level), 1 for CFTR-RD, HEXA, GJB2 — matches clinical evidence hierarchy"
  - "Penetrance 0.03 for CFTR-RD — empirical reduced penetrance for CFTR-related disorders"
  - "Bun runs TS natively — validate script imports schema source directly, no compilation needed"
  - "Zod v4 .issues API used in validation script — consistent with schema.ts convention from 28-01"

patterns-established:
  - "Pattern: Seed configs use clinically accurate OMIM phenotype MIM numbers in disease.omimId (not gene entry numbers)"
  - "Pattern: Each config has exactly one isDefault:true profile (enforced by GeneConfigSchema refine)"
  - "Pattern: Reference URLs are valid PubMed URLs for clinical literature"

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 28 Plan 02: Seed Gene Configs and CI Validation Summary

**Three seed gene config JSON files (CFTR/HEXA/GJB2) validated against GeneConfigSchema, with Bun-native CI script and GitHub Actions path-filtered PR workflow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T07:57:14Z
- **Completed:** 2026-02-24T07:59:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- CFTR.json with Classic CF (default, penetrance 1.0, clinvarStarThreshold 2) and CFTR-RD (penetrance 0.03) profiles
- HEXA.json with Tay-Sachs disease profile (penetrance 1.0, Ashkenazi Jewish founder effect documented)
- GJB2.json with DFNB1 nonsyndromic hearing loss profile (penetrance 1.0, population carrier frequency notes)
- scripts/validate-gene-configs.ts: Bun native TS script, validates all configs/genes/*.json, descriptive per-issue errors, exits 1 on failure
- .github/workflows/validate-gene-configs.yml: PR workflow with path filters for configs/genes/**, gene-config source, and validation script

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed gene config JSON files for CFTR, HEXA, and GJB2** - `d1d41d5` (feat)
2. **Task 2: Create CI validation script and GitHub Actions workflow** - `9a70e31` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `configs/genes/CFTR.json` - CFTR gene config: Classic CF (default) and CFTR-RD profiles
- `configs/genes/HEXA.json` - HEXA gene config: Tay-Sachs disease profile (default)
- `configs/genes/GJB2.json` - GJB2 gene config: DFNB1 nonsyndromic hearing loss profile (default)
- `scripts/validate-gene-configs.ts` - Bun-native validation script, imports GeneConfigSchema from source
- `.github/workflows/validate-gene-configs.yml` - GitHub Actions workflow with path filters

## Decisions Made
- `configs/genes/` placed at repo root — neutral location accessible without cross-package imports
- ClinVar star threshold 2 for Classic CF (expert panel), 1 for CFTR-RD/HEXA/GJB2 — reflects clinical evidence level
- CFTR-RD penetrance 0.03 — empirically supported reduced penetrance for CFTR-related disorders
- Bun runs TS natively from source — validation script imports `packages/core/src/gene-config/schema.ts` directly
- Zod v4 `.issues` API (not `.errors`) — consistent with 28-01 decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Seed configs ready; 28-03 can use registerGeneConfig to load CFTR/HEXA/GJB2 in the web wizard
- CI workflow validates community-contributed configs automatically on PRs
- No blockers for 28-03 (web auto-apply)

---
*Phase: 28-gene-config-system*
*Completed: 2026-02-24*
