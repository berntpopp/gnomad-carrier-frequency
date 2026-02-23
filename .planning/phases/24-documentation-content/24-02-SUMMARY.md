---
phase: 24-documentation-content
plan: "02"
subsystem: docs-content
tags: [vitepress, seo, faq, json-ld, hardy-weinberg, gnomad, structured-data]

dependency-graph:
  requires:
    - 24-01 (FAQ sidebar pre-registered in config.ts)
    - 16-vitepress-setup
    - 21-seo-foundation
  provides:
    - Expanded FAQ page at /reference/faq with FAQPage JSON-LD
    - 7 net-new Q&A pairs covering HWE and gnomAD data interpretation
  affects: []

tech-stack:
  added: []
  patterns:
    - FAQPage JSON-LD structured data in VitePress frontmatter (three-element tuple)
    - Two-category FAQ organization (HWE + gnomAD Data)

key-files:
  created:
    - docs/reference/faq.md
  modified: []

decisions:
  - id: faq-categories
    decision: "Two categories: Hardy-Weinberg Equilibrium (3 Qs) and gnomAD Data (4 Qs)"
    rationale: "Logical grouping by domain; HWE questions are conceptual, gnomAD questions are data-technical"
  - id: no-research-warning
    decision: "No Research Use Only callout on FAQ page"
    rationale: "Plan spec: FAQ is reference content, not educational claims requiring research disclaimer"
  - id: visible-content-matches-jsonld
    decision: "Visible Q&A text exactly matches JSON-LD acceptedAnswer text"
    rationale: "Google requires FAQ content visible to users; verbatim match ensures schema validity"

metrics:
  duration: "4 minutes"
  completed: "2026-02-23"
  tasks-completed: 2
  tasks-total: 2
---

# Phase 24 Plan 02: Expanded FAQ Page Summary

**One-liner:** FAQ page at /reference/faq with 7 net-new Q&A pairs (HWE violations, gnomAD versions, HWE flags, exome vs genome, ancestry groups, allele number, empty variant list) and FAQPage JSON-LD matching visible content.

## What Was Built

### Task 1: FAQ Page with FAQPage JSON-LD (7771110)

**`docs/reference/faq.md`** (111 lines):

**Hardy-Weinberg Equilibrium section (3 questions):**
- "When does Hardy-Weinberg equilibrium not hold?" -- covers 5 HWE assumptions, founder effects, assortative mating; notes HWE holds well for rare AR conditions
- "Why do carrier frequency estimates differ between gnomAD versions?" -- dataset size, population composition, GRCh37 vs GRCh38, exome/genome balance
- "What does it mean if gnomAD flags a variant as deviating from Hardy-Weinberg equilibrium?" -- genotyping artifacts, quality filters, pre-exclusion in calculator

**gnomAD Data section (4 questions):**
- "What is the difference between exome and genome data in gnomAD?" -- coverage, cost, v4.1 integration, combined AC/AN
- "How does gnomAD define genetic ancestry groups?" -- PCA-based inference, AFR/AMR/ASJ/EAS/FIN/MID/NFE/SAS groups, not self-reported ethnicity
- "What is allele number (AN) and why does it matter for carrier frequency estimates?" -- definition, low AN = unreliable estimate, displayed for transparency
- "Why might a gene show no qualifying variants in the calculator?" -- no ClinVar variants, structural variants, low coverage, version selection, filter settings

**Both JSON-LD and visible page content:**
- FAQPage JSON-LD with exactly 7 Question objects in mainEntity array
- inLanguage: "en"
- Visible Q&A text verbatim matches JSON-LD acceptedAnswer.text
- No duplicate questions from the 10 existing index.html FAQPage questions

**Internal links:**
- /guide/getting-started (intro paragraph)
- /reference/methodology (footer)
- /reference/data-sources (footer)
- /reference/filters (inline in last answer)

### Task 2: Validation Pass (no code changes)

Validation results:

| Check | Result |
|---|---|
| `vitepress build docs` (Task 1) | PASS (12.41s) |
| `vitepress build docs` (Task 2 final) | PASS (8.58s) |
| FAQ HTML file generated | PASS |
| FAQPage JSON-LD in built HTML | PASS |
| Question count in JSON-LD | PASS (7 of 7) |
| Article JSON-LD in what-is-carrier-frequency | PASS |
| Article JSON-LD in how-to-calculate | PASS |
| Zero duplicate questions vs index.html | PASS |
| All 7 gene deep-links (CFTR, GJB2, HEXA, HFE, PAH, ASPA, PKHD1) | PASS |
| Deep-link URL format (?gene=GENENAME) | PASS |
| Internal links resolve (/guide/getting-started, /reference/methodology, /reference/filters, /reference/data-sources) | PASS |
| FAQ in Reference sidebar (pre-registered in Plan 01) | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|---|---|---|
| 7771110 | feat | Create FAQ page with 7 net-new questions and FAQPage JSON-LD |
