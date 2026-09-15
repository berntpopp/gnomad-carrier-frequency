<template>
  <v-menu>
    <template #activator="{ props: menuProps }">
      <v-tooltip location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="{ ...menuProps, ...tooltipProps }"
            variant="outlined"
            class="toolbar-action-btn"
            prepend-icon="mdi-download"
          >
            Export
            <v-icon end size="x-small">mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        Download results as JSON, Excel, or TSV.
      </v-tooltip>
    </template>
    <v-list density="compact">
      <v-list-item prepend-icon="mdi-code-json" @click="handleExport('json')">
        <v-list-item-title>Export as JSON</v-list-item-title>
      </v-list-item>
      <v-list-item prepend-icon="mdi-file-excel" @click="handleExport('xlsx')">
        <v-list-item-title>Export as Excel</v-list-item-title>
      </v-list-item>
      <v-list-item
        prepend-icon="mdi-file-delimited"
        @click="handleExport('tsv-populations')"
      >
        <v-list-item-title>Populations TSV</v-list-item-title>
      </v-list-item>
      <v-list-item
        prepend-icon="mdi-file-delimited"
        @click="handleExport('tsv-variants')"
      >
        <v-list-item-title>Variants TSV</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import type {
  CarrierFrequencyResult,
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  CalcConfig,
  ExclusionReason,
} from "@gnomad-cf/core/types";
import type { ClinVarSubmission } from "@gnomad-cf/core/queries";
import { useExport } from "@/composables";
import {
  filterPathogenicVariantsConfigurable,
  toDisplayVariants,
} from "@gnomad-cf/core/filters";
import { buildExportData } from "@/utils/export-utils";

const props = defineProps<{
  result: CarrierFrequencyResult;
  variants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
  filterConfig: FilterConfig;
  calcConfig: CalcConfig;
  submissions: Map<string, ClinVarSubmission[]>;
  excludedSet: Set<string>;
  reasons: Map<string, ExclusionReason>;
}>();

const { exportToJson, exportToExcel, exportPopulationsTsv, exportVariantsTsv } =
  useExport();

function handleExport(
  format: "json" | "xlsx" | "tsv-populations" | "tsv-variants",
) {
  if (!props.result) return;

  const allFilteredVariants = filterPathogenicVariantsConfigurable(
    props.variants,
    props.clinvarVariants,
    props.filterConfig,
    props.submissions,
  );
  const displayVariants = toDisplayVariants(
    allFilteredVariants,
    props.clinvarVariants,
  );

  const exportData = buildExportData(
    props.result,
    displayVariants,
    props.filterConfig,
    props.calcConfig,
    props.excludedSet,
    props.reasons,
  );

  switch (format) {
    case "json":
      exportToJson(exportData, props.result.gene);
      break;
    case "xlsx":
      exportToExcel(exportData, props.result.gene);
      break;
    case "tsv-populations":
      exportPopulationsTsv(exportData, props.result.gene);
      break;
    case "tsv-variants":
      exportVariantsTsv(exportData, props.result.gene);
      break;
  }
}
</script>

<style scoped>
.toolbar-action-btn {
  min-height: 44px !important;
}
</style>
