# Phase 24: Documentation Content - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Educational content pages that explain carrier frequency concepts, establish the tool's authority for research use, and drive users to the calculator. Includes a "What is Carrier Frequency?" explainer (~1,500 words), a "How to Calculate Carrier Frequency" tutorial (~1,200 words), and expanded FAQ with FAQPage structured data. All new content is English-only.

</domain>

<decisions>
## Implementation Decisions

### Audience & tone
- Mixed audience: primarily clinical professionals (geneticists, counselors) but accessible to informed patients and students
- Approachable-expert tone: professional but explains jargon when first used, uses analogies occasionally — like a good review article
- No citations or references section — self-contained content, the calculator is the authority
- Broader intro covering inheritance patterns for context, then deep-dive on autosomal recessive
- **Research Use Only** framing maintained throughout — no clinical advice, consistent with app disclaimer

### Content depth & structure
- "What is Carrier Frequency?" page: Concept → Why it matters → Clinical context structure
- Tutorial page: conceptual explanations with results, not step-by-step formula derivations (show Hardy-Weinberg formula once, then focus on meaning and outcomes)
- Tables only for visual elements — no custom diagrams or Punnett squares
- Expanded FAQ covers both categories: Hardy-Weinberg assumptions/limitations AND gnomAD data interpretation questions

### Bilingual strategy
- All Phase 24 content is English-only
- No German versions of educational pages
- No German FAQ expansion
- No inline German terminology
- German educational content deferred to future work

### Calculator integration
- Contextual inline CTAs where naturally relevant (e.g., after mentioning a gene: "Try it with CFTR →") plus end-of-page CTA on each educational page
- Deep-links with pre-filled genes using ?gene=GENENAME query param when a specific gene is mentioned in content
- Tutorial page includes a comparison table of 5-8 common conditions with carrier frequencies and calculator deep-links for each gene
- Gene examples must work well with gnomAD short-read sequencing data — exclude SMN1 and other genes with structural variant limitations (Claude to select appropriate genes)

### Structured data strategy
- FAQ page: FAQPage JSON-LD schema for expanded questions (Google-recommended for Q&A content)
- Educational pages: Article JSON-LD schema (semantically appropriate for educational content)
- No duplication of Q&A content in schema across pages (Google penalizes this)

### Claude's Discretion
- Specific gene examples for the comparison table (excluding SMN1 and structural variant genes)
- Exact FAQ questions to add (mix of HWE theory and gnomAD practical questions)
- Article schema property details (author, publisher, datePublished, etc.)
- Page navigation structure within the docs site

</decisions>

<specifics>
## Specific Ideas

- "Research Use Only" tone must be maintained — match the existing app disclaimer framing
- Gene comparison table should only include genes where gnomAD short-read data provides reliable carrier frequency estimates (no SMN1, no genes requiring long-read or structural variant detection)
- Existing Phase 21 pattern: CFTR deep-link uses ?gene=CFTR query param recognized by useUrlState composable
- Inline CTAs should feel natural within the content flow, not like advertisements

</specifics>

<deferred>
## Deferred Ideas

- German versions of educational pages — future phase
- German FAQ expansion — future phase
- Punnett square or inheritance diagrams — potential future enhancement
- Academic citations / Further Reading section — could add later if users request

</deferred>

---

*Phase: 24-documentation-content*
*Context gathered: 2026-02-23*
