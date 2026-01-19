# Features Research: v1.1

**Project:** gnomAD Carrier Frequency Calculator
**Research Date:** 2026-01-19
**Scope:** v1.1 enhancement features (variant tables, filtering UI, template editor, help system, validation)
**Confidence:** HIGH (based on current implementation review + domain research)

## Summary

v1.1 features center around enhancing the existing 4-step wizard with richer data exploration (variant tables, population drill-down), greater user control (configurable filters, template editing), and professional polish (help/documentation, validation warnings). Key patterns from the genetic data visualization domain include:

1. **Variant tables** should support expandable rows for population-specific drill-down (gnomAD pattern)
2. **Filtering UIs** should use chip-based toggles with real-time feedback (Material Design pattern)
3. **Template editors** should preserve simplicity with variable highlighting, not full WYSIWYG
4. **Help systems** need careful accessibility design for SPAs (focus management, ARIA live regions)
5. **Validation warnings** must be non-blocking but prominent for clinical use cases

---

## Feature Area 1: Variant Table with Population Drill-Down

The current `StepResults.vue` displays a flat table of populations. v1.1 should add variant-level visibility with population-specific breakdown.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Sortable columns** | Users need to find highest/lowest frequencies quickly | Low | Already implemented in current v-data-table |
| **Column headers with units** | Professional data presentation | Low | Currently shows %, ratio, AC, AN |
| **Global row highlighting** | Distinguish aggregate from population-specific | Low | Currently uses `bg-grey-lighten-4` class |
| **Founder effect badges** | Clinically significant pattern flagging | Low | Already implemented with chips |
| **Population label mapping** | "afr" -> "African/African American" | Low | Already implemented via config |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Expandable population rows** | Show subcontinental breakdown on click (e.g., NFE -> Bulgarian, Estonian, Finnish, etc.) | Medium | Vuetify supports `expanded-item` slot; gnomAD v2.1+ provides subcontinental data |
| **Variant-level table** | Show individual qualifying variants with ClinVar annotation, HGVS, consequence | Medium | Data already fetched; needs new display component |
| **Population frequency visualization** | Small inline bar charts for visual comparison | Medium | Could use Vuetify progress bars or simple CSS |
| **Export to CSV** | Allow downloading results for clinical records | Low | Simple blob/download implementation |
| **Copy individual row** | Quick copy of specific population data | Low | Clipboard API, similar to existing text copy |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full genome browser embed** | Overwhelming complexity, scope creep | Link to gnomAD browser for deep exploration |
| **Real-time population comparison charts** | Performance overhead, visual clutter | Keep to simple numeric display with optional expand |
| **Population heat maps** | Requires geographic data, complex visualization | Use simple ranking/highlighting |
| **Linkout to every external database** | Context switching, maintenance burden | Link only to gnomAD and ClinVar (primary sources) |

### Reference Examples

- **gnomAD Browser**: Population frequency table with subcontinental expansion on variant pages
- **NCBI Variation Viewer**: Two-panel design with filters (left) and paginated table (right)
- **Simple ClinVar**: Clean tabular display with clear classification badges

---

## Feature Area 2: Configurable Filtering UI

Current filtering is hardcoded: LoF HC + ClinVar P/LP with >= 1 star. v1.1 should allow user control.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Current filter display** | Show what criteria produced the results | Low | Add info chip or tooltip showing "LoF HC + ClinVar P/LP (>=1 star)" |
| **Filter reset** | Return to default criteria | Low | Single button to restore defaults |
| **Filter state persistence** | Remember preferences across sessions | Low | Already have localStorage pattern via Pinia |
| **Real-time result count** | Show how many variants match current filters | Low | Display count in UI before applying |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Filter chip toggles** | Visual, touch-friendly filter selection | Medium | Use Vuetify chips with `v-chip-group` in multi-select mode |
| **Include missense toggle** | Expand beyond LoF-only for some genes | Medium | Requires additional filter logic in `variant-filters.ts` |
| **ClinVar star threshold slider** | Adjust review status stringency (0-4 stars) | Low | Simple v-slider component |
| **Custom consequence types** | Select specific variant types (nonsense, frameshift, splice) | Medium | Multi-select from predefined list |
| **Filter presets** | "Conservative" (LoF HC only), "Inclusive" (all P/LP), "Custom" | Medium | Stored configurations with quick switch |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full variant annotation editor** | Scope creep, data integrity risk | Provide read-only display with links to sources |
| **Raw GraphQL query builder** | Exposes implementation, error-prone | Abstract behind meaningful filter options |
| **Allele frequency threshold filter** | Changes the calculation meaning, confusing | Keep all qualifying variants in calculation |
| **Custom gene lists/batching** | Multi-gene analysis is different product | Keep single-gene focus |

### Reference Examples

- **Material Design 3 Filter Chips**: Visual multi-select with clear active state
- **NCBI Variation Viewer**: Eight filter groups with AND between groups, OR within groups
- **gnomAD Browser**: Filtering options for ClinVar variants and variant consequence

---

## Feature Area 3: In-App Template Editor

Current implementation uses JSON config files for templates with `{{variable}}` placeholders. Users can toggle sections but cannot edit text.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Variable placeholder highlighting** | Show where dynamic content appears | Low | CSS highlighting for `{{variable}}` patterns |
| **Preview mode** | See rendered text before committing | Low | Already have preview in `TextOutput.vue` |
| **Section reordering** | Arrange output sections to match workflow | Medium | Draggable list with persistence |
| **Undo/redo** | Standard editing expectations | Medium | Vue ref-based history stack |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Inline template editing** | Edit template text directly in-app | Medium | Textarea with variable syntax preservation |
| **Variable autocomplete** | Insert available variables via dropdown | Medium | Show available variables: gene, frequency, ratio, pmid, etc. |
| **Template import/export** | Share templates between users/instances | Low | JSON download/upload |
| **Multiple template sets** | Different templates for different contexts (clinic, research) | Medium | Named template storage in Pinia |
| **Template validation** | Warn about unknown variables or malformed placeholders | Low | Regex-based validation before save |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full WYSIWYG/rich text editor** | Clinical text is plain text for pasting; formatting causes issues | Keep plain text with monospace editing |
| **Template marketplace/sharing** | Scope creep, moderation overhead | Provide import/export for manual sharing |
| **Conditional logic in templates** | Complexity explosion, debugging nightmare | Keep sections as toggleable blocks, not conditional |
| **PDF/document generation** | Output goes to EHR via copy-paste | Stay focused on clipboard-ready text |

### Reference Examples

- **ProcessMaker Template Editor**: Variable picker with search and double-click insertion
- **Document360 Variables**: `/variables` slash command pattern for insertion
- **EHR Template Systems**: Balance between consistency (templates) and customization (editable sections)

---

## Feature Area 4: Help/FAQ/Documentation

Current app has no help system. Professional clinical tools require guidance and reference documentation.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Methodology explanation** | How carrier frequency is calculated | Low | Static content explaining Hardy-Weinberg, filtering criteria |
| **Variable glossary** | What each output variable means | Low | Definitions for carrier frequency, recurrence risk, AC, AN |
| **Data sources attribution** | Credit gnomAD, ClinVar with version info | Low | Already have version display; formalize in help |
| **Contact/feedback link** | Professional accountability | Low | Link to GitHub issues or email |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Contextual help tooltips** | Help where it's needed, not buried in docs | Medium | Info icons with popover explanations |
| **Step-by-step walkthrough** | First-time user guidance | Medium | Optional overlay tutorial (skip-able) |
| **FAQ accordion** | Common questions in expandable format | Low | Use native `<details>`/`<summary>` for accessibility |
| **Keyboard shortcuts reference** | Power user efficiency | Low | Simple modal listing shortcuts |
| **Offline capability notice** | Set expectations about gnomAD dependency | Low | Explain that live API queries are required |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full user manual PDF** | Maintenance burden, goes stale | Keep help in-app, version with code |
| **Video tutorials** | High production cost, accessibility issues | Use text with screenshots if needed |
| **Chatbot/AI assistance** | Complexity, scope creep | FAQ + contextual tooltips sufficient |
| **Community forum integration** | Moderation overhead | GitHub issues for feedback |

### Accessibility Requirements (Critical)

SPA help pages require specific accessibility handling:

- **Focus management**: Move focus to help content when opened
- **ARIA live regions**: Announce dynamic content changes
- **Keyboard navigation**: Tab through FAQ sections, Enter/Space to expand
- **Screen reader testing**: Verify NVDA/VoiceOver announce accordion states
- **`tabindex="-1"`**: On help container for programmatic focus

### Reference Examples

- **vue3-accessible-accordion**: WAI-ARIA Authoring Practices 1.1 compliant
- **Native `<details>`/`<summary>`**: Built-in accessibility with less code
- **Deque SPA Accessibility Guide**: Focus management and ARIA patterns

---

## Feature Area 5: Gene Validation & Inheritance Warnings

Current app accepts any gene symbol without validation. Clinical tools need guardrails.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Gene symbol validation** | Catch typos before wasted API calls | Low | Already using gnomAD search autocomplete |
| **Gene not found handling** | Clear message when gene doesn't exist | Low | Currently shows "No results found" |
| **Loading states** | Feedback during API calls | Low | Already implemented with v-progress-circular |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Inheritance pattern warning** | Alert if gene not associated with AR inheritance | Medium | Requires OMIM/ClinGen data or manual curation |
| **Gene constraint display** | Show pLI/LOEUF scores for context | Low | Available from gnomAD gene query |
| **Synonymous gene lookup** | Handle common aliases (e.g., CFTR vs ABCC7) | Medium | gnomAD returns aliases; could auto-suggest |
| **Low coverage warning** | Flag genes with poor exome coverage | Low | Available from gnomAD gene coverage data |
| **No qualifying variants warning** | Clear explanation when no P/LP variants found | Low | Already shows "Using default carrier frequency assumption" |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Blocking inheritance validation** | Some AR genes have AD forms too; user knows clinical context | Non-blocking warning banner |
| **Automatic inheritance lookup** | Data sources vary in completeness | Link to OMIM/GeneReviews for verification |
| **Condition name autocomplete** | Disease terminology is complex (OMIM vs MONDO vs common names) | Stay gene-focused, not condition-focused |
| **Variant-level pathogenicity override** | Clinical interpretation outside app scope | Trust ClinVar + LoF annotations |

### Clinical Disclaimer Requirements

**CRITICAL**: Any clinical tool needs appropriate disclaimers:

- "For research/educational use only - verify with clinical laboratory"
- "Results should be interpreted by qualified genetic professionals"
- "gnomAD data represents population-level frequencies, not clinical diagnosis"
- "This tool does not replace genetic counseling"

### Reference Examples

- **gnomAD Gene Constraint**: pLI, LOEUF, Z-scores displayed prominently
- **ACMG/AMP Guidelines**: Framework for pathogenicity interpretation (PP1-5, BP1-7, etc.)
- **Direct-to-Consumer Testing Disclaimers**: Required transparency about limitations

---

## Feature Dependencies

```
Filter Configuration -----+
                          +--> Variant Table --> Results Display
Template Editor ----------+

Help System (standalone, no dependencies)

Gene Validation --> Gene Search --> Variant Fetch --> Frequency Calc
```

**Build Order Recommendation:**
1. Help/Documentation (independent, low risk)
2. Gene Validation warnings (enhances existing flow)
3. Filter Configuration (affects data pipeline)
4. Variant Table enhancements (depends on filter data)
5. Template Editor (independent, can be parallel with 3-4)

---

## MVP Recommendation for v1.1

**Prioritize (Table Stakes + 1 Differentiator each):**

1. **Variant Table**: Expandable population rows for subcontinental data
2. **Filtering**: Filter chip toggles for LoF/ClinVar inclusion + star threshold
3. **Help**: FAQ accordion + methodology explanation
4. **Validation**: Inheritance pattern warning (non-blocking)

**Defer to v1.2+:**
- Full template editor (users managing with section toggles)
- Variant-level detail table (population-level sufficient for carrier frequency)
- Export functionality (copy-paste sufficient for clinical workflow)
- Walkthrough tutorial (users are professionals who learn quickly)

---

## Sources

### Variant Table & Population Display
- [UCSC Genome Browser 2025 Update](https://academic.oup.com/nar/article/53/D1/D1243/7845169) - gnomAD 4.1 integration, variant display patterns
- [gnomAD Browser](https://gnomad.broadinstitute.org/) - Population frequency table with subcontinental expansion
- [gnomAD v2.1 Release Notes](https://gnomad.broadinstitute.org/news/2018-10-gnomad-v2-1/) - Subcontinental population breakdown
- [Variant Interpretation Using gnomAD (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9160216/) - Population frequency table features
- [NCBI Variation Viewer](https://www.ncbi.nlm.nih.gov/variation/view/help/) - Filter panel + table design pattern

### Filtering UI
- [Material Design 3 Chips](https://m3.material.io/components/chips/guidelines) - Filter chip design patterns
- [Data Table UX Best Practices](https://uxplanet.org/best-practices-for-usable-and-efficient-data-table-in-applications-4a1d1fb29550) - Filtering placement and feedback
- [Filter UI Examples for SaaS](https://www.eleken.co/blog-posts/filter-ux-and-ui-for-saas) - Dynamic filtering, save views, real-time feedback
- [Vuetify Data Table](https://vuetifyjs.com/en/components/data-tables/basics/) - Column filtering implementation
- [ClinVar Classification](https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/) - Star rating system, classification terms

### Template Editing
- [EHR Templates Best Practices (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7735456/) - Template design with variables
- [ProcessMaker WYSIWYG Editor](https://wiki.processmaker.com/index.php/New_WYSIWYG_HTML_Editor) - Variable picker pattern
- [Document360 Variables](https://docs.document360.com/docs/variables) - Slash command variable insertion
- [CKEditor Placeholder](https://ckeditor.com/docs/ckeditor5/latest/features/editor-placeholder.html) - Placeholder highlighting

### Help/Documentation Accessibility
- [SPA Accessibility Guide (TestParty)](https://testparty.ai/blog/spa-accessibility) - Focus management, ARIA patterns
- [Deque SPA Accessibility Tips](https://www.deque.com/blog/accessibility-tips-in-single-page-applications/) - Screen reader considerations
- [Accessible Accordion Patterns (Aditus)](https://www.aditus.io/patterns/accordion/) - ARIA attributes for FAQ
- [vue3-accessible-accordion](https://github.com/jonbackus/vue3-accessible-accordion) - WAI-ARIA compliant Vue component
- [SitePoint SPA Accessibility](https://www.sitepoint.com/accessibility-best-practices-for-single-page-applications/) - Focus and announcement patterns

### Gene Validation & Clinical Context
- [ACMG Carrier Screening Guidelines (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8488021/) - Professional counseling requirements
- [Bayesian Analysis in Genetic Counseling (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC1867463/) - Risk calculation methodology
- [False-Positive DTC Testing Results (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6301953/) - Disclaimer requirements
- [ConsCal Tool](https://pubmed.ncbi.nlm.nih.gov/37221981/) - Recurrence risk calculation for AR diseases
- [ClinGen Variant Curation SOP](https://clinicalgenome.org/site/assets/files/3677/clingen_variant-curation_sopv1.pdf) - Classification criteria
