<template>
  <v-card variant="outlined" class="mb-6" data-testid="results-summary-card">
    <v-card-title
      class="d-flex align-center justify-space-between flex-wrap pb-0"
    >
      <span class="d-flex align-center">
        <span class="text-h6">
          <em>{{ result.gene }}</em>
          <span
            v-if="canonicalTranscript"
            class="text-body-2 text-medium-emphasis font-weight-regular"
          >
            ({{ canonicalTranscript }})
          </span>
        </span>

        <!-- Per-gene refresh button -->
        <v-btn
          icon
          variant="text"
          :loading="isLoading"
          title="Re-fetch variant data from gnomAD"
          aria-label="Re-fetch variant data from gnomAD"
          data-testid="refetch-btn"
          class="refetch-btn"
          @click="$emit('refetch')"
        >
          <v-icon size="small">mdi-refresh</v-icon>
        </v-btn>

        <!-- Cache status badge -->
        <v-chip
          v-if="cacheStatus === 'hit'"
          size="x-small"
          variant="tonal"
          color="blue-grey"
          class="ml-2"
        >
          Cached
        </v-chip>
      </span>
      <div class="d-flex align-center ga-2">
        <v-chip :color="sourceChipColor" size="small">
          {{ sourceAttribution }}
        </v-chip>
        <v-chip
          v-if="!useHWEFormula"
          color="warning"
          size="small"
          prepend-icon="mdi-alert"
        >
          Simplified formula
        </v-chip>
      </div>
    </v-card-title>

    <v-card-text class="pt-4">
      <!-- Processing status -->
      <div
        v-if="processingStatus"
        class="text-body-2 text-medium-emphasis mt-1"
      >
        {{ processingStatus }}
      </div>

      <!-- All-excluded warning -->
      <v-alert
        v-if="qualifyingVariantCount === 0 && excludedCount > 0"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        All {{ excludedCount }} qualifying variant(s) have been manually
        excluded. Carrier frequency cannot be calculated. Open the variant table
        to restore variants.
        <template #append>
          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-table"
            @click="$emit('openAllVariants')"
          >
            Open variant table
          </v-btn>
        </template>
      </v-alert>

      <!-- Primary metrics grid -->
      <v-row dense class="metric-grid">
        <!-- Carrier Frequency — hero stat -->
        <v-col cols="12" sm="4">
          <div class="stat-card stat-card--hero">
            <v-tooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps" class="stat-label">
                  Carrier Frequency
                  <span class="formula-badge">2pq</span>
                </div>
              </template>
              <span class="tooltip-text">
                <strong>Carrier Frequency (2pq)</strong><br />
                Proportion of individuals carrying one copy of a pathogenic
                variant. Calculated as ~2 &times; sum of pathogenic allele
                frequencies.
              </span>
            </v-tooltip>
            <div class="stat-value text-h5 text-primary">
              {{ summaryPrimary }}
            </div>
            <div class="stat-detail">
              {{ summaryDetail }}
            </div>
          </div>
        </v-col>

        <!-- Recurrence Risk -->
        <v-col cols="6" sm="4">
          <div class="stat-card">
            <v-tooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps" class="stat-label">
                  Recurrence Risk
                  <span class="formula-badge">
                    &times;
                    {{ indexStatus === "heterozygous" ? "0.25" : "0.5" }}
                  </span>
                </div>
              </template>
              <span class="tooltip-text">
                <strong>Recurrence Risk</strong><br />
                Carrier: risk offspring inherits both a parental and a
                population variant (freq &times; 0.25 &times; penetrance).<br />
                Affected: risk offspring is affected (freq &times; 0.5 &times;
                penetrance).
              </span>
            </v-tooltip>
            <div class="stat-value">
              {{ recurrenceRisk?.ratio ?? "-" }}
            </div>
            <div class="stat-detail">
              {{ recurrenceRisk?.percent ?? "-" }}
            </div>
          </div>
        </v-col>

        <!-- Genetic Prevalence -->
        <v-col v-if="geneticPrevalenceFormatted" cols="6" sm="4">
          <div class="stat-card">
            <v-tooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps" class="stat-label">
                  Genetic Prevalence
                  <span class="formula-badge">q&sup2;</span>
                </div>
              </template>
              <span class="tooltip-text">
                <strong>Genetic Prevalence (q&sup2;)</strong><br />
                Expected frequency of affected individuals under Hardy-Weinberg
                Equilibrium. This is the theoretical disease frequency before
                accounting for penetrance.
              </span>
            </v-tooltip>
            <div class="stat-value">
              {{ geneticPrevalenceFormatted.ratio }}
            </div>
            <div class="stat-detail">
              {{ geneticPrevalenceFormatted.percent }}
            </div>
          </div>
        </v-col>

        <!-- Bayesian Prevalence (only when penetrance < 100%) -->
        <v-col
          v-if="bayesianPrevalenceFormatted && penetrance < 1"
          cols="6"
          sm="4"
        >
          <div class="stat-card">
            <v-tooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps" class="stat-label">
                  Bayesian Prevalence
                  <span class="formula-badge">
                    {{ Math.round(penetrance * 100) }}%
                  </span>
                </div>
              </template>
              <span class="tooltip-text">
                <strong>Bayesian Prevalence</strong><br />
                Genetic prevalence adjusted for incomplete penetrance
                (prevalence &times; penetrance).
              </span>
            </v-tooltip>
            <div class="stat-value">
              {{ bayesianPrevalenceFormatted.ratio }}
            </div>
            <div class="stat-detail">
              {{ bayesianPrevalenceFormatted.percent }}
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Range across populations -->
      <div
        v-if="result.minFrequency !== null"
        class="text-body-2 text-medium-emphasis mt-3"
      >
        Range across populations:
        {{ formatFrequency(result.minFrequency) }}
        to
        {{ formatFrequency(result.maxFrequency) }}
      </div>

      <!-- Supporting info -->
      <div
        class="text-caption text-medium-emphasis mt-1 d-flex align-center flex-wrap"
      >
        Based on {{ qualifyingVariantCount }} qualifying variant(s)
        <span v-if="excludedCount > 0" class="ml-1 text-warning">
          ({{ excludedCount }} manually excluded)
        </span>
        <span v-if="flaggedVariantCount > 0" class="ml-1 text-warning">
          <v-icon size="x-small" class="mr-1">mdi-alert-outline</v-icon>({{
            flaggedVariantCount
          }}
          flagged)
        </span>
      </div>

      <!-- Orphanet prevalence section — at bottom of summary card -->
      <OrphanetSection
        :loading="orphanetLoading"
        :diseases="orphanetDiseases"
        :primary-disease="primaryDisease"
        :additional-diseases="additionalDiseases"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  CarrierFrequencyResult,
  IndexPatientStatus,
} from "@gnomad-cf/core/types";
import { config } from "@gnomad-cf/core/config";
import type { OrphanetDisease } from "@gnomad-cf/core/orphanet";
import {
  calculateRecurrenceRisk,
  frequencyToPercent,
  frequencyToRatio,
  formatPrevalence,
} from "@gnomad-cf/core/calculations";
import type { DisplayFormat } from "@gnomad-cf/core/calculations";
import OrphanetSection from "@/components/OrphanetSection.vue";

const props = defineProps<{
  result: CarrierFrequencyResult;
  canonicalTranscript: string | null;
  effectiveFrequency: number | null;
  indexStatus: IndexPatientStatus;
  penetrance: number;
  useHWEFormula: boolean;
  sourceAttribution: string;
  sourceChipColor: string;
  cacheStatus: "hit" | "miss" | "stored" | "unavailable" | "idle" | null;
  processingStatus: string | null;
  isLoading: boolean;
  qualifyingVariantCount: number;
  excludedCount: number;
  flaggedVariantCount: number;
  currentFormat: DisplayFormat;
  formatFrequency: (freq: number | null) => string;
  orphanetLoading: boolean;
  orphanetDiseases: OrphanetDisease[];
  primaryDisease: OrphanetDisease | undefined;
  additionalDiseases: OrphanetDisease[];
}>();

defineEmits<{
  refetch: [];
  openAllVariants: [];
}>();

const summaryPrimary = computed(() => {
  if (props.effectiveFrequency === null) return "-";
  return props.formatFrequency(props.effectiveFrequency);
});

const summaryDetail = computed(() => {
  if (props.effectiveFrequency === null) return "No variants included";
  if (props.currentFormat === "ratio") {
    return frequencyToPercent(props.effectiveFrequency);
  }
  return frequencyToRatio(props.effectiveFrequency);
});

const recurrenceRisk = computed(() => {
  const freq = props.effectiveFrequency;
  if (freq === null) return null;

  const risk = calculateRecurrenceRisk(
    freq,
    props.indexStatus,
    props.penetrance,
  );
  if (risk === null) return null;

  return {
    risk,
    percent: `${(risk * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`,
    ratio: risk > 0 ? `1:${Math.round(1 / risk).toLocaleString()}` : "N/A",
  };
});

const geneticPrevalenceFormatted = computed(() => {
  const gp = props.result.geneticPrevalence ?? null;
  if (gp === null) return null;
  return formatPrevalence(gp);
});

const bayesianPrevalenceFormatted = computed(() => {
  const bp = props.result.bayesianPrevalence ?? null;
  if (bp === null) return null;
  return formatPrevalence(bp);
});
</script>

<style scoped>
.tooltip-text {
  max-width: 280px;
  display: inline-block;
}

.stat-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(var(--v-theme-surface-variant), 0.15);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
  height: 100%;
}

.stat-card:hover {
  border-color: rgba(var(--v-border-color), 0.28);
  background-color: rgba(var(--v-theme-surface-variant), 0.25);
}

.stat-card--hero {
  border-left: 3px solid rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-transform: uppercase;
  margin-bottom: 4px;
  cursor: help;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.formula-badge {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: none;
  background: rgba(var(--v-theme-on-surface), 0.08);
  padding: 1px 6px;
  border-radius: 4px;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.95);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

.stat-value.text-h5 {
  font-size: 1.5rem !important;
}

.refetch-btn {
  min-width: 44px;
  min-height: 44px;
}

.stat-detail {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
</style>
