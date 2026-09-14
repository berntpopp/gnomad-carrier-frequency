import { describe, it, expect } from "vitest";
import {
  buildExportSummary,
  buildExportPopulations,
  buildExportVariants,
  buildPopulationsTsv,
  buildVariantsTsv,
  buildExportData,
  sanitizeFilename,
  generateFilename,
} from "../export-utils";
import type {
  CarrierFrequencyResult,
  DisplayVariant,
  ExclusionReason,
  PopulationFrequency,
} from "@gnomad-cf/core/types";
import {
  FACTORY_FILTER_DEFAULTS,
  FACTORY_CALC_DEFAULTS,
} from "@gnomad-cf/core/types";

describe("export-utils parity (Lane 3)", () => {
  const mockPopulations: PopulationFrequency[] = [
    {
      code: "nfe",
      label: "Non-Finnish European",
      carrierFrequency: 0.04,
      alleleCount: 20,
      alleleNumber: 1000,
      isLowSampleSize: false,
      isFounderEffect: false,
      geneticPrevalence: 0.0004,
    },
  ];

  const mockResult: CarrierFrequencyResult = {
    gene: "CFTR",
    version: "v4",
    globalCarrierFrequency: 0.04,
    globalAlleleCount: 20,
    globalAlleleNumber: 1000,
    populations: mockPopulations,
    qualifyingVariantCount: 2,
    minFrequency: 0.02,
    maxFrequency: 0.05,
    hasFounderEffect: false,
    geneticPrevalence: 0.0004,
    bayesianPrevalence: 0.0004,
    formula: "hwe",
    homExclusionActive: true,
  };

  const mockVariants: DisplayVariant[] = [
    {
      variant_id: "7-117559590-ATCT-A",
      pos: 117559590,
      ref: "ATCT",
      alt: "A",
      consequence: "frameshift_variant",
      alleleFrequency: 0.015,
      alleleCount: 15,
      alleleNumber: 1000,
      homozygoteCount: 1,
      clinvarStatus: "Pathogenic",
      clinvarVariationId: "7105",
      goldStars: 2,
      hgvsc: "c.1521_1523delCTT",
      hgvsp: "p.Phe508del",
      transcriptId: "ENST00000003084",
      lof: "HC",
      isLoF: true,
      isClinvarPathogenic: true,
      isMissense: false,
    },
  ];

  it("sanitizes filenames and generates date-stamped filenames", () => {
    expect(sanitizeFilename('CFTR:<>"/\\|?*')).toBe("CFTR");
    const filename = generateFilename("CFTR");
    expect(filename).toMatch(/^CFTR_\d{4}-\d{2}-\d{2}$/);
  });

  it("builds summary with full clinical calculation properties", () => {
    const summary = buildExportSummary(mockResult);
    expect(summary.gene).toBe("CFTR");
    expect(summary.globalCarrierFrequency).toBe(0.04);
    expect(summary.geneticPrevalence).toBe(0.0004);
    expect(summary.bayesianPrevalence).toBe(0.0004);
    expect(summary.formula).toBe("hwe");
    expect(summary.homExclusionActive).toBe(true);
  });

  it("builds populations with recurrence risk and prevalence", () => {
    const pops = buildExportPopulations(mockPopulations, "heterozygous", 1.0);
    expect(pops).toHaveLength(1);
    expect(pops[0].carrierFrequency).toBe(0.04);
    // Heterozygous index: 0.04 * 0.25 = 0.01
    expect(pops[0].recurrenceRisk).toBe(0.01);
    expect(pops[0].geneticPrevalence).toBe(0.0004);
  });

  it("builds variants with homozygote counts and exclusion provenance", () => {
    const excludedIds = new Set(["7-117559590-ATCT-A"]);
    const reasons = new Map<string, ExclusionReason>([
      [
        "7-117559590-ATCT-A",
        { type: "clinical_benign", customText: "Benign in literature" },
      ],
    ]);

    const variants = buildExportVariants(mockVariants, excludedIds, reasons);
    expect(variants).toHaveLength(1);
    expect(variants[0].homozygoteCount).toBe(1);
    expect(variants[0].goldStars).toBe(2);
    expect(variants[0].excluded).toBe(true);
    expect(variants[0].exclusionReason).toBeDefined();
    expect(variants[0].exclusionProvenance).toEqual({
      type: "clinical_benign",
      customText: "Benign in literature",
    });
  });

  it("builds population TSV with recurrence risk and prevalence columns", () => {
    const exportData = buildExportData(
      mockResult,
      mockVariants,
      FACTORY_FILTER_DEFAULTS,
      FACTORY_CALC_DEFAULTS,
      undefined,
      undefined,
      "heterozygous",
      1.0,
    );

    const tsv = buildPopulationsTsv(exportData);
    expect(tsv).toContain("Recurrence Risk");
    expect(tsv).toContain("Prevalence");
    expect(tsv).toContain("Non-Finnish European");
  });

  it("builds variants TSV with homozygote count and star columns", () => {
    const exportData = buildExportData(
      mockResult,
      mockVariants,
      FACTORY_FILTER_DEFAULTS,
      FACTORY_CALC_DEFAULTS,
    );

    const tsv = buildVariantsTsv(exportData);
    expect(tsv).toContain("Homozygotes");
    expect(tsv).toContain("Stars");
    expect(tsv).toContain("7-117559590-ATCT-A");
  });
});
