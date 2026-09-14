import { describe, it, expect } from "vitest";
import {
  buildSubmissionsQuery,
  parseSubmissionsResponse,
} from "../clinvar-submissions.js";

describe("ClinVar Submissions Query Builder (SPEC-08, CRIT-1)", () => {
  it("builds parameterized GraphQL query using ReferenceGenomeId! and singular clinvar_variant", () => {
    const variantIds = ["1-12345-A-T", "chrX-67890-C-G"];
    const result = buildSubmissionsQuery(variantIds, "GRCh38");

    expect(result).not.toBeNull();
    if (!result) return;

    const { query, variables } = result;

    // Check query signature
    expect(query).toContain(
      "query GetClinvarSubmissions($refGenome: ReferenceGenomeId!, $var0: String!, $var1: String!)",
    );

    // Check field structure
    expect(query).toContain(
      "v0: clinvar_variant(variant_id: $var0, reference_genome: $refGenome)",
    );
    expect(query).toContain(
      "v1: clinvar_variant(variant_id: $var1, reference_genome: $refGenome)",
    );
    expect(query).toContain("submitter_name");
    expect(query).toContain("clinical_significance");
    expect(query).toContain("review_status");
    expect(query).toContain("last_evaluated");

    // Check variables
    expect(variables).toEqual({
      refGenome: "GRCh38",
      var0: "1-12345-A-T",
      var1: "chrX-67890-C-G",
    });
  });

  it("returns null for empty variant array", () => {
    expect(buildSubmissionsQuery([], "GRCh38")).toBeNull();
  });

  it("validates variant ID format and throws on malformed or malicious inputs", () => {
    expect(() =>
      buildSubmissionsQuery(['1-12345-A-T", malicious: true) {'], "GRCh38"),
    ).toThrow("Invalid variant ID format");

    expect(() => buildSubmissionsQuery(["invalid-id"], "GRCh38")).toThrow(
      "Invalid variant ID format",
    );
  });

  it("parses response into variant_id to submissions Map", () => {
    const rawResponse = {
      v0: {
        variant_id: "1-12345-A-T",
        clinical_significance: "Pathogenic",
        review_status: "criteria provided, single submitter",
        submissions: [
          {
            clinical_significance: "Pathogenic",
            submitter_name: "Lab Corp",
            review_status: "criteria provided",
          },
        ],
      },
      v1: null,
    };

    const map = parseSubmissionsResponse(rawResponse);
    expect(map.size).toBe(1);
    expect(map.get("1-12345-A-T")?.[0].submitter_name).toBe("Lab Corp");
  });
});
