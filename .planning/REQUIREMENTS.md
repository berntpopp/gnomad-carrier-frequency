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
- [ ] **FILT-03**: ClinVar variants require >=1 review star
- [ ] **FILT-04**: Filter criteria (LoF HC OR ClinVar P/LP) clearly documented in UI

### Population Handling

- [ ] **POP-01**: Global population frequency displayed as primary result
- [ ] **POP-02**: All gnomAD populations displayed (afr, amr, asj, eas, fin, mid, nfe, sas)
- [ ] **POP-03**: Upper/lower bounds across populations shown
- [ ] **POP-04**: Founder effect flagged when population >5x global frequency

### Calculation

- [ ] **CALC-01**: Carrier frequency calculated as 2 x sum(pathogenic allele frequencies)
- [ ] **CALC-02**: Recurrence risk for heterozygous carrier: 1/2 x carrier_freq x 1/2 = carrier_freq / 4
- [ ] **CALC-03**: Recurrence risk for compound het/homozygous affected: 1 x carrier_freq x 1/2 = carrier_freq / 2
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

- [ ] **UI-01**: 4-step wizard flow: Gene -> Status -> Frequency -> Results
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
| GENE-01 | Phase 1 | Complete |
| GENE-02 | Phase 1 | Complete |
| GENE-03 | Phase 1 | Complete |
| API-01 | Phase 1 | Complete |
| API-02 | Phase 1 | Complete |
| API-03 | Phase 1 | Complete |
| FILT-01 | Phase 1 | Complete |
| FILT-02 | Phase 1 | Complete |
| FILT-03 | Phase 1 | Complete |
| FILT-04 | Phase 1 | Complete |
| POP-01 | Phase 1 | Complete |
| POP-02 | Phase 1 | Complete |
| POP-03 | Phase 1 | Complete |
| POP-04 | Phase 1 | Complete |
| CALC-01 | Phase 1 | Complete |
| CALC-02 | Phase 1 | Complete |
| CALC-03 | Phase 1 | Complete |
| CALC-04 | Phase 1 | Complete |
| IDX-01 | Phase 2 | Complete |
| IDX-02 | Phase 2 | Complete |
| SRC-01 | Phase 2 | Complete |
| SRC-02 | Phase 2 | Complete |
| SRC-03 | Phase 2 | Complete |
| SRC-04 | Phase 2 | Complete |
| UI-01 | Phase 2 | Complete |
| UI-02 | Phase 2 | Complete |
| UI-03 | Phase 2 | Complete |
| UI-04 | Phase 2 | Complete |
| TEXT-01 | Phase 3 | Pending |
| TEXT-02 | Phase 3 | Pending |
| TEXT-03 | Phase 3 | Pending |
| TEXT-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-01-18*
*Last updated: 2026-01-19 - Phase 1 and Phase 2 requirements marked Complete*
