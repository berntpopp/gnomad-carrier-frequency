<template>
  <v-row dense class="filter-calc-section">
    <!-- HWE Formula switch -->
    <v-col cols="12" md="6">
      <v-tooltip location="top">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" class="d-flex align-center">
            <v-switch
              :model-value="calcConfig.useHWEFormula"
              color="primary"
              label="HWE Formula (2pq)"
              :density="smAndDown ? 'default' : 'compact'"
              hide-details
              @update:model-value="
                emit('updateCalcConfig', 'useHWEFormula', $event)
              "
            />
          </div>
        </template>
        <span class="tooltip-text">
          <strong>Hardy-Weinberg Equilibrium</strong>
          — currently {{ calcConfig.useHWEFormula ? "2pq" : "2×SumAF" }}<br />
          When enabled, carrier frequency is calculated as 2pq (standard
          epidemiological approach). When disabled, the simplified formula
          2×SumAF is used.
        </span>
      </v-tooltip>
    </v-col>

    <!-- Homozygote Exclusion switch -->
    <v-col cols="12" md="6">
      <v-tooltip location="top">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" class="d-flex align-center">
            <v-switch
              :model-value="calcConfig.useHomExclusion"
              color="primary"
              label="Homozygote Exclusion"
              :density="smAndDown ? 'default' : 'compact'"
              hide-details
              @update:model-value="
                emit('updateCalcConfig', 'useHomExclusion', $event)
              "
            />
          </div>
        </template>
        <span class="tooltip-text">
          <strong>Homozygote Exclusion (VCR/GCR)</strong>
          — currently {{ calcConfig.useHomExclusion ? "enabled" : "disabled"
          }}<br />
          When enabled, uses Variant Carrier Rate per variant and Gene Carrier
          Rate aggregation. This accounts for observed homozygotes and avoids
          double-counting.
        </span>
      </v-tooltip>
    </v-col>

    <!-- Penetrance slider -->
    <v-col cols="12" md="6">
      <v-tooltip location="top">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" class="d-flex align-start">
            <v-slider
              :model-value="penetrancePercent"
              :min="0"
              :max="100"
              :step="1"
              :ticks="smAndDown ? undefined : penetranceTickLabels"
              :show-ticks="showTickLabels"
              tick-size="4"
              label="Penetrance %"
              :density="smAndDown ? 'default' : 'compact'"
              thumb-label
              color="primary"
              class="flex-grow-1"
              @update:model-value="updatePenetrance($event)"
            />
          </div>
        </template>
        <span class="tooltip-text">
          <strong>Penetrance</strong>
          — currently {{ penetrancePercent }}%<br />
          Proportion of individuals with the disease genotype who express the
          phenotype. Most classic AR conditions are 100%. Reducing penetrance
          scales Bayesian prevalence accordingly.
        </span>
      </v-tooltip>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDisplay } from "vuetify";
import type { CalcConfig } from "@gnomad-cf/core/types";

const props = defineProps<{
  calcConfig: CalcConfig;
}>();

const emit = defineEmits<{
  updateCalcConfig: [
    key: keyof CalcConfig,
    value: CalcConfig[keyof CalcConfig],
  ];
}>();

const { smAndDown } = useDisplay();

const penetranceTickLabels = {
  0: "0%",
  50: "50%",
  100: "100%",
};

const penetrancePercent = computed(() =>
  Math.round(props.calcConfig.penetrance * 100),
);
const showTickLabels = computed((): boolean | "always" =>
  smAndDown.value ? false : "always",
);

function updatePenetrance(percentValue: number) {
  emit("updateCalcConfig", "penetrance", percentValue / 100);
}
</script>

<style scoped>
.tooltip-text {
  max-width: 280px;
  display: inline-block;
}
</style>
