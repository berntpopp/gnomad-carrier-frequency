<template>
  <div>
    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      label="Search variants"
      single-line
      hide-details
      clearable
      density="compact"
      class="mb-2 mx-4"
    />
    <div class="table-scroll-wrapper">
      <v-data-table
        :headers="headers"
        :items="variants"
        :loading="loading"
        :sort-by="sortBy"
        :search="search"
        :items-per-page="10"
        density="compact"
        item-value="variant_id"
        show-expand
        class="elevation-0 variant-table"
        :item-class="getRowClass"
      >
        <!-- Header checkbox for bulk include/exclude -->
        <template #[`header.include`]>
          <v-checkbox-btn
            :model-value="allIncluded"
            :indeterminate="someExcluded"
            density="compact"
            hide-details
            aria-label="Include all variants"
            @update:model-value="handleHeaderToggle"
          />
        </template>

        <!-- Row checkbox for individual exclusion -->
        <template #[`item.include`]="{ item }">
          <v-checkbox-btn
            :model-value="!isExcluded(item.variant_id)"
            density="compact"
            hide-details
            :aria-label="isExcluded(item.variant_id) ? 'Include variant' : 'Exclude variant'"
            @update:model-value="() => toggleVariant(item.variant_id)"
          />
        </template>

        <!-- Variant ID column - links to gnomAD -->
        <template #[`item.variant_id`]="{ item }">
          <a
            :href="getGnomadUrl(item.variant_id)"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'text-primary text-decoration-none',
              { 'text-decoration-line-through text-medium-emphasis': isExcluded(item.variant_id) }
            ]"
          >
            {{ item.variant_id }}
            <v-icon
              size="x-small"
              class="ml-1"
            >mdi-open-in-new</v-icon>
          </a>
        </template>

        <!-- Consequence column -->
        <template #[`item.consequence`]="{ item }">
          <span class="text-body-2">{{ item.consequence }}</span>
        </template>

        <!-- Allele frequency column - scientific notation for small values -->
        <template #[`item.alleleFrequency`]="{ item }">
          <span class="text-mono">{{ formatFrequency(item.alleleFrequency) }}</span>
        </template>

        <!-- Carrier frequency column - 2 × AF -->
        <template #[`item.carrierFrequency`]="{ item }">
          <span class="text-mono">{{ formatCarrierFreq(item.alleleFrequency) }}</span>
        </template>

        <!-- Ratio column - 1:X format based on carrier frequency -->
        <template #[`item.ratio`]="{ item }">
          <span class="text-mono text-body-2">
            {{ formatRatio(item.alleleFrequency) }}
          </span>
        </template>

        <!-- ClinVar status column - colored chip linking to ClinVar -->
        <template #[`item.clinvarStatus`]="{ item }">
          <v-chip
            v-if="item.clinvarStatus"
            :href="getClinvarUrl(item.clinvarVariationId, item.variant_id)"
            target="_blank"
            :color="getClinvarColor(item.clinvarStatus)"
            size="x-small"
            variant="tonal"
            link
          >
            {{ formatClinvarStatus(item.clinvarStatus) }}
            <v-icon
              end
              size="x-small"
            >
              mdi-open-in-new
            </v-icon>
          </v-chip>
          <span
            v-else
            class="text-medium-emphasis"
          >-</span>
        </template>

        <!-- Gold stars column - star icons -->
        <template #[`item.goldStars`]="{ item }">
          <div
            v-if="item.goldStars !== null"
            class="d-flex align-center"
            :aria-label="`${item.goldStars} out of 4 review stars`"
          >
            <v-icon
              v-for="n in 4"
              :key="n"
              :icon="n <= item.goldStars ? 'mdi-star' : 'mdi-star-outline'"
              :color="n <= item.goldStars ? 'amber-darken-2' : 'grey-lighten-1'"
              size="x-small"
            />
          </div>
          <span
            v-else
            class="text-medium-emphasis"
          >-</span>
        </template>

        <!-- HGVS-c column - truncate if long -->
        <template #[`item.hgvsc`]="{ item }">
          <span
            v-if="item.hgvsc"
            class="text-body-2 text-truncate d-inline-block"
            style="max-width: 150px"
            :title="item.hgvsc"
          >
            {{ item.hgvsc }}
          </span>
          <span
            v-else
            class="text-medium-emphasis"
          >-</span>
        </template>

        <!-- HGVS-p column - truncate if long -->
        <template #[`item.hgvsp`]="{ item }">
          <span
            v-if="item.hgvsp"
            class="text-body-2 text-truncate d-inline-block"
            style="max-width: 150px"
            :title="item.hgvsp"
          >
            {{ item.hgvsp }}
          </span>
          <span
            v-else
            class="text-medium-emphasis"
          >-</span>
        </template>

        <!-- Expanded row - additional details -->
        <template #expanded-row="{ columns, item }">
          <tr class="bg-grey-lighten-5">
            <td :colspan="columns.length">
              <div class="pa-3">
                <v-row dense>
                  <v-col
                    cols="12"
                    sm="6"
                    md="3"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Transcript
                    </div>
                    <div class="text-body-2">
                      {{ item.transcriptId || '-' }}
                    </div>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="3"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Position
                    </div>
                    <div class="text-body-2">
                      {{ item.pos.toLocaleString() }}
                    </div>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="3"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Ref / Alt
                    </div>
                    <div class="text-body-2 text-mono">
                      {{ item.ref }} / {{ item.alt }}
                    </div>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="3"
                  >
                    <div class="text-caption text-medium-emphasis">
                      Allele Count / Number
                    </div>
                    <div class="text-body-2">
                      {{ item.alleleCount.toLocaleString() }} / {{ item.alleleNumber.toLocaleString() }}
                    </div>
                  </v-col>
                </v-row>

                <!-- Flags row -->
                <div class="d-flex flex-wrap ga-2 mt-2">
                  <v-chip
                    v-if="item.isLoF"
                    color="error"
                    size="small"
                    variant="tonal"
                  >
                    <v-icon
                      start
                      size="x-small"
                    >
                      mdi-alert-circle
                    </v-icon>
                    LoF HC
                  </v-chip>
                  <v-chip
                    v-if="item.lof && item.lof !== 'HC'"
                    color="warning"
                    size="small"
                    variant="tonal"
                  >
                    LoF {{ item.lof }}
                  </v-chip>
                  <v-chip
                    v-if="item.isMissense"
                    color="secondary"
                    size="small"
                    variant="tonal"
                  >
                    Missense
                  </v-chip>
                  <v-chip
                    v-if="item.isClinvarPathogenic"
                    color="error"
                    size="small"
                    variant="tonal"
                  >
                    <v-icon
                      start
                      size="x-small"
                    >
                      mdi-alert
                    </v-icon>
                    ClinVar P/LP
                  </v-chip>
                </div>
              </div>
            </td>
          </tr>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="text-center py-4 text-medium-emphasis">
            No variants match the current filters
          </div>
        </template>

        <!-- Loading state -->
        <template #loading>
          <v-skeleton-loader type="table-row@5" />
        </template>
      </v-data-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DisplayVariant } from '@/types';
import { getClinvarColor, formatAlleleFrequency } from '@/utils/variant-display';
import { getDatasetId, getReferenceGenome } from '@/config';
import { useExclusionState } from '@/composables';

const props = defineProps<{
  /** Variants to display in the table */
  variants: DisplayVariant[];
  /** Loading state */
  loading?: boolean;
  /** Population code for population-specific view (unused but reserved for future) */
  populationCode?: string | null;
}>();

// Get exclusion state composable
const {
  excludeAll,
  includeVariant,
  toggleVariant,
  isExcluded,
} = useExclusionState();

// All variants are included (none excluded)
const allIncluded = computed(() => {
  if (!props.variants.length) return true;
  return props.variants.every(v => !isExcluded(v.variant_id));
});

// Some but not all variants are excluded
const someExcluded = computed(() => {
  if (!props.variants.length) return false;
  const excludedInTable = props.variants.filter(v => isExcluded(v.variant_id));
  return excludedInTable.length > 0 && excludedInTable.length < props.variants.length;
});

// Handle header checkbox toggle
function handleHeaderToggle(include: boolean) {
  if (include) {
    // Include all variants in this table
    for (const v of props.variants) {
      includeVariant(v.variant_id);
    }
  } else {
    // Exclude all variants in this table
    excludeAll(props.variants.map(v => v.variant_id));
  }
}

// Row class for excluded variant styling
function getRowClass(item: DisplayVariant): string {
  return isExcluded(item.variant_id) ? 'excluded-row' : '';
}

// Table headers with sorting configuration
const headers = ref([
  { title: '', key: 'include', sortable: false, width: '48px' },
  { title: 'Variant ID', key: 'variant_id', sortable: true },
  { title: 'Consequence', key: 'consequence', sortable: true },
  { title: 'Allele Freq', key: 'alleleFrequency', sortable: true, align: 'end' as const },
  { title: 'Carrier Freq', key: 'carrierFrequency', sortable: true, align: 'end' as const },
  { title: 'Ratio', key: 'ratio', sortable: true, align: 'end' as const },
  { title: 'ClinVar', key: 'clinvarStatus', sortable: true },
  { title: 'Stars', key: 'goldStars', sortable: true, align: 'center' as const },
  { title: 'HGVS-c', key: 'hgvsc', sortable: false },
  { title: 'HGVS-p', key: 'hgvsp', sortable: false },
]);

// Default sort by allele frequency descending
const sortBy = ref([{ key: 'alleleFrequency', order: 'desc' as const }]);

// Search filter
const search = ref('');

// Build gnomAD variant URL
function getGnomadUrl(variantId: string): string {
  const dataset = getDatasetId();
  return `https://gnomad.broadinstitute.org/variant/${variantId}?dataset=${dataset}`;
}

// Build ClinVar URL - uses variation ID if available, otherwise falls back to position search
function getClinvarUrl(clinvarVariationId: string | null, variantId: string): string {
  // Use direct variation link if ID is available
  if (clinvarVariationId) {
    return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${clinvarVariationId}/`;
  }
  // Fallback to position-based search with correct assembly
  const parts = variantId.split('-');
  if (parts.length >= 2) {
    const chr = parts[0];
    const pos = parts[1];
    const refGenome = getReferenceGenome();
    const chrposField = refGenome === 'GRCh38' ? 'chrpos38' : 'chrpos37';
    return `https://www.ncbi.nlm.nih.gov/clinvar/?term=${chr}[chr]+AND+${pos}[${chrposField}]`;
  }
  return `https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(variantId)}`;
}

// Use the utility function for frequency formatting
function formatFrequency(freq: number | null): string {
  return formatAlleleFrequency(freq);
}

// Format carrier frequency (2 × AF) - same decimal format as allele frequency
function formatCarrierFreq(alleleFreq: number | null): string {
  if (alleleFreq === null || alleleFreq === 0) return '-';
  const carrierFreq = 2 * alleleFreq;
  // Use same format as allele frequency (decimal, scientific for small values)
  return formatAlleleFrequency(carrierFreq);
}

// Format ratio as "1:X" based on carrier frequency (2 × allele frequency)
function formatRatio(alleleFreq: number | null): string {
  if (alleleFreq === null || alleleFreq === 0) return '-';
  const carrierFreq = 2 * alleleFreq;
  const denominator = Math.round(1 / carrierFreq);
  return `1:${denominator.toLocaleString()}`;
}

// Format ClinVar status for display (shorten long strings)
function formatClinvarStatus(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes('pathogenic') && lower.includes('likely')) {
    return 'Likely P';
  }
  if (lower.includes('pathogenic')) {
    return 'Pathogenic';
  }
  if (lower.includes('uncertain') || lower.includes('vus')) {
    return 'VUS';
  }
  if (lower.includes('benign') && lower.includes('likely')) {
    return 'Likely B';
  }
  if (lower.includes('benign')) {
    return 'Benign';
  }
  if (lower.includes('conflicting')) {
    return 'Conflicting';
  }
  // Truncate very long strings
  if (status.length > 15) {
    return status.substring(0, 12) + '...';
  }
  return status;
}
</script>

<style scoped>
.text-mono {
  font-family: monospace;
}

/* Horizontal scroll wrapper for mobile */
.table-scroll-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

/* Freeze first column (checkbox) */
:deep(.variant-table) th:first-child,
:deep(.variant-table) td:first-child {
  position: sticky;
  left: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

/* Freeze second column (variant ID) */
:deep(.variant-table) th:nth-child(2),
:deep(.variant-table) td:nth-child(2) {
  position: sticky;
  left: 48px; /* Width of checkbox column */
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}

/* Add shadow to indicate scrollable content */
:deep(.variant-table) th:nth-child(2)::after,
:deep(.variant-table) td:nth-child(2)::after {
  content: '';
  position: absolute;
  top: 0;
  right: -8px;
  bottom: 0;
  width: 8px;
  background: linear-gradient(to right, rgba(0,0,0,0.1), transparent);
  pointer-events: none;
}

/* Ensure expand column gets sticky too for consistency */
:deep(.variant-table) th:last-child,
:deep(.variant-table) td:last-child {
  position: sticky;
  right: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

/* Excluded row styling - override background for frozen columns */
:deep(.excluded-row) {
  opacity: 0.6;
}

:deep(.excluded-row) td {
  color: rgba(var(--v-theme-on-surface), 0.6) !important;
}

:deep(.excluded-row) td:first-child,
:deep(.excluded-row) td:nth-child(2),
:deep(.excluded-row) td:last-child {
  background: rgb(var(--v-theme-surface));
}

/* Maintain hover for re-inclusion */
:deep(.excluded-row:hover) {
  opacity: 0.8;
}

/* Expanded row background - ensure frozen cells inherit */
:deep(.bg-grey-lighten-5) td:first-child,
:deep(.bg-grey-lighten-5) td:nth-child(2),
:deep(.bg-grey-lighten-5) td:last-child {
  background: #fafafa; /* grey-lighten-5 */
}
</style>
