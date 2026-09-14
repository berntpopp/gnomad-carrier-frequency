import { describe, it, expect } from "vitest";
import {
  buildSubmissionsQuery,
  parseSubmissionsResponse,
  calculatePathogenicPercentage,
  meetsConflictingThreshold,
} from "../src/queries/clinvar-submissions.js";
import { VARIANT_SUBCONTINENTAL_QUERY } from "../src/queries/subcontinental-variant.js";
import {
  GENE_SEARCH_QUERY,
  GENE_DETAILS_QUERY,
} from "../src/queries/gene-search.js";
import { GENE_VARIANTS_QUERY } from "../src/queries/gene-variants.js";

describe("queries module", () => {
  describe("clinvar submissions query helpers", () => {
    it("builds batched submissions query string", () => {
      const q = buildSubmissionsQuery(["1-100-A-G", "2-200-C-T"], "GRCh38");
      expect(q).toContain("query ClinVarSubmissions");
      expect(q).toContain("v0: clinvar_variant");
      expect(q).toContain("v1: clinvar_variant");
      expect(q).toContain("1-100-A-G");
      expect(q).toContain("GRCh38");
    });

    it("parses submissions response correctly", () => {
      const rawResponse = {
        v0: {
          variant_id: "1-100-A-G",
          submissions: [{ clinical_significance: "Pathogenic" }],
        },
        v1: null,
      };
      const parsed = parseSubmissionsResponse(rawResponse);
      expect(parsed.size).toBe(1);
      expect(parsed.get("1-100-A-G")).toEqual([
        { clinical_significance: "Pathogenic" },
      ]);
    });

    it("calculates pathogenic percentage excluding neutral terms", () => {
      const submissions = [
        { clinical_significance: "Pathogenic" },
        { clinical_significance: "Likely pathogenic" },
        { clinical_significance: "Benign" },
        { clinical_significance: "drug response" }, // excluded
      ];

      // 2 pathogenic out of 3 valid = 66.666%
      const pct = calculatePathogenicPercentage(submissions);
      expect(pct).toBeCloseTo(66.666, 2);
      expect(meetsConflictingThreshold(submissions, 60)).toBe(true);
      expect(meetsConflictingThreshold(submissions, 70)).toBe(false);
    });

    it("returns null when no valid submissions exist", () => {
      expect(calculatePathogenicPercentage([])).toBeNull();
      expect(
        calculatePathogenicPercentage([
          { clinical_significance: "not provided" },
        ]),
      ).toBeNull();
      expect(meetsConflictingThreshold([], 50)).toBe(false);
    });
  });

  describe("subcontinental query", () => {
    it("exports VARIANT_SUBCONTINENTAL_QUERY string", () => {
      expect(VARIANT_SUBCONTINENTAL_QUERY).toContain("variant(variantId: $variantId, dataset: $dataset)");
      expect(VARIANT_SUBCONTINENTAL_QUERY).toContain("populations");
    });
  });

  describe("static queries", () => {
    it("exports valid GraphQL strings", () => {
      expect(GENE_SEARCH_QUERY).toContain("gene_search");
      expect(GENE_DETAILS_QUERY).toContain("gene(gene_symbol:");
      expect(GENE_VARIANTS_QUERY).toContain("gene(gene_symbol:");
    });
  });
});
