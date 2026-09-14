// Per-population carrier frequency breakdown by evidence source category
// SRC-03, SRC-04: Split carrier frequency contribution by ClinVar / pLoF / Both

import type {
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  CalcConfig,
} from "../types/index.js";
import type { SourceCategory } from "../filters/source-classification.js";
import { classifyVariantSource } from "../filters/source-classification.js";
import type { ClinVarSubmission } from "../queries/index.js";

import { calculateVCR, calculateGCR } from "./homozygote-exclusion.js";
import {
  calculateHWECarrierFrequency,
  calculateSimplifiedCarrierFrequency,
} from "./carrier-frequency.js";

const SOURCE_LABELS: Record<SourceCategory, string> = {
  clinvar_only: "ClinVar",
  plof_only: "pLoF",
  both: "Both",
};

export interface SourceBreakdownRow {
  sourceCategory: SourceCategory;
  label: string;
  variantCount: number;
  carrierFrequency: number | null;
  alleleCount: number;
  alleleNumber: number;
}

/**
 * Compute per-population carrier frequency split by evidence source category.
 *
 * Groups the provided variants into clinvar_only / plof_only / both buckets,
 * then calculates carrier frequency for each group within the
 * specified population respecting CalcConfig (homozygote exclusion and HWE formula).
 * Groups with no variants are omitted.
 *
 * Uses the same joint-first data preference as aggregatePopulationFrequenciesWithConfig.
 *
 * @param variants - Pathogenicity-filtered gnomAD variants (before quality/manual exclusions)
 * @param clinvarVariants - ClinVar variants for cross-reference
 * @param filterConfig - Filter configuration (ClinVar star threshold, conflicting settings)
 * @param populationCode - gnomAD population code (e.g. "afr", "eur")
 * @param calcConfig - Calculation configuration (HWE formula & homozygote exclusion toggles)
 * @param submissionsMap - Optional map of variant_id to ClinVar submissions
 */
export function computeSourceBreakdown(
  variants: GnomadVariant[],
  clinvarVariants: ClinVarVariant[],
  filterConfig: FilterConfig,
  populationCode: string,
  calcConfig: CalcConfig,
  submissionsMap?: Map<string, ClinVarSubmission[]>,
): SourceBreakdownRow[] {
  const groups: Record<SourceCategory, GnomadVariant[]> = {
    clinvar_only: [],
    plof_only: [],
    both: [],
  };

  for (const variant of variants) {
    const cat = classifyVariantSource(
      variant,
      clinvarVariants,
      filterConfig,
      submissionsMap,
    );
    groups[cat].push(variant);
  }

  const rows: SourceBreakdownRow[] = [];

  for (const cat of ["clinvar_only", "plof_only", "both"] as SourceCategory[]) {
    const groupVariants = groups[cat];
    if (groupVariants.length === 0) continue;

    let totalAC = 0;
    let maxAN = 0;
    const afs: number[] = [];
    const vcrs: number[] = [];

    for (const variant of groupVariants) {
      let ac: number;
      let an: number;
      let hom: number;

      const jointPop = variant.joint?.populations?.find(
        (p) => p.id === populationCode,
      );
      if (jointPop) {
        ac = jointPop.ac;
        an = jointPop.an;
        hom = jointPop.homozygote_count;
      } else {
        const exomePop = variant.exome?.populations?.find(
          (p) => p.id === populationCode,
        );
        const genomePop = variant.genome?.populations?.find(
          (p) => p.id === populationCode,
        );
        ac = (exomePop?.ac ?? 0) + (genomePop?.ac ?? 0);
        an = (exomePop?.an ?? 0) + (genomePop?.an ?? 0);
        hom = (exomePop?.ac_hom ?? 0) + (genomePop?.ac_hom ?? 0);
      }

      totalAC += ac;
      maxAN = Math.max(maxAN, an);
      if (an > 0) {
        afs.push(ac / an);
        vcrs.push(calculateVCR(ac, an, hom));
      }
    }

    let carrierFrequency: number | null = null;
    if (totalAC > 0 && maxAN > 0) {
      if (calcConfig.useHomExclusion) {
        carrierFrequency = calculateGCR(vcrs);
      } else if (calcConfig.useHWEFormula) {
        carrierFrequency = calculateHWECarrierFrequency(afs);
      } else {
        carrierFrequency = calculateSimplifiedCarrierFrequency(afs);
      }
    }

    rows.push({
      sourceCategory: cat,
      label: SOURCE_LABELS[cat],
      variantCount: groupVariants.length,
      carrierFrequency,
      alleleCount: totalAC,
      alleleNumber: maxAN,
    });
  }

  return rows;
}
