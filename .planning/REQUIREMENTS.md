# Requirements: gnomAD Carrier Frequency Calculator

**Defined:** 2026-01-18
**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Gene Input

- [ ] **GENE-01**: User can enter gene symbol with autocomplete suggestions
- [ ] **GENE-02**: Gene symbol is validated against gnomAD before proceeding
- [ ] **GENE-03**: Invalid gene shows clear error message

### API Integration

- [ ] **API-01**: App queries gnomAD GraphQL API for gene variants
- [ ] **API-02**: App handles API errors gracefully with user feedback
- [ ] **API-03**: App falls back to default 1:100 when no qualifying variants found

### Variant Filtering

- [ ] **FILT-01**: Variants filtered to include LoF "HC" (high confidence) predictions
- [ ] **FILT-02**: Variants filtered to include ClinVar pathogenic/likely pathogenic
- [ ] **FILT-03**: ClinVar variants require ≥1 review star
- [ ] **FILT-04**: Filter criteria (LoF HC OR ClinVar P/LP) clearly documented in UI

### Population Handling

- [ ] **POP-01**: Global population frequency displayed as primary result
- [ ] **POP-02**: All gnomAD populations displayed (afr, amr, asj, eas, fin, mid, nfe, sas)
- [ ] **POP-03**: Upper/lower bounds across populations shown
- [ ] **POP-04**: Founder effect flagged when population >5x global frequency

### Calculation

- [ ] **CALC-01**: Carrier frequency calculated as 2 × Σ(pathogenic allele frequencies)
- [ ] **CALC-02**: Recurrence risk for heterozygous carrier: 1/2 × carrier_freq × 1/2 = carrier_freq / 4
- [ ] **CALC-03**: Recurrence risk for compound het/homozygous affected: 1 × carrier_freq × 1/2 = carrier_freq / 2
- [ ] **CALC-04**: Results displayed as both percentage and ratio (e.g., 0.5% and 1:200)

### Index Patient Status

- [ ] **IDX-01**: User selects index patient status: heterozygous carrier OR compound het/homozygous affected
- [ ] **IDX-02**: Status selection affects German text output framing

### Frequency Source

- [ ] **SRC-01**: User can use gnomAD-calculated carrier frequency
- [ ] **SRC-02**: User can enter literature-based frequency with PMID citation
- [ ] **SRC-03**: User can select default assumption (1:100)
- [ ] **SRC-04**: Source attribution shown in results

### German Text Output

- [ ] **TEXT-01**: German clinical text generated based on calculation results
- [ ] **TEXT-02**: User selects perspective: affected patient, carrier, or family member
- [ ] **TEXT-03**: Text includes gene name, carrier frequency, source, and recurrence risk
- [ ] **TEXT-04**: Copy-to-clipboard button for German text

### User Interface

- [ ] **UI-01**: 4-step wizard flow: Gene → Status → Frequency → Results
- [ ] **UI-02**: Vuetify stepper component for navigation
- [ ] **UI-03**: User can navigate back to previous steps
- [ ] **UI-04**: Results step shows all population frequencies in table format

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Inheritance Modes

- **INH-01**: Support X-linked recessive calculation
- **INH-02**: Support X-linked dominant calculation
- **INH-03**: Bayesian residual risk calculation for negative carrier test

### Advanced Features

- **ADV-01**: Batch processing for multiple genes
- **ADV-02**: Session history (recent calculations)
- **ADV-03**: Export results to PDF
- **ADV-04**: At-risk couple calculation (both partners)

### Localization

- **LOC-01**: English clinical text output option
- **LOC-02**: Du/Sie toggle for German text formality

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Backend/database | Direct gnomAD GraphQL from browser, no server needed |
| User accounts | Stateless tool, no persistence required |
| Variant-level detail display | Aggregated frequencies only, not individual variant listing |
| Diagnostic claims | Clinical tool for documentation, not diagnosis |
| Custom variant curation | Use established gnomAD/ClinVar sources only |
| EMR integration | Out of scope for standalone calculator |
| Real-time API streaming | Batch query on gene search sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GENE-01 | TBD | Pending |
| GENE-02 | TBD | Pending |
| GENE-03 | TBD | Pending |
| API-01 | TBD | Pending |
| API-02 | TBD | Pending |
| API-03 | TBD | Pending |
| FILT-01 | TBD | Pending |
| FILT-02 | TBD | Pending |
| FILT-03 | TBD | Pending |
| FILT-04 | TBD | Pending |
| POP-01 | TBD | Pending |
| POP-02 | TBD | Pending |
| POP-03 | TBD | Pending |
| POP-04 | TBD | Pending |
| CALC-01 | TBD | Pending |
| CALC-02 | TBD | Pending |
| CALC-03 | TBD | Pending |
| CALC-04 | TBD | Pending |
| IDX-01 | TBD | Pending |
| IDX-02 | TBD | Pending |
| SRC-01 | TBD | Pending |
| SRC-02 | TBD | Pending |
| SRC-03 | TBD | Pending |
| SRC-04 | TBD | Pending |
| TEXT-01 | TBD | Pending |
| TEXT-02 | TBD | Pending |
| TEXT-03 | TBD | Pending |
| TEXT-04 | TBD | Pending |
| UI-01 | TBD | Pending |
| UI-02 | TBD | Pending |
| UI-03 | TBD | Pending |
| UI-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 0
- Unmapped: 32 ⚠️

---
*Requirements defined: 2026-01-18*
*Last updated: 2026-01-18 after initial definition*
