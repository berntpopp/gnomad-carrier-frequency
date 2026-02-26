// Per-population carrier frequency breakdown by evidence source category
// SRC-03, SRC-04: Split carrier frequency contribution by ClinVar / pLoF / Both

import type { GnomadVariant, ClinVarVariant, FilterConfig, CalcConfig } from '../types/index.js';
import type { SourceCategory } from '../filters/source-classification.js';
import { classifyVariantSource } from '../filters/source-classification.js';
import type { ClinVarSubmission } from '../queries/index.js';

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
 * then calculates allele-sum carrier frequency for each group within the
 * specified population. Groups with no variants are omitted.
 *
 * Uses the same joint-first data preference as aggregatePopulationFrequenciesWithConfig.
 *
 * @param variants - Pathogenicity-filtered gnomAD variants (before quality/manual exclusions)
 * @param clinvarVariants - ClinVar variants for cross-reference
 * @param filterConfig - Filter configuration (ClinVar star threshold, conflicting settings)
 * @param populationCode - gnomAD population code (e.g. "afr", "eur")
 * @param calcConfig - Calculation configuration (HWE formula toggle)
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
    const cat = classifyVariantSource(variant, clinvarVariants, filterConfig, submissionsMap);
    groups[cat].push(variant);
  }

  const rows: SourceBreakdownRow[] = [];
  const labels: Record<SourceCategory, string> = {
    clinvar_only: 'ClinVar',
    plof_only: 'pLoF',
    both: 'Both',
  };

  for (const cat of ['clinvar_only', 'plof_only', 'both'] as SourceCategory[]) {
    const groupVariants = groups[cat];
    if (groupVariants.length === 0) continue;

    let sumAF = 0;
    let totalAC = 0;
    let maxAN = 0;

    for (const variant of groupVariants) {
      let ac: number;
      let an: number;

      const jointPop = variant.joint?.populations?.find(p => p.id === populationCode);
      if (jointPop) {
        ac = jointPop.ac;
        an = jointPop.an;
      } else {
        const exomePop = variant.exome?.populations?.find(p => p.id === populationCode);
        const genomePop = variant.genome?.populations?.find(p => p.id === populationCode);
        ac = (exomePop?.ac ?? 0) + (genomePop?.ac ?? 0);
        an = (exomePop?.an ?? 0) + (genomePop?.an ?? 0);
      }

      totalAC += ac;
      maxAN = Math.max(maxAN, an);
      if (an > 0) {
        sumAF += ac / an;
      }
    }

    let carrierFrequency: number | null = null;
    if (sumAF > 0) {
      if (calcConfig.useHWEFormula) {
        const q = sumAF;
        carrierFrequency = 2 * (1 - q) * q;
      } else {
        carrierFrequency = 2 * sumAF;
      }
    }

    rows.push({
      sourceCategory: cat,
      label: labels[cat],
      variantCount: groupVariants.length,
      carrierFrequency,
      alleleCount: totalAC,
      alleleNumber: maxAN,
    });
  }

  return rows;
}
