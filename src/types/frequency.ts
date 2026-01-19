// Frequency calculation result types

import type { GnomadVersion } from '@/config';

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
}

export interface CarrierFrequencyResult {
  gene: string;
  version: GnomadVersion;
  globalCarrierFrequency: number | null;
  populations: PopulationFrequency[];
  qualifyingVariantCount: number;
  minFrequency: number | null;
  maxFrequency: number | null;
  hasFounderEffect: boolean;
}

export interface RecurrenceRiskResult {
  carrierFrequency: number;
  indexStatus: IndexPatientStatus;
  recurrenceRisk: number;
  recurrenceRiskPercent: string;
  recurrenceRiskRatio: string;
}
