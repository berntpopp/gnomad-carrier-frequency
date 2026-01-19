// Pure utility functions for export data formatting and filename generation

import type {
  CarrierFrequencyResult,
  PopulationFrequency,
  DisplayVariant,
  FilterConfig,
  ExportSummary,
  ExportPopulation,
  ExportVariant,
  ExportMetadata,
  ExportData,
  ExclusionReason,
} from '@/types';
import type { GnomadVersion } from '@/config';
import { getGnomadVersion, EXCLUSION_REASONS } from '@/config';
import { config } from '@/config';

/**
 * Sanitize filename by removing/replacing unsafe characters
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove Windows-unsafe chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .trim();
}

/**
 * Generate export filename: gene_YYYY-MM-DD
 */
export function generateFilename(gene: string, population?: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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
  if (freq === null) return 'Not detected';
  return `${(freq * 100).toFixed(config.settings.frequencyDecimalPlaces)}%`;
}

/**
 * Format frequency as ratio string
 */
function formatRatio(freq: number | null): string {
  if (freq === null || freq === 0) return '-';
  return `1:${Math.round(1 / freq).toLocaleString()}`;
}

/**
 * Format exclusion reason for export display
 */
function formatExclusionReason(reason: ExclusionReason | undefined): string | null {
  if (!reason) return null;

  // Find the label for predefined reason
  const predefined = EXCLUSION_REASONS.find((r) => r.value === reason.type);
  const label = predefined?.label ?? reason.type;

  // For 'other', append custom text if provided
  if (reason.type === 'other' && reason.customText) {
    return `${label}: ${reason.customText}`;
  }

  return label;
}

/**
 * Build ExportSummary from calculation result
 */
export function buildExportSummary(result: CarrierFrequencyResult): ExportSummary {
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
  };
}

/**
 * Build ExportPopulation array from populations
 */
export function buildExportPopulations(
  populations: PopulationFrequency[]
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
  }));
}

/**
 * Build ExportVariant array from display variants with exclusion data
 */
export function buildExportVariants(
  variants: DisplayVariant[],
  excludedIds?: Set<string>,
  reasons?: Map<string, ExclusionReason>
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
      hgvsC: v.hgvsc,
      hgvsP: v.hgvsp,
      clinvarStatus: v.clinvarStatus,
      isLoF: v.isLoF,
      isClinvarPathogenic: v.isClinvarPathogenic,
      excluded: isExcluded,
      exclusionReason: isExcluded ? formatExclusionReason(reason) : null,
    };
  });
}

/**
 * Build ExportMetadata
 */
export function buildExportMetadata(
  version: GnomadVersion,
  filters: FilterConfig
): ExportMetadata {
  const versionConfig = getGnomadVersion(version);
  return {
    exportDate: formatExportDate(),
    gnomadVersion: version,
    gnomadDisplayName: versionConfig.displayName,
    filtersApplied: { ...filters },
    appVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
  };
}

/**
 * Build complete ExportData object
 */
export function buildExportData(
  result: CarrierFrequencyResult,
  variants: DisplayVariant[],
  filters: FilterConfig,
  excludedIds?: Set<string>,
  reasons?: Map<string, ExclusionReason>
): ExportData {
  return {
    summary: buildExportSummary(result),
    populations: buildExportPopulations(result.populations),
    variants: buildExportVariants(variants, excludedIds, reasons),
    metadata: buildExportMetadata(result.version, filters),
  };
}
