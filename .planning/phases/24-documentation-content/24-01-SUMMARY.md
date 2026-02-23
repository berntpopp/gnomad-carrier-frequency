---
phase: 24-documentation-content
plan: "01"
subsystem: docs-content
tags: [vitepress, seo, educational-content, json-ld, hardy-weinberg, carrier-frequency]

dependency-graph:
  requires:
    - 16-vitepress-setup
    - 21-seo-foundation
  provides:
    - Educational concept pages with Article JSON-LD
    - Concepts nav/sidebar section in VitePress
    - FAQ page pre-registered in reference sidebar
  affects:
    - 24-02 (FAQ content page uses pre-registered sidebar slot)

tech-stack:
  added: []
  patterns:
    - Article JSON-LD structured data in VitePress frontmatter (three-element tuple)
    - ?gene=GENENAME deep-link CTAs from docs to calculator

key-files:
  created:
    - docs/concepts/what-is-carrier-frequency.md
    - docs/concepts/how-to-calculate.md
  modified:
    - docs/.vitepress/config.ts

decisions:
  - id: concepts-nav-placement
    decision: "Concepts nav entry placed between Use Cases and Reference"
    rationale: "Logical progression: how to use the tool (Guide/Use Cases) -> conceptual background (Concepts) -> technical reference (Reference)"
  - id: json-ld-frontmatter-pattern
    decision: "Article JSON-LD uses three-element tuple pattern [script, {type: application/ld+json}, |content]"
    rationale: "VitePress frontmatter head array convention for injecting raw script tags with multiline content"
  - id: faq-pre-registered
    decision: "FAQ sidebar entry pre-registered in config.ts despite file not existing until Plan 02"
    rationale: "Avoids config change in Plan 02; 404 on /reference/faq is expected until Plan 02 creates the file"
  - id: carrier-table-values
    decision: "Table values framed as approximate estimates from population studies, not exact gnomAD values"
    rationale: "Prevents outdated figures becoming authoritative; directs users to calculator for current data"

metrics:
  duration: "4 minutes"
  completed: "2026-02-23"
  tasks-completed: 2
  tasks-total: 2
---

# Phase 24 Plan 01: Educational Content Pages Summary

**One-liner:** Two educational concept pages (What is Carrier Frequency + How to Calculate) with Article JSON-LD, inline CTAs, and updated VitePress nav/sidebar registration.

## What Was Built

### Task 1: Educational Content Pages (d0d6e9f)

**`docs/concepts/what-is-carrier-frequency.md`** (~1,573 words):
- Introduction with carrier analogy and autosomal recessive focus
- Dominant vs recessive comparison table
- Why carrier frequency matters (clinical context, CFTR 1:25 example)
- Hardy-Weinberg connection (2pq formula, worked numeric example)
- Clinical context section (cascade testing, reproductive counseling, population screening)
- End-of-page CTA with 4 gene deep-links (CFTR, HFE, GJB2, HEXA)

**`docs/concepts/how-to-calculate.md`** (~1,595 words):
- Introduction with HWE formula and inline CTA
- Step 1: AC/AN to allele frequency, summing across multiple variants, CFTR example
- Step 2: Hardy-Weinberg application, numeric example, 1-in-X conversion
- 7-gene comparison table (CFTR, GJB2, HEXA, HFE, PAH, ASPA, PKHD1) with deep-links
- Population-specific variation section (founder effect, HEXA/Ashkenazi, CFTR/European)
- Limitations section (variant coverage, population representation, HWE assumptions)
- End-of-page CTA with 7 gene deep-links

**Both pages include:**
- Article JSON-LD structured data in frontmatter
- Research Use Only warning callout
- All calculator links with `{target="_blank" rel="noopener"}` attributes

### Task 2: VitePress Config Update (f2f48ee)

Updated `docs/.vitepress/config.ts`:
- Added Concepts nav entry between Use Cases and Reference
- Added `/concepts/` sidebar section with both pages
- Pre-registered `/reference/faq` in reference sidebar for Plan 02

## Verification Results

| Check | Result |
|---|---|
| `vitepress build docs` | PASS (8.68s) |
| Both markdown files exist | PASS |
| Article JSON-LD in both files | PASS |
| Research Use Only callout in both | PASS |
| gene= deep-links in both files | PASS (5 in explainer, 14 in tutorial) |
| 7-gene comparison table rows | PASS (CFTR, GJB2, HEXA, HFE, PAH, ASPA, PKHD1) |
| /concepts/ sidebar in config | PASS |
| FAQ pre-registered in config | PASS |
| Word counts in range | PASS (1,573 and 1,595 words) |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|---|---|---|
| d0d6e9f | feat | Create educational content pages with Article JSON-LD |
| f2f48ee | feat | Update VitePress config with concepts sidebar/nav and FAQ sidebar entry |
