<template>
  <div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Flag variants that may need review. Flagged variants can be excluded
      per-analysis in the filter panel.
    </p>

    <!-- Card 1: High AF (BA1) -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon start size="small" color="error">mdi-alert-circle</v-icon>
        High Allele Frequency (BA1)
      </v-card-title>
      <v-card-text>
        <v-switch
          v-model="qualityStore.defaults.highAfEnabled"
          color="error"
          label="Flag variants exceeding AF threshold"
          density="compact"
          hide-details
          class="mb-3"
        />
        <v-slider
          v-model="highAfPercent"
          :disabled="!qualityStore.defaults.highAfEnabled"
          :min="1"
          :max="20"
          :step="0.5"
          label="AF Threshold %"
          thumb-label
          color="error"
          density="compact"
        >
          <template #append>
            <span class="text-body-2">{{ highAfPercent }}%</span>
          </template>
        </v-slider>
        <div class="text-caption text-medium-emphasis">
          ACMG BA1: Variants with allele frequency above this threshold in any
          population may be too common for a rare recessive disease.
        </div>
      </v-card-text>
    </v-card>

    <!-- Card 2: High Homozygote Count -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon start size="small" color="orange">mdi-alert</v-icon>
        High Homozygote Count
      </v-card-title>
      <v-card-text>
        <v-switch
          v-model="qualityStore.defaults.highHomEnabled"
          color="orange"
          label="Flag variants with unexpectedly high homozygotes"
          density="compact"
          hide-details
          class="mb-3"
        />
        <v-btn-toggle
          v-model="qualityStore.defaults.highHomMethod"
          :disabled="!qualityStore.defaults.highHomEnabled"
          mandatory
          density="compact"
          color="orange"
          variant="outlined"
          class="mb-3"
        >
          <v-btn value="hwe_relative" size="small">HWE-Relative</v-btn>
          <v-btn value="absolute" size="small">Absolute</v-btn>
        </v-btn-toggle>

        <!-- HWE-relative multiplier -->
        <v-slider
          v-if="qualityStore.defaults.highHomMethod === 'hwe_relative'"
          v-model="qualityStore.defaults.highHomHWEMultiplier"
          :disabled="!qualityStore.defaults.highHomEnabled"
          :min="2"
          :max="20"
          :step="1"
          label="HWE Multiplier"
          thumb-label
          color="orange"
          density="compact"
        >
          <template #append>
            <span class="text-body-2">
              {{ qualityStore.defaults.highHomHWEMultiplier }}x
            </span>
          </template>
        </v-slider>

        <!-- Absolute threshold -->
        <v-slider
          v-else
          v-model="qualityStore.defaults.highHomAbsoluteThreshold"
          :disabled="!qualityStore.defaults.highHomEnabled"
          :min="1"
          :max="50"
          :step="1"
          label="Max Homozygotes"
          thumb-label
          color="orange"
          density="compact"
        >
          <template #append>
            <span class="text-body-2">
              {{ qualityStore.defaults.highHomAbsoluteThreshold }}
            </span>
          </template>
        </v-slider>

        <div class="text-caption text-medium-emphasis">
          Flag when observed homozygotes exceed expected count. HWE-Relative
          flags if observed > multiplier x HWE-expected (AF^2 x AN).
        </div>
      </v-card-text>
    </v-card>

    <!-- Card 3: gnomAD Filtered -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon start size="small" color="amber">mdi-filter-remove</v-icon>
        gnomAD Quality Filters
      </v-card-title>
      <v-card-text>
        <v-switch
          v-model="qualityStore.defaults.gnomadFilteredEnabled"
          color="amber"
          label="Flag variants that failed gnomAD QC filters"
          density="compact"
          hide-details
        />
        <div class="text-caption text-medium-emphasis mt-2">
          Variants flagged by gnomAD's internal quality filters (e.g., random
          forest, allele balance, inbreeding coefficient) may have lower
          reliability.
        </div>
      </v-card-text>
    </v-card>

    <!-- Card 4: Genomes Only -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-subtitle-1">
        <v-icon start size="small" color="blue-grey">mdi-dna</v-icon>
        Genomes Only
      </v-card-title>
      <v-card-text>
        <v-switch
          v-model="qualityStore.defaults.genomesOnlyEnabled"
          color="blue-grey"
          label="Flag variants observed only in genome data"
          density="compact"
          hide-details
        />
        <div class="text-caption text-medium-emphasis mt-2">
          Variants without exome coverage may have different quality
          characteristics compared to exome-sequenced variants.
        </div>
      </v-card-text>
    </v-card>

    <v-divider class="my-4" />
    <v-btn
      variant="outlined"
      color="warning"
      size="small"
      prepend-icon="mdi-restore"
      @click="qualityStore.resetToFactoryDefaults()"
    >
      Reset to Factory Defaults
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useQualityStore } from "@/stores/useQualityStore";

const qualityStore = useQualityStore();

const highAfPercent = computed({
  get: () => qualityStore.defaults.highAfThreshold * 100,
  set: (v: number) => qualityStore.setDefaults({ highAfThreshold: v / 100 }),
});
</script>
