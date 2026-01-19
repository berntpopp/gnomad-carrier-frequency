# Phase 2: Wizard UI - Research

**Researched:** 2026-01-19
**Domain:** Vuetify 3 Stepper, Form Validation, Data Tables
**Confidence:** MEDIUM

## Summary

This phase implements a 4-step wizard flow (Gene -> Status -> Frequency -> Results) using Vuetify 3 components. The existing codebase already has Phase 1 complete with working composables (`useCarrierFrequency`, `useGeneSearch`, `useGeneVariants`) and components (`GeneSearch`, `FrequencyResults`).

The standard approach uses Vuetify 3's `v-stepper` component with `v-stepper-header`, `v-stepper-item`, `v-stepper-window`, and `v-stepper-window-item` for content panels. Linear navigation (user decision) means steps must be completed sequentially. Form validation uses Vuetify's built-in `rules` prop on input components with inline error display.

**Primary recommendation:** Use Vuetify 3's native stepper with linear mode (no `non-linear` prop), v-switch for status toggle, v-tabs + v-window for frequency source selection, and v-data-table for sortable results.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vuetify | ^3.8.1 | UI component framework | Already in project, provides stepper, tabs, data-table, form validation |
| vue | ^3.5.24 | Reactive framework | Already in project |
| @vueuse/core | ^12.7.0 | Vue composition utilities | Already in project, provides useDebounceFn |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | All required components available in Vuetify 3 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vuetify v-stepper | form-wizard-vue3 | External dependency, less integrated with Vuetify theme |
| Vuetify rules | Vuelidate | More powerful validation but adds dependency, Vuetify rules sufficient for this use case |
| v-data-table | v-table | v-table is simpler but lacks built-in sorting; v-data-table provides sortable columns out of box |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── wizard/                    # Wizard-specific components
│   │   ├── WizardStepper.vue      # Main stepper container
│   │   ├── StepGene.vue           # Step 1: Gene selection
│   │   ├── StepStatus.vue         # Step 2: Index patient status
│   │   ├── StepFrequency.vue      # Step 3: Frequency source
│   │   └── StepResults.vue        # Step 4: Results table
│   ├── GeneSearch.vue             # Existing - reuse
│   ├── FrequencyResults.vue       # Existing - refactor for sortable table
│   └── VersionSelector.vue        # Existing - reuse
├── composables/
│   ├── useWizard.ts               # Wizard state management
│   ├── useCarrierFrequency.ts     # Existing - already has calculateRisk
│   └── ...                        # Existing composables
└── types/
    └── wizard.ts                  # Wizard-specific types
```

### Pattern 1: Vuetify 3 Stepper Structure
**What:** v-stepper with header items and window content panels
**When to use:** Multi-step forms with distinct content per step
**Example:**
```typescript
// Source: Vuetify GitHub examples + official API docs
<template>
  <v-stepper v-model="currentStep">
    <v-stepper-header>
      <v-stepper-item
        :complete="currentStep > 1"
        title="Gene"
        value="1"
      />
      <v-divider />
      <v-stepper-item
        :complete="currentStep > 2"
        title="Status"
        value="2"
      />
      <v-divider />
      <v-stepper-item
        :complete="currentStep > 3"
        title="Frequency"
        value="3"
      />
      <v-divider />
      <v-stepper-item
        title="Results"
        value="4"
      />
    </v-stepper-header>

    <v-stepper-window>
      <v-stepper-window-item value="1">
        <StepGene @complete="nextStep" />
      </v-stepper-window-item>
      <v-stepper-window-item value="2">
        <StepStatus @complete="nextStep" @back="prevStep" />
      </v-stepper-window-item>
      <!-- ... more steps -->
    </v-stepper-window>
  </v-stepper>
</template>
```

### Pattern 2: Linear Navigation with Validation
**What:** Disabled forward navigation until current step is valid
**When to use:** When steps must be completed in order (user decision: linear only)
**Example:**
```typescript
// Source: Vuetify form validation docs
const step1Valid = computed(() => !!selectedGene.value);
const step2Valid = computed(() => !!indexStatus.value);
const step3Valid = computed(() => !!frequencySource.value);

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1: return step1Valid.value;
    case 2: return step2Valid.value;
    case 3: return step3Valid.value;
    default: return false;
  }
});

// Next button
<v-btn :disabled="!canProceed" @click="nextStep">Continue</v-btn>
```

### Pattern 3: Tabs for Frequency Source Selection
**What:** v-tabs with v-window for tab content (not v-tabs-items which is Vuetify 2)
**When to use:** Mutually exclusive options with different input forms
**Example:**
```typescript
// Source: Vuetify 3 tabs docs - v-tabs-items replaced with v-window
<template>
  <v-tabs v-model="sourceTab">
    <v-tab value="gnomad">gnomAD</v-tab>
    <v-tab value="literature">Literature</v-tab>
    <v-tab value="default">Default</v-tab>
  </v-tabs>

  <v-window v-model="sourceTab">
    <v-window-item value="gnomad">
      <!-- gnomAD frequency content -->
    </v-window-item>
    <v-window-item value="literature">
      <!-- Literature input: frequency + PMID -->
    </v-window-item>
    <v-window-item value="default">
      <!-- Default value display -->
    </v-window-item>
  </v-window>
</template>
```

### Pattern 4: v-switch for Status Toggle
**What:** Binary toggle between heterozygous and compound het/homozygous
**When to use:** Two mutually exclusive options (user decision: simple toggle)
**Example:**
```typescript
// Source: Vuetify switch docs
<template>
  <v-switch
    v-model="isAffected"
    :label="isAffected ? 'Affected (compound het/homozygous)' : 'Carrier (heterozygous)'"
    color="primary"
  />
  <v-btn icon="mdi-help-circle-outline" variant="text" @click="showHelp = true" />
</template>

<script setup>
const isAffected = ref(false); // Default: carrier (user decision)
const indexStatus = computed<IndexPatientStatus>(() =>
  isAffected.value ? 'compound_het_homozygous' : 'heterozygous'
);
</script>
```

### Pattern 5: Sortable Data Table with Row Highlighting
**What:** v-data-table with headers config, custom row classes, and sorting
**When to use:** Tabular data with user-sortable columns (user decision: sortable)
**Example:**
```typescript
// Source: Vuetify data table docs
<template>
  <v-data-table
    :items="populations"
    :headers="headers"
    :item-class="getRowClass"
    density="compact"
  >
    <template #item.isFounderEffect="{ item }">
      <v-icon v-if="item.isFounderEffect" color="info" size="small">
        mdi-star
      </v-icon>
    </template>
  </v-data-table>
</template>

<script setup>
const headers = [
  { title: 'Population', key: 'label', sortable: true },
  { title: 'Carrier Freq (%)', key: 'carrierFrequencyPercent', sortable: true },
  { title: 'Carrier Freq (ratio)', key: 'carrierFrequencyRatio', sortable: true },
  { title: 'Recurrence Risk', key: 'recurrenceRisk', sortable: true },
  { title: 'Variant Count', key: 'variantCount', sortable: true },
  { title: 'Allele Count', key: 'alleleCount', sortable: true },
  { title: 'Sample Size', key: 'alleleNumber', sortable: true },
];

const getRowClass = (item: PopulationFrequency) =>
  item.isFounderEffect ? 'bg-blue-lighten-5' : '';
</script>
```

### Pattern 6: Wizard State Management with Composable
**What:** Centralized wizard state in composable with step reset on value changes
**When to use:** Multi-step forms needing coordinated state (user decision: reset downstream on change)
**Example:**
```typescript
// useWizard.ts
export interface WizardState {
  currentStep: number;
  gene: GeneSearchResult | null;
  indexStatus: IndexPatientStatus;
  frequencySource: FrequencySource;
  literatureFrequency: number | null;
  literaturePmid: string | null;
}

export function useWizard() {
  const state = reactive<WizardState>({
    currentStep: 1,
    gene: null,
    indexStatus: 'heterozygous',
    frequencySource: 'gnomad',
    literatureFrequency: null,
    literaturePmid: null,
  });

  // Reset downstream when gene changes
  watch(() => state.gene, () => {
    if (state.currentStep > 1) {
      state.currentStep = 1;
      state.indexStatus = 'heterozygous';
      state.frequencySource = 'gnomad';
      state.literatureFrequency = null;
      state.literaturePmid = null;
    }
  });

  return { state, nextStep, prevStep, resetWizard };
}
```

### Anti-Patterns to Avoid
- **Using v-tabs-items (Vuetify 2):** In Vuetify 3, use v-window + v-window-item instead
- **Non-linear stepper for linear flow:** Do not add `non-linear` prop when steps must be sequential
- **item-class prop on v-data-table:** This was removed in Vuetify 3; use row-props instead or custom slots
- **Direct step manipulation:** Don't let users click ahead; disable via computed validation state
- **Hardcoding step numbers:** Use named values ('gene', 'status', etc.) instead of numbers for clarity

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-step wizard | Custom div transitions | v-stepper | Built-in accessibility, animations, mobile support |
| Form validation | Manual error tracking | Vuetify rules prop | Consistent error display, reactive validation |
| Sortable tables | Custom sort + render | v-data-table | Built-in sort icons, accessibility, performance |
| Tab switching | Custom v-if toggles | v-tabs + v-window | Proper animation, keyboard navigation |
| Toggle switch | Radio buttons | v-switch | Material Design UX, compact, accessible |
| Help tooltips | Custom popover | v-tooltip or v-dialog | Accessible, positions correctly |

**Key insight:** Vuetify 3 provides all necessary wizard primitives. The complexity is in state coordination between steps, not in building components.

## Common Pitfalls

### Pitfall 1: Vuetify 3 Stepper API Changes
**What goes wrong:** Code written for Vuetify 2 uses deprecated components
**Why it happens:** Many tutorials and examples online are for Vuetify 2
**How to avoid:** Use Vuetify 3 component names:
- v-stepper-step -> v-stepper-item
- v-stepper-content -> v-stepper-window-item
- v-stepper-items -> v-stepper-window
**Warning signs:** Import errors, components not rendering

### Pitfall 2: v-data-table item-class Removed
**What goes wrong:** Row highlighting doesn't work with item-class prop
**Why it happens:** Vuetify 3 removed item-class prop from v-data-table
**How to avoid:** Use `row-props` function or custom `item` slot:
```typescript
<v-data-table :row-props="getRowProps">
// or
<template #item="{ item, props }">
  <tr v-bind="props" :class="getRowClass(item)">
```
**Warning signs:** GitHub issues mention this frequently

### Pitfall 3: Tabs Content Not Showing
**What goes wrong:** Tab content doesn't appear when switching tabs
**Why it happens:** Using v-tabs-items (Vuetify 2) instead of v-window (Vuetify 3)
**How to avoid:** Use v-window + v-window-item bound to same v-model as v-tabs
**Warning signs:** Tabs highlight but content area is empty

### Pitfall 4: Stepper Scrolls to Top on Step Change
**What goes wrong:** Page jumps to top when clicking Next/Previous
**Why it happens:** Known bug in Vuetify 3.7.3 with Next button
**How to avoid:** If issue occurs, add manual scroll position preservation or update Vuetify
**Warning signs:** Jarring scroll behavior on wizard navigation

### Pitfall 5: Validation Timing Issues
**What goes wrong:** Errors show immediately on mount or not at all
**Why it happens:** Rules validate on mount by default; or rules array changes don't trigger revalidation
**How to avoid:** Use `validate-on="blur"` or `validate-on="submit"` props; for dynamic rules, manually call validate()
**Warning signs:** Error messages appear before user interacts with field

### Pitfall 6: Global Frequency Row in Table
**What goes wrong:** Global frequency shown twice (summary + table) with inconsistent data
**Why it happens:** User decision requires both, but they pull from different sources
**How to avoid:** Compute global row from same source as summary card; add clear visual distinction
**Warning signs:** Numbers don't match between summary and table row

## Code Examples

Verified patterns from official sources:

### Vuetify 3 Stepper with Window (Complete Structure)
```typescript
// Source: Vuetify GitHub examples
<template>
  <v-stepper v-model="step" flat>
    <v-stepper-header>
      <v-stepper-item
        :complete="step > 1"
        :value="1"
        title="Gene Selection"
        subtitle="Search and select"
      />
      <v-divider />
      <v-stepper-item
        :complete="step > 2"
        :value="2"
        title="Patient Status"
        subtitle="Carrier or affected"
      />
      <v-divider />
      <v-stepper-item
        :complete="step > 3"
        :value="3"
        title="Frequency Source"
        subtitle="gnomAD, literature, or default"
      />
      <v-divider />
      <v-stepper-item
        :value="4"
        title="Results"
        subtitle="View calculations"
      />
    </v-stepper-header>

    <v-stepper-window>
      <v-stepper-window-item :value="1">
        <!-- Step 1 content -->
      </v-stepper-window-item>
      <v-stepper-window-item :value="2">
        <!-- Step 2 content -->
      </v-stepper-window-item>
      <v-stepper-window-item :value="3">
        <!-- Step 3 content -->
      </v-stepper-window-item>
      <v-stepper-window-item :value="4">
        <!-- Step 4 content -->
      </v-stepper-window-item>
    </v-stepper-window>

    <!-- Custom actions (not using v-stepper-actions for more control) -->
    <v-card-actions>
      <v-btn v-if="step > 1" variant="text" @click="step--">Back</v-btn>
      <v-spacer />
      <v-btn
        v-if="step < 4"
        :disabled="!canProceed"
        color="primary"
        @click="step++"
      >
        Continue
      </v-btn>
    </v-card-actions>
  </v-stepper>
</template>
```

### v-switch with Custom Labels
```typescript
// Source: Vuetify switch docs
<template>
  <div class="d-flex align-center">
    <span :class="{ 'text-medium-emphasis': isAffected }">
      Carrier (heterozygous)
    </span>
    <v-switch
      v-model="isAffected"
      class="mx-4"
      color="primary"
      hide-details
      inset
    />
    <span :class="{ 'text-medium-emphasis': !isAffected }">
      Affected (compound het/homozygous)
    </span>
    <v-tooltip location="top">
      <template #activator="{ props }">
        <v-icon v-bind="props" class="ml-2" size="small">
          mdi-help-circle-outline
        </v-icon>
      </template>
      <span>Select based on index patient's genetic status</span>
    </v-tooltip>
  </div>
</template>
```

### v-tabs with v-window (Vuetify 3 Pattern)
```typescript
// Source: Vuetify 3 tabs + window docs
<template>
  <v-card>
    <v-tabs v-model="tab" bg-color="primary">
      <v-tab value="gnomad">gnomAD</v-tab>
      <v-tab value="literature">Literature</v-tab>
      <v-tab value="default">Default</v-tab>
    </v-tabs>

    <v-card-text>
      <v-window v-model="tab">
        <v-window-item value="gnomad">
          <p>Using gnomAD-calculated carrier frequency: {{ globalFrequency }}</p>
          <v-btn color="primary" @click="confirmGnomad">Use This Value</v-btn>
        </v-window-item>

        <v-window-item value="literature">
          <v-text-field
            v-model="literatureFreq"
            label="Carrier Frequency"
            hint="Enter as decimal (e.g., 0.01 for 1:100)"
            :rules="[rules.required, rules.validFrequency]"
          />
          <v-text-field
            v-model="pmid"
            label="PMID"
            :rules="[rules.required, rules.validPmid]"
          />
        </v-window-item>

        <v-window-item value="default">
          <v-alert type="info" variant="tonal">
            Using default carrier frequency assumption: 1:100 (0.01)
          </v-alert>
          <p class="text-body-2 mt-2">
            Use when no gene-specific data available or as conservative estimate.
          </p>
        </v-window-item>
      </v-window>
    </v-card-text>
  </v-card>
</template>
```

### v-data-table with Sortable Headers and Row Highlighting
```typescript
// Source: Vuetify data table docs + GitHub discussions
<template>
  <v-data-table
    :items="tableItems"
    :headers="headers"
    :sort-by="[{ key: 'carrierFrequency', order: 'desc' }]"
    density="compact"
    items-per-page="-1"
    hide-default-footer
  >
    <template #item="{ item }">
      <tr :class="getRowClass(item)">
        <td>{{ item.label }}</td>
        <td class="text-right">{{ formatPercent(item.carrierFrequency) }}</td>
        <td class="text-right">{{ formatRatio(item.carrierFrequency) }}</td>
        <td class="text-right">{{ item.recurrenceRisk }}</td>
        <td class="text-right">{{ item.variantCount }}</td>
        <td class="text-right">{{ item.alleleCount }}</td>
        <td class="text-right">{{ item.alleleNumber.toLocaleString() }}</td>
        <td>
          <v-chip v-if="item.isFounderEffect" color="info" size="x-small">
            <v-icon start size="x-small">mdi-star</v-icon>
            Founder
          </v-chip>
        </td>
      </tr>
    </template>
  </v-data-table>
</template>

<script setup>
const headers = ref([
  { title: 'Population', key: 'label', sortable: true },
  { title: 'Carrier Freq (%)', key: 'carrierFrequency', sortable: true, align: 'end' },
  { title: 'Ratio', key: 'ratio', sortable: false, align: 'end' },
  { title: 'Recurrence Risk', key: 'recurrenceRisk', sortable: true, align: 'end' },
  { title: 'Variants', key: 'variantCount', sortable: true, align: 'end' },
  { title: 'AC', key: 'alleleCount', sortable: true, align: 'end' },
  { title: 'AN', key: 'alleleNumber', sortable: true, align: 'end' },
  { title: 'Notes', key: 'notes', sortable: false },
]);

const getRowClass = (item: TableRow) => {
  if (item.isGlobal) return 'bg-grey-lighten-4 font-weight-bold';
  if (item.isFounderEffect) return 'bg-blue-lighten-5';
  return '';
};
</script>
```

### Vuetify Form Validation with Rules
```typescript
// Source: Vuetify form validation docs
<template>
  <v-form ref="form" v-model="valid">
    <v-text-field
      v-model="frequency"
      label="Carrier Frequency"
      :rules="frequencyRules"
      validate-on="blur"
    />
    <v-text-field
      v-model="pmid"
      label="PMID"
      :rules="pmidRules"
      validate-on="blur"
    />
  </v-form>
</template>

<script setup>
const valid = ref(false);
const form = ref<VForm | null>(null);

const frequencyRules = [
  (v: string) => !!v || 'Frequency is required',
  (v: string) => !isNaN(parseFloat(v)) || 'Must be a number',
  (v: string) => {
    const num = parseFloat(v);
    return (num > 0 && num <= 1) || 'Must be between 0 and 1';
  },
];

const pmidRules = [
  (v: string) => !!v || 'PMID is required',
  (v: string) => /^\d+$/.test(v) || 'PMID must be numeric',
];

// Manual validation trigger if needed
const validateAndProceed = async () => {
  const { valid } = await form.value!.validate();
  if (valid) {
    // proceed
  }
};
</script>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v-stepper-step | v-stepper-item | Vuetify 3.0 | Component renamed, API similar |
| v-stepper-content | v-stepper-window-item | Vuetify 3.0 | Component renamed |
| v-tabs-items | v-window | Vuetify 3.0 | Separate component for tab content |
| item-class prop | row-props or custom slot | Vuetify 3.0 | Row styling approach changed |
| Vuex | Pinia or reactive() | Vue 3 | Simpler state management |
| Options API | Composition API | Vue 3 | Used throughout existing codebase |

**Deprecated/outdated:**
- v-stepper-step, v-stepper-content, v-stepper-items: Use v-stepper-item, v-stepper-window, v-stepper-window-item
- v-tabs-items: Use v-window + v-window-item
- item-class on v-data-table: Use row-props function or item slot

## Open Questions

Things that couldn't be fully resolved:

1. **Exact gnomAD tab interaction flow**
   - What we know: User decides Claude has discretion on whether auto-populated or confirm-to-use
   - What's unclear: Should user click "Use gnomAD value" button, or is it auto-selected when tab is active?
   - Recommendation: Auto-populate but require explicit "Confirm" button click before proceeding (provides user control)

2. **v-stepper-actions vs custom buttons**
   - What we know: v-stepper-actions provides built-in prev/next buttons with props for text customization
   - What's unclear: Whether built-in actions provide enough control for validation-gated navigation
   - Recommendation: Use custom v-card-actions for full control over disabled state and styling

3. **Table column: Variant Count**
   - What we know: User requested "Variant Count" column in results table
   - What's unclear: Is this per-population variant count or global qualifying variant count?
   - Recommendation: Display per-population variant count if available, or global count with clarifying note

## Sources

### Primary (HIGH confidence)
- [Vuetify GitHub - prop-non-linear.vue](https://github.com/vuetifyjs/vuetify/blob/master/packages/docs/src/examples/v-stepper/prop-non-linear.vue) - Official stepper examples
- [Vuetify GitHub - misc-editable.vue](https://github.com/vuetifyjs/vuetify/blob/master/packages/docs/src/examples/v-stepper/misc-editable.vue) - Editable stepper example
- Existing codebase analysis - useCarrierFrequency.ts, FrequencyResults.vue, types

### Secondary (MEDIUM confidence)
- [Vuetify Stepper Documentation](https://vuetifyjs.com/en/components/steppers/) - Component overview
- [Vuetify Tabs Documentation](https://vuetifyjs.com/en/components/tabs/) - Tabs + v-window pattern
- [Vuetify Data Tables Documentation](https://vuetifyjs.com/en/components/data-tables/basics/) - Sortable tables
- [Vuetify Switch Documentation](https://vuetifyjs.com/en/components/switches/) - v-switch component
- [Vuetify Form Documentation](https://vuetifyjs.com/en/components/forms/) - Validation rules
- [DBI Services - Dynamic Slots in Vuetify Data Table](https://www.dbi-services.com/blog/how-to-use-dynamic-slots-in-vue-js-with-vuetify-data-table/) - Custom column rendering

### Tertiary (LOW confidence)
- [GitHub Issue #18842](https://github.com/vuetifyjs/vuetify/issues/18842) - Vertical stepper not in Vuetify 3
- [GitHub Issue #16991](https://github.com/vuetifyjs/vuetify/issues/16991) - item-class removed from v-data-table
- [GitHub Issue #18517](https://github.com/vuetifyjs/vuetify/issues/18517) - VStepper slots documentation unclear
- WebSearch results - Community patterns, blog posts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed and used in Phase 1
- Architecture (stepper structure): MEDIUM - Vuetify 3 docs sparse, verified via GitHub examples
- Architecture (tabs/switch): MEDIUM - WebSearch verified with official docs
- Pitfalls: MEDIUM - GitHub issues document real problems
- Code examples: MEDIUM - Synthesized from multiple official sources

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - Vuetify 3 is stable)
