import { describe, it, expect } from "vitest";
import type {
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
} from "../../types/index.js";
import { FACTORY_FILTER_DEFAULTS } from "../../types/index.js";
import type { ClinVarSubmission } from "../../queries/index.js";
import {
  classifyVariantSource,
  sourceCategoryLabel,
  sourceCategoryColor,
} from "../source-classification.js";

// ─── Minimal mock helpers ────────────────────────────────────────────────────

function makeVariant(overrides: Partial<GnomadVariant> = {}): GnomadVariant {
  return {
    variant_id: "1-12345-A-G",
    pos: 12345,
    ref: "A",
    alt: "G",
    transcript_consequence: null,
    joint: {
      ac: 10,
      an: 10000,
      homozygote_count: 0,
      hemizygote_count: 0,
      populations: [],
    },
    ...overrides,
  };
}

function makeLoFVariant(): GnomadVariant {
  return makeVariant({
    transcript_consequence: {
      gene_symbol: "CFTR",
      transcript_id: "ENST00000003084",
      canonical: true,
      consequence_terms: ["stop_gained"],
      lof: "HC",
      lof_filter: null,
      lof_flags: null,
      hgvsc: "c.100C>T",
      hgvsp: "p.Arg34*",
    },
  });
}

function makeLcLofVariant(): GnomadVariant {
  return makeVariant({
    transcript_consequence: {
      gene_symbol: "CFTR",
      transcript_id: "ENST00000003084",
      canonical: true,
      consequence_terms: ["missense_variant"],
      lof: "LC", // Low confidence LoF — should NOT count as pLoF source
      lof_filter: "SINGLE_EXON",
      lof_flags: null,
      hgvsc: "c.100C>T",
      hgvsp: "p.Arg34Ser",
    },
  });
}

function makeNoLoFVariant(): GnomadVariant {
  return makeVariant({
    transcript_consequence: {
      gene_symbol: "CFTR",
      transcript_id: "ENST00000003084",
      canonical: true,
      consequence_terms: ["missense_variant"],
      lof: null,
      lof_filter: null,
      lof_flags: null,
      hgvsc: "c.200G>A",
      hgvsp: "p.Gly67Asp",
    },
  });
}

const defaultFilter: FilterConfig = {
  ...FACTORY_FILTER_DEFAULTS,
  clinvarStarThreshold: 1, // Use low threshold for test simplicity
};

function makeClinvarVariant(
  variantId: string,
  sig: string,
  stars: number,
): ClinVarVariant {
  return {
    variant_id: variantId,
    clinvar_variation_id: "12345",
    clinical_significance: sig,
    gold_stars: stars,
    review_status: "criteria provided, single submitter",
    pos: 12345,
    ref: "A",
    alt: "G",
  };
}

// ─── classifyVariantSource tests ─────────────────────────────────────────────

describe("classifyVariantSource", () => {
  it("classifies a pLoF-only variant (HC LoF, no ClinVar match) as plof_only", () => {
    const variant = makeLoFVariant();
    const result = classifyVariantSource(variant, [], defaultFilter);
    expect(result).toBe("plof_only");
  });

  it("classifies a ClinVar-only variant (no LoF, has P/LP ClinVar) as clinvar_only", () => {
    const variant = makeNoLoFVariant();
    const clinvarVariants = [
      makeClinvarVariant("1-12345-A-G", "Pathogenic", 2),
    ];
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      defaultFilter,
    );
    expect(result).toBe("clinvar_only");
  });

  it("classifies a variant with HC LoF AND ClinVar P/LP as both", () => {
    const variant = makeLoFVariant();
    const clinvarVariants = [
      makeClinvarVariant("1-12345-A-G", "Pathogenic", 2),
    ];
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      defaultFilter,
    );
    expect(result).toBe("both");
  });

  it("classifies a missense variant with LC LoF and ClinVar P/LP as clinvar_only (Pitfall 5)", () => {
    // Missense with lof=LC should NOT count as pLoF — only HC counts
    const variant = makeLcLofVariant();
    const clinvarVariants = [
      makeClinvarVariant("1-12345-A-G", "Pathogenic/Likely pathogenic", 2),
    ];
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      defaultFilter,
    );
    expect(result).toBe("clinvar_only");
  });

  it("classifies a variant with no transcript_consequence as clinvar_only", () => {
    // Must have been included via ClinVar if no transcript consequence
    const variant = makeVariant({ transcript_consequence: null });
    const clinvarVariants = [
      makeClinvarVariant("1-12345-A-G", "Likely pathogenic", 1),
    ];
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      defaultFilter,
    );
    expect(result).toBe("clinvar_only");
  });

  it("classifies a variant with no ClinVar data and HC LoF as plof_only", () => {
    const variant = makeLoFVariant();
    const result = classifyVariantSource(variant, [], defaultFilter);
    expect(result).toBe("plof_only");
  });

  it("ignores ClinVar match when stars are below threshold", () => {
    // Threshold is 2, variant has 0 stars → not counted as ClinVar
    const variant = makeLoFVariant();
    const highThresholdFilter: FilterConfig = {
      ...FACTORY_FILTER_DEFAULTS,
      clinvarStarThreshold: 2,
    };
    const clinvarVariants = [
      makeClinvarVariant("1-12345-A-G", "Pathogenic", 0), // 0 stars, below threshold
    ];
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      highThresholdFilter,
    );
    // ClinVar evidence not counted due to insufficient stars → pLoF only
    expect(result).toBe("plof_only");
  });

  it("does not count conflicting ClinVar as source when includeConflicting is disabled", () => {
    const variant = makeLoFVariant();
    const filterWithConflictingDisabled: FilterConfig = {
      ...FACTORY_FILTER_DEFAULTS,
      clinvarIncludeConflicting: false,
      clinvarStarThreshold: 1,
    };
    const clinvarVariants = [
      makeClinvarVariant(
        "1-12345-A-G",
        "Conflicting classifications of pathogenicity",
        1,
      ),
    ];
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      filterWithConflictingDisabled,
    );
    // Conflicting not counted → just pLoF
    expect(result).toBe("plof_only");
  });

  it("counts conflicting ClinVar as source when submissionsMap meets threshold", () => {
    const variant = makeNoLoFVariant(); // No LoF
    const filterWithConflictingEnabled: FilterConfig = {
      ...FACTORY_FILTER_DEFAULTS,
      clinvarEnabled: true,
      clinvarIncludeConflicting: true,
      clinvarConflictingThreshold: 80,
      clinvarStarThreshold: 1,
    };
    const clinvarVariants = [
      makeClinvarVariant(
        "1-12345-A-G",
        "Conflicting classifications of pathogenicity",
        1,
      ),
    ];
    // 4 out of 5 submissions are pathogenic (80%) — meets threshold
    const submissions: ClinVarSubmission[] = [
      { clinical_significance: "Pathogenic" },
      { clinical_significance: "Pathogenic" },
      { clinical_significance: "Pathogenic" },
      { clinical_significance: "Likely pathogenic" },
      { clinical_significance: "Benign" },
    ];
    const submissionsMap = new Map([["1-12345-A-G", submissions]]);
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      filterWithConflictingEnabled,
      submissionsMap,
    );
    expect(result).toBe("clinvar_only");
  });

  it("does not count conflicting ClinVar when threshold is not met", () => {
    const variant = makeLoFVariant();
    const filterWithConflictingEnabled: FilterConfig = {
      ...FACTORY_FILTER_DEFAULTS,
      clinvarEnabled: true,
      clinvarIncludeConflicting: true,
      clinvarConflictingThreshold: 80,
      clinvarStarThreshold: 1,
    };
    const clinvarVariants = [
      makeClinvarVariant(
        "1-12345-A-G",
        "Conflicting classifications of pathogenicity",
        1,
      ),
    ];
    // Only 1 out of 5 pathogenic (20%) — does NOT meet 80% threshold
    const submissions: ClinVarSubmission[] = [
      { clinical_significance: "Pathogenic" },
      { clinical_significance: "Benign" },
      { clinical_significance: "Benign" },
      { clinical_significance: "Benign" },
      { clinical_significance: "Benign" },
    ];
    const submissionsMap = new Map([["1-12345-A-G", submissions]]);
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      filterWithConflictingEnabled,
      submissionsMap,
    );
    // Conflicting threshold not met → just pLoF
    expect(result).toBe("plof_only");
  });

  it("ignores non-canonical transcript for LoF classification", () => {
    // lof=HC but canonical=false → should NOT count as pLoF
    const variant = makeVariant({
      transcript_consequence: {
        gene_symbol: "CFTR",
        transcript_id: "ENST00000003084",
        canonical: false, // non-canonical
        consequence_terms: ["stop_gained"],
        lof: "HC",
        lof_filter: null,
        lof_flags: null,
        hgvsc: "c.100C>T",
        hgvsp: "p.Arg34*",
      },
    });
    const clinvarVariants = [
      makeClinvarVariant("1-12345-A-G", "Pathogenic", 2),
    ];
    const result = classifyVariantSource(
      variant,
      clinvarVariants,
      defaultFilter,
    );
    // Non-canonical HC LoF → not counted as pLoF → ClinVar only
    expect(result).toBe("clinvar_only");
  });
});

// ─── sourceCategoryLabel tests ───────────────────────────────────────────────

describe("sourceCategoryLabel", () => {
  it("returns 'ClinVar' for clinvar_only", () => {
    expect(sourceCategoryLabel("clinvar_only")).toBe("ClinVar");
  });

  it("returns 'pLoF' for plof_only", () => {
    expect(sourceCategoryLabel("plof_only")).toBe("pLoF");
  });

  it("returns 'Both' for both", () => {
    expect(sourceCategoryLabel("both")).toBe("Both");
  });
});

// ─── sourceCategoryColor tests ───────────────────────────────────────────────

describe("sourceCategoryColor", () => {
  it("returns 'blue' for clinvar_only", () => {
    expect(sourceCategoryColor("clinvar_only")).toBe("blue");
  });

  it("returns 'deep-purple' for plof_only", () => {
    expect(sourceCategoryColor("plof_only")).toBe("deep-purple");
  });

  it("returns 'green' for both", () => {
    expect(sourceCategoryColor("both")).toBe("green");
  });
});
