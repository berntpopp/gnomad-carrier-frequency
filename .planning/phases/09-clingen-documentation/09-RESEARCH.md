# Phase 9: ClinGen + Documentation - Research

**Researched:** 2026-01-19
**Domain:** ClinGen gene-disease validity integration, gnomAD constraint data, help system UX, clinical documentation
**Confidence:** MEDIUM (ClinGen CSV is verified; gnomAD constraint fields verified via gist examples; help patterns from Vuetify docs)

## Summary

Phase 9 involves integrating ClinGen gene-disease validity data (for AR inheritance warnings), displaying gnomAD gene constraint scores (pLI/LOEUF), building a help/FAQ system with methodology documentation, and implementing a clinical disclaimer with data attribution. The key findings are:

1. **ClinGen CSV**: Available at `https://search.clinicalgenome.org/kb/gene-validity/download` with columns including GENE SYMBOL, DISEASE LABEL, MOI (Mode of Inheritance), and CLASSIFICATION. Built in real-time. CORS status unverified but user decision was to use CSV (implying it works).

2. **gnomAD Constraint**: The GraphQL API provides `gnomad_constraint` object with fields including `pLI`, `oe_lof` (LOEUF equivalent), `oe_lof_upper` (actual LOEUF), `exp_lof`, `obs_lof`, and Z-scores. Current gene queries do NOT fetch this data - a new query or query modification is needed.

3. **Help System**: Vuetify 3 `v-expansion-panels` with `variant="accordion"` provides the FAQ pattern. Methodology content needs Hardy-Weinberg explanation and calculation formula documentation.

4. **Disclaimer Banner**: Use Vuetify `v-banner` or custom dialog with Pinia store persistence for acknowledgment state. Footer icons for data sources and about dialogs.

**Primary recommendation:** Extend existing gnomAD gene query to fetch constraint data; parse ClinGen CSV client-side with caching; build help system using Vuetify expansion panels with proper accessibility.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vuetify 3 | 3.x | UI components (expansion panels, banners, dialogs) | Already in use, has all needed components |
| Pinia | 2.x | State persistence (disclaimer acknowledged, ClinGen cache) | Already in use with persist plugin |
| villus | 3.x | GraphQL client for gnomAD queries | Already configured for gnomAD API |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage | Native | Cache ClinGen data with timestamp | Built into Pinia persist plugin |
| fetch API | Native | Download ClinGen CSV | Native browser API |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side CSV parsing | PapaParse library | Adds dependency; native parsing sufficient for simple CSV |
| Custom accordion | Native `<details>`/`<summary>` | Less styling control; Vuetify provides better integration |
| IndexedDB for caching | localStorage | More complex API; not needed for small ClinGen dataset |

**Installation:**
```bash
# No new dependencies required - all components available in existing Vuetify/Pinia stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── api/
│   └── queries/
│       └── gene-constraint.ts    # NEW: Gene constraint query
├── composables/
│   └── useClingenValidity.ts     # NEW: ClinGen data fetching/caching
├── components/
│   ├── ClingenWarning.vue        # NEW: Warning alert component
│   ├── GeneConstraintCard.vue    # NEW: pLI/LOEUF display
│   ├── DisclaimerBanner.vue      # NEW: First-visit disclaimer
│   ├── MethodologyDialog.vue     # NEW: Calculation methodology
│   ├── FaqDialog.vue             # NEW: FAQ accordion
│   ├── AboutDialog.vue           # NEW: Project info
│   └── DataSourcesDialog.vue     # NEW: Version attribution
├── stores/
│   └── useAppStore.ts            # NEW or extend: disclaimerAcknowledged, clingenCache
└── config/
    └── help/
        ├── methodology.json      # NEW: Methodology content
        └── faq.json              # NEW: FAQ content
```

### Pattern 1: ClinGen CSV Caching with Expiry
**What:** Fetch ClinGen CSV, parse it, store in Pinia with timestamp, check 30-day expiry
**When to use:** On gene selection to check AR association
**Example:**
```typescript
// Source: Project pattern from useFilterStore.ts + standard caching pattern
interface ClingenCacheState {
  data: ClingenEntry[] | null;
  lastFetched: number | null; // Unix timestamp
  version: string | null;
}

const CACHE_EXPIRY_DAYS = 30;

export const useClingenStore = defineStore('clingen', {
  state: (): ClingenCacheState => ({
    data: null,
    lastFetched: null,
    version: null,
  }),

  getters: {
    isExpired: (state): boolean => {
      if (!state.lastFetched) return true;
      const daysSince = (Date.now() - state.lastFetched) / (1000 * 60 * 60 * 24);
      return daysSince > CACHE_EXPIRY_DAYS;
    },

    getGeneValidity: (state) => (geneSymbol: string): ClingenEntry[] => {
      if (!state.data) return [];
      return state.data.filter(e => e.geneSymbol === geneSymbol.toUpperCase());
    },
  },

  persist: {
    key: 'clingen-cache',
    storage: localStorage,
  },
});
```

### Pattern 2: gnomAD Constraint Query Extension
**What:** Add constraint fields to gene query
**When to use:** When fetching gene data, also fetch pLI/LOEUF
**Example:**
```graphql
// Source: https://gist.github.com/hliang/aad37d960adf42da16b3bad8677d7f19
query GeneWithConstraint($geneSymbol: String!, $referenceGenome: ReferenceGenomeId!) {
  gene(gene_symbol: $geneSymbol, reference_genome: $referenceGenome) {
    gene_id
    symbol
    gnomad_constraint {
      exp_lof
      obs_lof
      oe_lof
      oe_lof_lower
      oe_lof_upper  # This is LOEUF
      pLI
      lof_z
      flags
    }
    # Could also add coverage data if available
  }
}
```

### Pattern 3: Disclaimer with One-Time Acknowledgment
**What:** Show banner on first visit, persist acknowledgment to store
**When to use:** App initialization
**Example:**
```vue
<!-- Source: Vuetify banner pattern + Pinia persistence -->
<template>
  <v-banner
    v-if="!appStore.disclaimerAcknowledged"
    lines="two"
    icon="mdi-alert-circle-outline"
    color="warning"
    sticky
  >
    <template #text>
      For research use only. Results should be verified by a clinical laboratory.
      This tool does not replace genetic counseling.
    </template>
    <template #actions>
      <v-btn @click="acknowledge">I Understand</v-btn>
    </template>
  </v-banner>
</template>

<script setup lang="ts">
const appStore = useAppStore();
const acknowledge = () => { appStore.disclaimerAcknowledged = true; };
</script>
```

### Pattern 4: Vuetify Expansion Panel FAQ
**What:** Accordion-style FAQ with categorized sections
**When to use:** Help/FAQ dialog
**Example:**
```vue
<!-- Source: https://vuetifyjs.com/en/components/expansion-panels/ -->
<template>
  <v-expansion-panels variant="accordion">
    <v-expansion-panel
      v-for="item in faqItems"
      :key="item.id"
      :title="item.question"
      :text="item.answer"
    />
  </v-expansion-panels>
</template>
```

### Anti-Patterns to Avoid
- **Server-side proxy for ClinGen**: Decision was to use CSV directly - implies CORS works or will use a workaround
- **Blocking AR validation**: Gene validation must be non-blocking warning, not a gate
- **Full gene info re-fetch**: Extend existing query rather than making separate constraint query
- **Manual localStorage management**: Use Pinia persist plugin, not raw localStorage calls

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Manual string splitting | Simple line/comma split or PapaParse | Edge cases (quoted fields) exist but ClinGen CSV is simple |
| Accordion accessibility | Custom ARIA management | Vuetify `v-expansion-panels` | Built-in keyboard nav, ARIA roles |
| Cache expiry | Manual timestamp checks | Pinia persist with getter for expiry check | Cleaner state management |
| First-visit detection | Raw localStorage | Pinia store with `disclaimerAcknowledged` flag | Consistent with existing pattern |

**Key insight:** The existing Pinia persist pattern handles all caching needs. Vuetify provides all UI components for help/disclaimer UX.

## Common Pitfalls

### Pitfall 1: ClinGen CORS Issues
**What goes wrong:** Fetch from browser may be blocked by CORS
**Why it happens:** ClinGen server CORS headers not configured for browser requests
**How to avoid:**
- Test the URL `https://search.clinicalgenome.org/kb/gene-validity/download` directly
- If CORS fails, options: (1) pre-download CSV at build time, (2) use CORS proxy during dev
- User decision was "CSV is CORS-enabled" - verify this early
**Warning signs:** `Access-Control-Allow-Origin` errors in console

### Pitfall 2: gnomAD Constraint Field Availability by Version
**What goes wrong:** Constraint data may differ between gnomAD versions (v2 vs v4)
**Why it happens:** v4 has different LOEUF thresholds and some constraint fields may not exist
**How to avoid:**
- Check if `gnomad_constraint` object is null in response
- Use version-specific LOEUF thresholds: v2 < 0.35, v4 < 0.6
- Display "N/A" if constraint data unavailable
**Warning signs:** Null constraint data, incorrect threshold interpretation

### Pitfall 3: ClinGen MOI Parsing
**What goes wrong:** Inheritance mode not matched correctly
**Why it happens:** ClinGen uses full terms like "Autosomal recessive inheritance" not abbreviations
**How to avoid:**
- Parse MOI column for patterns: "recessive", "AR", "Autosomal recessive"
- Handle multiple MOI for same gene (gene may have AR and AD forms)
- Show specific classification found, not just "not AR"
**Warning signs:** Valid AR genes showing warnings

### Pitfall 4: Accordion Accessibility with v-if
**What goes wrong:** Screen readers don't announce expansion state changes
**Why it happens:** Dynamic content changes need ARIA live regions (learned from Phase 7)
**How to avoid:**
- Use Vuetify components which handle ARIA internally
- Leverage VueAnnouncer for dynamic content announcements (already installed)
- Test with screen reader
**Warning signs:** NVDA/VoiceOver not announcing panel open/close

### Pitfall 5: Disclaimer Banner Blocking Content
**What goes wrong:** Banner covers important UI or is dismissable accidentally
**Why it happens:** Sticky positioning or accidental clicks
**How to avoid:**
- Use `v-dialog` instead of sticky banner for critical disclaimer
- Require explicit "I Understand" click, not just dismiss
- Don't use `closable` prop without action confirmation
**Warning signs:** Users bypassing disclaimer without reading

## Code Examples

Verified patterns from research:

### ClinGen CSV Parsing
```typescript
// Source: Standard CSV parsing, ClinGen column structure from WebFetch
interface ClingenEntry {
  geneSymbol: string;       // Column: GENE SYMBOL
  hgncId: string;           // Column: GENE ID (HGNC)
  diseaseLabel: string;     // Column: DISEASE LABEL
  mondoId: string;          // Column: DISEASE ID (MONDO)
  moi: string;              // Column: MOI (AD, AR, XL, SD, UD)
  classification: string;   // Column: CLASSIFICATION (Definitive, Strong, etc.)
  gcep: string;             // Column: GCEP
}

async function fetchClingenCSV(): Promise<ClingenEntry[]> {
  const response = await fetch('https://search.clinicalgenome.org/kb/gene-validity/download');
  const text = await response.text();

  const lines = text.split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(','); // Simple split - ClinGen CSV is clean
      return {
        geneSymbol: values[0]?.trim().toUpperCase(),
        hgncId: values[1]?.trim(),
        diseaseLabel: values[2]?.trim(),
        mondoId: values[3]?.trim(),
        moi: values[4]?.trim(),
        classification: values[5]?.trim(),
        gcep: values[9]?.trim(),
      };
    });
}

function isAutosomalRecessive(moi: string): boolean {
  const lowerMoi = moi.toLowerCase();
  return lowerMoi.includes('recessive') || lowerMoi === 'ar';
}
```

### Gene Constraint Display
```typescript
// Source: gnomAD GraphQL schema from gist + gnomAD v4 threshold documentation
interface GeneConstraint {
  pLI: number | null;
  loeuf: number | null;      // oe_lof_upper from API
  oeLof: number | null;      // oe_lof (observed/expected)
  flags: string[] | null;
}

function getConstraintInterpretation(
  loeuf: number | null,
  gnomadVersion: 'v2' | 'v3' | 'v4'
): 'constrained' | 'intermediate' | 'tolerant' | 'unknown' {
  if (loeuf === null) return 'unknown';

  // Version-specific thresholds from gnomAD documentation
  const constrainedThreshold = gnomadVersion === 'v4' ? 0.6 : 0.35;
  const tolerantThreshold = gnomadVersion === 'v4' ? 1.5 : 1.0;

  if (loeuf < constrainedThreshold) return 'constrained';
  if (loeuf > tolerantThreshold) return 'tolerant';
  return 'intermediate';
}

function getPliInterpretation(pLI: number | null): string {
  if (pLI === null) return 'N/A';
  if (pLI >= 0.9) return 'LoF intolerant';
  if (pLI <= 0.1) return 'LoF tolerant';
  return 'Intermediate';
}
```

### Hardy-Weinberg Methodology Content
```typescript
// Source: https://www.perinatology.com/calculators/Hardy-Weinberg.htm and research
const methodologyContent = {
  overview: `
    The carrier frequency for an autosomal recessive condition is calculated
    using the Hardy-Weinberg equilibrium principle, which describes the
    relationship between allele and genotype frequencies in a population.
  `,
  formula: `
    For two alleles (normal A, disease a):
    - p = frequency of normal allele
    - q = frequency of disease allele
    - p + q = 1

    Genotype frequencies at equilibrium:
    - p² = homozygous normal (AA)
    - 2pq = heterozygous carriers (Aa)
    - q² = affected (aa)

    This calculator uses: Carrier frequency ≈ 2 × sum(pathogenic allele frequencies)
  `,
  assumptions: [
    'Random mating in the population',
    'No new mutations occurring',
    'No natural selection',
    'Infinitely large population',
    'No migration',
  ],
  limitations: [
    'Founder effects may cause higher frequencies in specific populations',
    'Consanguinity increases risk beyond Hardy-Weinberg predictions',
    'Some variants may have incomplete penetrance',
    'gnomAD populations may not match patient ancestry',
  ],
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pLI for constraint | LOEUF (oe_lof_upper) | gnomAD v2.1 (2018) | More continuous metric, better for continuous analysis |
| LOEUF < 0.35 threshold | LOEUF < 0.6 for v4 | gnomAD v4.0 (2024) | Threshold shift due to larger sample size |
| ClinGen REST API | ClinGen GraphQL + CSV download | 2023+ | CSV still available, GraphQL is primary |

**Deprecated/outdated:**
- pLI alone: Still display but LOEUF preferred; pLI better for dichotomous classification
- gnomAD v2.1.1 constraints on v4 data: Must use version-appropriate thresholds

## Open Questions

Things that couldn't be fully resolved:

1. **ClinGen CSV CORS confirmation**
   - What we know: Decision was "ClinGen CSV is CORS-enabled"
   - What's unclear: Not verified in research; may need runtime test
   - Recommendation: Test early; have fallback plan (build-time download)

2. **gnomAD coverage data availability via GraphQL**
   - What we know: Coverage data exists in gnomAD, used in constraint calculations
   - What's unclear: Whether `exome_coverage` is exposed in public GraphQL API
   - Recommendation: Check gene query schema for coverage fields; may need separate approach

3. **Gene constraint data for v3 genomes-only**
   - What we know: v3 is genomes-only, constraint traditionally from exomes
   - What's unclear: Whether constraint data available for v3
   - Recommendation: Handle null constraint gracefully, display "N/A"

## Sources

### Primary (HIGH confidence)
- [ClinGen Downloads Page](https://search.clinicalgenome.org/kb/downloads) - CSV download URL and structure
- [gnomAD v4.0 Gene Constraint Announcement](https://gnomad.broadinstitute.org/news/2024-03-gnomad-v4-0-gene-constraint/) - LOEUF threshold changes
- [gnomAD GraphQL Example Gist](https://gist.github.com/hliang/aad37d960adf42da16b3bad8677d7f19) - gnomad_constraint field structure
- [Vuetify Expansion Panels](https://vuetifyjs.com/en/components/expansion-panels/) - Accordion component API

### Secondary (MEDIUM confidence)
- [Hardy-Weinberg Calculator](https://www.perinatology.com/calculators/Hardy-Weinberg.htm) - Methodology explanation
- [gnomAD Help - Constraint](https://gnomad.broadinstitute.org/help/constraint) - pLI vs LOEUF explanation
- [Shields.io](https://shields.io/) - README badge service

### Tertiary (LOW confidence)
- ClinGen CORS behavior - Decision document says enabled, not independently verified
- gnomAD coverage in GraphQL - Not found in search, needs runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies
- Architecture: HIGH - Extends proven Pinia/Vuetify patterns
- ClinGen integration: MEDIUM - CSV structure verified, CORS unverified
- gnomAD constraint: MEDIUM - Field names verified, API availability per version uncertain
- Pitfalls: HIGH - Based on Phase 7 learnings and domain research

**Research date:** 2026-01-19
**Valid until:** 30 days (ClinGen/gnomAD API stability reasonable)

---

## Appendix: ClinGen CSV Column Reference

| Column Index | Header | Example Value | Use |
|--------------|--------|---------------|-----|
| 0 | GENE SYMBOL | CFTR | Match against user-selected gene |
| 1 | GENE ID (HGNC) | HGNC:1884 | Alternative identifier |
| 2 | DISEASE LABEL | Cystic fibrosis | Display in warning |
| 3 | DISEASE ID (MONDO) | MONDO:0009061 | Linkout to Mondo |
| 4 | MOI | Autosomal recessive inheritance | Check for AR |
| 5 | SOP | 9 | Standard operating procedure version |
| 6 | CLASSIFICATION | Definitive | Display classification strength |
| 7 | ONLINE REPORT | URL | Link to full curation |
| 8 | CLASSIFICATION DATE | ISO timestamp | Data freshness |
| 9 | GCEP | Expert panel name | Attribution |

## Appendix: gnomAD Constraint Fields Reference

| Field | Type | Description | Use |
|-------|------|-------------|-----|
| `pLI` | float | Probability of LoF intolerance | Display, threshold >= 0.9 |
| `oe_lof_upper` | float | LOEUF - upper bound of O/E ratio | Primary constraint metric |
| `oe_lof` | float | Observed/expected LoF ratio | Display |
| `oe_lof_lower` | float | Lower confidence bound | Confidence interval |
| `exp_lof` | float | Expected LoF variants | Context |
| `obs_lof` | int | Observed LoF variants | Context |
| `lof_z` | float | Z-score for LoF | Alternative metric |
| `flags` | string[] | Quality flags | Warn if present |

## Appendix: README Badges

Standard badges for the project README:

```markdown
![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?logo=vuedotjs&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)
![Vuetify](https://img.shields.io/badge/Vuetify-1867C0?logo=vuetify&logoColor=fff)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
```
