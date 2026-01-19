// Export data types for JSON and Excel file generation

import type { FilterConfig } from '@/types/filter';
import type { GnomadVersion } from '@/config';

/**
 * Metadata included in all exports
 */
export interface ExportMetadata {
  exportDate: string; // ISO format
  gnomadVersion: GnomadVersion;
  gnomadDisplayName: string;
  filtersApplied: FilterConfig;
  appVersion: string;
}

/**
 * Summary sheet data (single row)
 */
export interface ExportSummary {
  gene: string;
  globalCarrierFrequency: number | null;
  globalCarrierFrequencyPercent: string;
  globalCarrierFrequencyRatio: string;
  globalAlleleCount: number;
  globalAlleleNumber: number;
  qualifyingVariantCount: number;
  minFrequency: number | null;
  maxFrequency: number | null;
  hasFounderEffect: boolean;
}

/**
 * Population row for export
 */
export interface ExportPopulation {
  code: string;
  label: string;
  carrierFrequency: number | null;
  carrierFrequencyPercent: string;
  carrierFrequencyRatio: string;
  alleleCount: number;
  alleleNumber: number;
  isFounderEffect: boolean;
}

/**
 * Variant row for export
 */
export interface ExportVariant {
  variantId: string;
  consequence: string;
  alleleFrequency: number | null;
  alleleFrequencyPercent: string;
  alleleCount: number;
  alleleNumber: number;
  hgvsC: string | null;
  hgvsP: string | null;
  clinvarStatus: string | null;
  isLoF: boolean;
  isClinvarPathogenic: boolean;
  // Exclusion fields (EXCL-06)
  excluded: boolean;
  exclusionReason: string | null;
}

/**
 * Complete export data structure
 */
export interface ExportData {
  summary: ExportSummary;
  populations: ExportPopulation[];
  variants: ExportVariant[];
  metadata: ExportMetadata;
}
