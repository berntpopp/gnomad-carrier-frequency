// Quality flag types for variant quality transparency

/**
 * Types of quality flags that can be raised for a variant
 */
export type QualityFlagType =
  | "high_af"
  | "high_hom"
  | "gnomad_filtered"
  | "genomes_only";

/**
 * A quality flag raised for a variant, with label, explanation, and severity
 */
export interface QualityFlag {
  type: QualityFlagType;
  /** Short label shown in UI, e.g., "High AF (BA1)" */
  label: string;
  /** User-meaningful sentence explaining why the flag was raised and what it means */
  explanation: string;
  severity: "critical" | "warning" | "info";
}

/**
 * Configuration for quality flag detection thresholds and toggles
 */
export interface QualitySettings {
  /** Enable/disable High AF (ACMG BA1) flag */
  highAfEnabled: boolean;
  /** AF threshold for High AF flag (default 0.05 = 5%, ACMG BA1) */
  highAfThreshold: number;
  /** Enable/disable High Homozygote Count flag */
  highHomEnabled: boolean;
  /** Method for detecting high homozygote count */
  highHomMethod: "hwe_relative" | "absolute";
  /** Absolute homozygote count threshold (used when method is 'absolute') */
  highHomAbsoluteThreshold: number;
  /** HWE multiplier for flagging (used when method is 'hwe_relative') — flag if observed > multiplier × expected */
  highHomHWEMultiplier: number;
  /** Enable/disable gnomAD QC filter fail flag */
  gnomadFilteredEnabled: boolean;
  /** Enable/disable Genomes Only flag */
  genomesOnlyEnabled: boolean;
}

/**
 * Configuration for which quality flag types cause variant exclusion from calculation
 * All default to false — user must opt in to excluding flagged variants
 */
export interface QualityExclusionConfig {
  excludeHighAf: boolean;
  excludeHighHom: boolean;
  excludeGnomadFiltered: boolean;
  excludeGenomesOnly: boolean;
}

/**
 * Factory default quality settings
 */
export const FACTORY_QUALITY_DEFAULTS: QualitySettings = {
  highAfEnabled: true,
  highAfThreshold: 0.05,
  highHomEnabled: true,
  highHomMethod: "hwe_relative",
  highHomAbsoluteThreshold: 10,
  highHomHWEMultiplier: 5.0,
  gnomadFilteredEnabled: true,
  genomesOnlyEnabled: true,
};

/**
 * Factory default quality exclusion config — all false (no exclusions by default)
 */
export const FACTORY_EXCLUSION_DEFAULTS: QualityExclusionConfig = {
  excludeHighAf: false,
  excludeHighHom: false,
  excludeGnomadFiltered: false,
  excludeGenomesOnly: false,
};
