/**
 * Filter-flags integration test for the queryGene pipeline.
 *
 * Proves that CLI FilterConfig properties (lofHcEnabled, clinvarEnabled,
 * clinvarStarThreshold) actually affect queryGene output — variant counts
 * and carrier frequencies change when filter flags change.
 *
 * Uses the CFTR fixture (3 variants):
 *   1. 7-117559593-ATCT-A — frameshift, LoF HC, ClinVar Pathogenic 4 stars
 *   2. 7-117548628-G-A    — missense, NOT LoF, ClinVar Pathogenic 3 stars
 *   3. 7-117531061-A-G    — missense, NOT LoF, ClinVar Uncertain significance 1 star (always excluded)
 *
 * With FACTORY_FILTER_DEFAULTS (lofHcEnabled=true, clinvarEnabled=true, clinvarStarThreshold=2):
 *   Variant 1 passes via LoF HC; variant 2 passes via ClinVar P (3 stars >= 2) → count=2
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock the core client before importing queryGene
vi.mock("@gnomad-cf/core/client", () => ({
  executeGraphQLQuery: vi.fn(),
}));

// Mock withRetry to call fn() directly — no delays in tests
vi.mock("../utils/retry.js", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { executeGraphQLQuery } from "@gnomad-cf/core/client";
import { queryGene } from "../utils/gene-query.js";
import {
  FACTORY_FILTER_DEFAULTS,
  FACTORY_CALC_DEFAULTS,
} from "@gnomad-cf/core/types";
import cftrFixture from "./fixtures/cftr-response.json";

const mockExecuteGraphQLQuery = vi.mocked(executeGraphQLQuery);

// Base options shared across all tests
const baseOpts = {
  version: "v4" as const,
  filterConfig: { ...FACTORY_FILTER_DEFAULTS },
  calcConfig: { ...FACTORY_CALC_DEFAULTS },
};

describe("filter-flags integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteGraphQLQuery.mockResolvedValue(
      cftrFixture as ReturnType<typeof executeGraphQLQuery> extends Promise<
        infer T
      >
        ? T
        : never,
    );
  });

  it("default filters include both LoF and ClinVar variants (count=2)", async () => {
    const result = await queryGene("CFTR", baseOpts);
    // Variant 1 (frameshift LoF HC) + Variant 2 (missense ClinVar P 3 stars >= threshold 2)
    expect(result.variantCount).toBe(2);
  });

  it("--no-lof (lofHcEnabled=false) keeps both variants via ClinVar fallback", async () => {
    // Variant 1 is ALSO ClinVar Pathogenic with 4 stars — still passes via ClinVar path
    // Variant 2 is ClinVar Pathogenic with 3 stars — still passes
    const result = await queryGene("CFTR", {
      ...baseOpts,
      filterConfig: { ...FACTORY_FILTER_DEFAULTS, lofHcEnabled: false },
    });
    // Both variants have ClinVar P evidence above threshold, so count stays 2
    expect(result.variantCount).toBe(2);
  });

  it("--no-clinvar (clinvarEnabled=false) reduces variant count to 1", async () => {
    // Only LoF HC variants pass: Variant 1 (frameshift LoF HC) → count=1
    // Variant 2 (missense, no LoF) requires ClinVar evidence → excluded
    const result = await queryGene("CFTR", {
      ...baseOpts,
      filterConfig: { ...FACTORY_FILTER_DEFAULTS, clinvarEnabled: false },
    });
    expect(result.variantCount).toBe(1);
  });

  it("--no-lof --no-clinvar excludes all variants (count=0)", async () => {
    // No filter pathway passes: no LoF, no ClinVar
    const result = await queryGene("CFTR", {
      ...baseOpts,
      filterConfig: {
        ...FACTORY_FILTER_DEFAULTS,
        lofHcEnabled: false,
        clinvarEnabled: false,
      },
    });
    expect(result.variantCount).toBe(0);
  });

  it("high star threshold (clinvarStarThreshold=4) reduces ClinVar matches", async () => {
    // Variant 1: LoF HC → passes via LoF path (lofHcEnabled=true)
    // Variant 2: missense, ClinVar P with 3 stars < 4 → hasClinvarEvidence=false → excluded
    const result = await queryGene("CFTR", {
      ...baseOpts,
      filterConfig: { ...FACTORY_FILTER_DEFAULTS, clinvarStarThreshold: 4 },
    });
    expect(result.variantCount).toBe(1);
  });

  it("filter flags produce different globalCarrierFrequency values", async () => {
    // Default: 2 variants contribute to carrier frequency
    const resultDefault = await queryGene("CFTR", baseOpts);

    // ClinVar disabled: only 1 LoF variant contributes
    const resultNoClinvar = await queryGene("CFTR", {
      ...baseOpts,
      filterConfig: { ...FACTORY_FILTER_DEFAULTS, clinvarEnabled: false },
    });

    // Different variant counts mean different allele frequency sums → different carrier frequencies
    expect(resultDefault.globalCarrierFrequency).not.toBeNull();
    expect(resultNoClinvar.globalCarrierFrequency).not.toBeNull();
    expect(resultDefault.globalCarrierFrequency).not.toBe(
      resultNoClinvar.globalCarrierFrequency,
    );
  });

  it("--no-clinvar --no-lof results in null globalCarrierFrequency (no variants)", async () => {
    const result = await queryGene("CFTR", {
      ...baseOpts,
      filterConfig: {
        ...FACTORY_FILTER_DEFAULTS,
        lofHcEnabled: false,
        clinvarEnabled: false,
      },
    });
    expect(result.variantCount).toBe(0);
    expect(result.globalCarrierFrequency).toBeNull();
  });
});
