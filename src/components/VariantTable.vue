<template>
  <v-data-table
    :headers="headers"
    :items="variants"
    :loading="loading"
    :sort-by="sortBy"
    :items-per-page="10"
    density="compact"
    item-value="variant_id"
    show-expand
    class="elevation-0"
  >
    <!-- Consequence column -->
    <template #[`item.consequence`]="{ item }">
      <span class="text-body-2">{{ item.consequence }}</span>
    </template>

    <!-- Allele frequency column - scientific notation for small values -->
    <template #[`item.alleleFrequency`]="{ item }">
      <span class="text-mono">{{ formatFrequency(item.alleleFrequency) }}</span>
    </template>

    <!-- ClinVar status column - colored chip -->
    <template #[`item.clinvarStatus`]="{ item }">
      <v-chip
        v-if="item.clinvarStatus"
        :color="getClinvarColor(item.clinvarStatus)"
        size="x-small"
        variant="tonal"
      >
        {{ formatClinvarStatus(item.clinvarStatus) }}
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
                <div class="text-caption text-medium-emphasis">Transcript</div>
                <div class="text-body-2">
                  {{ item.transcriptId || '-' }}
                </div>
              </v-col>
              <v-col
                cols="12"
                sm="6"
                md="3"
              >
                <div class="text-caption text-medium-emphasis">Position</div>
                <div class="text-body-2">
                  {{ item.pos.toLocaleString() }}
                </div>
              </v-col>
              <v-col
                cols="12"
                sm="6"
                md="3"
              >
                <div class="text-caption text-medium-emphasis">Ref / Alt</div>
                <div class="text-body-2 text-mono">
                  {{ item.ref }} / {{ item.alt }}
                </div>
              </v-col>
              <v-col
                cols="12"
                sm="6"
                md="3"
              >
                <div class="text-caption text-medium-emphasis">Allele Count / Number</div>
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
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { DisplayVariant } from '@/types';
import { getClinvarColor, formatAlleleFrequency } from '@/utils/variant-display';

defineProps<{
  /** Variants to display in the table */
  variants: DisplayVariant[];
  /** Loading state */
  loading?: boolean;
  /** Population code for population-specific view (unused but reserved for future) */
  populationCode?: string | null;
}>();

// Table headers with sorting configuration
const headers = ref([
  { title: 'Variant ID', key: 'variant_id', sortable: true },
  { title: 'Consequence', key: 'consequence', sortable: true },
  { title: 'Allele Freq', key: 'alleleFrequency', sortable: true, align: 'end' as const },
  { title: 'ClinVar', key: 'clinvarStatus', sortable: true },
  { title: 'Stars', key: 'goldStars', sortable: true, align: 'center' as const },
  { title: 'HGVS-c', key: 'hgvsc', sortable: false },
  { title: 'HGVS-p', key: 'hgvsp', sortable: false },
]);

// Default sort by allele frequency descending
const sortBy = ref([{ key: 'alleleFrequency', order: 'desc' as const }]);

// Use the utility function for frequency formatting
function formatFrequency(freq: number | null): string {
  return formatAlleleFrequency(freq);
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
</style>
