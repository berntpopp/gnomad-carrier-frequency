<template>
  <div class="chart-container" style="position: relative">
    <!-- Empty state -->
    <div
      v-if="visiblePops.length === 0"
      class="chart-empty-state text-body-2 text-medium-emphasis py-8 text-center"
    >
      No population data available
    </div>

    <!-- SVG chart -->
    <svg
      v-else
      ref="svgRef"
      :viewBox="viewBox"
      :style="{
        width: '100%',
        height: 'auto',
        display: 'block',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif',
      }"
      role="img"
      :aria-label="`Carrier frequency by population for ${gene}`"
    >
      <title>Carrier frequency by population for {{ gene }}</title>

      <!-- Background -->
      <rect
        x="0"
        y="0"
        :width="SVG_WIDTH"
        :height="svgHeight"
        fill="rgb(var(--v-theme-surface))"
      />

      <!-- Population rows -->
      <g
        v-for="(pop, i) in visiblePops"
        :key="pop.code"
        :data-code="pop.code"
        style="cursor: pointer"
        @mouseenter="showTooltip(pop, $event)"
        @mouseleave="hideTooltip()"
        @click="handleBarClick(pop.code)"
        @touchstart.prevent="showTooltip(pop, $event)"
      >
        <!-- Population label -->
        <text
          :x="labelWidth - 8"
          :y="barY(i) + barHeight / 2 + 4"
          :font-size="smAndDown ? 10 : 12"
          text-anchor="end"
          fill="rgb(var(--v-theme-on-surface))"
        >
          {{ smAndDown ? pop.code.toUpperCase() : pop.label }}
        </text>

        <!-- Bar -->
        <rect
          :x="labelWidth"
          :y="barY(i)"
          :width="barWidth(pop.carrierFrequency)"
          :height="barHeight"
          :fill="barColor(pop)"
          rx="2"
          style="transition: width 0.3s ease"
        />

        <!-- Value label -->
        <text
          :x="labelWidth + barWidth(pop.carrierFrequency) + VALUE_MARGIN_GAP"
          :y="barY(i) + barHeight / 2 + 4"
          :font-size="smAndDown ? 9 : 11"
          text-anchor="start"
          fill="rgb(var(--v-theme-on-surface))"
        >
          {{ formatFrequency(pop.carrierFrequency) }}
        </text>
      </g>

      <!-- Global reference line -->
      <g v-if="refLineX !== null">
        <line
          :x1="refLineX"
          :x2="refLineX"
          :y1="TOP_PADDING - 4"
          :y2="svgHeight - BOTTOM_PADDING + 4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-dasharray="4,3"
          opacity="0.6"
        />
        <text
          :x="refLineX + 4"
          :y="TOP_PADDING - 8"
          font-size="10"
          fill="currentColor"
          text-anchor="start"
        >
          Global: {{ formatFrequency(globalCarrierFrequency) }}
        </text>
      </g>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="tooltipVisible && tooltipPop"
      class="chart-tooltip elevation-4"
      :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
    >
      <strong>{{ tooltipPop.label }}</strong><br />
      Carrier frequency: {{ formatFrequency(tooltipPop.carrierFrequency) }}<br />
      AC: {{ tooltipPop.alleleCount }} / AN:
      {{ tooltipPop.alleleNumber?.toLocaleString() ?? "-" }}<br />
      <em v-if="tooltipPop.isFounderEffect" class="text-warning"
        >Founder effect population</em
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useDisplay } from "vuetify";
import { useAppTheme } from "@/composables/useTheme";
import { useDisplayFormat } from "@/composables/useDisplayFormat";
import type { PopulationFrequency } from "@gnomad-cf/core/types";

// ── Props ──────────────────────────────────────────────────────────────────────

const props = defineProps<{
  populations: PopulationFrequency[];
  globalCarrierFrequency: number | null;
  gene: string;
  gnomadVersion: string;
}>();

// ── Emits ──────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  "bar-click": [code: string];
}>();

// ── Composables ────────────────────────────────────────────────────────────────

const { isDark } = useAppTheme();
const { smAndDown } = useDisplay();
const { formatFrequency } = useDisplayFormat();

// ── SVG Layout Constants ───────────────────────────────────────────────────────

const SVG_WIDTH = 600;
const VALUE_MARGIN = 90;
const VALUE_MARGIN_GAP = 6;
const TOP_PADDING = 24;
const BOTTOM_PADDING = 40;

// Responsive constants computed from breakpoint
const barHeight = computed(() => (smAndDown.value ? 14 : 20));
const barGap = computed(() => (smAndDown.value ? 4 : 8));
const labelWidth = computed(() => (smAndDown.value ? 80 : 160));

const BAR_AREA = computed(() => SVG_WIDTH - labelWidth.value - VALUE_MARGIN);

// ── Color Scheme (Okabe-Ito, colorblind-safe) ─────────────────────────────────

const CHART_COLORS = {
  light: { normal: "#0072B2", founder: "#D55E00" },
  dark: { normal: "#56B4E9", founder: "#E69F00" },
} as const;

function barColor(pop: PopulationFrequency): string {
  const palette = isDark.value ? CHART_COLORS.dark : CHART_COLORS.light;
  return pop.isFounderEffect ? palette.founder : palette.normal;
}

// ── Computed Data ──────────────────────────────────────────────────────────────

const visiblePops = computed(() =>
  props.populations
    .filter((p) => p.carrierFrequency !== null && p.carrierFrequency > 0)
    .sort((a, b) => (b.carrierFrequency ?? 0) - (a.carrierFrequency ?? 0)),
);

const maxFreq = computed(() =>
  Math.max(
    props.globalCarrierFrequency ?? 0,
    ...visiblePops.value.map((p) => p.carrierFrequency ?? 0),
  ),
);

const svgHeight = computed(
  () =>
    TOP_PADDING +
    visiblePops.value.length * (barHeight.value + barGap.value) +
    BOTTOM_PADDING,
);

const viewBox = computed(() => `0 0 ${SVG_WIDTH} ${svgHeight.value}`);

function barWidth(freq: number | null): number {
  if (!freq || !maxFreq.value) return 0;
  return (freq / maxFreq.value) * BAR_AREA.value;
}

function barY(index: number): number {
  return TOP_PADDING + index * (barHeight.value + barGap.value);
}

const refLineX = computed(() => {
  if (!props.globalCarrierFrequency || !maxFreq.value) return null;
  return (
    labelWidth.value +
    (props.globalCarrierFrequency / maxFreq.value) * BAR_AREA.value
  );
});

// ── SVG Ref (exposed for export in Plan 02) ────────────────────────────────────

const svgRef = ref<SVGSVGElement | null>(null);
defineExpose({ svgRef });

// ── Tooltip State ──────────────────────────────────────────────────────────────

const tooltipVisible = ref(false);
const tooltipPop = ref<PopulationFrequency | null>(null);
const tooltipX = ref(0);
const tooltipY = ref(0);
let touchTimeout: ReturnType<typeof setTimeout> | null = null;

function showTooltip(
  pop: PopulationFrequency,
  event: MouseEvent | TouchEvent,
) {
  tooltipPop.value = pop;
  tooltipVisible.value = true;

  const rect = (event.currentTarget as Element)
    .closest(".chart-container")
    ?.getBoundingClientRect();
  if (!rect) return;

  const clientX =
    "touches" in event ? event.touches[0].clientX : event.clientX;
  const clientY =
    "touches" in event ? event.touches[0].clientY : event.clientY;

  tooltipX.value = clientX - rect.left + 12;
  tooltipY.value = clientY - rect.top - 10;

  if ("touches" in event) {
    if (touchTimeout) clearTimeout(touchTimeout);
    touchTimeout = setTimeout(hideTooltip, 3000);
  }
}

function hideTooltip() {
  tooltipVisible.value = false;
}

function handleBarClick(code: string) {
  emit("bar-click", code);
}

onBeforeUnmount(() => {
  if (touchTimeout) clearTimeout(touchTimeout);
});
</script>

<style scoped>
.chart-tooltip {
  position: absolute;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.8125rem;
  line-height: 1.5;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
  max-width: 280px;
}
</style>
