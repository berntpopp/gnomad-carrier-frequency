# Architecture Patterns

**Domain:** Vue 3 SPA for gnomAD carrier frequency calculation
**Researched:** 2026-01-18
**Confidence:** HIGH (verified with official Vue docs, gnomAD API documentation)

## Recommended Architecture

```
+-------------------------------------------------------------------+
|                         App Shell (App.vue)                       |
|  - Vuetify v-app wrapper                                          |
|  - Global error boundary                                          |
|  - Layout structure                                               |
+-------------------------------------------------------------------+
           |
           v
+-------------------------------------------------------------------+
|                    Wizard Container (WizardView.vue)              |
|  - Vuetify v-stepper orchestration                                |
|  - Step navigation logic                                          |
|  - Wizard state coordination                                      |
+-------------------------------------------------------------------+
           |
           +------------------+------------------+------------------+
           |                  |                  |                  |
           v                  v                  v                  v
+----------------+  +----------------+  +----------------+  +----------------+
| Step 1:        |  | Step 2:        |  | Step 3:        |  | Step 4:        |
| GeneInput      |  | PatientStatus  |  | FrequencySource|  | Results        |
| Component      |  | Component      |  | Component      |  | Component      |
+----------------+  +----------------+  +----------------+  +----------------+
           |                                     |                  |
           v                                     v                  v
+-------------------------------------------------------------------+
|                        Composables Layer                          |
+-------------------+-------------------+---------------------------+
| useGnomadApi()    | useWizardState()  | useCarrierCalculation()   |
| - Gene search     | - Current step    | - Frequency calculation   |
| - Variant fetch   | - Step data       | - Risk calculation        |
| - Population data | - Validation      | - Confidence intervals    |
+-------------------+-------------------+---------------------------+
           |                                     |
           v                                     v
+----------------------------+     +----------------------------+
|    API Service Layer       |     |    Calculation Service     |
+----------------------------+     +----------------------------+
| gnomadService.ts           |     | carrierFrequency.ts        |
| - GraphQL query building   |     | - Hardy-Weinberg calcs     |
| - fetch() to gnomAD API    |     | - Population aggregation   |
| - Response transformation  |     | - Confidence bounds        |
+----------------------------+     +----------------------------+
           |                                     |
           v                                     v
+----------------------------+     +----------------------------+
|    Types Layer             |     |    Text Generation         |
+----------------------------+     +----------------------------+
| types/gnomad.ts            |     | germanText.ts              |
| types/wizard.ts            |     | - Template rendering       |
| types/calculation.ts       |     | - Perspective adaptation   |
+----------------------------+     +----------------------------+
```

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `App.vue` | Vuetify shell, global layout, error boundary | WizardView |
| `WizardView.vue` | v-stepper orchestration, step navigation, progress tracking | All step components, useWizardState |
| `GeneInputStep.vue` | Gene search/selection UI, validation | useGnomadApi, useWizardState |
| `PatientStatusStep.vue` | Index patient status selection (carrier vs affected) | useWizardState |
| `FrequencySourceStep.vue` | Source selection (gnomAD, literature, default), PMID input | useWizardState, useGnomadApi |
| `ResultsStep.vue` | Display frequencies, risks, German text, copy button | useCarrierCalculation, useWizardState |
| `useGnomadApi` | GraphQL queries, response caching, loading/error states | gnomadService |
| `useWizardState` | Cross-step data, validation, step progression | None (singleton state) |
| `useCarrierCalculation` | Derived values from wizard state + API data | useWizardState, useGnomadApi |
| `gnomadService.ts` | Raw HTTP/GraphQL communication | gnomAD external API |
| `carrierFrequency.ts` | Pure calculation functions | None |
| `germanText.ts` | Text template rendering | None |

## Data Flow

### Primary Flow: Gene to Results

```
User Input          API Layer           State              Calculation        Output
-----------         ---------           -----              -----------        ------

Gene name    -->    searchGene()   -->  selectedGene  -->
             |                          |
             |                          v
             |      fetchVariants() --> variants       -->  filterVariants()
             |                          |                   |
             |                          |                   v
             |                          |              sumAlleleFreqs()
             |                          |                   |
             |                          v                   v
Patient      ---------------------->    patientStatus -->   calculateCarrier()
status                                  |                   |
                                        |                   v
Freq source  ---------------------->    freqSource    -->   calculateRisk()
                                        |                   |
                                        |                   v
                                        +------------->     generateText() --> German text
```

### Reactive Data Flow with Vue 3

```typescript
// useWizardState.ts - Singleton composable (global state)
const wizardState = reactive({
  currentStep: 1,
  gene: null as Gene | null,
  patientStatus: null as 'carrier' | 'affected' | null,
  frequencySource: 'gnomad' as 'gnomad' | 'literature' | 'default',
  literaturePmid: '',
  literatureFrequency: null as number | null
})

// useGnomadApi.ts - API composable (can be instantiated per-use or singleton)
export function useGnomadApi() {
  const variants = ref<Variant[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchVariantsForGene(geneId: string) {
    loading.value = true
    // ... fetch from gnomadService
  }

  return { variants, loading, error, fetchVariantsForGene }
}

// useCarrierCalculation.ts - Derived values composable
export function useCarrierCalculation() {
  const { gene, patientStatus, frequencySource } = useWizardState()
  const { variants } = useGnomadApi()

  // Computed values automatically update when dependencies change
  const carrierFrequency = computed(() => {
    if (frequencySource === 'gnomad' && variants.value.length > 0) {
      return calculateCarrierFreqFromVariants(variants.value)
    }
    // ... handle other sources
  })

  const recurrenceRisk = computed(() => {
    return carrierFrequency.value ? carrierFrequency.value / 4 : null
  })

  return { carrierFrequency, recurrenceRisk }
}
```

## Patterns to Follow

### Pattern 1: Service Layer Separation

**What:** Separate raw API communication from reactive state management.

**When:** Always for external API calls.

**Why:**
- Testability: Services can be unit tested without Vue
- Reusability: Same service works with different UI frameworks
- Maintainability: API changes isolated to service layer

**Example:**
```typescript
// services/gnomadService.ts - Pure functions, no Vue reactivity
const GNOMAD_API = 'https://gnomad.broadinstitute.org/api'

export interface GnomadVariant {
  variant_id: string
  pos: number
  consequence: string
  exome?: { ac: number; an: number; af: number; populations: Population[] }
  genome?: { ac: number; an: number; af: number; populations: Population[] }
}

export async function fetchGeneVariants(
  geneSymbol: string,
  dataset = 'gnomad_r4'
): Promise<GnomadVariant[]> {
  const query = `
    query GeneVariants($geneSymbol: String!) {
      gene(gene_symbol: $geneSymbol, reference_genome: GRCh38) {
        variants(dataset: ${dataset}) {
          variant_id
          pos
          consequence
          exome {
            ac
            an
            af
            populations { id ac an }
          }
          genome {
            ac
            an
            af
            populations { id ac an }
          }
        }
      }
    }
  `

  const response = await fetch(GNOMAD_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { geneSymbol } })
  })

  const { data, errors } = await response.json()
  if (errors) throw new Error(errors[0].message)
  return data.gene?.variants ?? []
}

// composables/useGnomadApi.ts - Vue-specific reactive wrapper
import { ref, readonly } from 'vue'
import { fetchGeneVariants, type GnomadVariant } from '@/services/gnomadService'

export function useGnomadApi() {
  const variants = ref<GnomadVariant[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadVariants(geneSymbol: string) {
    loading.value = true
    error.value = null
    try {
      variants.value = await fetchGeneVariants(geneSymbol)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return {
    variants: readonly(variants),
    loading: readonly(loading),
    error: readonly(error),
    loadVariants
  }
}
```

### Pattern 2: Composable Singleton for Wizard State

**What:** Single source of truth for wizard data, shared across all steps.

**When:** Data needs to persist across step transitions and be accessible from any step.

**Why:** Vuetify stepper destroys step content when navigating, so component-local state would be lost.

**Example:**
```typescript
// composables/useWizardState.ts
import { reactive, computed, toRefs } from 'vue'

interface WizardState {
  currentStep: number
  gene: { symbol: string; id: string } | null
  patientStatus: 'carrier' | 'affected' | null
  frequencySource: 'gnomad' | 'literature' | 'default'
  literaturePmid: string
  literatureFrequency: number | null
}

// Singleton state - declared outside function
const state = reactive<WizardState>({
  currentStep: 1,
  gene: null,
  patientStatus: null,
  frequencySource: 'gnomad',
  literaturePmid: '',
  literatureFrequency: null
})

export function useWizardState() {
  // Computed validations
  const canProceedToStep2 = computed(() => state.gene !== null)
  const canProceedToStep3 = computed(() => state.patientStatus !== null)
  const canProceedToStep4 = computed(() => {
    if (state.frequencySource === 'literature') {
      return state.literatureFrequency !== null && state.literaturePmid !== ''
    }
    return true
  })

  function reset() {
    state.currentStep = 1
    state.gene = null
    state.patientStatus = null
    state.frequencySource = 'gnomad'
    state.literaturePmid = ''
    state.literatureFrequency = null
  }

  return {
    ...toRefs(state),
    canProceedToStep2,
    canProceedToStep3,
    canProceedToStep4,
    reset
  }
}
```

### Pattern 3: Computed Chains for Derived Values

**What:** Use computed properties to derive values that automatically update when dependencies change.

**When:** Calculations depend on multiple reactive sources.

**Why:** Automatic reactivity, caching, and clear data dependencies.

**Example:**
```typescript
// composables/useCarrierCalculation.ts
import { computed } from 'vue'
import { useWizardState } from './useWizardState'
import { useGnomadApi } from './useGnomadApi'
import {
  filterPathogenicVariants,
  calculateCarrierFrequency,
  calculateRecurrenceRisk
} from '@/services/carrierFrequency'

export function useCarrierCalculation() {
  const { frequencySource, literatureFrequency, patientStatus } = useWizardState()
  const { variants } = useGnomadApi()

  // Filtered variants (only pathogenic/LoF)
  const pathogenicVariants = computed(() =>
    filterPathogenicVariants(variants.value)
  )

  // Carrier frequency from selected source
  const carrierFrequency = computed(() => {
    switch (frequencySource.value) {
      case 'gnomad':
        return calculateCarrierFrequency(pathogenicVariants.value)
      case 'literature':
        return literatureFrequency.value
      case 'default':
        return 1 / 100 // 1:100 default
    }
  })

  // Recurrence risk (carrier_freq / 4)
  const recurrenceRisk = computed(() => {
    if (!carrierFrequency.value) return null
    return calculateRecurrenceRisk(carrierFrequency.value, patientStatus.value)
  })

  // Population-specific frequencies
  const populationFrequencies = computed(() => {
    if (frequencySource.value !== 'gnomad') return null
    return calculatePopulationFrequencies(pathogenicVariants.value)
  })

  return {
    pathogenicVariants,
    carrierFrequency,
    recurrenceRisk,
    populationFrequencies
  }
}
```

### Pattern 4: Pure Calculation Functions

**What:** Keep domain calculations as pure functions, separate from Vue reactivity.

**When:** Mathematical/business logic that doesn't need reactivity internally.

**Why:** Testability, reusability, no Vue dependency for core logic.

**Example:**
```typescript
// services/carrierFrequency.ts
import type { GnomadVariant, Population } from './gnomadService'

/**
 * Filter variants to only pathogenic ones.
 * Criteria: LoF HC (high confidence) OR ClinVar pathogenic/likely pathogenic
 */
export function filterPathogenicVariants(variants: GnomadVariant[]): GnomadVariant[] {
  return variants.filter(v => {
    const isLoFHC = v.consequence?.includes('lof') // Simplified - check actual field
    const isClinVarPath = v.clinvar_pathogenicity === 'pathogenic'
      || v.clinvar_pathogenicity === 'likely_pathogenic'
    return isLoFHC || isClinVarPath
  })
}

/**
 * Calculate carrier frequency from variant allele frequencies.
 * Formula: 2 * sum(AF) for each variant
 * This assumes Hardy-Weinberg equilibrium and rare variants.
 */
export function calculateCarrierFrequency(variants: GnomadVariant[]): number {
  const totalAF = variants.reduce((sum, v) => {
    const af = v.exome?.af ?? v.genome?.af ?? 0
    return sum + af
  }, 0)

  // Carrier frequency = 2q where q is total allele frequency
  // (For rare recessive conditions, heterozygote frequency ~= 2pq ~= 2q)
  return 2 * totalAF
}

/**
 * Calculate recurrence risk based on patient status.
 * - Affected patient: offspring risk = carrier_freq / 4
 * - Carrier: offspring risk depends on partner status
 */
export function calculateRecurrenceRisk(
  carrierFreq: number,
  patientStatus: 'carrier' | 'affected'
): number {
  // Risk = P(partner is carrier) * P(both transmit) = q * 1/4
  // For affected patient: both parents are carriers, offspring gets one allele
  // Partner risk = carrier frequency in population
  return carrierFreq / 4
}

/**
 * Calculate carrier frequency per population.
 */
export function calculatePopulationFrequencies(
  variants: GnomadVariant[]
): Map<string, number> {
  const popFreqs = new Map<string, { ac: number; an: number }>()

  for (const variant of variants) {
    const populations = variant.exome?.populations ?? variant.genome?.populations ?? []
    for (const pop of populations) {
      const existing = popFreqs.get(pop.id) ?? { ac: 0, an: 0 }
      popFreqs.set(pop.id, {
        ac: existing.ac + pop.ac,
        an: Math.max(existing.an, pop.an) // AN should be same across variants
      })
    }
  }

  const result = new Map<string, number>()
  for (const [popId, { ac, an }] of popFreqs) {
    if (an > 0) {
      result.set(popId, 2 * (ac / an)) // 2 * AF = carrier frequency
    }
  }

  return result
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct API Calls in Components

**What:** Calling fetch/axios directly in component script.

**Why bad:**
- Duplicated error handling
- No caching/deduplication
- Hard to test components
- API changes require touching many files

**Instead:** Use composables that wrap services.

```typescript
// BAD - in component
async function searchGene() {
  const response = await fetch('https://gnomad.broadinstitute.org/api', {
    method: 'POST',
    body: JSON.stringify({ query: '...' })
  })
  // Error handling duplicated everywhere
}

// GOOD - in component
const { searchGene, loading, error, results } = useGnomadApi()
// All API logic encapsulated
```

### Anti-Pattern 2: Step-Local State for Wizard Data

**What:** Using ref/reactive inside step components for data that needs to persist.

**Why bad:** Vuetify stepper may unmount step components, losing state.

**Instead:** Use singleton composable for wizard state.

```typescript
// BAD - in GeneInputStep.vue
const selectedGene = ref(null) // Lost when step unmounts

// GOOD - any step component
const { gene } = useWizardState() // Persists across steps
```

### Anti-Pattern 3: Prop Drilling Through Steps

**What:** Passing all wizard data as props through stepper to each step.

**Why bad:** Tight coupling, verbose, hard to add new data fields.

**Instead:** Steps consume shared state via composables.

```vue
<!-- BAD -->
<GeneInputStep
  :gene="gene"
  :patient-status="patientStatus"
  :frequency-source="frequencySource"
  @update:gene="gene = $event"
  @update:patient-status="patientStatus = $event"
/>

<!-- GOOD -->
<GeneInputStep />
<!-- Step uses useWizardState() internally -->
```

### Anti-Pattern 4: GraphQL in Multiple Places

**What:** Writing GraphQL queries in different composables/components.

**Why bad:**
- Query duplication
- Schema changes require hunting through codebase
- No single source of truth for data requirements

**Instead:** Centralize all queries in service layer.

```typescript
// BAD - queries scattered
// composables/useGeneSearch.ts
const GENE_QUERY = `query { gene(...) { ... } }`

// composables/useVariants.ts
const VARIANT_QUERY = `query { gene(...) { variants { ... } } }`

// GOOD - centralized
// services/gnomadQueries.ts
export const GENE_SEARCH_QUERY = `...`
export const GENE_VARIANTS_QUERY = `...`
// All queries in one file
```

### Anti-Pattern 5: Business Logic in Templates

**What:** Complex calculations or conditionals in template expressions.

**Why bad:** Hard to test, hard to read, can't be reused.

**Instead:** Use computed properties or methods.

```vue
<!-- BAD -->
<p>Risk: {{ (variants.reduce((s,v) => s + v.af, 0) * 2 / 4 * 100).toFixed(2) }}%</p>

<!-- GOOD -->
<p>Risk: {{ formattedRisk }}</p>
<script setup>
const { recurrenceRisk } = useCarrierCalculation()
const formattedRisk = computed(() =>
  recurrenceRisk.value ? `${(recurrenceRisk.value * 100).toFixed(2)}%` : 'N/A'
)
</script>
```

## Project Structure

Recommended folder structure for this application:

```
src/
├── App.vue                          # Root component with Vuetify shell
├── main.ts                          # App entry, Vuetify plugin setup
├── components/
│   ├── wizard/
│   │   ├── WizardView.vue           # Stepper container
│   │   ├── GeneInputStep.vue        # Step 1
│   │   ├── PatientStatusStep.vue    # Step 2
│   │   ├── FrequencySourceStep.vue  # Step 3
│   │   └── ResultsStep.vue          # Step 4
│   └── common/
│       ├── LoadingSpinner.vue       # Shared loading indicator
│       └── ErrorAlert.vue           # Shared error display
├── composables/
│   ├── useWizardState.ts            # Wizard state singleton
│   ├── useGnomadApi.ts              # gnomAD API reactive wrapper
│   └── useCarrierCalculation.ts     # Derived calculations
├── services/
│   ├── gnomadService.ts             # Raw gnomAD API communication
│   ├── gnomadQueries.ts             # GraphQL query definitions
│   ├── carrierFrequency.ts          # Pure calculation functions
│   └── germanText.ts                # German text generation
├── types/
│   ├── gnomad.ts                    # gnomAD API response types
│   ├── wizard.ts                    # Wizard state types
│   └── calculation.ts               # Calculation result types
└── assets/
    └── styles/                      # Global styles if needed
```

## Build Order Implications

Based on dependencies between components, recommended build order:

### Phase 1: Foundation
Build first, no dependencies on other app code:

1. **Types** (`types/*.ts`) - Define data structures
2. **Pure Services** (`services/carrierFrequency.ts`, `services/germanText.ts`) - No external dependencies
3. **gnomAD Service** (`services/gnomadService.ts`) - External API only

**Rationale:** These have no internal dependencies and can be unit tested immediately.

### Phase 2: State Layer
Depends on types:

4. **useWizardState** (`composables/useWizardState.ts`) - State management
5. **useGnomadApi** (`composables/useGnomadApi.ts`) - Depends on gnomadService

**Rationale:** Composables depend on types and services being defined.

### Phase 3: Calculation Layer
Depends on composables:

6. **useCarrierCalculation** (`composables/useCarrierCalculation.ts`) - Depends on both composables

**Rationale:** Calculation composable combines state and API data.

### Phase 4: UI Components
Depends on composables:

7. **Common components** - LoadingSpinner, ErrorAlert
8. **Step components** - GeneInputStep through ResultsStep
9. **WizardView** - Orchestrates all steps

**Rationale:** UI components consume composables. Build steps in order (1-4) to validate flow incrementally.

### Phase 5: Integration
Everything wired together:

10. **App.vue** - Final integration
11. **E2E testing** - Full flow validation

### Dependency Graph

```
types/*
    |
    v
services/* (pure)
    |
    +---> gnomadService
    |         |
    v         v
useWizardState    useGnomadApi
    |                 |
    +--------+--------+
             |
             v
    useCarrierCalculation
             |
             v
    Step Components
             |
             v
    WizardView.vue
             |
             v
    App.vue
```

## Sources

**Vue 3 Architecture:**
- [Vue.js Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq) - Official guidance on composables
- [Vue.js Composables Guide](https://vuejs.org/guide/reusability/composables) - Official composables documentation
- [Pinia Cookbook: Composables](https://pinia.vuejs.org/cookbook/composables.html) - When to use Pinia vs composables
- [Vue FAQ: Project Structure](https://vue-faq.org/en/development/project-structure.html) - Folder organization
- [Vue School: Large Scale Vue Apps](https://vueschool.io/articles/vuejs-tutorials/how-to-structure-a-large-scale-vue-js-application/) - Modular architecture

**Vuetify 3 Stepper:**
- [Vuetify Stepper Component](https://vuetifyjs.com/en/components/steppers/) - Official stepper documentation

**gnomAD API:**
- [gnomAD GraphQL API](https://gnomad.broadinstitute.org/help/how-do-i-query-a-batch-of-variants-do-you-have-an-api) - Official API documentation
- [gnomAD Browser GitHub](https://github.com/broadinstitute/gnomad-browser/tree/main/graphql-api) - GraphQL schema reference
- [gnomAD Forum: API Rate Limiting](https://discuss.gnomad.broadinstitute.org/t/blocked-when-using-api-to-get-af/149) - Rate limiting and query examples
- [Biostars: Population Allele Frequency](https://www.biostars.org/p/9610668/) - Population-level query structure

**Vue 3 GraphQL Clients:**
- [Villus GraphQL Client](https://villus.logaretm.com/guide/overview/) - Lightweight Vue 3 GraphQL client
- [URQL Vue Bindings](https://github.com/urql-graphql/urql/blob/main/docs/basics/vue.md) - Alternative GraphQL client

**State Management:**
- [Composables vs Pinia](https://iamjeremie.me/post/2025-01/composables-vs-pinia-vs-provide-inject/) - Decision framework
- [Managing API Layers in Vue.js](https://dev.to/blindkai/managing-api-layers-in-vue-js-with-typescript-hno) - Service layer patterns

**Wizard State Machines:**
- [Managing Multi-Step Forms with XState](https://mayashavin.com/articles/manage-multi-step-forms-vue-xstate) - State machine approach
- [VeeValidate Multi-step Form](https://vee-validate.logaretm.com/v4/examples/multistep-form-wizard/) - Form wizard pattern
