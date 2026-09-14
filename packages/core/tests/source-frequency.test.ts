import { describe, it, expect } from "vitest";
import { computeSourceBreakdown } from "../src/calculations/source-frequency.js";
import type {
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
  CalcConfig,
} from "../src/types/index.js";
import { FACTORY_FILTER_DEFAULTS } from "../src/types/filter.js";
import { FACTORY_CALC_DEFAULTS } from "../src/types/calculations.js";

describe("computeSourceBreakdown", () => {
  const filterConfig: FilterConfig = { ...FACTORY_FILTER_DEFAULTS };
  const calcConfig: CalcConfig = { ...FACTORY_CALC_DEFAULTS };

  const createVariant = (
    id: string,
    lof: string | null,
    jointPop?: { id: string; ac: number; an: number; homozygote_count: number },
  ): GnomadVariant => ({
    variant_id: id,
    pos: 1000,
    ref: "A",
    alt: "G",
    transcript_consequence: {
      gene_symbol: "TEST",
      transcript_id: "ENST1",
      canonical: true,
      consequence_terms: lof ? ["stop_gained"] : ["missense_variant"],
      lof,
      lof_filter: null,
      lof_flags: null,
      hgvsc: "c.100A>G",
      hgvsp: "p.Lys34Arg",
    },
    joint: jointPop
      ? {
          ac: jointPop.ac,
          an: jointPop.an,
          homozygote_count: jointPop.homozygote_count,
          hemizygote_count: 0,
          populations: [jointPop],
        }
      : undefined,
  });

  it("returns empty array when no variants provided", () => {
    const rows = computeSourceBreakdown([], [], filterConfig, "nfe", calcConfig);
    expect(rows).toEqual([]);
  });

  it("correctly groups and computes frequencies for plof_only variant", () => {
    // HC LoF variant, no ClinVar match
    const v = createVariant("1-100-A-G", "HC", {
      id: "nfe",
      ac: 10,
      an: 1000,
      homozygote_count: 0,
    });

    const rows = computeSourceBreakdown([v], [], filterConfig, "nfe", calcConfig);
    expect(rows.length).toBe(1);
    expect(rows[0].sourceCategory).toBe("plof_only");
    expect(rows[0].label).toBe("pLoF");
    expect(rows[0].variantCount).toBe(1);
    expect(rows[0].alleleCount).toBe(10);
    expect(rows[0].alleleNumber).toBe(1000);
    // VCR = 10 / (1000 / 2) = 0.02
    expect(rows[0].carrierFrequency).toBeCloseTo(0.02, 6);
  });

  it("correctly groups and computes frequencies for clinvar_only variant", () => {
    // Missense variant with ClinVar P/LP match
    const v = createVariant("1-200-A-G", null, {
      id: "nfe",
      ac: 20,
      an: 1000,
      homozygote_count: 1,
    });
    const cv: ClinVarVariant = {
      variant_id: "1-200-A-G",
      clinvar_variation_id: "123",
      clinical_significance: "Pathogenic",
      gold_stars: 2,
      review_status: "criteria provided, multiple submitters, no conflicts",
      pos: 200,
      ref: "A",
      alt: "G",
    };

    const rows = computeSourceBreakdown([v], [cv], filterConfig, "nfe", calcConfig);
    expect(rows.length).toBe(1);
    expect(rows[0].sourceCategory).toBe("clinvar_only");
    expect(rows[0].label).toBe("ClinVar");
    // VCR = (20 - 2) / (1000 / 2) = 18 / 500 = 0.036
    expect(rows[0].carrierFrequency).toBeCloseTo(0.036, 6);
  });

  it("correctly handles both plof and clinvar evidence", () => {
    const v = createVariant("1-300-A-G", "HC", {
      id: "nfe",
      ac: 4,
      an: 1000,
      homozygote_count: 0,
    });
    const cv: ClinVarVariant = {
      variant_id: "1-300-A-G",
      clinvar_variation_id: "456",
      clinical_significance: "Pathogenic",
      gold_stars: 2,
      review_status: "criteria provided, multiple submitters, no conflicts",
      pos: 300,
      ref: "A",
      alt: "G",
    };

    const rows = computeSourceBreakdown([v], [cv], filterConfig, "nfe", calcConfig);
    expect(rows.length).toBe(1);
    expect(rows[0].sourceCategory).toBe("both");
    expect(rows[0].label).toBe("Both");
    expect(rows[0].carrierFrequency).toBeCloseTo(4 / 500, 6);
  });

  it("respects calcConfig toggles (homozygote exclusion off + HWE)", () => {
    const v = createVariant("1-100-A-G", "HC", {
      id: "nfe",
      ac: 10,
      an: 1000,
      homozygote_count: 2,
    });

    const noHomExclConfig: CalcConfig = {
      ...calcConfig,
      useHomExclusion: false,
      useHWEFormula: true,
    };

    const rows = computeSourceBreakdown(
      [v],
      [],
      filterConfig,
      "nfe",
      noHomExclConfig,
    );
    expect(rows.length).toBe(1);
    // q = 10 / 1000 = 0.01, 2pq = 2 * 0.99 * 0.01 = 0.0198
    expect(rows[0].carrierFrequency).toBeCloseTo(0.0198, 6);
  });

  it("pools exome and genome counts when joint frequency is unavailable", () => {
    const v: GnomadVariant = {
      variant_id: "1-500-C-T",
      pos: 500,
      ref: "C",
      alt: "T",
      transcript_consequence: {
        gene_symbol: "TEST",
        transcript_id: "ENST1",
        canonical: true,
        consequence_terms: ["stop_gained"],
        lof: "HC",
        lof_filter: null,
        lof_flags: null,
        hgvsc: "c.500C>T",
        hgvsp: "p.Gln167Ter",
      },
      exome: {
        ac: 3,
        an: 500,
        ac_hom: 0,
        populations: [{ id: "afr", ac: 3, an: 500, ac_hom: 0 }],
      },
      genome: {
        ac: 2,
        an: 500,
        ac_hom: 0,
        populations: [{ id: "afr", ac: 2, an: 500, ac_hom: 0 }],
      },
    };

    const rows = computeSourceBreakdown([v], [], filterConfig, "afr", calcConfig);
    expect(rows.length).toBe(1);
    expect(rows[0].alleleCount).toBe(5);
    expect(rows[0].alleleNumber).toBe(1000);
    // VCR = 5 / (1000 / 2) = 0.01
    expect(rows[0].carrierFrequency).toBeCloseTo(0.01, 6);
  });
});
