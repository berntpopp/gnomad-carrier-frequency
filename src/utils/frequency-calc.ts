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
 * Key insight: AN (allele number) is the sample size, which is CONSTANT for all
 * variants in a given population/dataset. We must NOT sum AN across variants.
 *
 * Correct approach:
 * - Sum AC across all variants (each variant contributes different alleles)
 * - Take max AN for exome + max AN for genome (sample size is constant per dataset)
 *
 * Example for NFE population with 2 variants:
 *   Variant 1: exome AC=100 AN=500k, genome AC=10 AN=50k
 *   Variant 2: exome AC=50 AN=500k, genome AC=5 AN=50k
 *   Total AC = 100+10+50+5 = 165
 *   Total AN = 500k + 50k = 550k (NOT 1.1M by summing all)
 */
export function aggregatePopulationFrequencies(
  variants: VariantFrequencyData[],
  version: GnomadVersion
): Map<string, { totalAC: number; totalAN: number }> {
  const result = new Map<
    string,
    { totalAC: number; maxExomeAN: number; maxGenomeAN: number }
  >();

  // Get population codes from config for this version
  const populationCodes = getPopulationCodes(version);

  // Initialize all populations from config
  for (const pop of populationCodes) {
    result.set(pop, { totalAC: 0, maxExomeAN: 0, maxGenomeAN: 0 });
  }

  for (const variant of variants) {
    // Process exome populations - sum AC, track max AN
    for (const pop of variant.exome?.populations ?? []) {
      if (populationCodes.includes(pop.id)) {
        const current = result.get(pop.id)!;
        current.totalAC += pop.ac;
        current.maxExomeAN = Math.max(current.maxExomeAN, pop.an);
      }
    }

    // Process genome populations - sum AC, track max AN
    for (const pop of variant.genome?.populations ?? []) {
      if (populationCodes.includes(pop.id)) {
        const current = result.get(pop.id)!;
        current.totalAC += pop.ac;
        current.maxGenomeAN = Math.max(current.maxGenomeAN, pop.an);
      }
    }
  }

  // Convert to final format: totalAN = maxExomeAN + maxGenomeAN
  const finalResult = new Map<string, { totalAC: number; totalAN: number }>();
  for (const [code, data] of result) {
    finalResult.set(code, {
      totalAC: data.totalAC,
      totalAN: data.maxExomeAN + data.maxGenomeAN,
    });
  }

  return finalResult;
}

/**
 * Build PopulationFrequency results from aggregated data
 * Applies founder effect and low sample size detection using config thresholds
 */
export function buildPopulationFrequencies(
  aggregated: Map<string, { totalAC: number; totalAN: number }>,
  globalCarrierFrequency: number | null,
  version: GnomadVersion
): PopulationFrequency[] {
  const results: PopulationFrequency[] = [];

  for (const [code, data] of aggregated) {
    const af = calculateAlleleFrequency(data.totalAC, data.totalAN);
    const carrierFreq = af !== null ? 2 * af : null;

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
      alleleNumber: data.totalAN,
      isLowSampleSize: data.totalAN < lowSampleSizeThreshold, // Threshold from config
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
