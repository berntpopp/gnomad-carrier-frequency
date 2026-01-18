# Phase 1: Foundation - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish working gnomAD API integration and correct carrier frequency calculation logic. This phase delivers gene validation, API queries, variant filtering (LoF HC + ClinVar P/LP with >=1 star), and carrier frequency math (2 x sum of pathogenic AFs). No UI beyond what's needed to test the logic.

</domain>

<decisions>
## Implementation Decisions

### Population handling
- Show all populations, even with small sample sizes — add visual warning indicator for low sample counts
- Order populations by descending carrier frequency (highest first for clinical relevance)
- Founder effect threshold is configurable (default 5x, allow user to adjust e.g., 3x, 5x, 10x)
- Zero pathogenic variants in a population displayed as "Not detected" (not "0") — acknowledges detection limits

### Gene validation UX
- Autocomplete triggers after 2+ characters typed
- Official HGNC symbols only — no synonyms or aliases accepted
- Case-insensitive input — "cftr", "Cftr", "CFTR" all work, normalized internally
- If valid gene has no gnomAD variant data: explain clearly and offer default 1:100 assumption

### Claude's Discretion
- Sample size threshold for "low sample" warning (e.g., <1000 alleles)
- Autocomplete debounce timing and max suggestions shown
- Exact wording for error messages and warnings
- Loading state presentation during API calls

</decisions>

<specifics>
## Specific Ideas

- "Not detected" wording chosen deliberately over "0" — clinical nuance that absence of data isn't proof of zero frequency
- Descending frequency order puts clinically relevant populations at top (e.g., NFE for CFTR, ASJ for HEXA founder effects)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-18*
