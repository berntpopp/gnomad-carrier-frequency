import { describe, it, expect } from "vitest";
import {
  getClinvarColor,
  formatAlleleFrequency,
  getConsequenceLabel,
  toDisplayVariant,
  toDisplayVariants,
  getPopulationVariants,
  filterVariantsByPopulation,
} from "../src/filters/index.js";

// ---------------------------------------------------------------------------
// getClinvarColor
// ---------------------------------------------------------------------------

describe("getClinvarColor", () => {
  it("returns 'default' for null status", () => {
    expect(getClinvarColor(null)).toBe("default");
  });

  it("returns 'default' for empty string", () => {
    expect(getClinvarColor("")).toBe("default");
  });

  it("returns 'error' for Pathogenic", () => {
    expect(getClinvarColor("Pathogenic")).toBe("error");
  });

  it("returns 'error' for pathogenic (lowercase)", () => {
    expect(getClinvarColor("pathogenic")).toBe("error");
  });

  it("returns 'warning' for Likely pathogenic", () => {
    expect(getClinvarColor("Likely pathogenic")).toBe("warning");
  });

  it("returns 'warning' for Likely_pathogenic (underscore)", () => {
    expect(getClinvarColor("Likely_pathogenic")).toBe("warning");
  });

  it("returns 'grey' for Uncertain significance", () => {
    expect(getClinvarColor("Uncertain significance")).toBe("grey");
  });

  it("returns 'grey' for VUS", () => {
    expect(getClinvarColor("VUS")).toBe("grey");
  });

  it("returns 'success' for Benign", () => {
    expect(getClinvarColor("Benign")).toBe("success");
  });

  it("returns 'success' for Likely benign", () => {
    expect(getClinvarColor("Likely benign")).toBe("success");
  });

  // Regression: conflicting text contains "pathogenic" — must return deep-orange, not error
  it("returns 'deep-orange' for Conflicting interpretations of pathogenicity", () => {
    expect(
      getClinvarColor("Conflicting interpretations of pathogenicity"),
    ).toBe("deep-orange");
  });

  it("returns 'deep-orange' for conflicting (any casing)", () => {
    expect(getClinvarColor("CONFLICTING interpretations")).toBe("deep-orange");
  });

  it("returns 'default' for unknown classification", () => {
    expect(getClinvarColor("not provided")).toBe("default");
  });
});

// ---------------------------------------------------------------------------
// formatAlleleFrequency
// ---------------------------------------------------------------------------

describe("formatAlleleFrequency", () => {
  it("returns '-' for null", () => {
    expect(formatAlleleFrequency(null)).toBe("-");
  });

  it("returns '0' for zero", () => {
    expect(formatAlleleFrequency(0)).toBe("0");
  });

  it("uses scientific notation for very small values", () => {
    expect(formatAlleleFrequency(0.00001)).toBe("1.00e-5");
  });

  it("uses fixed notation for normal values", () => {
    expect(formatAlleleFrequency(0.04)).toBe("0.040000");
  });

  it("uses fixed notation at boundary (0.0001)", () => {
    expect(formatAlleleFrequency(0.0001)).toBe("0.000100");
  });

  it("uses scientific notation just below boundary", () => {
    const result = formatAlleleFrequency(0.00009999);
    expect(result).toMatch(/e-/);
  });
});

// ---------------------------------------------------------------------------
// getConsequenceLabel
// ---------------------------------------------------------------------------

describe("getConsequenceLabel", () => {
  it("returns 'Unknown' for empty array", () => {
    expect(getConsequenceLabel([])).toBe("Unknown");
  });

  it("replaces underscores with spaces", () => {
    expect(getConsequenceLabel(["missense_variant"])).toBe("missense variant");
  });

  it("returns first term when multiple present", () => {
    expect(getConsequenceLabel(["stop_gained", "splice_donor_variant"])).toBe(
      "stop gained",
    );
  });
});

describe("toDisplayVariant & toDisplayVariants", () => {
  const gnomadVar = {
    variant_id: "1-1000-A-T",
    pos: 1000,
    ref: "A",
    alt: "T",
    joint: {
      ac: 10,
      an: 1000,
      homozygote_count: 0,
      hemizygote_count: 0,
      populations: [{ id: "nfe", ac: 6, an: 500, homozygote_count: 0 }],
    },
    transcript_consequence: {
      gene_symbol: "TEST",
      transcript_id: "ENST1",
      canonical: true,
      consequence_terms: ["stop_gained"],
      lof: "HC",
      lof_filter: null,
      lof_flags: null,
      hgvsc: "c.100A>T",
      hgvsp: "p.Lys34Ter",
    },
  };

  const clinvarVar = {
    variant_id: "1-1000-A-T",
    clinvar_variation_id: "999",
    clinical_significance: "Pathogenic",
    gold_stars: 2,
    review_status: "criteria provided",
    pos: 1000,
    ref: "A",
    alt: "T",
  };

  it("transforms gnomAD variant with global counts", () => {
    const disp = toDisplayVariant(gnomadVar, [clinvarVar]);
    expect(disp.variant_id).toBe("1-1000-A-T");
    expect(disp.consequence).toBe("stop gained");
    expect(disp.alleleCount).toBe(10);
    expect(disp.alleleNumber).toBe(1000);
    expect(disp.alleleFrequency).toBe(0.01);
    expect(disp.clinvarStatus).toBe("Pathogenic");
    expect(disp.isLoF).toBe(true);
    expect(disp.isClinvarPathogenic).toBe(true);
  });

  it("transforms with population-specific counts when populationCode provided", () => {
    const disp = toDisplayVariant(gnomadVar, [clinvarVar], "nfe");
    expect(disp.alleleCount).toBe(6);
    expect(disp.alleleNumber).toBe(500);
    expect(disp.alleleFrequency).toBe(6 / 500);
  });

  it("transforms array of variants via toDisplayVariants", () => {
    const arr = toDisplayVariants([gnomadVar], [clinvarVar]);
    expect(arr.length).toBe(1);
    expect(arr[0].variant_id).toBe("1-1000-A-T");
  });

  it("retrieves population variants via getPopulationVariants", () => {
    const popVars = getPopulationVariants([gnomadVar], "nfe");
    expect(popVars.length).toBe(1);
    expect(popVars[0].populationCode).toBe("nfe");
    expect(popVars[0].alleleCount).toBe(6);
  });

  it("filters variants by population presence via filterVariantsByPopulation", () => {
    expect(filterVariantsByPopulation([gnomadVar], "nfe").length).toBe(1);
    expect(filterVariantsByPopulation([gnomadVar], "afr").length).toBe(0);
  });
});
