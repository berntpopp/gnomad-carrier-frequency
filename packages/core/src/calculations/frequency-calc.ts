// Carrier frequency and recurrence risk calculations
// All thresholds from config - NO MAGIC NUMBERS

import {
  config,
  getPopulationLabel,
  getPopulationCodes,
  type GnomadVersion,
} from '../config/index.js';
import type { IndexPatientStatus, PopulationFrequency } from '../types/index.js';
import type { VariantFrequencyData } from '../types/variant.js';
import type { CalcConfig } from '../types/calculations.js';
import { calculateHWECarrierFrequency, calculateSimplifiedCarrierFrequency } from './carrier-frequency.js';
import { calculateVCR, calculateGCR } from './homozygote-exclusion.js';
import { calculateGeneticPrevalence } from './prevalence.js';

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
 * Aggregate population frequencies from multiple variants, respecting CalcConfig.
 *
 * Supports four combinations:
 *   - useHomExclusion=true:  VCR/GCR per population (HWE toggle has no effect)
 *   - useHomExclusion=false + useHWEFormula=true:   2pq (HWE) from sumAF
 *   - useHomExclusion=false + useHWEFormula=false:  2 * sumAF (simplified)
 *
 * Genetic prevalence (q^2) is ALWAYS computed from raw sumAF regardless of formula.
 *
 * IMPORTANT: ac_hom access uses explicit null checks on the exome/genome wrapper,
 * NOT optional chaining with ?? 0, to avoid masking missing data.
 *
 * Returns per-population aggregated data including sumAF, totalAC, maxAN,
 * carrierFrequency, and geneticPrevalence.
 */
export function aggregatePopulationFrequenciesWithConfig(
  variants: VariantFrequencyData[],
  version: GnomadVersion,
  calcConfig: CalcConfig
): Map<
  string,
  {
    carrierFrequency: number | null;
    sumAF: number;
    totalAC: number;
    maxAN: number;
    geneticPrevalence: number | null;
  }
> {
  const populationCodes = getPopulationCodes(version);

  // Working accumulator per population
  const acc = new Map<
    string,
    {
      sumAF: number;
      totalAC: number;
      maxExomeAN: number;
      maxGenomeAN: number;
      vcrs: number[]; // Only populated when useHomExclusion=true
    }
  >();

  for (const pop of populationCodes) {
    acc.set(pop, { sumAF: 0, totalAC: 0, maxExomeAN: 0, maxGenomeAN: 0, vcrs: [] });
  }

  for (const variant of variants) {
    // Build population lookup maps for this variant
    const exomePops = new Map(
      (variant.exome !== null && variant.exome !== undefined
        ? variant.exome.populations
        : []
      ).map((p) => [p.id, p])
    );
    const genomePops = new Map(
      (variant.genome !== null && variant.genome !== undefined
        ? variant.genome.populations
        : []
      ).map((p) => [p.id, p])
    );

    for (const popCode of populationCodes) {
      const exomePop = exomePops.get(popCode);
      const genomePop = genomePops.get(popCode);

      const exomeAC = exomePop !== undefined ? exomePop.ac : 0;
      const genomeAC = genomePop !== undefined ? genomePop.ac : 0;
      const exomeAN = exomePop !== undefined ? exomePop.an : 0;
      const genomeAN = genomePop !== undefined ? genomePop.an : 0;
      const exomeAcHom = exomePop !== undefined ? exomePop.ac_hom : 0;
      const genomeAcHom = genomePop !== undefined ? genomePop.ac_hom : 0;

      const combinedAC = exomeAC + genomeAC;
      const combinedAN = exomeAN + genomeAN;
      const combinedAcHom = exomeAcHom + genomeAcHom;

      const current = acc.get(popCode)!;

      current.totalAC += combinedAC;
      current.maxExomeAN = Math.max(current.maxExomeAN, exomeAN);
      current.maxGenomeAN = Math.max(current.maxGenomeAN, genomeAN);

      if (combinedAN > 0) {
        current.sumAF += combinedAC / combinedAN;

        if (calcConfig.useHomExclusion) {
          // VCR uses per-population combined counts
          const vcr = calculateVCR(combinedAC, combinedAN, combinedAcHom);
          current.vcrs.push(vcr);
        }
      }
    }
  }

  // Convert to final result map
  const result = new Map<
    string,
    {
      carrierFrequency: number | null;
      sumAF: number;
      totalAC: number;
      maxAN: number;
      geneticPrevalence: number | null;
    }
  >();

  for (const [popCode, data] of acc) {
    const maxAN = data.maxExomeAN + data.maxGenomeAN;

    // Genetic prevalence always from raw q = sumAF (never from carrier frequency)
    const geneticPrevalence =
      data.sumAF > 0 ? calculateGeneticPrevalence([data.sumAF]) : null;

    let carrierFrequency: number | null = null;

    if (data.sumAF > 0 || (calcConfig.useHomExclusion && data.vcrs.length > 0)) {
      if (calcConfig.useHomExclusion) {
        // VCR/GCR path — HWE toggle has no effect
        const gcr = calculateGCR(data.vcrs);
        carrierFrequency = gcr > 0 ? gcr : null;
      } else if (calcConfig.useHWEFormula) {
        // HWE 2pq formula
        const cf = calculateHWECarrierFrequency([data.sumAF]);
        carrierFrequency = cf > 0 ? cf : null;
      } else {
        // Simplified 2 * sumAF
        const cf = calculateSimplifiedCarrierFrequency([data.sumAF]);
        carrierFrequency = cf > 0 ? cf : null;
      }
    }

    result.set(popCode, {
      carrierFrequency,
      sumAF: data.sumAF,
      totalAC: data.totalAC,
      maxAN,
      geneticPrevalence,
    });
  }

  return result;
}

/**
 * Build PopulationFrequency results from aggregated data
 * Applies founder effect and low sample size detection using config thresholds.
 *
 * Accepts the extended map from aggregatePopulationFrequenciesWithConfig which
 * includes pre-computed carrierFrequency and geneticPrevalence.
 */
export function buildPopulationFrequencies(
  aggregated: Map<
    string,
    {
      carrierFrequency: number | null;
      sumAF: number;
      totalAC: number;
      maxAN: number;
      geneticPrevalence: number | null;
    }
  >,
  globalCarrierFrequency: number | null,
  version: GnomadVersion
): PopulationFrequency[] {
  const results: PopulationFrequency[] = [];

  for (const [code, data] of aggregated) {
    const carrierFreq = data.carrierFrequency;

    // Use thresholds from config
    const isFounderEffect =
      globalCarrierFrequency !== null &&
      carrierFreq !== null &&
      carrierFreq > globalCarrierFrequency * founderEffectMultiplier;

    results.push({
      code,
      label: getPopulationLabel(code, version),
      carrierFrequency: carrierFreq,
      alleleCount: data.totalAC,
      alleleNumber: data.maxAN,
      isLowSampleSize: data.maxAN < lowSampleSizeThreshold,
      isFounderEffect,
      geneticPrevalence: data.geneticPrevalence,
    });
  }

  // Sort by carrier frequency descending (nulls at end)
  return results.sort((a, b) => {
    if (a.carrierFrequency === null) return 1;
    if (b.carrierFrequency === null) return -1;
    return b.carrierFrequency - a.carrierFrequency;
  });
}
