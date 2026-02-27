// Display format composable — bridges useFormatStore to formatted frequency strings

import { computed } from "vue";
import { useFormatStore } from "@/stores/useFormatStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import {
  frequencyToPercent,
  frequencyToRatio,
  frequencyToScientific,
  frequencyToPerHundredK,
} from "@gnomad-cf/core/calculations";
import type { DisplayFormat } from "@gnomad-cf/core/calculations";

/**
 * Composable providing reactive frequency formatting based on the user's
 * selected display format. The active format resets to the user's persisted
 * default when the wizard is reset or the gene is changed.
 *
 * Usage:
 *   const { currentFormat, setFormat, formatFrequency, formatRatio } = useDisplayFormat();
 */
export function useDisplayFormat() {
  const formatStore = useFormatStore();
  const templateStore = useTemplateStore();

  /**
   * Derive BCP-47 locale tag from the template store's language setting.
   * Used for locale-aware formatting in scientific notation and per-100k.
   */
  const locale = computed(() =>
    templateStore.language === "de" ? "de-DE" : "en-US",
  );

  /** The currently active display format (reactive). */
  const currentFormat = computed(() => formatStore.currentFormat);

  /** Switch the active display format for the current session. */
  function setFormat(f: DisplayFormat): void {
    formatStore.setCurrentFormat(f);
  }

  /**
   * Format a carrier frequency using the currently selected display format.
   * Dispatches to the appropriate core formatter from @gnomad-cf/core/calculations.
   *
   * - "percent"    -> frequencyToPercent (e.g. "4.31%")
   * - "ratio"      -> frequencyToRatio   (e.g. "1:23")
   * - "scientific" -> frequencyToScientific (e.g. "4.31 × 10⁻²", locale-aware)
   * - "per100k"    -> frequencyToPerHundredK (e.g. "4,310 / 100,000", locale-aware)
   */
  function formatFrequency(freq: number | null): string {
    switch (formatStore.currentFormat) {
      case "percent":
        return frequencyToPercent(freq);
      case "ratio":
        return frequencyToRatio(freq);
      case "scientific":
        return frequencyToScientific(freq, locale.value);
      case "per100k":
        return frequencyToPerHundredK(freq, locale.value);
    }
  }

  /**
   * Format a frequency as a ratio regardless of the active display format.
   * Used for recurrence risk, which is always shown as a ratio (e.g. "1:2116").
   */
  function formatRatio(freq: number | null): string {
    return frequencyToRatio(freq);
  }

  return {
    currentFormat,
    setFormat,
    formatFrequency,
    formatRatio,
  };
}

export type UseDisplayFormatReturn = ReturnType<typeof useDisplayFormat>;
