import { bench, describe } from "vitest";
import {
  calculateCarrierFrequency,
  calculateRecurrenceRisk,
  calculateHardyWeinbergCarrierFrequency,
  calculateRecessivePrevalence,
} from "@gnomad-cf/core/calculations";
import {
  filterPathogenicVariantsConfigurable,
  classifyVariantSource,
} from "@gnomad-cf/core/filters";
import type {
  GnomadVariant,
  ClinVarVariant,
  FilterConfig,
} from "@gnomad-cf/core/types";

// Generate synthetic test dataset: 1,000 variants
function generateSyntheticVariants(count: number): {
  gnomadVariants: GnomadVariant[];
  clinvarVariants: ClinVarVariant[];
} {
  const gnomadVariants: GnomadVariant[] = [];
  const clinvarVariants: ClinVarVariant[] = [];

  for (let i = 0; i < count; i++) {
    const variantId = `12-111803${900 + i}-G-A`;
    const isLof = i % 5 === 0;
    const isPathogenic = i % 3 === 0;

    gnomadVariants.push({
      variant_id: variantId,
      pos: 111803900 + i,
      ref: "G",
      alt: "A",
      consequence: isLof ? "frameshift_variant" : "missense_variant",
      flags: [],
      lof: isLof ? "HC" : null,
      exome: {
        ac: 2 + (i % 10),
        an: 150000,
        homozygote_count: i % 20 === 0 ? 1 : 0,
        hemizygote_count: 0,
        populations: [
          { id: "afr", ac: 1, an: 20000, homozygote_count: 0, hemizygote_count: 0 },
          { id: "nfe", ac: 1 + (i % 5), an: 60000, homozygote_count: 0, hemizygote_count: 0 },
        ],
      },
      genome: null,
      joint: null,
    });

    if (isPathogenic) {
      clinvarVariants.push({
        clinical_significance: "Pathogenic",
        gold_stars: 2,
        review_status: "criteria provided, multiple submitters, no conflicts",
        in_gnomad: true,
        pos: 111803900 + i,
        ref: "G",
        alt: "A",
        variant_id: variantId,
      });
    }
  }

  return { gnomadVariants, clinvarVariants };
}

const { gnomadVariants, clinvarVariants } = generateSyntheticVariants(1000);

const filterConfig: FilterConfig = {
  lofHcEnabled: true,
  missenseEnabled: false,
  clinvarEnabled: true,
  clinvarStarThreshold: 1,
  clinvarIncludeConflicting: false,
  clinvarConflictingThreshold: 75,
};

describe("Core Clinical Calculations Benchmark", () => {
  bench("calculateCarrierFrequency (HWE, 100 variants)", () => {
    calculateCarrierFrequency(
      gnomadVariants.slice(0, 100),
      "CFTR",
      "v4",
      { useHWEFormula: true, useHomExclusion: true },
    );
  });

  bench("calculateHardyWeinbergCarrierFrequency (1,000 iterations)", () => {
    for (let i = 0; i < 1000; i++) {
      calculateHardyWeinbergCarrierFrequency(0.02);
    }
  });

  bench("calculateRecurrenceRisk (heterozygous, 1,000 iterations)", () => {
    for (let i = 0; i < 1000; i++) {
      calculateRecurrenceRisk(0.04, "heterozygous", 1.0);
    }
  });

  bench("calculateRecurrenceRisk (homozygous, 1,000 iterations)", () => {
    for (let i = 0; i < 1000; i++) {
      calculateRecurrenceRisk(0.04, "homozygous", 1.0);
    }
  });

  bench("calculateRecessivePrevalence (1,000 iterations)", () => {
    for (let i = 0; i < 1000; i++) {
      calculateRecessivePrevalence(0.04, 0.95);
    }
  });
});

describe("Variant Pipeline & Filtering Benchmark", () => {
  bench("filterPathogenicVariantsConfigurable (1,000 synthetic variants)", () => {
    filterPathogenicVariantsConfigurable(
      gnomadVariants,
      clinvarVariants,
      filterConfig,
      new Map(),
    );
  });

  bench("classifyVariantSource (1,000 iterations)", () => {
    for (let i = 0; i < 1000; i++) {
      const variant = gnomadVariants[i % gnomadVariants.length]!;
      classifyVariantSource(variant, clinvarVariants, filterConfig, new Map());
    }
  });
});
