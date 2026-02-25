# Phase 26: Calculation Improvements in Core - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade carrier frequency calculations in `packages/core` to clinically-correct published formulas (Hardy-Weinberg 2pq, homozygote exclusion via VCR/GCR, genetic prevalence q², Bayesian prevalence with penetrance). These replace the current simplified `2 × ΣAF` formula as default. All formulas validated against published reference values. New calculations displayed in the web app results step. Clinical text templates are NOT changed.

</domain>

<decisions>
## Implementation Decisions

### Results presentation
- New outputs (genetic prevalence, Bayesian prevalence) added to the existing summary card — all key numbers in one place below carrier frequency and recurrence risk
- Population table: single carrier frequency column that reflects the active formula (switches in place when formula/settings change, same pattern as existing filter changes)
- Population table gets new prevalence column(s) for per-population disease frequency
- Each new metric gets an info tooltip (ⓘ) explaining what it means — consistent with existing tooltips for carrier frequency and recurrence risk

### Formula switching UX
- Toggle in the filter panel: a switch labeled for HWE formula (on = HWE 2pq, off = simplified 2×ΣAF)
- When simplified formula is active, a warning chip/badge displays near the carrier frequency value indicating non-default formula
- Formula choice persisted to localStorage (same as other filter preferences)
- Formula choice included in shareable URLs — recipients see the same formula the sender used
- All toggles in the filter panel stay flat (no visual separator between variant filters and calculation settings)
- Clinical text output does NOT change based on formula choice
- Export (JSON/Excel) metadata includes which formula was used

### Homozygote exclusion defaults
- Homozygote exclusion ON by default (more clinically accurate)
- Toggle in the filter panel alongside formula toggle (same switch pattern)
- `ac_hom` field confirmed available in gnomAD GraphQL API at both variant-level and per-population level — no fallback handling needed
- Homozygote exclusion persisted to localStorage and included in shareable URLs (consistent with formula toggle)

### Penetrance & prevalence display
- Penetrance input: slider in the filter panel, defaulting to 100%
- When Phase 28 gene configs become available, penetrance auto-populated from gene config (slider updates to gene-specific value)
- Prevalence displayed in both ratio and fraction format: "1:10,000 (0.01%)" — consistent with carrier frequency display pattern
- Clinical text templates do NOT include prevalence (carrier frequency and recurrence risk only)

### Claude's Discretion
- Exact tooltip text and wording for new metrics
- Slider range and step size for penetrance
- Order of new lines in the summary card
- How prevalence column header is labeled in the population table
- Info tooltip content for the prevalence explanation

</decisions>

<specifics>
## Specific Ideas

- gnomAD API confirmed: `ac_hom` is available per population per variant in `exome.populations[].ac_hom` and `genome.populations[].ac_hom` — add to the existing GraphQL query
- The current query in `src/api/queries/gene-variants.ts` only fetches `ac` and `an` — needs `ac_hom` added at both exome/genome top level and population level
- Penetrance slider should work standalone in Phase 26 (default 100%) and later auto-populate from gene configs in Phase 28
- Warning chip for non-default formula follows the same visual pattern as the existing "Default (no gnomAD data)" chip in the summary card
- All new calculation settings (formula, homozygote exclusion, penetrance) follow the same persistence and URL-sharing pattern as existing filter preferences

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-calculation-improvements*
*Context gathered: 2026-02-23*
