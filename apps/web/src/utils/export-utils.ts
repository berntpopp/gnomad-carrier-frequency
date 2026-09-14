// Pure utility functions for export data formatting and filename generation

import type {
  CarrierFrequencyResult,
  PopulationFrequency,
  DisplayVariant,
  FilterConfig,
  CalcConfig,
  ExportSummary,
  ExportPopulation,
  ExportVariant,
  ExportMetadata,
  ExportData,
  ExclusionReason,
  IndexPatientStatus,
} from "@gnomad-cf/core/types";
import type { GnomadVersion } from "@gnomad-cf/core/config";
import { getGnomadVersion, EXCLUSION_REASONS } from "@gnomad-cf/core/config";
import { config } from "@gnomad-cf/core/config";
import { calculateRecurrenceRisk } from "@gnomad-cf/core/calculations";

/**
 * Sanitize filename by removing/replacing unsafe characters
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "") // Remove Windows-unsafe chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .trim();
}

/**
 * Generate export filename: gene_YYYY-MM-DD
 */
export function generateFilename(gene: string, population?: string): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const sanitizedGene = sanitizeFilename(gene);
  if (population) {
    const sanitizedPop = sanitizeFilename(population);
    return `${sanitizedGene}_${sanitizedPop}_${date}`;
  }
  return `${sanitizedGene}_${date}`;
}

/**
 * Format date for display in exports
 */
export function formatExportDate(): string {
  return new Date().toISOString();
}

/**
 * Format frequency as percent string
 */
function formatPercent(freq: number | null): string {
  if (freq === null) return "Not detected";
  return `${(freq * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`;
}

/**
 * Format frequency as ratio string
 */
function formatRatio(freq: number | null): string {
  if (freq === null || freq === 0) return "-";
  return `1:${Math.round(1 / freq).toLocaleString()}`;
}

/**
 * Format exclusion reason for export display
 */
function formatExclusionReason(
  reason: ExclusionReason | undefined,
): string | null {
  if (!reason) return null;

  // Find the label for predefined reason
  const predefined = EXCLUSION_REASONS.find((r) => r.value === reason.type);
  const label = predefined?.label ?? reason.type;

  // For 'other', append custom text if provided
  if (reason.type === "other" && reason.customText) {
    return `${label}: ${reason.customText}`;
  }

  return label;
}

/**
 * Build ExportSummary from calculation result
 */
export function buildExportSummary(
  result: CarrierFrequencyResult,
): ExportSummary {
  return {
    gene: result.gene,
    globalCarrierFrequency: result.globalCarrierFrequency,
    globalCarrierFrequencyPercent: formatPercent(result.globalCarrierFrequency),
    globalCarrierFrequencyRatio: formatRatio(result.globalCarrierFrequency),
    globalAlleleCount: result.globalAlleleCount,
    globalAlleleNumber: result.globalAlleleNumber,
    qualifyingVariantCount: result.qualifyingVariantCount,
    minFrequency: result.minFrequency,
    maxFrequency: result.maxFrequency,
    hasFounderEffect: result.hasFounderEffect,
    geneticPrevalence: result.geneticPrevalence,
    bayesianPrevalence: result.bayesianPrevalence,
    formula: result.formula,
    homExclusionActive: result.homExclusionActive,
  };
}

/**
 * Build ExportPopulation array from populations
 */
export function buildExportPopulations(
  populations: PopulationFrequency[],
  indexStatus: IndexPatientStatus = "heterozygous",
  penetrance: number = 1.0,
): ExportPopulation[] {
  return populations.map((pop) => ({
    code: pop.code,
    label: pop.label,
    carrierFrequency: pop.carrierFrequency,
    carrierFrequencyPercent: formatPercent(pop.carrierFrequency),
    carrierFrequencyRatio: formatRatio(pop.carrierFrequency),
    alleleCount: pop.alleleCount,
    alleleNumber: pop.alleleNumber,
    isFounderEffect: pop.isFounderEffect,
    recurrenceRisk: calculateRecurrenceRisk(
      pop.carrierFrequency,
      indexStatus,
      penetrance,
    ),
    geneticPrevalence: pop.geneticPrevalence,
  }));
}

/**
 * Build ExportVariant array from display variants with exclusion data
 */
export function buildExportVariants(
  variants: DisplayVariant[],
  excludedIds?: Set<string>,
  reasons?: Map<string, ExclusionReason>,
): ExportVariant[] {
  return variants.map((v) => {
    const isExcluded = excludedIds?.has(v.variant_id) ?? false;
    const reason = reasons?.get(v.variant_id);

    return {
      variantId: v.variant_id,
      consequence: v.consequence,
      alleleFrequency: v.alleleFrequency,
      alleleFrequencyPercent: formatPercent(v.alleleFrequency),
      alleleCount: v.alleleCount,
      alleleNumber: v.alleleNumber,
      homozygoteCount: v.homozygoteCount ?? 0,
      hgvsC: v.hgvsc,
      hgvsP: v.hgvsp,
      clinvarStatus: v.clinvarStatus,
      goldStars: v.goldStars ?? null,
      isLoF: v.isLoF,
      isClinvarPathogenic: v.isClinvarPathogenic,
      excluded: isExcluded,
      exclusionReason: isExcluded ? formatExclusionReason(reason) : null,
      exclusionProvenance:
        isExcluded && reason
          ? {
              type: reason.type,
              customText: reason.customText,
            }
          : null,
    };
  });
}

/**
 * Build ExportMetadata
 */
export function buildExportMetadata(
  version: GnomadVersion,
  filters: FilterConfig,
  calcConfig: CalcConfig,
): ExportMetadata {
  const versionConfig = getGnomadVersion(version);
  return {
    exportDate: formatExportDate(),
    gnomadVersion: version,
    gnomadDisplayName: versionConfig.displayName,
    filtersApplied: { ...filters },
    calcConfig: { ...calcConfig },
    appVersion: import.meta.env.VITE_APP_VERSION || "unknown",
  };
}

/**
 * Escape a field value for TSV output.
 * - Wrap every field in double quotes
 * - Escape internal double quotes as ""
 * - Replace newlines with a space
 * - Replace tab characters with a space
 */
export function escapeTsv(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return '""';
  const str = String(value)
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Build a populations TSV string (no BOM — composable adds it).
 * Columns: Population, Carrier Frequency, Ratio, Recurrence Risk, AC, AN, Prevalence, Notes
 */
export function buildPopulationsTsv(data: ExportData): string {
  const header =
    "Population\tCarrier Frequency\tRatio\tRecurrence Risk\tAC\tAN\tPrevalence\tNotes";
  const rows = data.populations.map((pop) => {
    const recurrenceRisk =
      pop.recurrenceRisk !== undefined && pop.recurrenceRisk !== null
        ? pop.recurrenceRisk
        : pop.carrierFrequency !== null
          ? pop.carrierFrequency / 4
          : null;
    const riskStr =
      recurrenceRisk !== null
        ? `${(recurrenceRisk * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`
        : "-";
    const prevStr =
      pop.geneticPrevalence !== undefined && pop.geneticPrevalence !== null
        ? `${(pop.geneticPrevalence * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`
        : "-";
    return [
      escapeTsv(pop.label),
      escapeTsv(pop.carrierFrequency),
      escapeTsv(pop.carrierFrequencyRatio),
      escapeTsv(riskStr),
      escapeTsv(pop.alleleCount),
      escapeTsv(pop.alleleNumber),
      escapeTsv(prevStr),
      escapeTsv(pop.isFounderEffect ? "Founder effect" : ""),
    ].join("\t");
  });
  return [header, ...rows].join("\n");
}

/**
 * Build a variants TSV string (no BOM — composable adds it).
 * Columns: Variant ID, Consequence, AF, Carrier Frequency, Homozygotes,
 *          ClinVar Significance, Stars, HGVS-c, HGVS-p, Excluded, Exclusion Reason
 */
export function buildVariantsTsv(data: ExportData): string {
  const header = [
    "Variant ID",
    "Consequence",
    "AF",
    "Carrier Frequency",
    "Homozygotes",
    "ClinVar Significance",
    "Stars",
    "HGVS-c",
    "HGVS-p",
    "Excluded",
    "Exclusion Reason",
  ].join("\t");
  const rows = data.variants.map((v) => {
    const carrierFreq =
      v.alleleFrequency !== null ? v.alleleFrequency * 2 : null;
    return [
      escapeTsv(v.variantId),
      escapeTsv(v.consequence),
      escapeTsv(v.alleleFrequency),
      escapeTsv(carrierFreq),
      escapeTsv(v.homozygoteCount ?? 0),
      escapeTsv(v.clinvarStatus ?? ""),
      escapeTsv(
        v.goldStars !== null && v.goldStars !== undefined ? v.goldStars : "",
      ),
      escapeTsv(v.hgvsC ?? ""),
      escapeTsv(v.hgvsP ?? ""),
      escapeTsv(v.excluded ? "Yes" : "No"),
      escapeTsv(v.exclusionReason ?? ""),
    ].join("\t");
  });
  return [header, ...rows].join("\n");
}

/**
 * Build complete ExportData object
 */
export function buildExportData(
  result: CarrierFrequencyResult,
  variants: DisplayVariant[],
  filters: FilterConfig,
  calcConfig: CalcConfig,
  excludedIds?: Set<string>,
  reasons?: Map<string, ExclusionReason>,
  indexStatus?: IndexPatientStatus,
  penetrance?: number,
): ExportData {
  return {
    summary: buildExportSummary(result),
    populations: buildExportPopulations(
      result.populations,
      indexStatus,
      penetrance ?? calcConfig.penetrance,
    ),
    variants: buildExportVariants(variants, excludedIds, reasons),
    metadata: buildExportMetadata(result.version, filters, calcConfig),
  };
}
