# Phase 18: Documentation Content - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Write all documentation pages with clinical accuracy, embedded screenshots, and cross-links forming a complete user guide. Pages span 4 sections: Guide (getting started), Use Cases (3 clinical scenarios), Reference (methodology, data sources, filters, templates), and About (citation, changelog). Placeholder pages from Phase 16 are replaced with full content. Screenshots from Phase 17 are embedded.

</domain>

<decisions>
## Implementation Decisions

### Writing tone & audience
- Primary audience: broad clinical audience (not just genetic counselors) — include brief context for concepts like Hardy-Weinberg and carrier frequency
- Tone: friendly instructional — approachable but accurate, tutorial-style ("Enter your gene of interest and the calculator will...")
- Language: English only — docs entirely in English; German clinical text output is the app's feature but docs don't need German versions
- Disclaimers: prominent "For research use only" disclaimer on the landing page and/or a dedicated disclaimer note in the guide section

### Use case scenarios
- Two example genes: CFTR and HFE
  - CFTR: deactivate c.1210-11T>G variant (demonstrates variant exclusion)
  - HFE: activate only C282Y and H63D variants (demonstrates selective variant inclusion)
- Use case split: CFTR for carrier screening + family planning (2 pages), HFE for clinical letter (1 page)
- Walkthrough style: scenario-focused — start with a clinical scenario (e.g., couple planning pregnancy), then show key steps; focus on WHY and interpreting results, not every click
- Clinical text output: show a relevant snippet of the generated text — enough to see the format, not the full thing

### Reference depth
- Methodology: key formulas + plain-language explanation (q², 2pq, risk = 2pq × 2pq × 1/4). No full derivation
- Data sources: brief overview of gnomAD v4.1 vs v2.1.1 with key differences, link to gnomAD's own documentation for deeper detail
- Filters: practical overview with examples of what each filter includes/excludes — less technical, more "what does this mean for your results"
- Templates: full syntax reference documenting all available {{variable}} placeholders, template structure, and customization options — users should be able to create their own templates

### Screenshot presentation
- Style: clean embeds with descriptive captions below — no annotations, arrows, or callout overlays
- Framing: browser-like frame — subtle border/shadow wrapping screenshots to look like a browser window
- Density: 1-2 screenshots per page for use cases and reference pages
- Exception: Getting Started page shows all 4 wizard steps (one screenshot per step) as the full walkthrough page

### Claude's Discretion
- Exact page structure and heading hierarchy within each page
- Cross-link strategy between pages
- Which specific screenshots to use on which pages (14 available)
- Callout/tip box placement for clinical context
- Changelog page content and format

</decisions>

<specifics>
## Specific Ideas

- CFTR with c.1210-11T>G deactivated is a real-world clinical scenario — this variant has disputed pathogenicity and counselors often exclude it
- HFE with only C282Y and H63D demonstrates hereditary hemochromatosis carrier screening — a common clinical use case distinct from CF
- Browser-like screenshot frames give a polished, professional documentation feel
- Prominent research disclaimer reflects the tool's positioning as a research aid, not a diagnostic tool

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-documentation-content*
*Context gathered: 2026-02-23*
