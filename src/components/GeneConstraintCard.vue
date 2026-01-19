<template>
  <v-card
    v-if="constraint || loading"
    variant="outlined"
    class="mt-4"
  >
    <v-card-title class="text-subtitle-1 d-flex align-center">
      <v-icon
        start
        size="small"
      >
        mdi-dna
      </v-icon>
      Gene Constraint
      <v-tooltip location="top">
        <template #activator="{ props: tooltipProps }">
          <v-icon
            v-bind="tooltipProps"
            size="x-small"
            class="ml-1"
            aria-label="Gene constraint information"
          >
            mdi-information-outline
          </v-icon>
        </template>
        <span>
          Constraint metrics indicate how tolerant a gene is to loss-of-function
          variants. Lower LOEUF values suggest the gene is more constrained
          (intolerant to LoF).
        </span>
      </v-tooltip>
    </v-card-title>

    <v-card-text>
      <v-skeleton-loader
        v-if="loading"
        type="text, text"
      />

      <template v-else-if="constraint">
        <div class="d-flex flex-wrap ga-4">
          <!-- LOEUF (primary metric) -->
          <div class="constraint-metric">
            <div class="text-caption text-medium-emphasis">
              LOEUF
            </div>
            <div class="d-flex align-center">
              <v-chip
                :color="loeufInterpretation.color"
                size="small"
                variant="tonal"
              >
                {{
                  constraint.loeuf !== null
                    ? constraint.loeuf.toFixed(2)
                    : 'N/A'
                }}
              </v-chip>
              <span class="text-caption ml-2">{{
                loeufInterpretation.label
              }}</span>
            </div>
          </div>

          <!-- pLI (secondary metric) -->
          <div class="constraint-metric">
            <div class="text-caption text-medium-emphasis">
              pLI
            </div>
            <div class="d-flex align-center">
              <v-chip
                :color="pliInterpretation.color"
                size="small"
                variant="tonal"
              >
                {{
                  constraint.pLI !== null ? constraint.pLI.toFixed(2) : 'N/A'
                }}
              </v-chip>
              <span class="text-caption ml-2">{{ pliInterpretation.label }}</span>
            </div>
          </div>

          <!-- O/E Ratio -->
          <div
            v-if="constraint.oeLof !== null"
            class="constraint-metric"
          >
            <div class="text-caption text-medium-emphasis">
              O/E LoF
            </div>
            <div class="text-body-2">
              {{ constraint.oeLof.toFixed(2) }}
              <span
                v-if="constraint.oeLofLower !== null"
                class="text-medium-emphasis"
              >
                ({{ constraint.oeLofLower.toFixed(2) }} -
                {{ constraint.loeuf?.toFixed(2) }})
              </span>
            </div>
          </div>

          <!-- Observed/Expected counts -->
          <div
            v-if="constraint.obsLof !== null && constraint.expLof !== null"
            class="constraint-metric"
          >
            <div class="text-caption text-medium-emphasis">
              LoF Variants
            </div>
            <div class="text-body-2">
              {{ constraint.obsLof }} observed /
              {{ constraint.expLof?.toFixed(1) }} expected
            </div>
          </div>
        </div>

        <!-- Quality flags warning -->
        <v-alert
          v-if="constraint.flags && constraint.flags.length > 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          <div class="text-caption">
            Quality flags: {{ constraint.flags.join(', ') }}
          </div>
        </v-alert>
      </template>

      <div
        v-else
        class="text-medium-emphasis text-body-2"
      >
        No constraint data available for this gene.
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GeneConstraint } from '@/types';
import { getLoeufInterpretation, getPliInterpretation } from '@/types';

const props = defineProps<{
  constraint: GeneConstraint | null;
  loading?: boolean;
  gnomadVersion?: string;
}>();

const loeufInterpretation = computed(() =>
  getLoeufInterpretation(props.constraint?.loeuf ?? null, props.gnomadVersion ?? '4.1')
);

const pliInterpretation = computed(() =>
  getPliInterpretation(props.constraint?.pLI ?? null)
);
</script>

<style scoped>
.constraint-metric {
  min-width: 120px;
}
</style>
