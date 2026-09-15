import { describe, it, expect } from "vitest";
import {
  AnalysisContextSchema,
  type AnalysisContext,
} from "../src/types/context.js";

describe("AnalysisContextSchema", () => {
  const validContext: AnalysisContext = {
    revision: 1,
    target: {
      geneSymbol: "CFTR",
      geneId: "ENSG00000001626",
      dataset: "v4",
      referenceGenome: "GRCh38",
      subcontinentalEnabled: false,
    },
    clinical: {
      indexStatus: "heterozygous",
      frequencySource: "gnomad",
      literatureCarrierFrequency: null,
      literaturePmid: null,
      penetrance: 1.0,
    },
    filters: {
      selectedProfileName: "Standard Pathogenic",
      includeLof: true,
      includeMissense: true,
      includeClinvarPathogenic: true,
      clinvarReviewStarsMin: 1,
      includeConflictingClinvar: false,
      clinvarConflictingThreshold: 80,
      conflictingReviewStarsMin: 2,
    },
    quality: {
      highAfEnabled: true,
      highAfThreshold: 0.05,
      highHomEnabled: true,
      highHomMethod: "hwe_relative",
      highHomAbsoluteThreshold: 10,
      highHomHWEMultiplier: 2.0,
      gnomadFilteredEnabled: true,
      genomesOnlyEnabled: false,
      excludeHighAf: true,
      excludeHighHom: true,
      excludeGnomadFiltered: true,
      excludeGenomesOnly: false,
      excludeLowAN: false,
      minAlleleNumber: 2000,
    },
    exclusions: {
      manualExcludedVariantIds: ["1-12345-A-G"],
      qualityExcludedVariantIds: ["1-67890-C-T"],
      exclusionReasons: {
        "1-12345-A-G": "Manual review: benign artifact",
        "1-67890-C-T": "Quality: High homozygote count",
      },
    },
    calculation: {
      formula: "hwe",
      useHomozygoteExclusion: true,
      useBayesianPrevalence: true,
    },
    provenance: {
      isDefaultFallback: false,
      cacheTimestamp: 1726344000000,
      clinvarSubmissionBatchId: "batch-123",
      appVersion: "1.9.0",
    },
  };

  it("validates a fully populated valid AnalysisContext", () => {
    const result = AnalysisContextSchema.safeParse(validContext);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target.geneSymbol).toBe("CFTR");
      expect(result.data.clinical.penetrance).toBe(1.0);
    }
  });

  it("rejects invalid revision (negative)", () => {
    const invalid = { ...validContext, revision: -1 };
    const result = AnalysisContextSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid penetrance (> 1.0 or < 0.0)", () => {
    const invalidHigh = {
      ...validContext,
      clinical: { ...validContext.clinical, penetrance: 1.5 },
    };
    expect(AnalysisContextSchema.safeParse(invalidHigh).success).toBe(false);

    const invalidLow = {
      ...validContext,
      clinical: { ...validContext.clinical, penetrance: -0.1 },
    };
    expect(AnalysisContextSchema.safeParse(invalidLow).success).toBe(false);
  });

  it("rejects invalid dataset", () => {
    const invalid = {
      ...validContext,
      target: { ...validContext.target, dataset: "v1" },
    };
    expect(AnalysisContextSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts all four IndexPatientStatus values", () => {
    const statuses = [
      "heterozygous",
      "homozygous",
      "compound_het_confirmed",
      "compound_het_assumed",
    ] as const;

    for (const status of statuses) {
      const ctx = {
        ...validContext,
        clinical: { ...validContext.clinical, indexStatus: status },
      };
      expect(AnalysisContextSchema.safeParse(ctx).success).toBe(true);
    }
  });

  it("handles empty exclusion collections", () => {
    const ctx = {
      ...validContext,
      exclusions: {
        manualExcludedVariantIds: [],
        qualityExcludedVariantIds: [],
        exclusionReasons: {},
      },
    };
    const result = AnalysisContextSchema.safeParse(ctx);
    expect(result.success).toBe(true);
  });
});
