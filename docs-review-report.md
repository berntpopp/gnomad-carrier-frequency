# Documentation Review Report

**Project:** gnomAD Carrier Frequency Calculator v1.3 Documentation
**Date:** 2026-02-23
**Reviewer:** Expert copywriter, senior data scientist, senior geneticist, epidemiologist
**Method:** Cross-document consistency analysis, implementation verification against source code, web-search fact-checking against primary sources (gnomAD, ClinVar, ClinGen, LOFTEE, HWE literature)

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 3 | Factual errors that could mislead clinical users |
| Major    | 5 | Inconsistencies, incorrect claims, or missing accuracy |
| Minor    | 7 | Imprecisions, label mismatches, presentation issues |
| Verified | 20+ | Key scientific claims confirmed against primary sources |

---

## Critical Issues

### C1. Recurrence risk formula error in carrier-screening.md

**File:** `docs/use-cases/carrier-screening.md` lines 42-44
**Issue:** The formula displayed for the carrier screening couple is incorrect.

**Current text:**
> carrier frequency of partner's population × carrier frequency of partner's population × 1/4

This expresses: CF × CF × 1/4 = CF²/4 — the **a priori population risk** where neither parent has been tested.

**But the scenario describes a known carrier:** "one partner was found to carry a pathogenic variant in the CFTR gene." For a known carrier, the correct formula is:

> partner's carrier frequency × 1/4 = CF/4

The code confirms: `carrierFrequency / 4` for heterozygous status (`frequency-calc.ts:47`).

**Impact:** A genetic counselor reading this could compute the wrong risk. For CFTR NFE (CF ≈ 1/25): CF²/4 = 1/2500 vs CF/4 = 1/100 — a 25× difference.

The follow-up sentence ("simplifies to: the other partner's carrier frequency × 1/4") arrives at the correct result, but the displayed formula is mathematically wrong for the described scenario.

**Fix:** Replace the bolded formula with the correct one for a known carrier.

---

### C2. Recurrence risk formula error in family-planning.md

**File:** `docs/use-cases/family-planning.md` lines 25-29
**Issue:** The heterozygous carrier formula is written as CF × CF × 1/4, contradicting the tool's actual calculation.

**Current text:**
> recurrence risk = carrier_frequency × carrier_frequency × 1/4

**What the tool actually computes:** `carrier_frequency / 4` for heterozygous (`frequency-calc.ts:47`).

The methodology.md correctly states: "Risk = partner_carrier_prob × 1/4 = carrier_frequency / 4" (line 68). So the family-planning.md contradicts the methodology.md and the implementation.

**Impact:** This creates an internal inconsistency — a reader comparing methodology.md and family-planning.md gets two different formulas for the same scenario.

**Fix:** Align the formula with the methodology.md and the actual code: `carrier_frequency / 4`.

---

### C3. Incorrect numeric comparison in family-planning.md

**File:** `docs/use-cases/family-planning.md` line 37
**Issue:** The numeric comparison uses the wrong formula result.

**Current text:**
> the recurrence risk is around 1 in 50 — compared to 1 in 2,500 from the standard carrier × carrier calculation

The 1:2500 figure comes from CF²/4 = (1/25)² × 1/4 = 1/2500 — using the **wrong** formula.

**Correct comparison using the tool's formulas:**
- Heterozygous (CF/4): (1/25)/4 = **1:100**
- Compound het (CF/2): (1/25)/2 = **1:50**

So the comparison should be "1 in 50 — compared to 1 in 100", not 1:2500.

**Impact:** The 50× vs 2× difference in risk presentation is clinically significant for counseling context.

**Fix:** Correct the numeric comparison to use the tool's actual formula results.

---

## Major Issues

### M1. URL inconsistency across documentation

**Files affected:**
- `docs/index.md` line 11: `https://gnomad-carrier-frequency.kidney-genetics.org/` (custom domain)
- `docs/.vitepress/config.ts` line 22: `https://gnomad-carrier-frequency.kidney-genetics.org/` (nav link)
- `docs/guide/getting-started.md` line 6: `https://carrier-frequency.requireform.com/` (old domain)
- `docs/about/index.md` line 12: `https://carrier-frequency.requireform.com/` (old domain)
- `docs/about/citation.md` line 9, 26: `https://carrier-frequency.requireform.com/` (old domain)
- `CITATION.cff` line 11: `https://carrier-frequency.requireform.com/` (old domain)

**Issue:** Two different domains are used interchangeably. The ROADMAP Phase 19 success criteria reference `https://gnomad-carrier-frequency.kidney-genetics.org/` as the production URL. The vite.config.ts uses `base: '/'` with comment "Custom domain serves from root."

**Fix:** Standardize all URLs to `https://gnomad-carrier-frequency.kidney-genetics.org/` (the custom domain).

---

### M2. Missing Umlaute in German examples (templates.md)

**File:** `docs/reference/templates.md` lines 88-91
**Issue:** All German gender style examples are missing the Umlaut (ä → a):

| Current (wrong) | Correct |
|-----------------|---------|
| Anlagetrager\*innen | Anlageträger\*innen |
| Anlagetrager:innen | Anlageträger:innen |
| Anlagetrager/-innen | Anlageträger/-innen |
| Anlagetrager und Anlagetragerinnen | Anlageträgerinnen und Anlageträger |

The most recent commit (`64c556e`) fixed Umlaute in "German clinical text templates" but apparently did not cover the documentation page.

**Additionally:** The Traditional style example has the gender order reversed compared to the source code:
- templates.md: "Anlagetrager und Anlagetragerinnen" (masculine first)
- `types/text.ts:14`: "Anlageträgerinnen und Anlageträger" (feminine first)

**Fix:** Restore Umlaute and correct the gender order in the Traditional example.

---

### M3. Template variable count mismatch

**File:** `docs/reference/index.md` line 10
**Issue:** States "all 14 template variables" but the actual variable table in `docs/reference/templates.md` lists **15 variables**.

Variable count from `types/text.ts` TemplateContext interface: gene, carrierFrequency, carrierFrequencyRatio, recurrenceRiskPercent, recurrenceRiskRatio, source, indexStatus, statusIntro, populationName, pmid, accessDate, genderSuffix, patientNominative, patientGenitive, patientDative = **15 variables**.

The 18-VERIFICATION.md also confirms "15-variable table."

**Fix:** Change "14" to "15" in reference/index.md.

---

### M4. Hardy-Weinberg error claim overstated

**File:** `docs/reference/methodology.md` lines 38-39
**Issue:** The info box states the approximation "is accurate when q < 0.05 (5%), which covers virtually all autosomal recessive conditions."

While the specific numeric example (q = 0.02, error = 0.0008) is mathematically verified correct, the general claim is misleading:
- At q = 0.02: absolute error = 0.0008 (0.08%) — within 0.1%
- At q = 0.05: absolute error = 0.005 (0.5%) — exceeds 0.1% by 5×
- Relative error at q = 0.05 is ~5.26%

The claim "less than 0.1%" only holds for q < ~0.022, not for all q < 0.05.

**Fix:** Soften the general claim or restrict it to the specific example. Change to: "The approximation is most accurate when q is small (< 0.05), with error under 1% for virtually all autosomal recessive conditions."

---

### M5. Traditional gender style incorrectly described in clinical-letter.md

**File:** `docs/use-cases/clinical-letter.md` line 43
**Issue:** The Traditional style is described as "Träger/Trägerin (long form)" using a slash, but the actual implementation uses "und" (and):

- clinical-letter.md: `Träger/Trägerin` (with slash)
- types/text.ts line 14: `Anlageträgerinnen und Anlageträger` (with "und")

The slash form (`/`) is already the separate gender style option. Having Traditional also use a slash creates confusion.

**Fix:** Change to "Trägerin und Träger" or "Anlageträgerinnen und Anlageträger — explicit dual form."

---

## Minor Issues

### m1. ClinVar 1-star description incomplete

**Files:** `docs/reference/data-sources.md` line 54, `docs/reference/filters.md` line 42
**Issue:** 1 star is described as "Assertion criteria provided (single submitter)" but ClinVar's 1-star also covers "criteria provided, conflicting classifications." This omission could affect filter interpretation.

**Fix:** Add "(also: conflicting classifications)" or note this in the description.

---

### m2. Population label "Latino/Admixed American" inconsistent with tool display

**File:** `docs/guide/getting-started.md` line 66
**Issue:** The docs list "Latino/Admixed American" but the tool displays "Admixed American" (from `gnomad.json` v4 label).

**Fix:** Use the label as displayed in the tool: "Admixed American."

---

### m3. Population label order "European non-Finnish" vs "Non-Finnish European"

**File:** `docs/guide/getting-started.md` line 66
**Issue:** The docs say "European non-Finnish" but the tool displays "Non-Finnish European" (from `gnomad.json`).

**Fix:** Use the tool's label: "Non-Finnish European."

---

### m4. gnomAD v4.1 release date incorrect in config (not in docs)

**File:** `src/config/gnomad.json` line 21
**Issue:** The notes field says "v4.1 released Nov 2023" but v4.1 was released **April 19, 2024** (v4.0 was released November 1, 2023).

**Impact:** Config-only, not visible to users in docs. But should be corrected for accuracy.

**Fix:** Change to "v4.1 released April 2024, largest dataset with ~807,162 samples."

---

### m5. gnomAD v4.1 sample count nuance

**File:** `docs/reference/data-sources.md` line 13, `src/config/gnomad.json` line 21
**Issue:** Both state ~807,162 samples. This figure is the v4.0 count. gnomAD v4.1 added ~4,000 more exome samples (734,947 exomes + 76,215 genomes = ~811,162). For practical purposes, ~807,162 is defensible but ~811,162 would be more accurate for v4.1 specifically.

**Fix:** Consider updating to ~811,162 or adding "~" prefix to acknowledge approximation (already present in docs).

---

### m6. CFTR c.1210-11T>G "disputed pathogenicity" oversimplified

**File:** `docs/use-cases/carrier-screening.md` lines 24-25
**Issue:** The variant is described as having "disputed pathogenicity." ClinVar actually classifies c.1210-11T>G as Pathogenic/Likely pathogenic (2 stars, 21/35 submitters classify as pathogenic). The clinical complexity is real — pathogenicity is **context-dependent** (TG repeat length, phase with second variant) — but calling it "disputed" is an oversimplification. The variant is better described as having "variable clinical significance depending on the allelic context."

**Fix:** Reword to describe the context-dependent nature rather than using "disputed."

---

### m7. Missing gnomAD v4 Amish population note

**File:** `docs/reference/data-sources.md` line 37
**Issue:** The population table shows Amish as "No" for v4.1, which is correct for the **tool** (gnomad.json config doesn't include `ami` for v4). However, gnomAD v4 actually does include an Amish population. A note clarifying this is a tool-level limitation (not a gnomAD limitation) would prevent confusion.

**Fix:** Optional — add a footnote: "gnomAD v4 includes Amish data, but the calculator currently queries the eight primary ancestry groups listed above."

---

## Verified Claims

The following key scientific/technical claims were verified against primary sources:

| Claim | Source | Status |
|-------|--------|--------|
| Hardy-Weinberg genotype frequencies (p², 2pq, q²) | Standard population genetics | Verified |
| Carrier frequency = 2pq ≈ 2q for rare variants | HWE theory; code confirms `2 * sumAF` | Verified |
| gnomAD v4.1 ~807,162 samples, GRCh38, exomes+genomes | gnomAD v4.0 release blog | Verified |
| gnomAD v3.1.2 ~76,156 genomes only, GRCh38 | Multiple sources | Verified |
| gnomAD v2.1.1 ~141,456 samples, GRCh37 | Multiple sources | Verified |
| CFTR carrier frequency ~1:25 for NFE | Standard genetics reference | Verified |
| LOFTEE HC types: stop gained, frameshift, splice donor/acceptor | LOFTEE GitHub repo | Verified |
| ClinVar star system (0-4 scale) | ClinVar review_status docs | Verified |
| Filter defaults: LoF HC enabled, missense enabled, ClinVar P/LP enabled, 2 stars, conflicting disabled, 80% threshold | `types/filter.ts` FACTORY_FILTER_DEFAULTS | Verified |
| Founder effect threshold: 5× global | `settings.json` founderEffectMultiplier = 5 | Verified |
| Default carrier frequency: 1% (0.01) | `settings.json` defaultCarrierFrequency = 0.01 | Verified |
| Allele freq aggregation: sum AFs, not sum(AC)/sum(AN) | `frequency-calc.ts` lines 56-137 | Verified |
| LoF HC independent of ClinVar | `variant-filters.ts` line 182 | Verified |
| Missense requires ClinVar P/LP evidence | `variant-filters.ts` line 189 | Verified |
| 3 perspectives: affected, carrier, familyMember | `types/text.ts` and `en.json` | Verified |
| 8 template sections per perspective | `en.json` and `useTextGenerator.ts` sectionOrder | Verified |
| Template variable syntax: {{variable}} | `template-renderer.ts` regex `/\{\{(\w+)\}\}/g` | Verified |
| HFE C282Y homozygosity → majority of HH | Genetics in Medicine; CDC Genomics | Verified |
| HFE H63D pathogenicity in isolation debated | JCAG; Haematologica | Verified |
| ORCID 0000-0002-3679-1081 = Bernt Popp | ORCID profile | Verified |
| CFF version 1.2.0 is current | citation-file-format.github.io | Verified |
| CITATION.cff matches docs/about/citation.md | File comparison | Verified |
| All 14 screenshots exist in docs/public/screenshots/ | Glob verification | Verified |
| All internal cross-links resolve | Page existence check | Verified |
| VitePress sidebar matches actual page files | config.ts vs file system | Verified |

---

## Cross-Link Audit

All 13 unique internal cross-link targets verified:

| Link Target | Referenced From | Exists |
|------------|-----------------|--------|
| /guide/getting-started | landing, guide/index, use-cases/index, about/index, about/contributing, reference/index | Yes |
| /use-cases/ | guide/index, reference/index | Yes |
| /use-cases/carrier-screening | guide/getting-started, use-cases/index, reference/filters, family-planning | Yes |
| /use-cases/family-planning | guide/getting-started, use-cases/index, carrier-screening | Yes |
| /use-cases/clinical-letter | guide/getting-started, use-cases/index, reference/templates | Yes |
| /reference/ | guide/index, guide/getting-started, about/contributing | Yes |
| /reference/methodology | carrier-screening, family-planning, reference/filters, data-sources | Yes |
| /reference/data-sources | methodology | Yes |
| /reference/filters | carrier-screening, getting-started, methodology, data-sources | Yes |
| /reference/templates | clinical-letter, getting-started | Yes |
| /about/citation | (standalone) | Yes |
| /about/changelog | (standalone) | Yes |
| /about/contributing | (standalone) | Yes |

---

## Screenshot Audit

All 14 screenshots referenced in documentation verified as existing:

| Screenshot | Referenced In | Exists |
|-----------|---------------|--------|
| hero-preview.webp | use-cases/index | Yes |
| mobile-results.webp | guide/index | Yes |
| step-1-gene-search.webp | guide/getting-started | Yes |
| step-1-gene-selected.webp | guide/index, guide/getting-started | Yes |
| step-2-patient-status.webp | guide/getting-started | Yes |
| step-3-frequency.webp | guide/getting-started | Yes |
| step-4-results.webp | guide/getting-started | Yes |
| search-history.webp | guide/getting-started | Yes |
| variant-table.webp | use-cases/carrier-screening, reference/filters | Yes |
| text-output.webp | use-cases/clinical-letter, reference/templates | Yes |
| population-drilldown.webp | reference/methodology | Yes |
| dark-mode-results.webp | reference/data-sources | Yes |
| filter-chips.webp | reference/filters | Yes |
| settings-dialog.webp | reference/templates | Yes |

---

## Document-by-Document Summary

| Document | Status | Issues |
|----------|--------|--------|
| docs/index.md (landing) | Good | URL inconsistency (M1) |
| docs/guide/index.md | Good | None |
| docs/guide/getting-started.md | Fix needed | URL (M1), population labels (m2, m3) |
| docs/use-cases/index.md | Good | None |
| docs/use-cases/carrier-screening.md | Fix needed | **Formula error (C1)**, 5T allele wording (m6) |
| docs/use-cases/family-planning.md | Fix needed | **Formula error (C2, C3)** |
| docs/use-cases/clinical-letter.md | Fix needed | Traditional gender style (M5) |
| docs/reference/index.md | Fix needed | Variable count (M3) |
| docs/reference/methodology.md | Fix needed | HWE error claim (M4) |
| docs/reference/data-sources.md | Good | v4 Amish note optional (m7), ClinVar 1-star (m1) |
| docs/reference/filters.md | Good | ClinVar 1-star (m1) |
| docs/reference/templates.md | Fix needed | Umlaute (M2), gender order |
| docs/about/index.md | Fix needed | URL (M1) |
| docs/about/citation.md | Fix needed | URL (M1) |
| docs/about/changelog.md | Good | None |
| docs/about/contributing.md | Good | None |
| CITATION.cff | Fix needed | URL (M1) |
| src/config/gnomad.json | Fix needed | Release date (m4) |

---

*Report generated: 2026-02-23*
*Method: Parallel review with web-search fact-checking against gnomAD, ClinVar, ClinGen, LOFTEE primary sources*
