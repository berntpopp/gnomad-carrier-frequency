import { z } from "zod";

/**
 * Zod schema for complete, lossless analysis context validation.
 *
 * Ensures all influential settings (target gene/dataset, clinical index assumptions,
 * pathogenicity filters, quality filter parameters, manual/quality exclusions,
 * calculation formula options, and provenance metadata) are strictly typed
 * and verifiable across worker boundaries, history persistence, and exports.
 */
export const AnalysisContextSchema = z.object({
  /** Monotonically incrementing revision counter */
  revision: z.number().int().nonnegative(),

  /** Genetic & Dataset Target */
  target: z.object({
    geneSymbol: z.string().min(1),
    geneId: z.string().min(1),
    dataset: z.enum(["v4", "v3", "v2"]),
    referenceGenome: z.enum(["GRCh38", "GRCh37"]),
    subcontinentalEnabled: z.boolean(),
  }),

  /** Clinical Index Assumptions */
  clinical: z.object({
    indexStatus: z.enum([
      "heterozygous",
      "homozygous",
      "compound_het_confirmed",
      "compound_het_assumed",
    ]),
    frequencySource: z.enum(["gnomad", "literature", "default"]),
    literatureCarrierFrequency: z.number().nullable(),
    literaturePmid: z.string().nullable(),
    penetrance: z.number().min(0.0).max(1.0).default(1.0),
  }),

  /** Pathogenicity & Classification Filters */
  filters: z.object({
    selectedProfileName: z.string().nullable(),
    includeLof: z.boolean(),
    includeMissense: z.boolean(),
    includeClinvarPathogenic: z.boolean(),
    clinvarReviewStarsMin: z.number().int().min(0).max(4),
    includeConflictingClinvar: z.boolean(),
    clinvarConflictingThreshold: z.number().int().min(0).max(100),
    conflictingReviewStarsMin: z.number().int().min(0).max(4),
  }),

  /** Quality Filter Parameters */
  quality: z.object({
    highAfEnabled: z.boolean(),
    highAfThreshold: z.number(),
    highHomEnabled: z.boolean(),
    highHomMethod: z.enum(["hwe_relative", "absolute"]),
    highHomAbsoluteThreshold: z.number(),
    highHomHWEMultiplier: z.number(),
    gnomadFilteredEnabled: z.boolean(),
    genomesOnlyEnabled: z.boolean(),

    excludeHighAf: z.boolean(),
    excludeHighHom: z.boolean(),
    excludeGnomadFiltered: z.boolean(),
    excludeGenomesOnly: z.boolean(),

    excludeLowAN: z.boolean(),
    minAlleleNumber: z.number(),
  }),

  /** Independent Exclusions */
  exclusions: z.object({
    manualExcludedVariantIds: z.array(z.string()),
    qualityExcludedVariantIds: z.array(z.string()),
    exclusionReasons: z.record(z.string(), z.string()),
  }),

  /** Calculation Formula Parameters */
  calculation: z.object({
    formula: z.enum(["hwe", "simplified"]),
    useHomozygoteExclusion: z.boolean(),
    useBayesianPrevalence: z.boolean(),
  }),

  /** Provenance Metadata */
  provenance: z.object({
    isDefaultFallback: z.boolean(),
    cacheTimestamp: z.number().nullable(),
    clinvarSubmissionBatchId: z.string().nullable(),
    appVersion: z.string(),
  }),
});

export type AnalysisContext = z.infer<typeof AnalysisContextSchema>;
