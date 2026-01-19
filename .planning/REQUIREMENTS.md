# Requirements: gnomAD Carrier Frequency Calculator v1.1

**Defined:** 2026-01-19
**Core Value:** Accurate recurrence risk calculation from gnomAD population data with clinical documentation output

## v1.1 Requirements

Requirements for release-ready polish. Each maps to roadmap phases.

### App Shell & Navigation

- [ ] **SHELL-01**: App displays logo in app bar
- [ ] **SHELL-02**: App bar contains navigation menu
- [ ] **SHELL-03**: Settings accessible via gear icon in app bar
- [ ] **SHELL-04**: User can toggle dark/light theme
- [ ] **SHELL-05**: Theme preference persists across sessions
- [ ] **SHELL-06**: App has custom favicon
- [ ] **SHELL-07**: Logo and favicon follow consistent branding

### Variant Table

- [ ] **VAR-01**: User can open modal showing contributing variants
- [ ] **VAR-02**: Variant modal displays variant ID, consequence, allele frequency, ClinVar status
- [ ] **VAR-03**: Variant table columns are sortable
- [ ] **VAR-04**: User can click population row to see population-specific variants
- [ ] **VAR-05**: Population drill-down shows variant frequencies for that population

### Filtering Configuration

- [ ] **FILT-01**: User can see current filter criteria displayed
- [ ] **FILT-02**: User can toggle LoF HC filter on/off
- [ ] **FILT-03**: User can toggle missense inclusion on/off
- [ ] **FILT-04**: User can toggle ClinVar P/LP filter on/off
- [ ] **FILT-05**: User can adjust ClinVar star threshold (0-4)
- [ ] **FILT-06**: Filter defaults stored in settings
- [ ] **FILT-07**: User can override filter defaults per calculation
- [ ] **FILT-08**: User can reset filters to defaults
- [ ] **FILT-09**: Filter changes show real-time variant count feedback

### ClinGen Integration

- [ ] **CLIN-01**: App fetches ClinGen gene-disease validity data
- [ ] **CLIN-02**: ClinGen data cached with 30-day expiry
- [ ] **CLIN-03**: User can manually refresh ClinGen cache in settings
- [ ] **CLIN-04**: Non-blocking warning displayed if gene not AR-associated
- [ ] **CLIN-05**: Gene constraint scores (pLI/LOEUF) displayed from gnomAD
- [ ] **CLIN-06**: Warning displayed for genes with low exome coverage

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

- [ ] **DOC-01**: README.md describes project purpose and features
- [ ] **DOC-02**: README.md includes technology tags/badges
- [ ] **DOC-03**: Methodology page explains carrier frequency calculation
- [ ] **DOC-04**: Methodology page explains Hardy-Weinberg principles
- [ ] **DOC-05**: Help/FAQ page with expandable accordion sections
- [ ] **DOC-06**: FAQ addresses common questions about gnomAD data
- [ ] **DOC-07**: Contextual help tooltips on key UI elements
- [ ] **DOC-08**: Data sources attributed (gnomAD, ClinVar versions)
- [ ] **DOC-09**: Clinical disclaimer displayed appropriately

### SEO & Accessibility

- [ ] **SEO-01**: Page has descriptive meta description
- [ ] **SEO-02**: Heading elements in sequential order
- [ ] **SEO-03**: Color contrast meets WCAG 2.1 AA (4.5:1 ratio)
- [ ] **SEO-04**: ARIA live regions announce dynamic content changes
- [ ] **SEO-05**: Focus management for modal dialogs
- [ ] **SEO-06**: Keyboard navigation works throughout app

### Infrastructure

- [ ] **INFRA-01**: Version number in package.json follows semver
- [ ] **INFRA-02**: Version displayed in app UI
- [ ] **INFRA-03**: Build time improved with vite-plugin-checker
- [ ] **INFRA-04**: Lint/typecheck runs in parallel
- [ ] **INFRA-05**: Lighthouse performance score >= 90
- [ ] **INFRA-06**: Lighthouse accessibility score >= 95
- [ ] **INFRA-07**: Lighthouse SEO score >= 95

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
| SHELL-01 | TBD | Pending |
| SHELL-02 | TBD | Pending |
| ... | ... | ... |

**Coverage:**
- v1.1 requirements: 56 total
- Mapped to phases: 0
- Unmapped: 56 (pending roadmap)

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 after initial definition*
