---
phase: 03-german-text
plan: 01
subsystem: text-generation
tags: [typescript, templates, i18n, german, clinical]

# Dependency graph
requires:
  - phase: 02-wizard-ui
    provides: Wizard state, calculation results
provides:
  - TemplateContext type for variable interpolation
  - renderTemplate utility function
  - German clinical templates (de.json)
  - English templates (en.json)
affects: [03-02-store, 03-03-composable, 03-04-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config-driven JSON templates with {{variable}} syntax"
    - "Pure template renderer function"
    - "Perspective-based text variants (affected/carrier/familyMember)"

key-files:
  created:
    - src/types/text.ts
    - src/utils/template-renderer.ts
    - src/config/templates/de.json
    - src/config/templates/en.json
  modified:
    - src/types/index.ts

key-decisions:
  - "Simple {{variable}} regex renderer (no dependency like micromustache)"
  - "Missing variables return empty string with console.warn"
  - "8 sections per perspective for comprehensive clinical text"
  - "genderSuffix variable for German inclusive language flexibility"

patterns-established:
  - "Template interpolation: renderTemplate(template, context) pure function"
  - "JSON templates: perspectives > sections > template strings"
  - "Variable naming: camelCase matching TypeScript conventions"

# Metrics
duration: 7min
completed: 2026-01-19
---

# Phase 3 Plan 1: Template System Foundation Summary

**TemplateContext types, renderTemplate utility, and German/English clinical template JSON files with variable interpolation**

## What Was Built

### Types (src/types/text.ts)
- `Perspective`: 'affected' | 'carrier' | 'familyMember'
- `GenderStyle`: '*' | ':' | '/' | 'traditional' for German inclusive language
- `TextSection`: id, label, template structure
- `PerspectiveConfig`: label + sections record
- `TemplateConfig`: language + perspectives structure
- `TemplateContext`: All template variables (gene, carrierFrequency, recurrenceRiskPercent, etc.)

### Template Renderer (src/utils/template-renderer.ts)
```typescript
renderTemplate(template: string, context: Partial<TemplateContext>): string
```
- Replaces `{{variableName}}` with context values
- Missing variables: returns empty string + logs warning
- Pure function with no side effects except warning

### German Templates (src/config/templates/de.json)
Clinical German terminology:
- Heterozygotenfrequenz (carrier frequency)
- Anlagetrager{{genderSuffix}} (carrier with gender suffix)
- Wiederholungsrisiko (recurrence risk)
- autosomal rezessiv (autosomal recessive)

8 sections per perspective:
1. geneIntro - Gene introduction
2. inheritance - Inheritance pattern
3. carrierFrequency - Carrier frequency with source
4. recurrenceRisk - Recurrence risk calculation
5. populationContext - Population variation note
6. founderEffect - Founder effect note
7. sourceCitation - Source details
8. recommendation - Family testing recommendation

### English Templates (src/config/templates/en.json)
- Identical structure to German
- Clinical English phrasing
- Same section keys for interchangeability

## Template Variables Used

| Variable | Purpose | Example |
|----------|---------|---------|
| gene | Gene symbol | CFTR |
| carrierFrequencyRatio | Carrier frequency as ratio | 1:25 |
| recurrenceRiskPercent | Formatted percentage | 0,25% |
| recurrenceRiskRatio | Risk as ratio | 1:400 |
| source | Attribution string | gnomAD v4 |
| genderSuffix | Gender-inclusive suffix | *innen |
| accessDate | Formatted date | 19.01.2026 |

## Commits

| Commit | Description |
|--------|-------------|
| caebca6 | feat(03-01): add text generation types |
| f55737b | feat(03-01): add template renderer utility |
| a256f0c | feat(03-01): add German and English template JSON files |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 03-02 (Pinia store):
- Types exported from `@/types` barrel
- renderTemplate utility available in `src/utils/`
- Template JSON files ready to import
- Variables cover all CONTEXT.md requirements
