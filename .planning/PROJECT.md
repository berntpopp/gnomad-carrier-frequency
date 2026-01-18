# gnomAD Carrier Frequency Calculator

## What This Is

A single-page application for genetic counselors to calculate carrier frequencies and recurrence risks for autosomal recessive conditions. Users enter a gene, select the index patient's status, and get population-specific carrier frequencies from gnomAD with calculated recurrence risks and ready-to-paste German clinical documentation text.

## Core Value

Accurate recurrence risk calculation from real gnomAD population data, with clinical documentation output that's ready to paste into patient letters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Gene search input with gnomAD lookup
- [ ] Index patient status selection (heterozygous carrier vs compound het/homozygous affected)
- [ ] Carrier frequency from three sources: gnomAD estimate, literature citation (with PMID), or default assumption (1:100)
- [ ] gnomAD query: fetch variants, filter for LoF HC or ClinVar pathogenic, sum allele frequencies, calculate carrier frequency (2 × cumulative AF)
- [ ] Population-specific frequencies: global primary, all populations shown, upper/lower bounds, founder effect detection
- [ ] Recurrence risk calculation: carrier_freq / 4 for offspring
- [ ] German clinical text generation with user-selectable perspective (affected patient, carrier, family member)
- [ ] Copy-to-clipboard for German text output
- [ ] Fallback to 1:100 default when gnomAD returns no qualifying variants

### Out of Scope

- [ ] Backend/database — direct gnomAD GraphQL from browser
- [ ] User accounts/authentication — stateless tool
- [ ] Non-German text output — German clinical letters only for v1
- [ ] Variant-level detail display — aggregated frequencies only

## Context

**Domain:** Genetic counseling for autosomal recessive conditions. Carrier frequency is the proportion of a population carrying one copy of a pathogenic variant. Recurrence risk is calculated using Hardy-Weinberg equilibrium principles.

**gnomAD:** The Genome Aggregation Database provides population allele frequencies via GraphQL API. Relevant filters are LoF (loss of function) with "HC" (high confidence) annotation and ClinVar pathogenic classifications.

**German clinical text template:**
> Die Eltern des Patienten sind mit großer Wahrscheinlichkeit jeweils heterozygote Anlageträger. Formalgenetisch sind 25% der Geschwister des Patienten ebenfalls compound heterozygote Anlageträger und betroffen. Nachkommen des Patienten erben eine der hier nachgewiesenen Varianten zu 100% und sind somit gesicherte Anlageträger*innen einer [CONDITION]. Bei einer geschätzten Heterozygotenfrequenz von [FREQ] ([SOURCE]) läge das Risiko für eine [GENE]-assoziierte Erkrankung bei Nachkommen des Patienten bei etwa [RISK]. Auch weitere Verwandte haben ggf. ein erhöhtes Risiko selbst Anlageträger zu sein und dadurch Nachkommen mit einer [GENE]-assoziierten Erkrankung zu haben. Familienangehörigen kann eine Untersuchung auf die hier nachgewiesene Variante angeboten werden.

Text adapts based on perspective selection and index patient status.

## Constraints

- **Stack**: Bun, Vue 3 (Composition API + `<script setup>`), Vuetify 3, Vite, TypeScript — chosen for speed and built-in stepper component
- **Deployment**: GitHub Pages via gh-pages, GitHub Actions for CI (lint, typecheck)
- **No backend**: All API calls direct to gnomAD GraphQL from browser
- **Single page**: Stepper-based wizard UI flow

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vuetify 3 over Tailwind | Built-in stepper component, Material Design consistency | — Pending |
| Direct gnomAD GraphQL | No backend complexity, data always fresh | — Pending |
| Bun over npm/yarn | Faster installs and builds | — Pending |
| German-only output | Primary use case, other languages can be added later | — Pending |

---
*Last updated: 2026-01-18 after initialization*
