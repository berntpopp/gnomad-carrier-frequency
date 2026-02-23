# Phase 24: Documentation Content - Research

**Researched:** 2026-02-23
**Domain:** VitePress educational content authoring, JSON-LD structured data (Article + FAQPage), gene selection for comparison table, clinical genetics content strategy
**Confidence:** HIGH (most findings verified against official VitePress docs, Google Search Central, and authoritative genetics literature)

## Summary

Phase 24 adds three educational content pieces to the existing VitePress docs site: a "What is Carrier Frequency?" explainer (~1,500 words), a "How to Calculate Carrier Frequency" tutorial (~1,200 words), and an expanded FAQ page with FAQPage structured data. All content is English-only. The VitePress infrastructure, cross-linking patterns, and CTA deep-link URL format were established in Phase 21 and are ready to use as-is.

The primary technical challenge is implementing per-page JSON-LD structured data (Article and FAQPage schemas) in VitePress. The solution is VitePress frontmatter `head:` arrays with three-element tuples — this feature exists and works correctly in VitePress 2.0-alpha.16. A known build bug (attempting to parse JSON-LD as JavaScript) was fixed in VitePress before v1.0. The content strategy requires careful attention to one Google constraint: FAQPage structured data must not duplicate Q&A content across pages (Google penalizes this). Since the app's `index.html` already has a FAQPage schema (English and German), new FAQ questions added to the docs FAQ page must be distinct from those 10 existing English questions.

Gene selection for the tutorial comparison table requires excluding SMN1 (structural variant detection) and other genes where short-read WES/WGS data is unreliable. Appropriate genes are those studied extensively in gnomAD with well-known carrier frequencies: CFTR, GJB2, HEXA, HFE, PAH, ASPA, and PKHD1 all have reliable short-read exome/genome data and clinically meaningful carrier frequencies.

**Primary recommendation:** Use VitePress frontmatter `head:` arrays for per-page JSON-LD. Write Article schema for the two educational pages and FAQPage schema for the expanded FAQ page. Use only net-new FAQ questions (not repeating the 10 already in index.html JSON-LD) to avoid Google's duplicate content penalty.

## Standard Stack

No new npm packages are needed. Phase 24 is pure content and configuration work within the existing stack.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| VitePress | ^2.0.0-alpha.16 | Static site framework for docs content | Already installed; all docs pages are Markdown files in `docs/` |
| VitePress frontmatter `head:` | built-in | Per-page JSON-LD injection | Official VitePress pattern; three-element tuple syntax supports `<script>` content |
| JSON-LD (`application/ld+json`) | schema.org spec | Structured data for Article + FAQPage | Google's preferred structured data format; decoupled from visible HTML |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Google Rich Results Test | web tool | Validate FAQPage + Article schema | After adding JSON-LD to each new page |
| gnomAD v4.1 browser | web tool | Verify carrier frequencies for comparison table genes | Before publishing gene frequency table |
| VitePress local dev | `bun run docs:dev` | Preview content and links during authoring | Throughout content writing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Frontmatter `head:` for JSON-LD | `transformPageData` hook in config.ts | Hook approach is more complex, requires config changes; frontmatter keeps schema co-located with content |
| Frontmatter `head:` for JSON-LD | Custom Vue component in Markdown | Component approach adds complexity; head injection is what's needed for SEO crawlers |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

New files for Phase 24:

```
docs/
├── concepts/                        # NEW directory for educational content
│   ├── index.md                     # (optional: concepts overview)
│   ├── what-is-carrier-frequency.md # NEW: ~1,500 word explainer (DOC-01)
│   └── how-to-calculate.md          # NEW: ~1,200 word tutorial (DOC-02)
├── reference/
│   └── faq.md                       # NEW: expanded FAQ page (DOC-03)
└── .vitepress/
    └── config.ts                    # UPDATE: add concepts/ sidebar + nav entry
```

Alternative structure (if concepts/ is not introduced): place pages under `guide/` or as top-level docs pages. Decision is Claude's discretion (noted in CONTEXT.md).

### Pattern 1: Per-Page JSON-LD via VitePress Frontmatter

**What:** VitePress supports per-page `head:` entries in frontmatter. The three-element tuple `[tagName, attributes, content]` injects a `<script>` tag with inner content into the page's `<head>`. This is the standard VitePress pattern for page-specific structured data.

**When to use:** Any VitePress page that needs page-specific structured data (Article, FAQPage) that differs from the global site head in `config.ts`.

**Example (Article schema for educational page):**
```yaml
---
title: What is Carrier Frequency?
description: Learn what carrier frequency means in genetics, why it matters for autosomal recessive conditions, and how Hardy-Weinberg equilibrium is used to calculate it.
head:
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "What is Carrier Frequency?",
        "description": "Learn what carrier frequency means in genetics...",
        "datePublished": "2026-02-23",
        "dateModified": "2026-02-23",
        "author": {
          "@type": "Person",
          "name": "Bernt Popp",
          "url": "https://github.com/berntpopp"
        },
        "publisher": {
          "@type": "Organization",
          "name": "gnomAD Carrier Frequency Calculator"
        }
      }
---
```

**Source:** VitePress official frontmatter-config docs; GitHub issue #538 confirmed JSON-LD parse bug was fixed before v1.0.

**Type definition:** `HeadConfig = [string, Record<string, string>] | [string, Record<string, string>, string]`

### Pattern 2: FAQPage JSON-LD on the FAQ Page

**What:** The docs FAQ page adds FAQPage structured data for new questions only. The existing `index.html` already has FAQPage schema covering 10 English questions. Google penalizes duplicate Q&A content in structured data across pages.

**Constraint:** All questions in the docs FAQ page's FAQPage schema must be net-new questions NOT already present in `index.html` JSON-LD. The 10 existing English questions cover:
1. What is carrier frequency?
2. How do I calculate carrier frequency from gnomAD data?
3. How does the Hardy-Weinberg equation work for carrier frequency?
4. What is the difference between carrier frequency and disease prevalence?
5. How is recurrence risk calculated for autosomal recessive conditions?
6. Which gnomAD population should I select?
7. Can I exclude specific variants from the calculation?
8. Can I use these results for clinical decisions?
9. Is my patient data stored or transmitted?
10. What are the limitations of this calculator?

New FAQ questions for DOC-03 should cover the two categories from CONTEXT.md:
- **HWE assumptions/limitations category** (not already covered by Q3 and Q10): e.g., "When does Hardy-Weinberg equilibrium not hold?", "Why do carrier frequencies differ between gnomAD versions?", "What does it mean if a variant deviates from HWE?"
- **gnomAD data interpretation category** (not already covered by Q6, Q7, Q10): e.g., "What is the difference between exome and genome data in gnomAD?", "How does gnomAD classify genetic ancestry?", "Why might a gene have no qualifying variants in gnomAD?", "What is allele number (AN) and why does it matter?"

**Example (FAQPage JSON-LD in frontmatter):**
```yaml
head:
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "inLanguage": "en",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "When does Hardy-Weinberg equilibrium not hold?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "..."
            }
          }
        ]
      }
```

### Pattern 3: Calculator CTA Deep-Links

**What:** Inline CTAs in content link to the calculator with `?gene=GENENAME` query params. This pattern was established in Phase 21 and recognized by the `useUrlState` composable.

**URL format:** `https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR`

**VitePress Markdown link syntax:**
```markdown
[Try with CFTR →](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR){target="_blank" rel="noopener"}
```

**Note:** VitePress 2.x opens external links (full URLs) in new tabs by default. The `{target="_blank"}` attribute syntax is supported but optional for full URLs.

### Pattern 4: VitePress sidebar and nav registration

**What:** New pages must be registered in `docs/.vitepress/config.ts` sidebar configuration. New top-level section needs a sidebar entry AND a nav entry.

**Example sidebar addition to config.ts:**
```typescript
'/concepts/': [
  {
    text: 'Concepts',
    items: [
      { text: 'What is Carrier Frequency?', link: '/concepts/what-is-carrier-frequency' },
      { text: 'How to Calculate', link: '/concepts/how-to-calculate' }
    ]
  }
],
```

**Example nav addition:**
```typescript
{ text: 'Concepts', link: '/concepts/what-is-carrier-frequency' },
```

### Pattern 5: VitePress "For Research Use Only" warning callout

**What:** All existing docs pages use a VitePress `::: warning` callout for the Research Use Only disclaimer. New educational pages should follow this pattern.

**Example:**
```markdown
::: warning For Research Use Only
The gnomAD Carrier Frequency Calculator is intended for research and educational purposes only. It is not a validated clinical diagnostic tool. Any outputs must be independently reviewed and verified by qualified professionals before use in a clinical context.
:::
```

### Anti-Patterns to Avoid

- **Duplicate FAQPage questions across pages:** Google explicitly penalizes duplicate Q&A content in structured data. Any question already in `index.html` FAQPage schema must not appear in docs FAQ page schema.
- **Unverified carrier frequencies in comparison table:** Carrier frequencies must reflect actual gnomAD v4.1 data. Don't use literature values or estimates — direct users to verify via calculator link. Present the table as "approximate global values from gnomAD v4.1" with a caveat.
- **Article schema on FAQ page:** FAQ pages use `FAQPage` type, not `Article`. Educational explainer pages use `Article`.
- **Missing nav registration:** New content pages are invisible in sidebar until registered in config.ts.
- **Missing VitePress base path:** The docs site uses `base: '/docs/'` — internal links within docs use paths like `/concepts/how-to-calculate` (VitePress resolves relative to base automatically).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-page head tags in VitePress | Custom Vue layout/component | Frontmatter `head:` array | Built-in VitePress feature; frontmatter approach is zero-config |
| JSON-LD validation | Manual inspection | Google Rich Results Test | Catches syntax errors and missing required properties |
| Gene carrier frequencies for table | Manual literature search | gnomAD browser + existing methodology docs | gnomAD v4.1 provides current data; methodology page explains the approach |
| New content page creation | Modifying existing pages | New `.md` files in `docs/concepts/` | Keeps educational content separate from how-to guide content |

**Key insight:** VitePress's frontmatter system handles per-page structured data injection with zero custom code. The existing cross-link infrastructure (deep-link URL params, CTA button pattern) is fully reusable.

## Common Pitfalls

### Pitfall 1: Duplicating FAQ Questions Already in index.html

**What goes wrong:** Adding a FAQPage schema to the docs FAQ page with questions that already appear in `index.html`'s JSON-LD. Google's documentation warns against marking up the same FAQ content on multiple pages.

**Why it happens:** The docs FAQ page is a natural place to add more FAQ content, but the existing index.html already covers 10 English questions extensively.

**How to avoid:** Cross-reference all new questions against the 10 existing English questions in `index.html` before writing the FAQ page JSON-LD. Focus new questions on HWE theory details and gnomAD data interpretation (gnomAD exomes vs genomes, allele number interpretation, version differences, ancestry classification method).

**Warning signs:** A new question that starts with "What is carrier frequency?" or "How do I calculate..." is almost certainly duplicating existing content.

### Pitfall 2: VitePress YAML Frontmatter Multiline String Escaping

**What goes wrong:** JSON-LD embedded in YAML frontmatter fails to parse if special characters (colons, quotes, brackets) are not properly escaped, or if indentation is incorrect.

**Why it happens:** YAML has strict rules about special characters. JSON strings with colons are ambiguous in YAML without quoting.

**How to avoid:** Use the YAML block scalar (`|`) syntax for the JSON-LD content — this treats the content as a literal string without special character interpretation. Always validate with `bun run docs:build` after adding JSON-LD frontmatter.

**Example (correct):**
```yaml
head:
  - - script
    - type: application/ld+json
    - |
      {"@context": "https://schema.org", "@type": "Article", "headline": "..."}
```

**Warning signs:** VitePress build fails with YAML parse error after adding structured data frontmatter.

### Pitfall 3: SMN1 and Structural Variant Genes in Comparison Table

**What goes wrong:** Including genes like SMN1 in the comparison table that require long-read sequencing or copy-number variant (CNV) detection for accurate carrier frequency estimation. gnomAD short-read data is insufficient for these genes.

**Why it happens:** SMN1 is one of the most common autosomal recessive conditions (spinal muscular atrophy) and is an obvious candidate for inclusion.

**How to avoid:** Use only genes where ClinVar pathogenic variants are predominantly point mutations and small indels detectable by short-read WES/WGS. The safe set includes: CFTR, GJB2, HEXA, HFE, PAH, ASPA, PKHD1. SMN1 requires homologous region disambiguation not supported by gnomAD short-read.

**Warning signs:** A gene has few or zero qualifying variants in the calculator despite being clinically significant — often indicates structural variant detection gap.

### Pitfall 4: Treating Article Schema as Having Required Fields

**What goes wrong:** Over-engineering the Article schema by trying to fill in every field or treating it like an SEO checkbox exercise.

**Why it happens:** Schema.org Article has many optional properties; it's easy to overcomplicate.

**How to avoid:** Google's Article schema documentation explicitly states "there are no required properties." Use only `headline`, `datePublished`, `dateModified`, `author`, and `publisher` — the properties that have clear, accurate values.

**Warning signs:** Placeholder values like "unknown" or dates that don't match actual content — these violate Google's structured data quality guidelines.

### Pitfall 5: Missing Sidebar Registration Causing 404s from Nav

**What goes wrong:** Adding new `.md` files without updating `docs/.vitepress/config.ts` sidebar and nav. Pages exist but are not linked from navigation, and any internal VitePress links that reference them get no sidebar context.

**Why it happens:** VitePress doesn't auto-discover pages — all navigation must be explicitly configured.

**How to avoid:** Always update `docs/.vitepress/config.ts` when adding new pages. The existing pattern (e.g., `'/guide/'` sidebar block) shows the exact format to follow.

## Code Examples

### Article JSON-LD Frontmatter (verified VitePress pattern)
```yaml
---
title: What is Carrier Frequency?
description: Learn what carrier frequency means, why it matters for autosomal recessive conditions, and how Hardy-Weinberg equilibrium relates to population genetics.
head:
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "What is Carrier Frequency?",
        "description": "Learn what carrier frequency means, why it matters for autosomal recessive conditions, and how Hardy-Weinberg equilibrium relates to population genetics.",
        "datePublished": "2026-02-23",
        "dateModified": "2026-02-23",
        "author": {
          "@type": "Person",
          "name": "Bernt Popp",
          "url": "https://github.com/berntpopp"
        },
        "publisher": {
          "@type": "Organization",
          "name": "gnomAD Carrier Frequency Calculator",
          "url": "https://gnomad-carrier-frequency.kidney-genetics.org/"
        }
      }
---
```

Source: VitePress official frontmatter-config docs (verified); Google Search Central Article schema docs (verified)

### FAQPage JSON-LD Frontmatter (verified pattern)
```yaml
---
title: FAQ
head:
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "inLanguage": "en",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "When does Hardy-Weinberg equilibrium not hold?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Hardy-Weinberg equilibrium breaks down when a population deviates from its assumptions: random mating, no selection, no migration, no new mutations, and large population size. In clinical genetics, the most relevant violations are founder effects (small isolated populations where one allele becomes enriched by chance), assortative mating (individuals choosing partners with similar genetic traits), and significant inbreeding. For the rare autosomal recessive conditions typically analyzed in gnomAD, HWE holds well enough for carrier frequency estimation — selection against homozygous affected individuals is minimal when disease is rare."
            }
          }
        ]
      }
---
```

### Inline CTA with Gene Deep-Link (established Phase 21 pattern)
```markdown
For example, cystic fibrosis (CFTR gene) has a carrier frequency of approximately 1 in 25 in European populations — meaning roughly 4% of people of European ancestry carry one pathogenic CFTR variant. [Try it with CFTR →](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR){target="_blank" rel="noopener"}
```

### Comparison Table Format
```markdown
| Condition | Gene | Global Carrier Frequency | Try in Calculator |
|-----------|------|--------------------------|-------------------|
| Cystic fibrosis | CFTR | ~1 in 35 (global) | [Open CFTR →](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=CFTR) |
| Nonsyndromic hearing loss | GJB2 | ~1 in 10 (global) | [Open GJB2 →](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=GJB2) |
| Phenylketonuria | PAH | ~1 in 50 (NFE) | [Open PAH →](https://gnomad-carrier-frequency.kidney-genetics.org/?gene=PAH) |
```

Note: Exact frequency values must be verified against gnomAD v4.1 via the calculator before publishing. The table should include a disclaimer that values are approximate and population-specific, and that actual values vary by ancestry.

## Gene Selection for Comparison Table

Based on research into gnomAD carrier frequency studies and the constraint to exclude structural variant genes:

### Recommended Genes (7 genes, suitable for comparison table)

| Gene | Condition | Why Appropriate | Approximate Global CF |
|------|-----------|-----------------|----------------------|
| CFTR | Cystic fibrosis | Well-studied, point mutations dominate, ~1:25 European, flagship example | ~1:35 global |
| GJB2 | Nonsyndromic hearing loss | High carrier frequency, well represented in gnomAD exomes | ~1:10 global |
| HEXA | Tay-Sachs disease | Classic Ashkenazi Jewish example showing founder effect; all point mutations | ~1:30 Ashkenazi, ~1:300 general |
| HFE | Hereditary hemochromatosis | Common condition, C282Y variant well-documented in gnomAD | ~1:9 NFE (C282Y) |
| PAH | Phenylketonuria (PKU) | ACMG-recommended screening gene, good gnomAD coverage | ~1:50 global |
| ASPA | Canavan disease | Classic Ashkenazi Jewish gene, point mutations, good gnomAD data | ~1:40 Ashkenazi |
| PKHD1 | Autosomal recessive polycystic kidney disease | Nephrology-relevant example, point mutations, gnomAD coverage good | ~1:70 global |

**Excluded genes:**
- **SMN1**: Requires copy-number analysis for SMA carrier detection; short-read WGS/WES cannot reliably distinguish SMN1 from SMN2 duplicons
- **HBB**: Beta-thalassemia has complex allele heterogeneity and some regional deletions requiring special handling
- **BRCA1/BRCA2**: Not autosomal recessive in the traditional sense (dominant cancer predisposition, not recessive disease)
- **FMR1**: Trinucleotide repeat expansion, not detectable by standard gnomAD methods

**Important caveat for planner:** Actual carrier frequency values in the table MUST be verified against gnomAD v4.1 via the live calculator before writing. Present all table values as "approximate, population-specific" with a note to use the calculator for current data.

## Recommended FAQ Questions for DOC-03

These are net-new questions distinct from the 10 existing English FAQ questions in `index.html`:

### HWE Theory Category (3 questions)
1. **"When does Hardy-Weinberg equilibrium not hold?"** — Covers founder effects, inbreeding, selection; explains practical impact on estimates
2. **"Why do carrier frequency estimates differ between gnomAD v4.1 and v2.1.1?"** — Explains dataset expansion, different populations included, exome vs genome composition
3. **"What does it mean if gnomAD shows variants deviating from Hardy-Weinberg equilibrium?"** — Explains HWE filter in gnomAD, genotyping artifacts, what gnomAD flags

### gnomAD Data Interpretation Category (4 questions)
4. **"What is the difference between exome and genome data in gnomAD?"** — Explains WES vs WGS coverage, when genomes add value (intronic, regulatory), version-specific data
5. **"How does gnomAD define genetic ancestry groups?"** — Explains population inference via PCA, self-reported vs genetic ancestry, why categories matter
6. **"What is allele number (AN) and why does it matter for carrier frequency estimates?"** — Low AN means poor coverage at that site; low AN variants should be treated with caution
7. **"Why might a gene show no qualifying variants in the calculator?"** — Poor gnomAD coverage, gene not in ClinVar, all variants are VUS — practical troubleshooting

## Content Structure Recommendations

### DOC-01: "What is Carrier Frequency?" (~1,500 words)

**Recommended structure:**

1. **Introduction** (~150 words): Open with the fundamental concept — a carrier is someone with one working copy and one non-working copy of a gene. Use analogy: like having one working headlight. Introduce autosomal recessive as the relevant inheritance pattern. Brief mention that other patterns (dominant, X-linked) exist for context, then narrow to recessive.

2. **Concept: Dominant vs Recessive Inheritance** (~200 words): Brief comparison table showing how dominant (one bad copy = affected) differs from recessive (two bad copies needed). Sets up why "carrier frequency" is a meaningful concept — it only matters for recessive conditions.

3. **Why Carrier Frequency Matters** (~300 words): Explain the clinical context — two carrier parents face 1-in-4 risk per pregnancy. Real-world scale: even rare conditions can affect many people if carrier frequency is high. CFTR example: 1-in-25 carriers in European populations × 1-in-25 = 1-in-2,500 pregnancies. Inline CTA: "Try it with CFTR →"

4. **How Hardy-Weinberg Connects to Carrier Frequency** (~300 words): Show the HWE equation once (2pq for carriers). Explain intuitively that if we know how common the disease allele is (q), we can predict how common carriers are without counting every carrier. The math converts allele frequency to person frequency. Brief worked example with numbers.

5. **Clinical Context** (~300 words): When carrier frequency information is used — cascade testing, reproductive counseling, population-based screening programs. Mention that population-level data guides which conditions to screen for. Maintain Research Use Only framing throughout.

6. **End-of-page CTA** (~50 words): Full section directing readers to calculator.

### DOC-02: "How to Calculate Carrier Frequency" (~1,200 words)

**Recommended structure:**

1. **Introduction** (~100 words): State goal — understand the calculation method, not derive it. Show the HWE formula once and explain each variable. Inline CTA to calculator.

2. **Step 1: Identify Disease Allele Frequency** (~200 words): Explain how gnomAD provides allele counts (AC) and allele numbers (AN). Formula: q = AC/AN. Multiple variants — sum allele frequencies. CFTR example with sample numbers.

3. **Step 2: Apply Hardy-Weinberg** (~150 words): Carrier frequency = 2pq ≈ 2q for rare variants. Show why the approximation works (p ≈ 1 when q is small). Numeric example continuing from Step 1.

4. **Comparison Table: Common Conditions** (~250 words): Table with 5-7 genes showing condition, gene, approximate global carrier frequency, and deep-link CTAs. Include caveat that values are approximate and vary by ancestry. Each row has a "Try in Calculator →" link.

5. **Population-Specific Variation** (~200 words): Explain why global carrier frequency differs from population-specific. Founder effect concept. CFTR Ashkenazi example. Connect to calculator's population breakdown feature.

6. **Limitations to Know** (~200 words): gnomAD covers only sequenced variants (not all variants); some ancestries underrepresented; HWE assumptions apply. Connect to methodology docs page. Research Use Only framing.

7. **End-of-page CTA** (~100 words): Strong section directing to calculator with gene-specific deep links.

### DOC-03: Expanded FAQ Page

**Recommended structure:**

1. **Page intro** (~50 words): Brief intro explaining this is the FAQ page for the calculator, linking to methodology docs for in-depth technical explanations.

2. **FAQ sections by category:**
   - **Using the Calculator** (2-3 questions, possibly reusing content from existing visible FAQ — but NOT repeating JSON-LD schema questions)
   - **Hardy-Weinberg Equilibrium** (3 questions from HWE theory category above)
   - **gnomAD Data** (4 questions from gnomAD interpretation category above)

3. **FAQPage JSON-LD** in frontmatter covering the 7 net-new questions.

**Note on visible content vs schema:** The visible FAQ questions on the page must match the questions in the FAQPage JSON-LD. Google requires FAQ content to be visible to users — do not put questions in schema that aren't visible on page.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FAQPage rich results for all sites | FAQPage rich results restricted to authoritative government/health sites (since Aug 2023) | Aug 2023 | FAQPage schema still improves featured snippet eligibility and AI system visibility; worth implementing even without guaranteed rich results |
| Article schema with many required fields | Article schema has NO required properties | Current Google docs | Use only the fields you have accurate data for |
| JSON-LD in VitePress build failed for non-JS scripts | Fixed in VitePress before v1.0 (PR #517) | VitePress v1.0 | Three-element frontmatter head tuple works correctly |

**Context on FAQPage rich results restriction:** Google's current documentation states FAQPage rich results are only shown for "well-known, authoritative websites that are government-focused or health-focused." This site likely does not qualify for visual rich results in SERPs, but FAQPage schema still provides structured data signals used by AI systems (ChatGPT, Perplexity) and may improve featured snippet eligibility. The CONTEXT.md decision to add FAQPage schema is still correct.

## Open Questions

1. **Navigation structure for concepts/ section**
   - What we know: CONTEXT.md says this is Claude's discretion; current nav has Guide, Use Cases, Reference, About
   - What's unclear: Whether to add "Concepts" as a new top-level nav item, or nest educational pages under Guide or Use Cases
   - Recommendation: Add a "Learn" or "Concepts" nav item as the most semantically accurate location; educational content is distinct from the step-by-step Guide and the workflow-focused Use Cases

2. **Exact carrier frequency values for comparison table**
   - What we know: Approximate values from literature (CFTR ~1:35 global, GJB2 ~1:10 global, etc.)
   - What's unclear: Exact gnomAD v4.1 values require live calculator verification
   - Recommendation: The plan should include a step to run the calculator for each gene and record actual values before writing the table; note that frequencies vary by ancestry so the table should show approximate global values with a caveat

3. **FAQ page location and existing FAQ content**
   - What we know: DOC-03 requires a docs FAQ page; `index.html` already has a visible mini-FAQ with 5 questions
   - What's unclear: Whether the docs FAQ page should repeat the same 5 visible mini-FAQ questions with more depth, or be entirely new questions
   - Recommendation: The docs FAQ page visible content can include some overlap with the index.html visible FAQ (that's acceptable for users), but the FAQPage JSON-LD schema must contain only net-new questions not already in index.html JSON-LD schema

## Sources

### Primary (HIGH confidence)
- VitePress official docs (https://vitepress.dev/reference/frontmatter-config) — frontmatter head array syntax verified
- VitePress GitHub issue #538 (https://github.com/vuejs/vitepress/issues/538) — confirmed JSON-LD build bug was fixed pre-v1.0
- Google Search Central Article schema (https://developers.google.com/search/docs/appearance/structured-data/article) — no required properties; recommended properties list
- Google Search Central FAQPage schema (https://developers.google.com/search/docs/appearance/structured-data/faqpage) — site restrictions, required properties, duplicate content penalty

### Secondary (MEDIUM confidence)
- Genetics in Medicine journal abstract: gnomAD v4.0 carrier frequency analysis (2024) — gene carrier frequency ranges for CFTR, GJB2, PAH confirmed
- PubMed: gnomAD carrier screening studies (2022-2025) — ACMG 93-gene panel, structural variant exclusion criteria

### Tertiary (LOW confidence)
- Approximate carrier frequency values in comparison table — require verification against live gnomAD v4.1 calculator before publication

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — VitePress version and frontmatter head syntax verified against official docs; no new packages needed
- Architecture: HIGH — frontmatter JSON-LD pattern verified; existing CTA/deep-link pattern established in Phase 21
- Content structure: MEDIUM — based on CONTEXT.md decisions and existing docs patterns; exact word counts flexible
- Gene selection: MEDIUM — based on peer-reviewed gnomAD carrier frequency literature; exact frequencies need calculator verification
- Pitfalls: HIGH — FAQPage duplicate penalty verified against Google docs; YAML escaping is well-known VitePress issue; SMN1 exclusion is technical fact

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (VitePress alpha may update; Google schema requirements stable)
