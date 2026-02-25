---
phase: 27-cli-package
verified: 2026-02-24T08:20:22Z
status: passed
score: 5/5 must-haves verified
---
# Phase 27: CLI Package Verification Report
**Phase Goal:** A developer or researcher can run `gnomad-cf CFTR --format json` from the terminal and receive correct carrier frequency output, and can process a gene list in batch mode with configurable output formats.
**Verified:** 2026-02-24T08:20:22Z
**Status:** passed
**Re-verification:** No - initial verification
---

## Goal Achievement

### Observable Truths
| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `gnomad-cf --version` prints 1.5.0 and `--help` shows query/batch/interactive | VERIFIED | Confirmed by running; output shows version 1.5.0 and all three subcommands |
| 2 | `gnomad-cf query CFTR --format json` returns structured JSON | VERIFIED | query.ts calls queryGene then formatJson; wired end-to-end; 17 integration tests pass |
| 3 | `gnomad-cf batch FILE --format tsv --output results.tsv` processes multi-gene list | VERIFIED | batch.ts: parseGeneListFile + pLimit + formatTsv + writeFile; 23 tests pass |
| 4 | `gnomad-cf` (no args) on TTY launches interactive wizard | VERIFIED | interactive.ts 383 lines with @clack/prompts wizard; cli.ts routes no-args TTY |
| 5 | CLI integration tests with mocked gnomAD pass for all commands, formats, error handling | VERIFIED | 72 CLI tests pass; root `bun run test` returns 226/226 |

**Score:** 5/5 truths verified

---

### Required Artifacts
| Artifact | Expected | Lines | Status |
|----------|----------|-------|--------|
| `packages/cli/src/cli.ts` | CLI entry point, Commander program, subcommand registration | 27 | VERIFIED |
| `packages/cli/src/commands/query.ts` | Single gene query command with all option flags | 182 | VERIFIED |
| `packages/cli/src/commands/batch.ts` | Batch command + exported parseGeneListFile | 286 | VERIFIED |
| `packages/cli/src/commands/interactive.ts` | Interactive wizard via @clack/prompts | 383 | VERIFIED |
| `packages/cli/src/utils/gene-query.ts` | queryGene pipeline using @gnomad-cf/core | 286 | VERIFIED |
| `packages/cli/src/output/text-formatter.ts` | Human-readable text formatter | 197 | VERIFIED |
| `packages/cli/src/output/json-formatter.ts` | JSON formatter | 37 | VERIFIED |
| `packages/cli/src/output/tsv-formatter.ts` | TSV formatter with quoting | 158 | VERIFIED |
| `packages/cli/src/output/clinical-formatter.ts` | Clinical documentation text formatter | 232 | VERIFIED |
| `packages/cli/src/config/user-config.ts` | User config loader + mergeConfig | 156 | VERIFIED |
| `packages/cli/src/utils/retry.ts` | Retry utility | 98 | VERIFIED |
| `packages/cli/src/utils/population-aliases.ts` | Population alias resolver | 70 | VERIFIED |
| `packages/cli/src/types.ts` | CLI type definitions | 35 | VERIFIED |
| `packages/cli/src/__tests__/formatters.test.ts` | Formatter unit tests (32 tests) | 341 | VERIFIED |
| `packages/cli/src/__tests__/query.test.ts` | queryGene integration tests (17 tests) | 175 | VERIFIED |
| `packages/cli/src/__tests__/batch.test.ts` | Batch tests: parsing + concurrency (23 tests) | 320 | VERIFIED |
| `packages/cli/src/__tests__/fixtures/cftr-response.json` | CFTR mock API response fixture | 177 | VERIFIED |
| `packages/cli/vitest.config.ts` | Vitest config (name=cli, node env) | 9 | VERIFIED |
| `packages/cli/package.json` | Package metadata: bin, scripts, deps | 23 | VERIFIED |
| `packages/cli/dist/cli.mjs` | Built CLI binary (170 KB) | N/A | VERIFIED |

Note: The three `placeholder:` instances in interactive.ts are @clack/prompts input hint strings (e.g., `placeholder: 'e.g. CFTR, HEXA, GJB2'`), not code stubs.

---

### Key Link Verification
| From | To | Via | Status |
|------|----|-----|--------|
| cli.ts | commands/query.ts | import + .addCommand(queryCommand) | WIRED |
| cli.ts | commands/batch.ts | import + .addCommand(batchCommand) | WIRED |
| cli.ts | commands/interactive.ts | import + .addCommand(interactiveCommand) | WIRED |
| commands/query.ts | utils/gene-query.ts | import queryGene then await queryGene(gene, opts) | WIRED |
| commands/batch.ts | utils/gene-query.ts | import queryGene then called in pLimit task | WIRED |
| commands/query.ts | output/text-formatter.ts | import formatText then formatText(result) | WIRED |
| commands/query.ts | output/json-formatter.ts | import formatJson then formatJson(result) | WIRED |
| commands/query.ts | output/tsv-formatter.ts | import formatTsv then formatTsv(result) | WIRED |
| commands/query.ts | output/clinical-formatter.ts | import formatClinical then await formatClinical(result) | WIRED |
| utils/gene-query.ts | @gnomad-cf/core/client | import executeGraphQLQuery then called via withRetry | WIRED |
| utils/gene-query.ts | @gnomad-cf/core/filters | import filterPathogenicVariantsConfigurable then called | WIRED |
| utils/gene-query.ts | @gnomad-cf/core/calculations | import aggregatePopulationFrequenciesWithConfig then called | WIRED |
| __tests__/query.test.ts | utils/gene-query.ts | import queryGene - function under test | WIRED |
| __tests__/batch.test.ts | commands/batch.ts | import parseGeneListFile - function under test | WIRED |
| __tests__/formatters.test.ts | output/text-formatter.ts | import formatText - function under test | WIRED |
| Root vitest.config.ts | packages/cli/vitest.config.ts | projects: packages/*/vitest.config.ts glob | WIRED |

---

### Requirements Coverage
| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| CLI-01 | @gnomad-cf/cli package with gnomad-cf binary | SATISFIED | package.json bin field; dist/cli.mjs built (170 KB) |
| CLI-02 | Single gene lookup: gnomad-cf query GENE | SATISFIED | commands/query.ts fully implemented; integration tests verify output |
| CLI-03 | Batch mode: gnomad-cf batch FILE | SATISFIED | commands/batch.ts with parseGeneListFile + pLimit; 23 batch tests pass |
| CLI-04 | Output format flag: --format json/tsv/text | SATISFIED | All three formatters implemented; routing in query and batch handlers |
| CLI-05 | Clinical text output (German/English) | SATISFIED | clinical-formatter.ts uses @gnomad-cf/core/templates; --text/--clinical flags |
| CLI-06 | Population filter: --population ID | SATISFIED | resolvePopulation alias system; population filter in queryGene; tested |
| CLI-07 | Variant filter flags: --lof, --clinvar, --star-threshold | SATISFIED | All flags on query and batch; mapped to filterConfig in action handler |
| CLI-08 | Homozygote exclusion flag: --exclude-homozygotes | SATISFIED | Flag present; calcConfig.useHomExclusion set; tested in query tests |
| CLI-09 | Output to file: --output PATH | SATISFIED | writeFile in both query and batch; defaults to stdout |
| CLI-10 | Interactive mode via @clack/prompts | SATISFIED | commands/interactive.ts 383 lines; full 10-step wizard |
| CLI-11 | Configurable concurrency: --concurrency N | SATISFIED | pLimit(concurrency) in batch; range validation (1-10); concurrency test passes |
| CLI-12 | --version and --help | SATISFIED | gnomad-cf --version prints 1.5.0; --help shows all subcommands |
| CLI-13 | Gene config support --config GENE (stub) | SATISFIED (stub) | Flag present; prints deferral note to stderr; Phase 28 feature per plan |
| TEST-08 | CLI integration tests with mocked gnomAD | SATISFIED | 72 CLI tests pass: 32 formatter, 17 query, 23 batch; no real API calls |

---

### Anti-Patterns Found
| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| commands/interactive.ts:78,120,218 | placeholder: strings in @clack/prompts config | Info | UI hint strings, not code stubs; no concern |
| commands/query.ts help text | STUB comment for --config flag | Info | Intentional per CLI-13; documented deferral to Phase 28 |

No blocker anti-patterns found.

---

### Human Verification Required

The following behaviors cannot be verified programmatically:

#### 1. Live gnomAD query via gnomad-cf query CFTR --format json

**Test:** Run `bun run packages/cli/src/cli.ts -- query CFTR --format json` with internet access.
**Expected:** JSON object with gene: "CFTR", populations array, globalCarrierFrequency between 0 and 1, matching web app values for the same gene.
**Why human:** Requires real gnomAD API network access; CI tests use mocked responses.

#### 2. Interactive wizard terminal flow

**Test:** Run `bun run packages/cli/src/cli.ts` in a real terminal (not piped). Step through gene entry, version selection, population multiselect, format selection.
**Expected:** Wizard renders with @clack/prompts UI, autocomplete works, spinner shows during query, results are displayed, equivalent command is echoed.
**Why human:** Interactive TTY behavior cannot be verified by static analysis; interactive.ts is 383 lines with full implementation but terminal interaction is inherently visual.

#### 3. Batch file processing with --output flag

**Test:** Create a genes.json file with ["CFTR", "HEXA"], run `gnomad-cf batch genes.json --format tsv --output results.tsv`. Check that results.tsv is created with correct TSV columns.
**Expected:** File written with header row + 2 gene x N population rows; TSV fields properly quoted.
**Why human:** Requires real gnomAD API and filesystem write; unit tests cover the formatting logic but not full integration.

---

## Gaps Summary

No gaps found. All 5 observable truths are verified by code inspection and test execution.

---

_Verified: 2026-02-24T08:20:22Z_
_Verifier: Claude (gsd-verifier)_
