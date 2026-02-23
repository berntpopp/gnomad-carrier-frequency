# Phase 18: Documentation Content - Research

**Researched:** 2026-02-23
**Domain:** VitePress markdown authoring, clinical documentation content, screenshot embedding
**Confidence:** HIGH

## Summary

Phase 18 is a content-authoring phase, not a software-engineering phase. The technical stack (VitePress alpha 2.0.0-alpha.16, custom CSS, sidebar config) is already in place from Phase 16. The 14 screenshots are generated and in `docs/public/screenshots/`. All 16 placeholder pages exist with their final paths. The work is: replace placeholder text in `.md` files with accurate, clinically sound content and add browser-frame CSS for screenshot presentation.

The content domains are firmly established from the app source code: filter defaults, template variables, gnomAD version configs, calculation formulas, and perspectives are all code-verified. The writing style decisions are locked in CONTEXT.md. The main research value is (1) confirming VitePress markdown features available for content authoring, (2) mapping the 14 screenshots to pages, (3) extracting verified clinical/technical facts from source code so writers don't guess, and (4) identifying cross-link and CSS patterns.

**Primary recommendation:** Write content directly into the 16 existing `.md` files. Add a `.screenshot-frame` CSS class in `custom.css` for browser-like framing. Use VitePress `::: tip` and `::: warning` containers for callout boxes. Every technical claim (formulas, filter names, variable names) must match the source code — use the verified facts below.

## Standard Stack

The established environment for this phase:

### Core (all already installed and configured)
| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| VitePress | 2.0.0-alpha.16 | Markdown → HTML build | Already configured in `docs/.vitepress/config.ts` |
| VitePress default theme | bundled | Containers, layout, nav | Already active, brand colors set |
| custom.css | exists | Brand color overrides | At `docs/.vitepress/theme/custom.css` |

### Nothing to Install

No new packages are needed for Phase 18. The entire technical stack is already in place. The work is markdown authoring and CSS for screenshot framing.

### Screenshot Assets (14 files, all verified present)

All files are in `docs/public/screenshots/` and referenced from markdown as `/screenshots/filename.webp` (VitePress strips the `public/` prefix automatically):

| File | Content | Best Use |
|------|---------|----------|
| `step-1-gene-search.webp` | Empty gene search input, step 1 UI | Getting Started step 1 |
| `step-1-gene-selected.webp` | CFTR selected, gene constraint visible | Getting Started step 1 (after) / Gene Search guide |
| `step-2-patient-status.webp` | Patient status options, step 2 | Getting Started step 2 / Patient Status guide |
| `step-3-frequency.webp` | Frequency source tabs, step 3 | Getting Started step 3 / Frequency Source guide |
| `step-4-results.webp` | Full results, population table | Getting Started step 4 / Results guide |
| `text-output.webp` | Clinical text panel with copy button | Use Case: Clinical Letter / Results guide |
| `variant-table.webp` | Variant table with LoF HC rows | Filters reference / Use Case: CFTR exclusion |
| `filter-chips.webp` | Filter chip controls visible | Filters reference page |
| `settings-dialog.webp` | Settings dialog open | Templates reference / Contributing guide |
| `hero-preview.webp` | App hero/landing state | Use Cases overview or landing page supplement |
| `dark-mode-results.webp` | Step 4 in dark mode | Data Sources or general appeal |
| `mobile-results.webp` | Mobile viewport results | Mobile-oriented callout |
| `population-drilldown.webp` | Ashkenazi Jewish row expanded | Methodology / Data Sources reference |
| `search-history.webp` | History panel showing past searches | Getting Started tip or Results guide |

## Architecture Patterns

### Page File Structure (all files already exist as placeholders)

```
docs/
├── index.md                        # Landing page — has content from Phase 16, add disclaimer note
├── guide/
│   ├── index.md                    # Guide intro — PLACEHOLDER → full content
│   └── getting-started.md          # 4-step walkthrough — PLACEHOLDER → full content
├── use-cases/
│   ├── index.md                    # Use cases overview — PLACEHOLDER → full content
│   ├── carrier-screening.md        # CFTR scenario 1 — PLACEHOLDER → full content
│   ├── family-planning.md          # CFTR scenario 2 — PLACEHOLDER → full content
│   └── clinical-letter.md          # HFE scenario — PLACEHOLDER → full content
├── reference/
│   ├── index.md                    # Reference overview — PLACEHOLDER → full content
│   ├── methodology.md              # HWE formulas — PLACEHOLDER → full content
│   ├── data-sources.md             # gnomAD v4/v3/v2 — PLACEHOLDER → full content
│   ├── filters.md                  # Filter options — PLACEHOLDER → full content
│   └── templates.md                # Variable syntax — PLACEHOLDER → full content
└── about/
    ├── index.md                    # About overview — PLACEHOLDER → full content
    ├── citation.md                 # CITATION.cff + BibTeX — PLACEHOLDER → full content
    └── changelog.md                # Version history — PLACEHOLDER → full content
```

Note: `contributing.md` is listed in requirements (ABOU-03) but the sidebar config in `config.ts` does not currently include a Contributing link. The sidebar config will need a new entry added.

### Pattern 1: VitePress Image Embedding with Browser Frame

**What:** Reference screenshots via standard markdown image syntax with a CSS class for framing
**When to use:** All screenshot embeds across all pages

Markdown (standard syntax — VitePress resolves `public/` assets automatically):
```markdown
![CFTR gene selected showing constraint metrics](/screenshots/step-1-gene-selected.webp)
*Step 1: After selecting CFTR, the gene constraint panel appears below the search field.*
```

For browser-frame effect, add CSS to `custom.css` and wrap with a custom container or use a `<figure>` HTML block:
```html
<figure class="screenshot-frame">
  <img src="/screenshots/step-1-gene-selected.webp" alt="CFTR gene selected showing gene constraint data" />
  <figcaption>Step 1: After selecting CFTR, the gene constraint panel appears below the search field.</figcaption>
</figure>
```

CSS to add to `docs/.vitepress/theme/custom.css`:
```css
/* Browser-like screenshot frame */
.screenshot-frame {
  margin: 1.5rem 0;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.screenshot-frame img {
  display: block;
  width: 100%;
  height: auto;
  border-bottom: 1px solid var(--vp-c-divider);
}

.screenshot-frame figcaption {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  text-align: center;
}
```

### Pattern 2: VitePress Custom Containers for Callout Boxes

**What:** Built-in VitePress container syntax for tip, warning, info, danger
**When to use:** Clinical context callouts, research disclaimer, important notes

Verified syntax (from official VitePress docs):
```markdown
::: tip For the Curious
Hardy-Weinberg equilibrium assumes random mating and no selection. In practice, these
assumptions hold well enough for the allele frequencies observed in gnomAD.
:::

::: warning Research Use Only
This calculator is intended to support clinical documentation workflows, not to replace
formal diagnostic interpretation. Results should be reviewed by a qualified clinician.
:::

::: info Population Note
Carrier frequencies vary significantly between populations. The global figure averages
across all gnomAD populations. Use population-specific values when ancestry is known.
:::
```

Available container types: `tip`, `warning`, `danger`, `info`, `details`

Custom title syntax: `::: tip Custom Title` overrides the default label.

### Pattern 3: Cross-Linking Between Pages

**What:** Relative markdown links without file extensions (VitePress converts `.md` to `/`)
**When to use:** All cross-page navigation

```markdown
<!-- From a use-case page to reference -->
See the [Filters reference](/reference/filters) for details on adjusting variant inclusion.

<!-- From reference to use-case -->
The [CFTR carrier screening use case](/use-cases/carrier-screening) demonstrates this with a real example.

<!-- From guide to use-cases -->
Ready to see a complete workflow? Try the [use cases](/use-cases/) section.
```

Note: Use absolute paths from docs root (starting with `/`), not relative paths. This is more robust with VitePress's base path handling.

### Pattern 4: Heading Hierarchy for Clinical Pages

**What:** Consistent H1/H2/H3 structure VitePress renders in the right-sidebar table of contents
**When to use:** All content pages

Recommended structure:
```markdown
# Page Title (H1 — only one per page, matches sidebar item text)

Brief 1-2 sentence intro of what this page covers.

## Clinical Scenario (H2 — main sections, appear in right TOC)

Scenario text.

### Step-by-step (H3 — subsections)

Content.

::: tip
Callout
:::
```

VitePress auto-generates an in-page TOC from H2 and H3 headings in the right sidebar.

### Anti-Patterns to Avoid

- **Relative links with `.md` extension:** `[text](./other.md)` — use `/reference/other` instead. VitePress handles extension stripping.
- **Embedding screenshots via URL query parameters:** Use plain path `/screenshots/file.webp`, not full GitHub Pages URLs.
- **Writing formulas in plain text without code blocks:** Use inline code or a custom block for formulas. VitePress does not include LaTeX/MathML by default.
- **Using H1 for subsections:** Only one `#` per page. Use `##` for major sections.
- **Hardcoding gnomAD version numbers without checking config:** The app uses v4.1, v3.1.2, v2.1.1 — match exactly.
- **Ignoring the `contributing.md` sidebar gap:** The config.ts sidebar for `/about/` only has citation and changelog — add contributing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Callout/tip boxes | Custom HTML divs with inline style | VitePress `::: tip/warning/info` containers | Built-in, theme-aware, dark-mode compatible |
| Screenshot border/shadow | Per-image inline style | Single `.screenshot-frame` CSS class in `custom.css` | One place to change, applied consistently |
| Table of contents | Manual anchor lists | VitePress auto-TOC from H2/H3 headings | Zero maintenance, always accurate |
| Search indexing | Extra meta tags | VitePress built-in local search (already configured) | Indexes all markdown content automatically |
| Code formatting | Manual HTML `<code>` tags | Markdown backticks and fenced blocks | Standard, more readable source |
| BibTeX formatting | Custom styling | Fenced code block with `bibtex` language hint | Gets syntax highlighting via Shiki |
| Formula display | Custom component | Markdown code block or Unicode characters | VitePress has no LaTeX — use Unicode (q², 2pq, ×) or code blocks |

**Key insight:** This phase is markdown authoring into an already-configured VitePress site. The only new code is CSS for screenshot framing. Everything else uses built-in VitePress features.

## Common Pitfalls

### Pitfall 1: Incorrect Technical Claims About Filters

**What goes wrong:** Documentation says "LoF HC requires ClinVar evidence" or misstates filter defaults.
**Why it happens:** Filter logic is nuanced — LoF HC is independent of ClinVar; missense requires ClinVar P/LP. Defaults differ from what you'd guess.
**How to avoid:** Use the verified facts section below. Defaults from source code: `lofHcEnabled: true`, `missenseEnabled: true`, `clinvarEnabled: true`, `clinvarStarThreshold: 2`, `clinvarIncludeConflicting: false`, `clinvarConflictingThreshold: 80`.
**Warning signs:** If your draft says star threshold defaults to 1 (it's 2) or says missense doesn't need ClinVar (it does).

### Pitfall 2: Wrong Recurrence Risk Formula for Different Statuses

**What goes wrong:** Documentation shows a single formula when there are two different divisors based on index patient status.
**Why it happens:** The formula branches on whether the index patient is heterozygous (÷4) or compound het/homozygous (÷2).
**How to avoid:** Document both formulas: heterozygous carrier → risk = carrier_freq / 4; compound het or homozygous affected → risk = carrier_freq / 2.
**Warning signs:** Showing only "2pq × 2pq × 1/4" without explaining when "2pq × 2pq × 1/2" applies.

### Pitfall 3: Missing Contributing Page in Sidebar Config

**What goes wrong:** Contributing page is written (ABOU-03) but doesn't appear in sidebar navigation.
**Why it happens:** The existing `config.ts` sidebar for `/about/` only has citation and changelog — contributing is not listed.
**How to avoid:** Add `{ text: 'Contributing', link: '/about/contributing' }` to the `/about/` sidebar items in `config.ts`.
**Warning signs:** `docs/about/contributing.md` exists but isn't reachable via sidebar.

### Pitfall 4: Screenshot Path Includes 'public/'

**What goes wrong:** `![alt](/public/screenshots/file.webp)` returns 404 in built site.
**Why it happens:** VitePress's `docs/public/` directory is a pass-through — files are served from the root of the docs base, not from `/public/`.
**How to avoid:** Use `/screenshots/file.webp` (not `/public/screenshots/file.webp`).
**Warning signs:** Screenshots work in dev (`vitepress dev`) but return 404 after `vitepress build`.

### Pitfall 5: German Text Snippets in English Docs

**What goes wrong:** When showing clinical text output examples, pasting raw German text makes the page look inconsistent.
**Why it happens:** The app's primary output is German; it's tempting to use real fixture output.
**How to avoid:** Use the English template output for English docs. The English templates exist (`src/config/templates/en.json`). Show a snippet like: *"A heterozygous pathogenic variant in the CFTR gene was identified..."*

### Pitfall 6: ClinGen Treated as a Filter (It's a Warning)

**What goes wrong:** Data Sources page describes ClinGen as a filter that excludes variants.
**Why it happens:** ClinGen appears in the app but it's a validity warning, not a variant filter.
**How to avoid:** ClinGen shows gene-disease validity status as an advisory banner. It does not affect which variants are included in the calculation.

### Pitfall 7: gnomAD Version Population Mismatches

**What goes wrong:** Describing population breakdowns identically for all versions.
**Why it happens:** gnomAD v4, v3, v2 have different population sets.
**How to avoid:** v4.1 has 8 populations (adds `mid` Middle Eastern). v3.1.2 has 8 populations (adds `ami` Amish, no `mid`). v2.1.1 has 8 populations (has `oth` Other, no `mid` or `ami`). Reference genomes: v4 and v3 use GRCh38; v2 uses GRCh37.

## Verified Technical Facts (Source of Truth for Content Authors)

All facts below are verified against project source code.

### Application Version History
- v1.0: MVP — gene search, wizard, gnomAD integration, carrier frequency, German text generation (shipped 2026-01-19)
- v1.1: Release-ready — variant table, ClinGen warnings, configurable filters, export, template editor, logging, help, Lighthouse 90+ (shipped 2026-01-19)
- v1.2: Sharing — URL state sharing, PWA/offline, manual variant exclusion, mobile optimization, search history (shipped 2026-01-20)
- v1.3: Documentation site (in progress, current milestone)

Current package version: `1.2.0` (from `package.json`)

### gnomAD Versions Supported
| Display Name | Dataset ID | Reference Genome | Key Differentiator |
|-------------|------------|-----------------|-------------------|
| gnomAD v4.1 | gnomad_r4 | GRCh38 | 807,162 samples; adds Middle Eastern (`mid`) population; default version |
| gnomAD v3.1.2 | gnomad_r3 | GRCh38 | Genome-only (no exomes); adds Amish (`ami`) population |
| gnomAD v2.1.1 | gnomad_r2_1 | GRCh37 | Older reference genome; uses `oth` (Other) instead of `mid` or `ami` |

### Population Codes by Version
**v4.1:** `afr`, `amr`, `asj`, `eas`, `fin`, `mid`, `nfe`, `sas`
**v3.1.2:** `afr`, `ami`, `amr`, `asj`, `eas`, `fin`, `nfe`, `sas`
**v2.1.1:** `afr`, `amr`, `asj`, `eas`, `fin`, `nfe`, `oth`, `sas`

### Calculation Formulas (from `useCarrierFrequency.ts`)

Carrier frequency from allele frequencies:
```
q = Σ(variant_AF_i)
  where variant_AF = (exome_AC + genome_AC) / (exome_AN + genome_AN)
carrier_frequency = 2 × q   (approximation: 2pq ≈ 2q when q is small)
```

Recurrence risk (from `calculateRisk()` in `useCarrierFrequency.ts`):
```
status = 'heterozygous' (known carrier):
  risk = carrier_frequency / 4
  (= 2q × 2q × 1/4 = carrier_freq × partner_carrier_prob × 1/4)

status = 'homozygous' or 'compound_het_confirmed' or 'compound_het_assumed':
  risk = carrier_frequency / 2
```

Hardy-Weinberg genotype frequencies (from `methodology.json`):
```
p + q = 1  (where q = disease allele frequency)
AA (unaffected homozygous): p²
Aa (heterozygous carrier):  2pq ≈ 2q
aa (affected homozygous):   q²
```

Founder effect threshold: populations where frequency > 5× global (from `settings.json`: `founderEffectMultiplier: 5`).

Default carrier frequency fallback (when no qualifying variants found): `0.01` (1%, from `settings.json`).

### Filter Defaults (from `src/types/filter.ts` FACTORY_FILTER_DEFAULTS)
| Filter | Default | What it does |
|--------|---------|-------------|
| LoF HC | **enabled** | Includes LOFTEE high-confidence loss-of-function variants on canonical transcript |
| Missense | **enabled** | Includes missense, inframe insertion, inframe deletion — ONLY when also has ClinVar P/LP evidence |
| ClinVar P/LP | **enabled** | Includes ClinVar Pathogenic/Likely Pathogenic variants |
| ClinVar star threshold | **2 stars** | Minimum review stars required (0=no review, 1=single submitter, 2=expert panel, etc.) |
| Include conflicting | **disabled** | Optionally include "conflicting classifications" if majority are P/LP |
| Conflicting threshold | **80%** | Percentage of submissions that must be P/LP to include conflicting variant |

Filter logic nuance: LoF HC is independent of ClinVar (LOFTEE annotation is sufficient). Missense variants require ClinVar P/LP evidence regardless of whether the ClinVar filter is enabled — this prevents unsupported missense inclusion.

### Index Patient Status Options (4 options, from `src/types/text.ts`)
| Status | Key | Clinical meaning | Risk divisor |
|--------|-----|-----------------|-------------|
| Heterozygous carrier | `heterozygous` | Known carrier of one pathogenic variant | ÷4 |
| Homozygous affected | `homozygous` | Two identical pathogenic variants | ÷2 |
| Compound het (confirmed) | `compound_het_confirmed` | Two different variants, phase confirmed | ÷2 |
| Compound het (assumed) | `compound_het_assumed` | Two different variants, phase assumed | ÷2 |

### Template Variables (all 14, from `src/config/template-variables.ts`)
| Variable | Category | Example | Description |
|----------|----------|---------|-------------|
| `{{gene}}` | gene | CFTR | Gene symbol |
| `{{carrierFrequency}}` | frequency | 4.0% | Carrier frequency as percentage |
| `{{carrierFrequencyRatio}}` | frequency | 1:25 | Carrier frequency as ratio |
| `{{recurrenceRiskPercent}}` | risk | 0.25% | Recurrence risk as percentage |
| `{{recurrenceRiskRatio}}` | risk | 1:400 | Recurrence risk as ratio |
| `{{source}}` | context | gnomAD v4.1.0 | Data source attribution |
| `{{indexStatus}}` | context | heterozygous | Index patient status |
| `{{statusIntro}}` | context | A homozygous pathogenic... | Status-specific intro text |
| `{{populationName}}` | context | European (non-Finnish) | Population name (optional) |
| `{{pmid}}` | context | 12345678 | PubMed ID (optional) |
| `{{accessDate}}` | context | January 19, 2026 | Formatted access date |
| `{{genderSuffix}}` | formatting | *innen | German gender-inclusive suffix |
| `{{patientNominative}}` | formatting | der Patient | German nominative form |
| `{{patientGenitive}}` | formatting | des Patienten | German genitive form |
| `{{patientDative}}` | formatting | dem Patienten | German dative form |

### Template Perspectives (3 perspectives, from `src/config/templates/`)
- **Affected Patient** (`affected`): For a patient with confirmed disease — describes inheritance, parents are likely carriers, recurrence risk for offspring
- **Healthy Carrier** (`carrier`): For an identified carrier — describes carrier status, partner testing recommendation, combined risk if partner is also a carrier
- **Family Member** (`familyMember`): For a relative at risk — describes familial variant, risk of being a carrier, targeted testing option

### Template Sections (8 sections per perspective, all same IDs in de and en)
`geneIntro`, `inheritance`, `carrierFrequency`, `recurrenceRisk`, `populationContext`, `founderEffect`, `sourceCitation`, `recommendation`

### German Gender-Inclusive Styles (from `src/types/text.ts`)
| Style | Example | Setting key |
|-------|---------|-------------|
| `*` | Anlagetrager*innen | Asterisk (most common in Germany) |
| `:` | Anlagetrager:innen | Colon (official German public service style) |
| `/` | Anlagetrager/-innen | Slash |
| `traditional` | Anlagetragerinnen und Anlagetrager | Traditional masculine-first form |

### Frequency Source Tabs (Step 3 of wizard)
Three tabs for frequency input:
1. **gnomAD** (default) — live query to gnomAD API with version selection
2. **Literature** — manual entry from published literature (with PMID field)
3. **Default** — uses the fallback value (1% carrier frequency)

## Code Examples

### Screenshot Embed with Frame (standard pattern for all pages)
```html
<!-- Use <figure> for semantic image with caption -->
<figure class="screenshot-frame">
  <img
    src="/screenshots/step-2-patient-status.webp"
    alt="Step 2: patient status selection showing four radio button options"
  />
  <figcaption>
    Step 2: Select the index patient's genetic status. The choice determines
    how recurrence risk is calculated.
  </figcaption>
</figure>
```

### Custom CSS Addition for `custom.css`
```css
/* Screenshot browser-frame presentation */
.screenshot-frame {
  margin: 1.5rem 0;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.screenshot-frame img {
  display: block;
  width: 100%;
  height: auto;
  border-bottom: 1px solid var(--vp-c-divider);
}

.screenshot-frame figcaption {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  text-align: center;
  font-style: italic;
}
```

### Research Disclaimer (for landing page and guide intro)
```markdown
::: warning For Research Use Only
The gnomAD Carrier Frequency Calculator is a research tool intended to support clinical
documentation workflows. Results should be reviewed by a qualified clinician and do not
constitute a diagnostic report.
:::
```

### Formula Display with Unicode (no LaTeX available in VitePress default)
```markdown
**Hardy-Weinberg genotype frequencies:**

| Genotype | Frequency |
|----------|-----------|
| AA (unaffected, homozygous normal) | p² |
| Aa (heterozygous carrier) | 2pq |
| aa (affected, homozygous) | q² |

Where **q** = disease allele frequency, **p** = 1 − q

**Carrier frequency:** 2pq ≈ 2q (when q is small)
```

### BibTeX Block (for citation page)
```markdown
## BibTeX

```bibtex
@software{popp_gnomad_carrier_frequency_2026,
  author = {Popp, Bernt},
  title = {gnomAD Carrier Frequency Calculator},
  year = {2026},
  version = {1.2.0},
  url = {https://berntpopp.github.io/gnomad-carrier-frequency/},
  license = {MIT}
}
```
```

### Adding Contributing to Sidebar Config
In `docs/.vitepress/config.ts`, add to `/about/` sidebar items:
```typescript
'/about/': [
  {
    text: 'About',
    items: [
      { text: 'Overview', link: '/about/' },
      { text: 'Citation', link: '/about/citation' },
      { text: 'Changelog', link: '/about/changelog' },
      { text: 'Contributing', link: '/about/contributing' }  // ADD THIS
    ]
  }
]
```

## Screenshot-to-Page Mapping

Recommended assignment of the 14 available screenshots to pages:

| Screenshot | Primary Page | Secondary Page |
|-----------|-------------|----------------|
| `step-1-gene-search.webp` | getting-started.md (step 1 before) | — |
| `step-1-gene-selected.webp` | getting-started.md (step 1 after) | guide/index.md |
| `step-2-patient-status.webp` | getting-started.md (step 2) | — |
| `step-3-frequency.webp` | getting-started.md (step 3) | — |
| `step-4-results.webp` | getting-started.md (step 4) | — |
| `text-output.webp` | clinical-letter.md (HFE use case) | reference/templates.md |
| `variant-table.webp` | carrier-screening.md (CFTR exclusion) | reference/filters.md |
| `filter-chips.webp` | reference/filters.md | — |
| `settings-dialog.webp` | reference/templates.md | — |
| `hero-preview.webp` | use-cases/index.md overview | — |
| `dark-mode-results.webp` | reference/data-sources.md | — |
| `mobile-results.webp` | guide/index.md intro | — |
| `population-drilldown.webp` | reference/methodology.md | reference/data-sources.md |
| `search-history.webp` | guide/getting-started.md (tip callout) | — |

Getting Started uses 5 screenshots (one per step + history tip). Use case pages use 1-2 each. Reference pages use 1-2 each.

## Page Content Blueprints

### guide/getting-started.md (GUID-01, GUID-02)
Structure: quick-start intro → 4 sections (one per wizard step) → each section has 1 screenshot + ~2 sentences of guidance + optional tip callout.

Section flow:
1. **Step 1: Search for a gene** — enter gene symbol, select from autocomplete, explain constraint panel appears. Screenshot: `step-1-gene-search.webp` + `step-1-gene-selected.webp`
2. **Step 2: Set patient status** — explain 4 options with brief clinical context. Screenshot: `step-2-patient-status.webp`
3. **Step 3: Choose frequency source** — explain 3 tabs (gnomAD/Literature/Default). Screenshot: `step-3-frequency.webp`
4. **Step 4: Review results and generate text** — explain results panel, population table, clinical text, copy. Screenshot: `step-4-results.webp`
Tip callout: history saves automatically, screenshot `search-history.webp`.
Warning callout: research use only disclaimer.

### use-cases/carrier-screening.md (CASE-01, CFTR scenario)
Scenario setup: "A couple is planning their first pregnancy. One partner has been identified as a CFTR carrier..."
Key steps to show: searching CFTR → noting the variant table → how to deactivate c.1210-11T>G (the variant exclusion workflow) → interpreting the carrier frequency for non-Finnish Europeans. Screenshot: `variant-table.webp`.

Clinical context: c.1210-11T>G (also known as 5T/7T/9T intron 8 polypyrimidine tract) has disputed pathogenicity — exclusion demonstrates the real-world clinical need to override automatic variant inclusion.

### use-cases/family-planning.md (CASE-02, CFTR scenario)
Scenario setup: "A child has been diagnosed with cystic fibrosis. The parents want to know the recurrence risk for future pregnancies..."
Key steps to show: CFTR search with "Compound heterozygous (assumed)" status → recurrence risk display → interpreting 25% risk.
No screenshot on this page (carrier-screening already has variant table, use text output snippet instead).

### use-cases/clinical-letter.md (CASE-03, HFE scenario)
Scenario setup: "A patient has been tested and found to carry HFE C282Y. You need to write a clinical letter explaining carrier status and reproductive implications."
Key steps to show: HFE search → activating only C282Y and H63D via filter chips → selecting "Healthy Carrier" perspective → choosing German language → copying text. Screenshot: `text-output.webp`.
Show a short German text snippet (2-3 sentences) to illustrate format. Explain gender-inclusive style options briefly.

### reference/methodology.md (REF-01)
Sections: Overview → HWE principle → Calculation steps → Multiple variants → Population-specific → Assumptions → Limitations.
Include formula table (Unicode math). Cross-link to data-sources for gnomAD version info.
Screenshot: `population-drilldown.webp` to illustrate population-specific frequencies.

### reference/data-sources.md (REF-02)
Sections: gnomAD versions (table comparing v4.1/v3.1.2/v2.1.1) → ClinVar P/LP classifications → ClinGen validity → Important links to external docs.
Screenshot: `dark-mode-results.webp` or `population-drilldown.webp`.
Note: v4.1 is default and recommended; v2.1.1 is on GRCh37 (older reference, use for legacy comparisons).

### reference/filters.md (REF-03)
Sections: Overview of filter logic → LoF HC filter → ClinVar filter → Star threshold → Missense filter → Conflicting classifications → Per-calculation override → How to use in practice.
Include the defaults table. Key distinction: LoF HC is autonomous; missense needs ClinVar. Screenshot: `filter-chips.webp` + `variant-table.webp`.

### reference/templates.md (REF-04)
Sections: Template system overview → Variable reference table (all 14) → Perspective explanations → Section explanations → German language options → Customization → How to edit templates.
Screenshot: `settings-dialog.webp` (shows template editor) + `text-output.webp` (shows output).
This page should allow a user to write a custom template from scratch using only this reference.

### about/citation.md (ABOU-01)
Sections: How to cite → CITATION.cff content (code block) → BibTeX entry (bibtex code block).
Note: CITATION.cff file does not currently exist in the repo — the content will need to be authored fresh. Required fields: `cff-version`, `message`, `title`, `authors`, `version`, `date-released`, `url`, `repository-code`.

### about/changelog.md (ABOU-02)
Format: newest-first, one section per minor version. Each version has: date, key features (bullet list). Versions: v1.2 (2026-01-20), v1.1 (2026-01-19), v1.0 (2026-01-19).

### about/contributing.md (ABOU-03) — new file needed
Sections: Development setup → Running locally → Code style → PR process. Include: `npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run docs:dev`.

## State of the Art

| Area | Current Approach | Notes |
|------|-----------------|-------|
| VitePress containers | `::: tip/warning/info/danger/details` | Built into VitePress 2.0 alpha, verified |
| Image handling | Standard `![alt](path)` or `<figure>` HTML | No native figure caption support — use HTML |
| Formula rendering | Unicode math characters + markdown tables | No LaTeX/MathJax in VitePress default theme — don't hand-roll |
| Code highlighting | Fenced blocks with language hint | Shiki built-in — use `bibtex`, `bash`, `typescript` hints |

**No deprecated approaches** apply to this phase — it's pure content authoring into a configured VitePress site.

## Open Questions

1. **CITATION.cff content**
   - What we know: No CITATION.cff exists in the repo; the citation page needs to author one
   - What's unclear: Preferred citation format (software citation vs. dataset)
   - Recommendation: Use standard software citation format per citation-file-format spec (version `1.2.0`). Create `CITATION.cff` in repo root as part of the citation page task, then embed its content in the docs page.

2. **Contributing page file creation**
   - What we know: `ABOU-03` requires a contributing guide; no `docs/about/contributing.md` exists yet; sidebar config doesn't list it
   - What's unclear: Whether planning will create this as a separate task or bundle with the About section task
   - Recommendation: Create the file and add the sidebar entry in the same task. The sidebar config change is minor (one line in config.ts).

3. **Math formula rendering quality**
   - What we know: VitePress default theme has no LaTeX support; Unicode math works but looks plain
   - What's unclear: Whether stakeholders expect formatted equations or plain text is acceptable
   - Recommendation: Use Unicode (q², 2pq, ×, Σ) and markdown tables. This matches the "key formulas + plain-language explanation" requirement from CONTEXT.md without over-engineering. If formal LaTeX is later needed, `markdown-it-mathjax3` can be added to VitePress config.

4. **German text snippet length in clinical-letter use case**
   - What we know: CONTEXT.md says "show a relevant snippet of the generated text — enough to see the format, not the full thing"
   - What's unclear: Exact length — 1 sentence, 2-3 sentences, or one paragraph?
   - Recommendation: Show 2-3 sentences from the `geneIntro` + `inheritance` sections. Long enough to demonstrate the format and variable substitution, short enough to be scannable.

## Sources

### Primary (HIGH confidence)
- Project source: `src/types/filter.ts` — filter config types and FACTORY_FILTER_DEFAULTS (verified)
- Project source: `src/config/template-variables.ts` — all 14 template variables (verified)
- Project source: `src/config/templates/de.json` + `en.json` — perspective and section structure (verified)
- Project source: `src/config/gnomad.json` — version configs, population codes, reference genomes (verified)
- Project source: `src/config/settings.json` — founderEffectMultiplier, defaultCarrierFrequency (verified)
- Project source: `src/composables/useCarrierFrequency.ts` — calculation formulas (verified)
- Project source: `src/types/text.ts` — perspectives, gender styles, patient sex types (verified)
- Project source: `src/utils/variant-filters.ts` — filter logic, missense/LoF HC distinction (verified)
- Project source: `package.json` — version 1.2.0 (verified)
- Project source: `docs/.vitepress/config.ts` — sidebar structure, existing pages (verified)
- Project source: `docs/public/screenshots/` — 14 WebP files present (verified via ls)
- Phase 16 RESEARCH.md — VitePress version, theme, CSS patterns (HIGH confidence, previously verified against official docs)
- Phase 17 VERIFICATION.md — 14 screenshots verified present and sized (HIGH confidence, 5/5 verified)
- VitePress docs: https://vitepress.dev/guide/markdown#custom-containers — container syntax (verified via WebFetch)

### Secondary (MEDIUM confidence)
- WebFetch of vitepress.dev/guide/markdown — confirmed `::: tip/warning/info/danger/details` syntax and that no native LaTeX/figure-caption support exists in default theme

### Tertiary (LOW confidence)
- git log for version dates — dates inferred from commit context (v1.0 shipped 2026-01-19, v1.2 shipped 2026-01-20); cross-checked against STATE.md and git tags (`v1.0`, `v1.2`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — VitePress already configured, screenshots already exist, all verified
- Architecture patterns: HIGH — file paths verified by ls, VitePress container syntax verified via official docs
- Verified technical facts: HIGH — all from direct source code inspection
- Screenshot mapping: MEDIUM — logical assignment based on content match; any screenshot could go on any page, this is a recommendation
- Page content blueprints: MEDIUM — based on requirements and CONTEXT.md decisions, specific prose not pre-written
- Open questions: accurately flagged uncertainties

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (30 days — VitePress alpha version is stable for current use, content facts tied to source code which won't change this phase)
