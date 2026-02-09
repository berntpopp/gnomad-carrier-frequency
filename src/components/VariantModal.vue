<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="isSmallScreen"
    :width="dialogWidth"
    max-width="1400"
    scrollable
    aria-label="Variant Details"
    data-testid="variant-modal"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="d-flex align-center flex-wrap">
          {{ modalTitle }}
          <v-chip
            v-if="excludedInModal > 0"
            color="warning"
            size="small"
            class="ml-2"
            variant="tonal"
          >
            {{ excludedInModal }} excluded
          </v-chip>
        </span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="Close variant modal"
          data-testid="variant-modal-close-btn"
          @click="emit('update:modelValue', false)"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <VariantTable
          :variants="variants"
          :loading="loading"
          :population-code="populationCode"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <!-- Clear exclusions button - only show if any excluded -->
        <v-btn
          v-if="excludedInModal > 0"
          variant="text"
          color="warning"
          size="small"
          @click="includeAll"
        >
          <v-icon start>
            mdi-refresh
          </v-icon>
          Clear exclusions
        </v-btn>

        <!-- Export dropdown -->
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="text"
              color="secondary"
              size="small"
              :disabled="variants.length === 0"
            >
              <v-icon start>
                mdi-download
              </v-icon>
              Export
              <v-icon end>
                mdi-chevron-down
              </v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item @click="handleVariantExport('json')">
              <template #prepend>
                <v-icon>mdi-code-json</v-icon>
              </template>
              <v-list-item-title>JSON</v-list-item-title>
            </v-list-item>
            <v-list-item @click="handleVariantExport('xlsx')">
              <template #prepend>
                <v-icon>mdi-file-excel</v-icon>
              </template>
              <v-list-item-title>Excel</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-spacer />
        <v-btn
          color="primary"
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import * as XLSX from 'xlsx';
import VariantTable from './VariantTable.vue';
import type { DisplayVariant } from '@/types';
import { buildExportVariants, generateFilename } from '@/utils/export-utils';
import { useExclusionState } from '@/composables';

const props = defineProps<{
  /** v-model for dialog visibility */
  modelValue: boolean;
  /** Variants to display in the modal */
  variants: DisplayVariant[];
  /** Human-readable population label for title (null = all variants) */
  populationLabel?: string | null;
  /** Population code for filtering context */
  populationCode?: string | null;
  /** Loading state */
  loading?: boolean;
  /** Gene symbol for export filename */
  gene?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Get exclusion state composable
const { excluded, reasons, includeAll } = useExclusionState();

// Computed Set of excluded variant IDs for export
const excludedSet = computed(() => new Set(excluded.value));

// Count of excluded variants in current modal view
const excludedInModal = computed(() => {
  return props.variants.filter(v => excluded.value.includes(v.variant_id)).length;
});

// Responsive breakpoint detection
const { smAndDown, lgAndUp } = useDisplay();

// Responsive dialog sizing
const isSmallScreen = computed(() => smAndDown.value);
const dialogWidth = computed(() => {
  if (lgAndUp.value) return '90%';
  return '95%';
});

// Dynamic modal title
const modalTitle = computed(() => {
  if (props.populationLabel) {
    return `Variants for ${props.populationLabel}`;
  }
  return 'All Contributing Variants';
});

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export variants handler for JSON or Excel format
 */
function handleVariantExport(format: 'json' | 'xlsx') {
  if (!props.variants.length) return;

  // Build export variants with exclusion data
  const exportVariants = buildExportVariants(
    props.variants,
    excludedSet.value,
    reasons
  );
  const gene = props.gene || 'variants';
  const population = props.populationCode || undefined;
  const filename = generateFilename(gene, population) + '_variants';

  if (format === 'json') {
    const data = {
      variants: exportVariants,
      populationCode: props.populationCode,
      populationLabel: props.populationLabel,
      exportDate: new Date().toISOString(),
      variantCount: exportVariants.length,
      excludedCount: exportVariants.filter((v) => v.excluded).length,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, filename + '.json');
  } else {
    // Excel export with single Variants sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportVariants);
    XLSX.utils.book_append_sheet(wb, ws, 'Variants');
    XLSX.writeFile(wb, filename + '.xlsx');
  }
}
</script>
