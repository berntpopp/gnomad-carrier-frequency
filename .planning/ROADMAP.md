# Roadmap: gnomAD Carrier Frequency Calculator

**Created:** 2026-01-18
**Depth:** Standard
**Phases:** 4
**Coverage:** 32/32 requirements mapped

---

## Overview

This roadmap delivers a carrier frequency calculator in 4 phases: Foundation establishes gnomAD API integration and core calculation logic, Wizard UI builds the 4-step user interface with population display, German Text adds clinical documentation generation, and Deploy validates calculations and publishes to GitHub Pages.

---

## Phase 1: Foundation

**Goal:** Establish working gnomAD API integration with multi-version support (v4 default, v3/v2 selectable) and correct carrier frequency calculation logic. All configuration externalized to JSON files - zero hardcoded values.

**Dependencies:** None (starting phase)

**Plans:** 5 plans in 4 waves

Plans:
- [x] 01-01-PLAN.md — Config system (gnomAD versions, settings, thresholds) [Wave 1]
- [x] 01-02-PLAN.md — Project setup (Vue, Vuetify, TypeScript) [Wave 1]
- [x] 01-03-PLAN.md — Types, calculation functions, GraphQL client [Wave 2]
- [x] 01-04-PLAN.md — GraphQL queries and composables [Wave 3]
- [x] 01-05-PLAN.md — Carrier frequency composable, test UI, version selector [Wave 4]

**Key Design Decisions:**
- Multi-version gnomAD support (v4 default, v3 and v2 selectable)
- JSON config files for ALL settings - no hardcoded values
- Browser-only (no Node.js caching patterns)
- DRY, KISS, SOLID principles throughout

**Requirements:**
- GENE-01: User can enter gene symbol with autocomplete suggestions
- GENE-02: Gene symbol is validated against gnomAD before proceeding
- GENE-03: Invalid gene shows clear error message
- API-01: App queries gnomAD GraphQL API for gene variants
- API-02: App handles API errors gracefully with user feedback
- API-03: App falls back to default (from config) when no qualifying variants found
- FILT-01: Variants filtered to include LoF "HC" (high confidence) predictions
- FILT-02: Variants filtered to include ClinVar pathogenic/likely pathogenic
- FILT-03: ClinVar variants require >= 1 review star
- FILT-04: Filter criteria (LoF HC OR ClinVar P/LP) clearly documented in UI
- CALC-01: Carrier frequency calculated as 2 x sum(pathogenic allele frequencies)
- CALC-02: Recurrence risk for heterozygous carrier: carrier_freq / 4
- CALC-03: Recurrence risk for compound het/homozygous affected: carrier_freq / 2
- CALC-04: Results displayed as both percentage and ratio (e.g., 0.5% and 1:200)
- POP-01: Global population frequency displayed as primary result
- POP-02: All gnomAD populations for selected version displayed
- POP-03: Upper/lower bounds across populations shown
- POP-04: Founder effect flagged when population >Nx global frequency (N from config)

**Success Criteria:**
1. User can enter "CFTR" and see gnomAD query execute successfully
2. Carrier frequency for CFTR matches published estimates (~1:25 for NFE population)
3. Invalid gene symbol (e.g., "NOTREAL") shows clear error without crashing
4. API timeout or failure shows user-friendly error message with retry option
5. Results show both percentage (4%) and ratio (1:25) formats
6. User can switch between gnomAD v4, v3, and v2
7. Zero hardcoded values in src/ - all from config

---

## Phase 2: Wizard UI

**Goal:** Users can navigate a complete 4-step wizard flow to calculate carrier frequencies.

**Dependencies:** Phase 1 (calculation logic must work before wiring to UI)

**Plans:** 3 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md — Wizard types and useWizard composable [Wave 1]
- [x] 02-02-PLAN.md — Step components (StepGene, StepStatus, StepFrequency) [Wave 2]
- [x] 02-03-PLAN.md — StepResults, WizardStepper, and App integration [Wave 3]

**Key Design Decisions:**
- Linear navigation only (must complete each step before proceeding)
- Frequency source selection via tabs (gnomAD/Literature/Default)
- Status toggle defaults to carrier (heterozygous)
- Sortable results table with v-data-table
- Changing gene resets all downstream steps

**Requirements:**
- UI-01: 4-step wizard flow: Gene -> Status -> Frequency -> Results
- UI-02: Vuetify stepper component for navigation
- UI-03: User can navigate back to previous steps
- UI-04: Results step shows all population frequencies in table format
- IDX-01: User selects index patient status: heterozygous carrier OR compound het/homozygous affected
- IDX-02: Status selection affects German text output framing
- SRC-01: User can use gnomAD-calculated carrier frequency
- SRC-02: User can enter literature-based frequency with PMID citation
- SRC-03: User can select default assumption (from config)
- SRC-04: Source attribution shown in results

**Success Criteria:**
1. User can complete wizard from gene entry to results in under 30 seconds
2. User can navigate backward to any previous step and see preserved selections
3. User can choose between gnomAD calculation, literature citation, or default assumption as frequency source
4. Results table shows all gnomAD populations with carrier frequencies and founder effect flags
5. Selecting index patient status (carrier vs affected) updates displayed recurrence risk appropriately

---

## Phase 3: German Text

**Goal:** Users can generate and copy German (and English) clinical documentation text with configurable templates.

**Dependencies:** Phase 2 (text generation depends on wizard state and calculations)

**Plans:** 4 plans (3 core + 1 gap closure)

Plans:
- [x] 03-01-PLAN.md — Template system foundation (types, renderer, JSON templates) [Wave 1]
- [x] 03-02-PLAN.md — Pinia store and useTextGenerator composable [Wave 2]
- [x] 03-03-PLAN.md — TextOutput UI and StepResults integration [Wave 3]
- [ ] 03-04-PLAN.md — Gap closure: affected status granularity + patient sex for German grammar [Wave 1]

**Key Design Decisions:**
- Config-driven templates with JSON (German + English)
- Template interpolation: {{gene}}, {{carrierFrequency}}, etc.
- 3 perspectives: affected patient, healthy carrier, family member
- Toggleable sections for customizing output
- Third-person clinical style (not addressing Sie/Du directly)
- Gender-inclusive language configurable (*, :, /, traditional)
- Pinia + localStorage for template persistence
- VueUse useClipboard for copy functionality
- 4 affected statuses: heterozygous, homozygous, compound het confirmed, compound het assumed (gap closure)
- Patient sex selection for German grammatical gender agreement (gap closure)

**Requirements:**
- TEXT-01: German clinical text generated based on calculation results
- TEXT-02: User selects perspective: affected patient, carrier, or family member
- TEXT-03: Text includes gene name, carrier frequency, source, and recurrence risk
- TEXT-04: Copy-to-clipboard button for German text

**Gaps Identified:**
- GAP-03-01: Affected status needs granularity (4 options instead of 2)
- GAP-03-02: Patient sex for German grammar (der Patient vs die Patientin)

**Success Criteria:**
1. User can select perspective (affected patient, carrier, or family member) and see text adapt appropriately
2. Generated German text includes gene name, carrier frequency with source, and calculated recurrence risk
3. Copy button copies complete text to clipboard with single click
4. Text is grammatically correct German suitable for clinical letters

---

## Phase 4: Deploy

**Goal:** Application is validated against known frequencies and deployed to GitHub Pages.

**Dependencies:** Phase 3 (all features must be complete before validation)

**Requirements:**
(No new requirements - this phase validates and deploys existing work)

**Success Criteria:**
1. CFTR carrier frequency calculation matches published ~1:25 for NFE population
2. HEXA carrier frequency calculation shows elevated frequency for ASJ population (founder effect)
3. Application loads correctly on GitHub Pages at published URL
4. GitHub Actions CI passes (lint, typecheck) on every push

---

## Progress

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Foundation | Complete | 18/18 requirements |
| Phase 2: Wizard UI | Complete | 10/10 requirements |
| Phase 3: German Text | Gap Closure | 4/4 requirements (gaps being closed) |
| Phase 4: Deploy | Pending | Validation only |

**Overall:** 32/32 requirements mapped (gap closure in progress)

---

## Requirement Coverage

| Category | Requirements | Phase |
|----------|--------------|-------|
| Gene Input | GENE-01, GENE-02, GENE-03 | Phase 1 |
| API Integration | API-01, API-02, API-03 | Phase 1 |
| Variant Filtering | FILT-01, FILT-02, FILT-03, FILT-04 | Phase 1 |
| Calculation | CALC-01, CALC-02, CALC-03, CALC-04 | Phase 1 |
| Population Handling | POP-01, POP-02, POP-03, POP-04 | Phase 1 |
| User Interface | UI-01, UI-02, UI-03, UI-04 | Phase 2 |
| Index Patient Status | IDX-01, IDX-02 | Phase 2 |
| Frequency Source | SRC-01, SRC-02, SRC-03, SRC-04 | Phase 2 |
| German Text Output | TEXT-01, TEXT-02, TEXT-03, TEXT-04 | Phase 3 |

**Coverage:** 32/32 v1 requirements mapped (100%)

---

*Last updated: 2026-01-19 (Phase 3 gap closure plan added)*
