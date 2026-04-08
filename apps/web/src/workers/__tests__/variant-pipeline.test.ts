import { describe, it, expect } from "vitest";
import { processVariants } from "../variant-pipeline";
import type { GnomadVariant, ClinVarVariant } from "@gnomad-cf/core/types";
import { FACTORY_FILTER_DEFAULTS } from "@gnomad-cf/core/types";
import { FACTORY_QUALITY_DEFAULTS, FACTORY_EXCLUSION_DEFAULTS } from "@gnomad-cf/core/types";
import { FACTORY_CALC_DEFAULTS } from "@gnomad-cf/core/types";

// Minimal variant that passes LoF HC filter
function makeLoFVariant(id: string, ac: number, an: number): GnomadVariant {
  return {
    variant_id: id,
    pos: 100,
    ref: "A",
    alt: "T",
    joint: {
      ac,
      an,
      homozygote_count: 0,
      hemizygote_count: 0,
      populations: [{ id: "nfe", ac, an, homozygote_count: 0 }],
    },
    transcript_consequence: {
      gene_symbol: "TEST",
      transcript_id: "ENST00000001",
      canonical: true,
      consequence_terms: ["stop_gained"],
      lof: "HC",
      lof_filter: null,
      lof_flags: null,
      hgvsc: "c.100A>T",
      hgvsp: "p.Lys34Ter",
    },
  };
}

// Variant that should NOT pass filters
function makeNonPathogenicVariant(id: string): GnomadVariant {
  return {
    variant_id: id,
    pos: 200,
    ref: "C",
    alt: "G",
    joint: {
      ac: 5,
      an: 100000,
      homozygote_count: 0,
      hemizygote_count: 0,
      populations: [],
    },
    transcript_consequence: {
      gene_symbol: "TEST",
      transcript_id: "ENST00000001",
      canonical: true,
      consequence_terms: ["synonymous_variant"],
      lof: null,
      lof_filter: null,
      lof_flags: null,
      hgvsc: null,
      hgvsp: null,
    },
  };
}

describe("processVariants", () => {
  const clinvarVariants: ClinVarVariant[] = [];

  it("filters to pathogenic variants and computes all outputs", () => {
    const variants = [
      makeLoFVariant("1-100-A-T", 10, 100000),
      makeLoFVariant("1-200-C-G", 5, 100000),
      makeNonPathogenicVariant("1-300-T-A"),
    ];

    const result = processVariants({
      variants,
      clinvarVariants,
      filterConfig: FACTORY_FILTER_DEFAULTS,
      qualitySettings: FACTORY_QUALITY_DEFAULTS,
      qualityExclusionConfig: FACTORY_EXCLUSION_DEFAULTS,
      calcConfig: FACTORY_CALC_DEFAULTS,
      excludedIds: [],
      submissions: [],
      version: "v4",
    });

    expect(result.filteredByPathogenicity).toHaveLength(2);
    expect(result.qualifyingVariants).toHaveLength(2);
    expect(result.qualityFlagsMap.length).toBe(2);
    expect(result.sourceCategoryMap.length).toBe(2);
    expect(result.globalStats.carrierFrequency).not.toBeNull();
    expect(result.globalStats.totalAC).toBe(15);
    expect(result.totalVariantCount).toBe(3);
  });

  it("applies manual exclusions to qualifying set but not filteredByPathogenicity", () => {
    const variants = [
      makeLoFVariant("1-100-A-T", 10, 100000),
      makeLoFVariant("1-200-C-G", 5, 100000),
    ];

    const result = processVariants({
      variants,
      clinvarVariants,
      filterConfig: FACTORY_FILTER_DEFAULTS,
      qualitySettings: FACTORY_QUALITY_DEFAULTS,
      qualityExclusionConfig: FACTORY_EXCLUSION_DEFAULTS,
      calcConfig: FACTORY_CALC_DEFAULTS,
      excludedIds: ["1-100-A-T"],
      submissions: [],
      version: "v4",
    });

    expect(result.filteredByPathogenicity).toHaveLength(2);
    expect(result.qualifyingVariants).toHaveLength(1);
    expect(result.qualifyingVariants[0]!.variant_id).toBe("1-200-C-G");
  });

  it("returns empty results when no variants pass filters", () => {
    const variants = [makeNonPathogenicVariant("1-300-T-A")];

    const result = processVariants({
      variants,
      clinvarVariants,
      filterConfig: FACTORY_FILTER_DEFAULTS,
      qualitySettings: FACTORY_QUALITY_DEFAULTS,
      qualityExclusionConfig: FACTORY_EXCLUSION_DEFAULTS,
      calcConfig: FACTORY_CALC_DEFAULTS,
      excludedIds: [],
      submissions: [],
      version: "v4",
    });

    expect(result.filteredByPathogenicity).toHaveLength(0);
    expect(result.qualifyingVariants).toHaveLength(0);
    expect(result.globalStats.carrierFrequency).toBeNull();
    expect(result.aggregatedPops).toBeNull();
  });
});
