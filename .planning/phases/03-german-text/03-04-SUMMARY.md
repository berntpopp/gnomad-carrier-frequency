# Phase 03 Plan 04: Gap Closure - Status Granularity and Patient Sex Summary

---
phase: 03-german-text
plan: 04
subsystem: text-generation
tags: [gap-closure, german-text, patient-sex, affected-status]

dependency-graph:
  requires: [03-01, 03-02, 03-03]
  provides: [4-option-status, patient-sex-german, status-specific-templates]
  affects: [04-validation]

tech-stack:
  added: []
  patterns:
    - status-specific-template-rendering
    - grammatical-gender-agreement

key-files:
  created: []
  modified:
    - src/types/frequency.ts
    - src/types/text.ts
    - src/types/index.ts
    - src/components/wizard/StepStatus.vue
    - src/components/wizard/TextOutput.vue
    - src/stores/useTemplateStore.ts
    - src/composables/useTextGenerator.ts
    - src/config/templates/de.json
    - src/config/templates/en.json

decisions:
  - key: 4-option-index-status
    choice: "heterozygous | homozygous | compound_het_confirmed | compound_het_assumed"
    rationale: Clinical documentation requires precise status differentiation
  - key: patient-sex-german-only
    choice: PatientSex selector visible only in German mode
    rationale: Grammatical gender only needed for German; English uses neutral forms
  - key: status-intro-in-generator
    choice: buildStatusIntro function in useTextGenerator
    rationale: Status-specific text built programmatically rather than template conditionals

metrics:
  duration: ~15 minutes
  completed: 2026-01-19
---

**One-liner:** Expanded IndexPatientStatus to 4 options with status-specific German text and patient sex grammatical agreement

## Objective

Close two high-severity gaps from Phase 3 verification:
1. GAP-03-01: Expand affected status from 2 to 4 options
2. GAP-03-02: Add patient sex selection for German grammatical gender

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Expand IndexPatientStatus and StepStatus UI | 7f1eb82 | IndexPatientStatus 4 values, v-radio-group UI |
| 2 | Add PatientSex type with store support | 143000b | PatientSex type, patientForms getter, buildStatusIntro |
| 3 | Update templates and TextOutput UI | 33b9d35 | {{statusIntro}}, {{patientGenitive}}, patient sex selector |

## Implementation Details

### IndexPatientStatus Expansion

**Before:**
```typescript
export type IndexPatientStatus = 'heterozygous' | 'compound_het_homozygous';
```

**After:**
```typescript
export type IndexPatientStatus =
  | 'heterozygous'           // Carrier - one pathogenic allele
  | 'homozygous'             // Affected - two copies same allele
  | 'compound_het_confirmed' // Affected - two different alleles, confirmed
  | 'compound_het_assumed';  // Affected - two different alleles, assumed
```

### StepStatus.vue Radio Group

Replaced v-switch toggle with v-radio-group offering 4 labeled options:
- Heterozygous carrier (one pathogenic allele)
- Homozygous affected (two copies same allele)
- Compound heterozygous confirmed (phase confirmed)
- Compound heterozygous assumed (phase by phenotype)

### PatientSex Type

```typescript
export type PatientSex = 'male' | 'female' | 'neutral';
```

### useTemplateStore Additions

```typescript
// State
patientSex: 'male',  // default

// Getter
patientForms: (state) => {
  // Returns { nominative, genitive, dative } based on patientSex
  // male: der Patient / des Patienten / dem Patienten
  // female: die Patientin / der Patientin / der Patientin
  // neutral: der/die Patient*in / des/der Patient*in / dem/der Patient*in
}

// Action
setPatientSex(sex: PatientSex)
```

### buildStatusIntro Function

Generates status-specific opening text in both German and English:

| Status | German Text |
|--------|-------------|
| heterozygous | Bei {dative} wurde eine heterozygote pathogene Variante im {gene}-Gen nachgewiesen. |
| homozygous | Bei {dative} wurde eine pathogene Variante im {gene}-Gen im homozygoten Zustand nachgewiesen. |
| compound_het_confirmed | Bei {dative} wurden zwei pathogene Varianten im {gene}-Gen im compound heterozygoten Zustand nachgewiesen. |
| compound_het_assumed | Bei {dative} wurden zwei pathogene Varianten im {gene}-Gen nachgewiesen. Aufgrund des passenden Phanotyps erscheint ein compound heterozygotes Vorliegen wahrscheinlich. |

### Template Changes

German templates updated:
- `geneIntro` (affected): `{{statusIntro}}` - uses buildStatusIntro
- `inheritance`: Uses `{{patientGenitive}}` instead of hardcoded "des Patienten"
- `recurrenceRisk`: Uses `{{patientGenitive}}` for proper grammatical agreement

### TextOutput.vue Patient Sex Selector

```vue
<v-select
  v-if="language === 'de'"
  v-model="patientSexModel"
  :items="patientSexOptions"
  :label="labels.patientSex"
/>
```

Options:
- Mannlich (der Patient)
- Weiblich (die Patientin)
- Neutral (der/die Patient*in)

## Verification Results

- [x] `npx vue-tsc --noEmit` passes
- [x] `npm run dev` starts without errors
- [x] IndexPatientStatus has 4 values
- [x] StepStatus shows 4 radio options
- [x] PatientSex type exported from types
- [x] Patient sex selector shown in German mode only
- [x] Generated text reflects selected status and patient sex

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- [x] GAP-03-01 closed: IndexPatientStatus expanded to 4 values
- [x] GAP-03-02 closed: PatientSex with German grammatical forms
- [x] All existing functionality preserved
- [x] Type safety maintained throughout

## Next Phase Readiness

Phase 3 gap closure complete. All TEXT requirements satisfied including:
- TEXT-01: German clinical text generation
- TEXT-02: Config-driven templates
- TEXT-03: Gender-inclusive language
- TEXT-04: Status-specific and patient-sex-aware text

Ready for Phase 4: Deploy (validation and deployment).
