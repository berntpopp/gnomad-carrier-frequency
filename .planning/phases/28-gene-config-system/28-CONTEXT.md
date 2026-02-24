# Phase 28: Gene Config System - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Community-curated per-gene configuration files that auto-apply recommended settings (filters, penetrance, variant exclusions) when a gene is selected in the web app or CLI. Includes a validated JSON schema, seed configs for three genes, CI validation workflow, and a comprehensive contributing guide.

</domain>

<decisions>
## Implementation Decisions

### Config file format & schema
- JSON format (consistent with existing project config files)
- Flexible schema: only gene symbol and one condition profile required; penetrance, filters, exclusions, metadata are optional
- Multiple condition profiles per gene supported (e.g., CFTR: Classic CF vs CFTR-RD)
- Each profile must have a default flag — one profile marked as default per gene
- Disease naming enforced through OMIM or MONDO identifiers (at least one required per profile)
- Config fields include: recommended filters, penetrance value, variant exclusion lists, gene metadata (display name, OMIM ID, inheritance, condition name, references)

### Auto-apply behavior
- Configs auto-apply silently when a gene with a config is selected
- Visual indicator shows "Gene config loaded" (chip/badge) with option to view or reset
- When multiple condition profiles exist, the default profile auto-applies; user can switch via dropdown in filter panel
- User can override any setting freely; no deviation tracking (config indicator stays, no diff display)
- Clinical text output does NOT mention which gene config profile was used — text reports numbers only

### Seed gene selection
- Three seed configs: CFTR, HEXA, GJB2
- SMN1 removed — paralog (SMN2) in repetitive region makes short-read sequencing data unreliable in gnomAD
- Curated values from expert judgment + published literature; sources cited in config metadata
- Seed configs include known variant exclusions for well-studied genes (e.g., known benign variants with high AF that skew calculations)

### Contribution workflow
- Config files live in a dedicated top-level `configs/genes/` directory (not bundled in core source)
- CI validates on PR: Zod schema validation, disease ID verification (OMIM/MONDO), gene symbol validation (HGNC/gnomAD), dry-run calculation with mock data
- All gene config PRs require maintainer review before merge
- Contributing guide is comprehensive: full schema docs, multiple examples, field-by-field explanations, FAQ, common pitfalls, links to resources for finding penetrance values
- Contributing guide published in both locations: `configs/CONTRIBUTING.md` + VitePress docs site page

### Claude's Discretion
- Exact Zod schema field names and nesting structure
- How configs are loaded at runtime (import vs fetch vs fs.read depending on platform)
- Visual indicator design (chip style, placement, color)
- Profile dropdown UI implementation in filter panel
- Disease ID verification approach (static list vs API check)

</decisions>

<specifics>
## Specific Ideas

- Disease identifiers should use OMIM or MONDO terms to enforce consistent naming across community contributions
- Configs should be visible and approachable to clinical geneticists, not just developers — the contributing guide should bridge the gap
- GJB2 chosen as third seed gene because it's well-characterized in gnomAD with high carrier frequency across many populations

</specifics>

<deferred>
## Deferred Ideas

- SMN1 config — may be possible in future with long-read sequencing data or specialized calling algorithms, but not with current gnomAD data
- PKD1 / autosomal dominant gene support — would require different calculation model (not AR carrier frequency)

</deferred>

---

*Phase: 28-gene-config-system*
*Context gathered: 2026-02-24*
