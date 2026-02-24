---
phase: 30-cli-integration-fixes
verified: 2026-02-24T15:52:32Z
status: passed
score: 6/6 must-haves verified
---

# Phase 30: CLI Integration Fixes — Verification Report

**Phase Goal:** The CLI filter flags (`--lof`, `--no-lof`, `--clinvar`, `--no-clinvar`, `--star-threshold`) correctly modify variant filtering behavior, the root typecheck covers all packages, and CLI prevalence math delegates to core functions — closing all gaps identified by the v1.5 milestone audit.

**Verified:** 2026-02-24T15:52:32Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CLI `--no-lof` flag excludes LoF variants from query results | VERIFIED | `query.ts:110` assigns `filterConfig.lofHcEnabled = opts['lof']`; `filter-flags.test.ts` confirms lofHcEnabled=false changes output |
| 2 | CLI `--no-clinvar` flag excludes ClinVar variants from query results | VERIFIED | `query.ts:113` assigns `filterConfig.clinvarEnabled = opts['clinvar']`; test case `count=1` when clinvarEnabled=false |
| 3 | CLI `--star-threshold` flag changes ClinVar star threshold | VERIFIED | `query.ts:116` assigns `filterConfig.clinvarStarThreshold`; test with threshold=4 reduces count from 2 to 1 |
| 4 | Root typecheck catches type errors in CLI package | VERIFIED | `package.json:18` typecheck script: `tsc --build packages/core && tsc --build packages/cli && bun run --filter gnomad-cf-web typecheck`; `bun run typecheck` exits 0 |
| 5 | CLI prevalence delegates to core `calculateGeneticPrevalence` and `calculateBayesianPrevalence` | VERIFIED | `gene-query.ts:26-27` imports both; lines 256, 259 call them — no inline q^2 math remains |
| 6 | Filter-effect integration test asserts different variant counts when filter flags change | VERIFIED | `filter-flags.test.ts` has 7 test cases; all 7 pass; test suite: 387/387 pass |

**Score:** 6/6 truths verified

---

## Required Artifacts

| Artifact | Expected | Exists | Lines | Stubs | Wired | Status |
|----------|----------|--------|-------|-------|-------|--------|
| `packages/cli/src/commands/query.ts` | FilterConfig correct property assignments | YES | 183 | None | Used by main CLI entry | VERIFIED |
| `packages/cli/src/commands/batch.ts` | FilterConfig correct property assignments | YES | 287 | None | Used by main CLI entry | VERIFIED |
| `packages/cli/src/utils/gene-query.ts` | Prevalence delegation to core functions | YES | 300 | None | Called by query.ts, batch.ts, interactive.ts | VERIFIED |
| `packages/cli/src/__tests__/filter-flags.test.ts` | Integration test for filter flag effects | YES | 122 | None | Run by vitest (7 tests pass) | VERIFIED |
| `package.json` | Typecheck script covering all 3 packages | YES | 32 | N/A | Executed by `bun run typecheck` | VERIFIED |
| `packages/cli/tsconfig.json` | `src/**/*.json` in include (fixture JSON access) | YES | 22 | N/A | Referenced by `tsc --build packages/cli` | VERIFIED |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `query.ts:110` | `FilterConfig.lofHcEnabled` | Direct property assignment | WIRED | `filterConfig.lofHcEnabled = opts['lof']` |
| `query.ts:113` | `FilterConfig.clinvarEnabled` | Direct property assignment | WIRED | `filterConfig.clinvarEnabled = opts['clinvar']` |
| `query.ts:116` | `FilterConfig.clinvarStarThreshold` | Direct property assignment | WIRED | `filterConfig.clinvarStarThreshold = opts['starThreshold']` |
| `batch.ts:155` | `FilterConfig.lofHcEnabled` | Direct property assignment | WIRED | `merged.filterConfig.lofHcEnabled = Boolean(opts['lof'])` |
| `batch.ts:156` | `FilterConfig.clinvarEnabled` | Direct property assignment | WIRED | `merged.filterConfig.clinvarEnabled = Boolean(opts['clinvar'])` |
| `batch.ts:158` | `FilterConfig.clinvarStarThreshold` | Direct property assignment | WIRED | `merged.filterConfig.clinvarStarThreshold = Number(opts['starThreshold'])` |
| `gene-query.ts:256` | `calculateGeneticPrevalence` from `@gnomad-cf/core/calculations` | Import + function call | WIRED | `calculateGeneticPrevalence([globalSumAF])` — no inline math |
| `gene-query.ts:259` | `calculateBayesianPrevalence` from `@gnomad-cf/core/calculations` | Import + function call | WIRED | `calculateBayesianPrevalence(geneticPrevalence, calcConfig.penetrance)` |
| `package.json` typecheck | `packages/cli` via `tsc --build packages/cli` | Shell script | WIRED | Verified: `bun run typecheck` exits 0 covering core + cli + web |

---

## Anti-Patterns Found

None. No TODO/FIXME comments, no placeholder content, no empty handlers, no stub implementations found in any modified file.

---

## Test Results

- **Full suite:** 387 tests, 26 test files — all passed
- **filter-flags.test.ts in isolation:** 7 tests — all passed
  - `default filters include both LoF and ClinVar variants (count=2)` — PASS
  - `--no-lof (lofHcEnabled=false) keeps both variants via ClinVar fallback` — PASS
  - `--no-clinvar (clinvarEnabled=false) reduces variant count to 1` — PASS
  - `--no-lof --no-clinvar excludes all variants (count=0)` — PASS
  - `high star threshold (clinvarStarThreshold=4) reduces ClinVar matches` — PASS
  - `filter flags produce different globalCarrierFrequency values` — PASS
  - `--no-clinvar --no-lof results in null globalCarrierFrequency (no variants)` — PASS

---

## Human Verification Required

None. All four success criteria are fully verifiable programmatically:

1. Filter flags use correct property names — confirmed by grep (no old names, 6 correct matches)
2. Root typecheck covers all 3 packages — confirmed by `bun run typecheck` passing
3. Prevalence delegates to core — confirmed by import + call sites in gene-query.ts
4. Integration test exists and passes — confirmed by 7/7 test pass

---

## Summary

All 6 must-haves from the PLAN.md frontmatter are verified against the actual codebase. The phase goal is fully achieved:

- **Filter flags** (`--lof`, `--no-lof`, `--clinvar`, `--no-clinvar`, `--star-threshold`) correctly map to `FilterConfig.lofHcEnabled`, `FilterConfig.clinvarEnabled`, and `FilterConfig.clinvarStarThreshold` — the old wrong names (`includeLofHC`, `includeClinvarPathogenic`, `clinvarMinStars`) are completely gone.
- **Root typecheck** now covers `packages/core`, `packages/cli`, and `apps/web` in sequence. Type errors in CLI code will fail CI.
- **Prevalence math** is delegated: `calculateGeneticPrevalence([globalSumAF])` and `calculateBayesianPrevalence(geneticPrevalence, calcConfig.penetrance)` are called at lines 256 and 259 of gene-query.ts.
- **Filter-effect integration test** (`filter-flags.test.ts`) provides 7 test cases on CFTR fixture data proving filter properties change variant counts and carrier frequencies.

---

_Verified: 2026-02-24T15:52:32Z_
_Verifier: Claude (gsd-verifier)_
