# Phase 27: CLI Package - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Command-line tool (`gnomad-cf`) for querying gnomAD carrier frequencies. Supports single-gene queries, batch processing of gene lists, and an interactive wizard mode. Reuses `@gnomad-cf/core` calculation engine. Gene config system (Phase 28) and comprehensive test suite (Phase 29) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Output content & formatting
- Full data output matching everything the web app shows: carrier frequency (1:N), genetic prevalence, Bayesian prevalence, variant count, total allele count, sum allele frequency, population — plus per-variant detail (variant ID, consequence, AF, ClinVar status, ac_hom)
- Default human-readable format: summary blocks — grouped sections per population with labeled key:value lines
- Machine-readable formats: JSON and TSV via `--format` flag
- Per-variant detail: summary-level by default in JSON/TSV; add `--variants` flag to include full per-variant breakdown
- Clinical text generation supported via `--text` or `--clinical` flag, reusing `@gnomad-cf/core/templates` renderer

### Interactive mode
- Running `gnomad-cf` with no arguments launches a step-by-step wizard (gene → population → format → options)
- Gene input: autocomplete type-ahead search (user types partial name, CLI shows matching genes to pick from)
- Population selection: multi-select checklist showing all available populations
- After wizard completes: print the equivalent CLI command for reuse/scripting

### Batch mode
- Subcommand: `gnomad-cf batch <file>`
- Input format: auto-detect JSON (structured with per-gene settings) or plain text (one gene symbol per line)
- Error handling: skip failed genes and continue by default; `--fail-fast` flag to stop on first error. Summary at end shows failures.
- Progress: visual progress bar showing genes processed / total with ETA
- Concurrency: parallel API requests with configurable `--concurrency N` (default 3, conservative for gnomAD rate limits), with exponential backoff matching the web tool's retry behavior

### Command & flag design
- Subcommand structure: `gnomad-cf query CFTR`, `gnomad-cf batch genes.txt`, `gnomad-cf interactive` (like git/docker)
- No-args → launches interactive mode (alias for `gnomad-cf interactive`)
- Population IDs: accept both short codes (`nfe`, `afr`) and full names (`european`, `african`) with internal alias mapping. Short codes as primary in docs.
- Calculation options: config file (`~/.gnomad-cf.json`) for defaults + CLI flags for per-invocation overrides (`--hwe`, `--exclude-homozygotes`, `--penetrance 0.8`)
- gnomAD version: default v4.1, switchable via `--gnomad-version` flag (supports v2.1.1 and future versions)

### Claude's Discretion
- CLI framework choice (e.g. commander, yargs, citty, or other)
- Progress bar library selection
- Interactive prompt library selection (inquirer, prompts, clack, etc.)
- Config file schema and validation approach
- Exact short flag assignments (-p, -f, -o, etc.)
- Error message formatting and exit code conventions

</decisions>

<specifics>
## Specific Ideas

- Interactive wizard should feel similar to the web app's stepper flow — familiar to users who know the web tool
- Exponential backoff for API retries should match the web tool's existing behavior
- Equivalent-command echo after interactive mode is a key usability feature — helps users graduate from interactive to scripted usage

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-cli-package*
*Context gathered: 2026-02-24*
