# Requirements: gnomAD Carrier Frequency Calculator v1.1

**Defined:** 2026-01-19
**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

## v1.1 Requirements

Requirements for release-ready polish. Each maps to roadmap phases.

### App Shell & Navigation

- [x] **SHELL-01**: App displays logo in app bar
- [x] **SHELL-02**: App bar contains navigation menu (N/A - single page app)
- [x] **SHELL-03**: Settings accessible via gear icon in app bar
- [x] **SHELL-04**: User can toggle dark/light theme
- [x] **SHELL-05**: Theme preference persists across sessions
- [x] **SHELL-06**: App has custom favicon
- [x] **SHELL-07**: Logo and favicon follow consistent branding

### Variant Table

- [x] **VAR-01**: User can open modal showing contributing variants
- [x] **VAR-02**: Variant modal displays variant ID, consequence, allele frequency, ClinVar status
- [x] **VAR-03**: Variant table columns are sortable
- [x] **VAR-04**: User can click population row to see population-specific variants
- [x] **VAR-05**: Population drill-down shows variant frequencies for that population

### Filtering Configuration

- [x] **FILT-01**: User can see current filter criteria displayed
- [x] **FILT-02**: User can toggle LoF HC filter on/off
- [x] **FILT-03**: User can toggle missense inclusion on/off
- [x] **FILT-04**: User can toggle ClinVar P/LP filter on/off
- [x] **FILT-05**: User can adjust ClinVar star threshold (0-4)
- [x] **FILT-06**: Filter defaults stored in settings
- [x] **FILT-07**: User can override filter defaults per calculation
- [x] **FILT-08**: User can reset filters to defaults
- [x] **FILT-09**: Filter changes show real-time variant count feedback

### ClinGen Integration

- [x] **CLIN-01**: App fetches ClinGen gene-disease validity data
- [x] **CLIN-02**: ClinGen data cached with 30-day expiry
- [x] **CLIN-03**: User can manually refresh ClinGen cache in settings
- [x] **CLIN-04**: Non-blocking warning displayed if gene not AR-associated
- [x] **CLIN-05**: Gene constraint scores (pLI/LOEUF) displayed from gnomAD
- [x] **CLIN-06**: Warning displayed for genes with low exome coverage

### Data Export

- [ ] **EXP-01**: User can export results as JSON file
- [ ] **EXP-02**: User can export results as Excel (.xlsx) file
- [ ] **EXP-03**: Export includes gene, populations, frequencies, calculated risks
- [ ] **EXP-04**: Export includes metadata (gnomAD version, date, filters used)

### Template Editor

- [ ] **TMPL-01**: User can edit German clinical text templates in settings
- [ ] **TMPL-02**: User can edit English clinical text templates in settings
- [ ] **TMPL-03**: Template editor highlights {{variable}} placeholders
- [ ] **TMPL-04**: Variable picker shows available template variables
- [ ] **TMPL-05**: User can insert variables via picker/autocomplete
- [ ] **TMPL-06**: User can export templates to file
- [ ] **TMPL-07**: User can import templates from file
- [ ] **TMPL-08**: Template changes persist across sessions

### Browser Logging

- [ ] **LOG-01**: App logs key events (API calls, calculations, errors)
- [ ] **LOG-02**: LogViewer panel accessible from app shell
- [ ] **LOG-03**: User can search logs by text
- [ ] **LOG-04**: User can filter logs by level (DEBUG, INFO, WARN, ERROR)
- [ ] **LOG-05**: User can download logs as JSON
- [ ] **LOG-06**: User can clear all logs
- [ ] **LOG-07**: Log statistics displayed (count, dropped, memory)
- [ ] **LOG-08**: Log max entries configurable in settings

### Documentation

- [x] **DOC-01**: README.md describes project purpose and features
- [x] **DOC-02**: README.md includes technology tags/badges
- [x] **DOC-03**: Methodology page explains carrier frequency calculation
- [x] **DOC-04**: Methodology page explains Hardy-Weinberg principles
- [x] **DOC-05**: Help/FAQ page with expandable accordion sections
- [x] **DOC-06**: FAQ addresses common questions about gnomAD data
- [x] **DOC-07**: Contextual help tooltips on key UI elements
- [x] **DOC-08**: Data sources attributed (gnomAD, ClinVar versions)
- [x] **DOC-09**: Clinical disclaimer displayed appropriately

### SEO & Accessibility

- [x] **SEO-01**: Page has descriptive meta description
- [x] **SEO-02**: Heading elements in sequential order
- [x] **SEO-03**: Color contrast meets WCAG 2.1 AA (4.5:1 ratio)
- [x] **SEO-04**: ARIA live regions announce dynamic content changes
- [x] **SEO-05**: Focus management for modal dialogs
- [x] **SEO-06**: Keyboard navigation works throughout app

### Infrastructure

- [x] **INFRA-01**: Version number in package.json follows semver
- [x] **INFRA-02**: Version displayed in app UI
- [ ] **INFRA-03**: Build time improved with vite-plugin-checker
- [ ] **INFRA-04**: Lint/typecheck runs in parallel
- [x] **INFRA-05**: Lighthouse performance score >= 90
- [x] **INFRA-06**: Lighthouse accessibility score >= 95
- [x] **INFRA-07**: Lighthouse SEO score >= 95

## v1.2+ Requirements

Deferred to future release. Tracked but not in current roadmap.

### Variant Table Enhancements

- **VAR-06**: Expandable population rows for subcontinental breakdown
- **VAR-07**: CSV export of contributing variants

### Advanced Features

- **ADV-01**: X-linked recessive inheritance calculation
- **ADV-02**: X-linked dominant inheritance calculation
- **ADV-03**: Bayesian residual risk for negative carrier test
- **ADV-04**: Batch processing for multiple genes
- **ADV-05**: Session history (recent calculations)
- **ADV-06**: Export results to PDF
- **ADV-07**: At-risk couple calculation (both partners)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Backend/database | Direct gnomAD GraphQL from browser maintains simplicity |
| User accounts | Stateless tool, no need for authentication |
| Full genome browser embed | Scope creep; link to gnomAD browser instead |
| WYSIWYG template editor | Clinical text is plain text for EHR paste |
| Real-time population comparison charts | Performance overhead, visual clutter |
| Custom gene lists/batching | Multi-gene analysis is different product |
| Video tutorials | High production cost, text sufficient |
| Chatbot/AI assistance | FAQ + tooltips sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 6 | Complete |
| SHELL-02 | Phase 6 | Complete (N/A) |
| SHELL-03 | Phase 6 | Complete |
| SHELL-04 | Phase 5 | Complete |
| SHELL-05 | Phase 5 | Complete |
| SHELL-06 | Phase 6 | Complete |
| SHELL-07 | Phase 6 | Complete |
| VAR-01 | Phase 8 | Complete |
| VAR-02 | Phase 8 | Complete |
| VAR-03 | Phase 8 | Complete |
| VAR-04 | Phase 8 | Complete |
| VAR-05 | Phase 8 | Complete |
| FILT-01 | Phase 8 | Complete |
| FILT-02 | Phase 8 | Complete |
| FILT-03 | Phase 8 | Complete |
| FILT-04 | Phase 8 | Complete |
| FILT-05 | Phase 8 | Complete |
| FILT-06 | Phase 8 | Complete |
| FILT-07 | Phase 8 | Complete |
| FILT-08 | Phase 8 | Complete |
| FILT-09 | Phase 8 | Complete |
| CLIN-01 | Phase 9 | Complete |
| CLIN-02 | Phase 9 | Complete |
| CLIN-03 | Phase 9 | Complete |
| CLIN-04 | Phase 9 | Complete |
| CLIN-05 | Phase 9 | Complete |
| CLIN-06 | Phase 9 | Complete |
| EXP-01 | Phase 10 | Pending |
| EXP-02 | Phase 10 | Pending |
| EXP-03 | Phase 10 | Pending |
| EXP-04 | Phase 10 | Pending |
| TMPL-01 | Phase 10 | Pending |
| TMPL-02 | Phase 10 | Pending |
| TMPL-03 | Phase 10 | Pending |
| TMPL-04 | Phase 10 | Pending |
| TMPL-05 | Phase 10 | Pending |
| TMPL-06 | Phase 10 | Pending |
| TMPL-07 | Phase 10 | Pending |
| TMPL-08 | Phase 10 | Pending |
| LOG-01 | Phase 10 | Pending |
| LOG-02 | Phase 10 | Pending |
| LOG-03 | Phase 10 | Pending |
| LOG-04 | Phase 10 | Pending |
| LOG-05 | Phase 10 | Pending |
| LOG-06 | Phase 10 | Pending |
| LOG-07 | Phase 10 | Pending |
| LOG-08 | Phase 10 | Pending |
| DOC-01 | Phase 9 | Complete |
| DOC-02 | Phase 9 | Complete |
| DOC-03 | Phase 9 | Complete |
| DOC-04 | Phase 9 | Complete |
| DOC-05 | Phase 9 | Complete |
| DOC-06 | Phase 9 | Complete |
| DOC-07 | Phase 9 | Complete |
| DOC-08 | Phase 9 | Complete |
| DOC-09 | Phase 9 | Complete |
| SEO-01 | Phase 7 | Complete |
| SEO-02 | Phase 7 | Complete |
| SEO-03 | Phase 7 | Complete |
| SEO-04 | Phase 7 | Complete |
| SEO-05 | Phase 7 | Complete |
| SEO-06 | Phase 7 | Complete |
| INFRA-01 | Phase 5 | Complete |
| INFRA-02 | Phase 5 | Complete |
| INFRA-03 | Phase 10 | Pending |
| INFRA-04 | Phase 10 | Pending |
| INFRA-05 | Phase 7 | Complete |
| INFRA-06 | Phase 7 | Complete |
| INFRA-07 | Phase 7 | Complete |

**Coverage:**
- v1.1 requirements: 69 total
- Mapped to phases: 69
- Unmapped: 0

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 (Phase 9 complete)*
