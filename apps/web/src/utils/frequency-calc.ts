// Carrier frequency and recurrence risk calculations
// All thresholds from config - NO MAGIC NUMBERS

import {
  config,
  getPopulationLabel,
  getPopulationCodes,
  type GnomadVersion,
} from '@/config';
import type { IndexPatientStatus, PopulationFrequency } from '@/types';
import type { VariantFrequencyData } from '@/types/variant';

// All thresholds from config - NO MAGIC NUMBERS
const { lowSampleSizeThreshold, founderEffectMultiplier } = config.settings;

/**
 * Calculate allele frequency from allele count and allele number
 * Returns null if AN=0 (population not sampled)
 */
export function calculateAlleleFrequency(
  ac: number,
  an: number
): number | null {
  if (an === 0) return null;
  return ac / an;
}

/**
 * Calculate carrier frequency from pathogenic allele frequencies
 * CALC-01: Carrier frequency = 2 x sum(pathogenic allele frequencies)
 */
export function calculateCarrierFrequency(pathogenicAFs: number[]): number {
  const sumAF = pathogenicAFs.reduce((sum, af) => sum + af, 0);
  return 2 * sumAF;
}

/**
 * Calculate recurrence risk based on carrier frequency and index patient status
 * CALC-02: Heterozygous carrier: carrier_freq / 4
 * CALC-03: Compound het/homozygous: carrier_freq / 2
 */
export function calculateRecurrenceRisk(
  carrierFrequency: number,
  indexStatus: IndexPatientStatus
): number {
  return indexStatus === 'heterozygous'
    ? carrierFrequency / 4
    : carrierFrequency / 2;
}

/**
 * Aggregate population frequencies from multiple variants
 *
 * Mathematical approach: Sum of allele frequencies per population
 *
 * Why sum AFs instead of sum(AC)/sum(AN)?
 * - AN varies per variant due to call rate (coverage/quality differences)
 * - Summing AN would incorrectly weight variants
 * - Summing AFs correctly handles varying sample sizes
 *
 * For each population:
 * 1. For each variant: variant_AF = (exome_AC + genome_AC) / (exome_AN + genome_AN)
 * 2. Sum AFs across variants: total_AF = Σ(variant_AF_i)
 * 3. Carrier frequency = 2 × total_AF
 *
 * We also track max AN for display purposes (to show representative sample size).
 */
export function aggregatePopulationFrequencies(
  variants: VariantFrequencyData[],
  version: GnomadVersion
): Map<string, { sumAF: number; totalAC: number; maxAN: number }> {
  const result = new Map<
    string,
    { sumAF: number; totalAC: number; maxExomeAN: number; maxGenomeAN: number }
  >();

  // Get population codes from config for this version
  const populationCodes = getPopulationCodes(version);

  // Initialize all populations from config
  for (const pop of populationCodes) {
    result.set(pop, { sumAF: 0, totalAC: 0, maxExomeAN: 0, maxGenomeAN: 0 });
  }

  for (const variant of variants) {
    // Build a map of population data for this variant
    const exomePops = new Map(
      (variant.exome?.populations ?? []).map((p) => [p.id, p])
    );
    const genomePops = new Map(
      (variant.genome?.populations ?? []).map((p) => [p.id, p])
    );

    // For each population, calculate this variant's contribution
    for (const popCode of populationCodes) {
      const exomePop = exomePops.get(popCode);
      const genomePop = genomePops.get(popCode);

      const exomeAC = exomePop?.ac ?? 0;
      const genomeAC = genomePop?.ac ?? 0;
      const exomeAN = exomePop?.an ?? 0;
      const genomeAN = genomePop?.an ?? 0;

      const combinedAC = exomeAC + genomeAC;
      const combinedAN = exomeAN + genomeAN;

      const current = result.get(popCode)!;

      // Sum AC for display
      current.totalAC += combinedAC;

      // Track max AN per dataset for display
      current.maxExomeAN = Math.max(current.maxExomeAN, exomeAN);
      current.maxGenomeAN = Math.max(current.maxGenomeAN, genomeAN);

      // Sum AF for this variant's contribution to the population
      if (combinedAN > 0) {
        current.sumAF += combinedAC / combinedAN;
      }
    }
  }

  // Convert to final format
  const finalResult = new Map<
    string,
    { sumAF: number; totalAC: number; maxAN: number }
  >();
  for (const [code, data] of result) {
    finalResult.set(code, {
      sumAF: data.sumAF,
      totalAC: data.totalAC,
      maxAN: data.maxExomeAN + data.maxGenomeAN,
    });
  }

  return finalResult;
}

/**
 * Build PopulationFrequency results from aggregated data
 * Applies founder effect and low sample size detection using config thresholds
 *
 * Uses pre-computed sumAF from aggregation (mathematically correct for varying AN)
 * Carrier frequency = 2 × sumAF
 */
export function buildPopulationFrequencies(
  aggregated: Map<string, { sumAF: number; totalAC: number; maxAN: number }>,
  globalCarrierFrequency: number | null,
  version: GnomadVersion
): PopulationFrequency[] {
  const results: PopulationFrequency[] = [];

  for (const [code, data] of aggregated) {
    // Carrier frequency = 2 × sum(AF) - already computed correctly in aggregation
    const carrierFreq = data.sumAF > 0 ? 2 * data.sumAF : null;

    // Use thresholds from config
    const isFounderEffect =
      globalCarrierFrequency !== null &&
      carrierFreq !== null &&
      carrierFreq > globalCarrierFrequency * founderEffectMultiplier;

    results.push({
      code,
      label: getPopulationLabel(code, version), // Label from config
      carrierFrequency: carrierFreq,
      alleleCount: data.totalAC,
      alleleNumber: data.maxAN, // Display max AN as representative sample size
      isLowSampleSize: data.maxAN < lowSampleSizeThreshold, // Threshold from config
      isFounderEffect,
    });
  }

  // Sort by carrier frequency descending (nulls at end)
  return results.sort((a, b) => {
    if (a.carrierFrequency === null) return 1;
    if (b.carrierFrequency === null) return -1;
    return b.carrierFrequency - a.carrierFrequency;
  });
}
