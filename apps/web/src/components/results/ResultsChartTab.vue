<template>
  <div class="pa-4">
    <PopulationBarChart
      ref="chartRef"
      :populations="result?.populations ?? []"
      :global-carrier-frequency="effectiveFrequency"
      :gene="result?.gene ?? ''"
      :gnomad-version="sourceAttribution"
      @bar-click="emit('openModal', $event)"
    />
    <!-- Chart export buttons -->
    <div class="d-flex justify-end ga-2 mt-3">
      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-file-image"
        @click="handleChartExportSvg"
      >
        Download SVG
      </v-btn>
      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-image"
        @click="handleChartExportPng"
      >
        Download PNG
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { CarrierFrequencyResult } from "@gnomad-cf/core/types";
import { useChartExport } from "@/composables/useChartExport";
import PopulationBarChart from "@/components/PopulationBarChart.vue";

const props = defineProps<{
  result: CarrierFrequencyResult;
  effectiveFrequency: number | null;
  sourceAttribution: string;
}>();

const emit = defineEmits<{
  openModal: [populationCode: string];
}>();

const chartRef = ref<InstanceType<typeof PopulationBarChart> | null>(null);
const { downloadSvg, downloadPng } = useChartExport();

function handleChartExportSvg() {
  const svgEl = chartRef.value?.svgRef;
  if (!svgEl || !props.result) return;
  downloadSvg(svgEl, props.result.gene, props.sourceAttribution);
}

function handleChartExportPng() {
  const svgEl = chartRef.value?.svgRef;
  if (!svgEl || !props.result) return;
  downloadPng(svgEl, props.result.gene, props.sourceAttribution);
}
</script>
