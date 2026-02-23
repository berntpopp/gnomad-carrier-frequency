# Requirements: gnomAD Carrier Frequency Calculator v1.5

**Defined:** 2026-02-23
**Core Value:** Accurate recurrence risk calculation from real gnomAD population data, with clinical documentation output that's ready to paste into patient letters.

## v1.5 Requirements

### Monorepo & Core Package

- [ ] **MONO-01**: Repository restructured as bun workspaces monorepo (packages/core, packages/cli, apps/web)
- [ ] **MONO-02**: Root `package.json` with workspace configuration and shared dev dependencies
- [ ] **MONO-03**: `@gnomad-cf/core` package with typed barrel export of all calculation, filtering, and template APIs
- [ ] **MONO-04**: Core package uses tsdown for dual ESM/CJS build output with declaration files
- [ ] **MONO-05**: TypeScript project references (`tsconfig.json`) across all workspace packages
- [ ] **MONO-06**: Pure `fetch()`-based gnomAD GraphQL client in core (no villus dependency)
- [ ] **MONO-07**: All shared types (`Variant`, `GeneInfo`, `PopulationFrequency`, etc.) moved to core
- [ ] **MONO-08**: All config files (gnomad.json, settings.json, templates) moved to core with typed loaders
- [ ] **MONO-09**: All pure utility functions (variant-filters, frequency-calc, template-renderer, formatters) moved to core
- [ ] **MONO-10**: Web app (`apps/web`) imports from `@gnomad-cf/core` instead of local `src/` paths
- [ ] **MONO-11**: Web app composables remain in `apps/web/src/composables/` as Vue-specific wrappers around core
- [ ] **MONO-12**: GitHub Actions `deploy.yml` updated for monorepo build (core → web → deploy)
- [ ] **MONO-13**: Web app continues deploying to same GitHub Pages URL without interruption

### Calculation Improvements

- [ ] **CALC-01**: Hardy-Weinberg 2pq carrier frequency formula (`2pq` where `q = Σ AF` and `p = 1 - q`)
- [ ] **CALC-02**: Per-variant carrier rate using `VCR = (AC - 2×Hom) / (AN/2)` when homozygote exclusion enabled
- [ ] **CALC-03**: Gene-level carrier rate via `GCR = 1 - Π(1 - VCRᵢ)` aggregation
- [ ] **CALC-04**: User-facing toggle in web app to enable/disable homozygote exclusion from carrier count
- [ ] **CALC-05**: Genetic prevalence calculation as `q²` (disease frequency from allele frequencies)
- [ ] **CALC-06**: Bayesian prevalence estimate with configurable penetrance parameter
- [ ] **CALC-07**: Prevalence results displayed in web app results step alongside carrier frequency
- [ ] **CALC-08**: Both old (simplified) and new (HWE 2pq) formulas available, with HWE as default
- [ ] **CALC-09**: Golden-value unit tests for all calculations using published reference values (CFTR, HEXA, PKD1)

### CLI

- [ ] **CLI-01**: `@gnomad-cf/cli` package with `gnomad-cf` binary entry point
- [ ] **CLI-02**: Single gene lookup: `gnomad-cf query <gene>` returns carrier frequencies for all populations
- [ ] **CLI-03**: Batch mode: `gnomad-cf batch <file>` processes gene list from JSON/CSV input
- [ ] **CLI-04**: Output format flag: `--format json|tsv|text` (default: json)
- [ ] **CLI-05**: Clinical text output: `--format text` produces German/English clinical documentation
- [ ] **CLI-06**: Population filter: `--population <id>` to restrict output to specific population
- [ ] **CLI-07**: Variant filter flags: `--lof`, `--clinvar`, `--star-threshold <n>` matching web app filters
- [ ] **CLI-08**: Homozygote exclusion flag: `--exclude-homozygotes` (default: on)
- [ ] **CLI-09**: Output to file: `--output <path>` or stdout by default
- [ ] **CLI-10**: Interactive mode via `@clack/prompts` when run without arguments
- [ ] **CLI-11**: Configurable concurrency for batch mode: `--concurrency <n>` (default: 3)
- [ ] **CLI-12**: `--version` and `--help` with usage examples
- [ ] **CLI-13**: Gene config support: `--config <gene>` applies community-curated settings for that gene

### Gene Config System

- [ ] **GENE-01**: JSON per-gene config schema with Zod validation (gene symbol, condition, inheritance, recommended filters, founder variants, notes)
- [ ] **GENE-02**: Gene config loading function in core package (`loadGeneConfig(symbol)`)
- [ ] **GENE-03**: Starter configs for CFTR, HEXA, and SMN1 with recommended filters and founder effect notes
- [ ] **GENE-04**: Gene configs auto-applied in web app when gene is selected (with user override)
- [ ] **GENE-05**: Gene configs applied in CLI via `--config <gene>` flag
- [ ] **GENE-06**: GitHub Actions CI validation workflow for gene config PRs (schema check, lint)
- [ ] **GENE-07**: Contributing guide for community gene config submissions

### Testing

- [ ] **TEST-01**: Vitest configured at monorepo root with per-package project configs
- [ ] **TEST-02**: Core package unit tests for carrier frequency calculation (HWE 2pq, simplified)
- [ ] **TEST-03**: Core package unit tests for homozygote exclusion (VCR, GCR formulas)
- [ ] **TEST-04**: Core package unit tests for genetic prevalence (q², Bayesian)
- [ ] **TEST-05**: Core package unit tests for variant filters (LoF HC, ClinVar pathogenic)
- [ ] **TEST-06**: Core package unit tests for template renderer (variable substitution, perspective, gender)
- [ ] **TEST-07**: Core package unit tests for gene config loading and validation
- [ ] **TEST-08**: CLI integration tests (single gene, batch mode, format flags, error handling)
- [ ] **TEST-09**: Web app component tests with Vue Test Utils (wizard steps, settings, results display)
- [ ] **TEST-10**: Playwright E2E tests for critical flows (wizard completion, URL sharing, history restore)
- [ ] **TEST-11**: CI pipeline runs all tests on push/PR with coverage reporting
- [ ] **TEST-12**: Coverage thresholds enforced (core: 90%+, CLI: 80%+, web: 60%+)

## Future Requirements (v1.6+)

### Features

- **FEAT-01**: X-linked recessive inheritance calculation
- **FEAT-02**: X-linked dominant inheritance calculation
- **FEAT-03**: Structural variant (SV) support via gnomAD SV API (#8)
- **FEAT-04**: At-risk couple calculation (both partners)
- **FEAT-05**: Export results to PDF
- **FEAT-06**: npm registry publishing for `@gnomad-cf/core` and `@gnomad-cf/cli`

### Performance

- **PERF-01**: Tree-shakeable icons (@mdi/js migration)

## Out of Scope

| Feature | Reason |
|---------|--------|
| npm registry publishing | GitHub Pages is primary distribution; publishing deferred to v1.6+ |
| Structural variant support | Different gnomAD API and data model; deferred to v1.6+ (#8) |
| SSR / Nuxt migration | Static HTML seed achieves 90% of SSR's SEO benefit |
| Backend/database | Direct gnomAD GraphQL from browser/CLI |
| Docker packaging for CLI | Bun binary is sufficient for now |
| GUI for gene config editing | JSON files + PR workflow is sufficient for v1 |
| Real-time API caching in CLI | Simple per-session caching sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MONO-01 | Phase 25 | Pending |
| MONO-02 | Phase 25 | Pending |
| MONO-03 | Phase 25 | Pending |
| MONO-04 | Phase 25 | Pending |
| MONO-05 | Phase 25 | Pending |
| MONO-06 | Phase 25 | Pending |
| MONO-07 | Phase 25 | Pending |
| MONO-08 | Phase 25 | Pending |
| MONO-09 | Phase 25 | Pending |
| MONO-10 | Phase 25 | Pending |
| MONO-11 | Phase 25 | Pending |
| MONO-12 | Phase 25 | Pending |
| MONO-13 | Phase 25 | Pending |
| CALC-01 | Phase 26 | Pending |
| CALC-02 | Phase 26 | Pending |
| CALC-03 | Phase 26 | Pending |
| CALC-04 | Phase 26 | Pending |
| CALC-05 | Phase 26 | Pending |
| CALC-06 | Phase 26 | Pending |
| CALC-07 | Phase 26 | Pending |
| CALC-08 | Phase 26 | Pending |
| CALC-09 | Phase 26 | Pending |
| CLI-01 | Phase 27 | Pending |
| CLI-02 | Phase 27 | Pending |
| CLI-03 | Phase 27 | Pending |
| CLI-04 | Phase 27 | Pending |
| CLI-05 | Phase 27 | Pending |
| CLI-06 | Phase 27 | Pending |
| CLI-07 | Phase 27 | Pending |
| CLI-08 | Phase 27 | Pending |
| CLI-09 | Phase 27 | Pending |
| CLI-10 | Phase 27 | Pending |
| CLI-11 | Phase 27 | Pending |
| CLI-12 | Phase 27 | Pending |
| CLI-13 | Phase 27 | Pending |
| GENE-01 | Phase 28 | Pending |
| GENE-02 | Phase 28 | Pending |
| GENE-03 | Phase 28 | Pending |
| GENE-04 | Phase 28 | Pending |
| GENE-05 | Phase 28 | Pending |
| GENE-06 | Phase 28 | Pending |
| GENE-07 | Phase 28 | Pending |
| TEST-01 | Phase 25 | Pending |
| TEST-02 | Phase 26 | Pending |
| TEST-03 | Phase 26 | Pending |
| TEST-04 | Phase 26 | Pending |
| TEST-05 | Phase 26 | Pending |
| TEST-06 | Phase 26 | Pending |
| TEST-07 | Phase 28 | Pending |
| TEST-08 | Phase 27 | Pending |
| TEST-09 | Phase 29 | Pending |
| TEST-10 | Phase 29 | Pending |
| TEST-11 | Phase 29 | Pending |
| TEST-12 | Phase 29 | Pending |

**Coverage:**
- v1.5 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 (traceability mapped to phases 25-29)*
