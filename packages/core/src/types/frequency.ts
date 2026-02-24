// Frequency calculation result types

import type { GnomadVersion } from '../config/types.js';

export type IndexPatientStatus =
  | 'heterozygous'           // Carrier - one pathogenic allele
  | 'homozygous'             // Affected - two copies same allele
  | 'compound_het_confirmed' // Affected - two different alleles, confirmed
  | 'compound_het_assumed';  // Affected - two different alleles, assumed by phenotype

export interface PopulationFrequency {
  code: string; // Dynamic from config, not hardcoded
  label: string;
  carrierFrequency: number | null; // null = not detected (AN=0)
  alleleCount: number;
  alleleNumber: number;
  isLowSampleSize: boolean;
  isFounderEffect: boolean;
  /** Per-population genetic prevalence (q^2) where q = sumAF for this population */
  geneticPrevalence: number | null;
}

export interface CarrierFrequencyResult {
  gene: string;
  version: GnomadVersion;
  globalCarrierFrequency: number | null;
  /** Total allele count across all pathogenic variants (global, not sum of populations) */
  globalAlleleCount: number;
  /** Total allele number (sample size) for global calculation */
  globalAlleleNumber: number;
  populations: PopulationFrequency[];
  qualifyingVariantCount: number;
  minFrequency: number | null;
  maxFrequency: number | null;
  hasFounderEffect: boolean;
  /** Genetic disease prevalence (q^2) from raw SumAF — always computed regardless of formula */
  geneticPrevalence: number | null;
  /** Bayesian prevalence = geneticPrevalence * penetrance */
  bayesianPrevalence: number | null;
  /** Which carrier frequency formula was used to produce globalCarrierFrequency */
  formula: 'hwe' | 'simplified';
  /** Whether VCR/GCR homozygote exclusion was applied */
  homExclusionActive: boolean;
}

export interface RecurrenceRiskResult {
  carrierFrequency: number;
  indexStatus: IndexPatientStatus;
  recurrenceRisk: number;
  recurrenceRiskPercent: string;
  recurrenceRiskRatio: string;
}
