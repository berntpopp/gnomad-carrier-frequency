/**
 * Gene query pipeline for the gnomAD CF CLI.
 *
 * Orchestrates the full data pipeline:
 *   fetch gene variants -> filter pathogenic -> aggregate frequencies -> return result
 *
 * All calculation logic is delegated to @gnomad-cf/core — no reimplementation here.
 */

import { executeGraphQLQuery } from "@gnomad-cf/core/client";
import {
  GENE_VARIANTS_QUERY,
  GENE_SEARCH_QUERY,
  type GeneVariantsResponse,
  type GeneSearchResponse,
  type GeneClinvarVariant,
} from "@gnomad-cf/core/queries";
import { filterPathogenicVariantsConfigurable } from "@gnomad-cf/core/filters";
import {
  aggregatePopulationFrequenciesWithConfig,
  buildPopulationFrequencies,
  calculateHWECarrierFrequency,
  calculateSimplifiedCarrierFrequency,
  calculateGCR,
  calculateVCR,
  calculateGeneticPrevalence,
  calculateBayesianPrevalence,
} from "@gnomad-cf/core/calculations";
import {
  getDatasetId,
  getReferenceGenome,
  type GnomadVersion,
} from "@gnomad-cf/core/config";
import type { QueryResult, QueryOptions } from "../types.js";
import { withRetry } from "./retry.js";

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Query gnomAD for a gene and return a fully aggregated carrier frequency result.
 *
 * Steps:
 *  1. Fetch gene variants via GraphQL (with retry)
 *  2. Validate response (GraphQL errors, gene not found)
 *  3. Filter to pathogenic variants (LoF HC + ClinVar P/LP per filterConfig)
 *  4. Aggregate per-population frequencies (respects calcConfig: HWE/simplified/VCR)
 *  5. Build PopulationFrequency[] with founder-effect and low-sample flags
 *  6. Compute global stats (sumAF, AC, AN, carrier frequency, prevalence)
 *  7. Return structured QueryResult
 *
 * @param gene - Gene symbol (e.g., "CFTR") — case-insensitive
 * @param opts - Query options: version, filterConfig, calcConfig, optional population filter
 */
export async function queryGene(
  gene: string,
  opts: QueryOptions,
): Promise<QueryResult> {
  const dataset = getDatasetId(opts.version);
  const referenceGenome = getReferenceGenome(opts.version);

  // 1. Fetch variants from gnomAD with retry
  const response = await withRetry(() =>
    executeGraphQLQuery<GeneVariantsResponse>(
      {
        query: GENE_VARIANTS_QUERY,
        variables: {
          geneSymbol: gene.toUpperCase(),
          dataset,
          referenceGenome,
        },
      },
      opts.version,
    ),
  );

  // 2. Check for GraphQL errors
  if (response.errors && response.errors.length > 0) {
    throw new Error(
      `gnomAD API error: ${response.errors.map((e) => e.message).join("; ")}`,
    );
  }

  // 3. Check gene exists
  const geneData = response.data?.gene;
  if (!geneData) {
    throw new Error(`Gene "${gene}" not found in gnomAD`);
  }

  const { variants, clinvar_variants } = geneData;

  // Normalize GeneVariant (null exome/genome/joint) to GnomadVariant (undefined)
  // gnomAD API returns null for missing data; core filter functions expect undefined
  const normalizedVariants = variants.map((v) => ({
    ...v,
    exome: v.exome ?? undefined,
    genome: v.genome ?? undefined,
    joint: v.joint ?? undefined,
  }));

  // 4. Filter to pathogenic variants
  const pathogenic = filterPathogenicVariantsConfigurable(
    normalizedVariants,
    clinvar_variants,
    opts.filterConfig,
    new Map(),
  );

  // 5. Aggregate per-population frequencies
  const aggregated = aggregatePopulationFrequenciesWithConfig(
    pathogenic,
    opts.version,
    opts.calcConfig,
  );

  // 6. Compute global carrier frequency (same formula as population aggregation)
  const globalStats = computeGlobalStats(pathogenic, opts.calcConfig);

  // 7. Build PopulationFrequency[] (with founder-effect + low-sample-size flags)
  let populations = buildPopulationFrequencies(
    aggregated,
    globalStats.globalCarrierFrequency,
    opts.version,
  );

  // Optional: filter to a single population
  if (opts.population) {
    populations = populations.filter((p) => p.code === opts.population);
  }

  // 8. Assemble variant details for optional inclusion
  const variantDetails = pathogenic.map((v) => ({
    variant_id: v.variant_id,
    consequence: v.transcript_consequence?.consequence_terms?.[0] ?? "unknown",
    alleleFrequency: computeVariantGlobalAF(v),
    clinvarSignificance: findClinvarSignificance(
      v.variant_id,
      clinvar_variants,
    ),
    ac_hom: v.joint
      ? v.joint.homozygote_count
      : (v.exome?.ac_hom ?? 0) + (v.genome?.ac_hom ?? 0),
  }));

  // 9. Determine which formula label to use
  const formula: "hwe" | "simplified" = opts.calcConfig.useHWEFormula
    ? "hwe"
    : "simplified";

  return {
    gene: gene.toUpperCase(),
    version: opts.version,
    variantCount: pathogenic.length,
    populations,
    globalCarrierFrequency: globalStats.globalCarrierFrequency,
    globalAlleleCount: globalStats.globalAlleleCount,
    globalAlleleNumber: globalStats.globalAlleleNumber,
    globalSumAF: globalStats.globalSumAF,
    geneticPrevalence: globalStats.geneticPrevalence,
    bayesianPrevalence: globalStats.bayesianPrevalence,
    formula,
    homExclusionActive: opts.calcConfig.useHomExclusion,
    penetrance: opts.calcConfig.penetrance,
    variants: variantDetails,
  };
}

// ---------------------------------------------------------------------------
// Gene search
// ---------------------------------------------------------------------------

/**
 * Search for genes by name or symbol prefix.
 *
 * @param query - Search string (e.g., "CFT", "CFTR")
 * @param version - gnomAD version for reference genome selection
 * @returns Array of matching genes with symbol and Ensembl ID
 */
export async function searchGenes(
  query: string,
  version?: GnomadVersion,
): Promise<Array<{ symbol: string; ensembl_id: string }>> {
  const referenceGenome = getReferenceGenome(version);

  const response = await withRetry(() =>
    executeGraphQLQuery<GeneSearchResponse>(
      {
        query: GENE_SEARCH_QUERY,
        variables: { query, referenceGenome },
      },
      version,
    ),
  );

  return response.data?.gene_search ?? [];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute global stats across all pathogenic variants.
 *
 * Global carrier frequency uses the same formula selection as per-population
 * aggregation (HWE, simplified, or VCR/GCR with homozygote exclusion).
 */
function computeGlobalStats(
  variants: ReturnType<typeof filterPathogenicVariantsConfigurable>,
  calcConfig: QueryOptions["calcConfig"],
): {
  globalSumAF: number;
  globalAlleleCount: number;
  globalAlleleNumber: number;
  globalCarrierFrequency: number | null;
  geneticPrevalence: number | null;
  bayesianPrevalence: number | null;
} {
  let globalSumAF = 0;
  let globalAlleleCount = 0;
  let globalAlleleNumber = 0;
  const vcrs: number[] = [];

  for (const v of variants) {
    let combinedAC: number;
    let combinedAN: number;
    let combinedAcHom: number;

    if (v.joint) {
      // Prefer joint data (gnomAD v4) — properly combines exome+genome using coverage
      combinedAC = v.joint.ac;
      combinedAN = v.joint.an;
      combinedAcHom = v.joint.homozygote_count;
    } else {
      combinedAC = (v.exome?.ac ?? 0) + (v.genome?.ac ?? 0);
      combinedAN = (v.exome?.an ?? 0) + (v.genome?.an ?? 0);
      combinedAcHom = (v.exome?.ac_hom ?? 0) + (v.genome?.ac_hom ?? 0);
    }

    globalAlleleCount += combinedAC;
    globalAlleleNumber = Math.max(globalAlleleNumber, combinedAN);

    if (combinedAN > 0) {
      globalSumAF += combinedAC / combinedAN;

      if (calcConfig.useHomExclusion) {
        vcrs.push(calculateVCR(combinedAC, combinedAN, combinedAcHom));
      }
    }
  }

  // Compute global carrier frequency using the same formula as population agg
  let globalCarrierFrequency: number | null = null;

  if (variants.length > 0 && globalSumAF > 0) {
    if (calcConfig.useHomExclusion && vcrs.length > 0) {
      const gcr = calculateGCR(vcrs);
      globalCarrierFrequency = gcr > 0 ? gcr : null;
    } else if (calcConfig.useHWEFormula) {
      const cf = calculateHWECarrierFrequency([globalSumAF]);
      globalCarrierFrequency = cf > 0 ? cf : null;
    } else {
      const cf = calculateSimplifiedCarrierFrequency([globalSumAF]);
      globalCarrierFrequency = cf > 0 ? cf : null;
    }
  }

  // Genetic prevalence: always q^2 from raw sumAF (never from carrier frequency)
  // Delegated to core functions for single source of truth
  const geneticPrevalence =
    globalSumAF > 0 ? calculateGeneticPrevalence([globalSumAF]) : null;
  const bayesianPrevalence =
    geneticPrevalence !== null && geneticPrevalence > 0
      ? calculateBayesianPrevalence(geneticPrevalence, calcConfig.penetrance)
      : null;

  return {
    globalSumAF,
    globalAlleleCount,
    globalAlleleNumber,
    globalCarrierFrequency,
    geneticPrevalence,
    bayesianPrevalence,
  };
}

/**
 * Compute the combined global allele frequency for a single variant.
 * Returns 0 if neither exome nor genome data is available.
 */
function computeVariantGlobalAF(
  variant: ReturnType<typeof filterPathogenicVariantsConfigurable>[number],
): number {
  let combinedAC: number;
  let combinedAN: number;

  if (variant.joint) {
    combinedAC = variant.joint.ac;
    combinedAN = variant.joint.an;
  } else {
    combinedAC = (variant.exome?.ac ?? 0) + (variant.genome?.ac ?? 0);
    combinedAN = (variant.exome?.an ?? 0) + (variant.genome?.an ?? 0);
  }

  return combinedAN > 0 ? combinedAC / combinedAN : 0;
}

/**
 * Find ClinVar clinical significance for a variant, if present.
 */
function findClinvarSignificance(
  variantId: string,
  clinvarVariants: GeneClinvarVariant[],
): string | null {
  const match = clinvarVariants.find((cv) => cv.variant_id === variantId);
  return match?.clinical_significance ?? null;
}
