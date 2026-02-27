// GraphQL query for fetching subcontinental population data for a single variant.
// Used by the subcontinental populations feature (v2 only: NFE + EAS subgroups).
// $referenceGenome is required by the gnomAD schema (same pattern as GENE_VARIANTS_QUERY).
// Only exome + genome are requested — v2.1.1 does not have a joint field.
export const VARIANT_SUBCONTINENTAL_QUERY = `
  query VariantSubcontinental($variantId: String!, $dataset: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
    variant(variant_id: $variantId, dataset: $dataset, reference_genome: $referenceGenome) {
      variant_id
      exome {
        populations {
          id
          ac
          an
          ac_hom
        }
      }
      genome {
        populations {
          id
          ac
          an
          ac_hom
        }
      }
    }
  }
`;

// Variables for VARIANT_SUBCONTINENTAL_QUERY
export interface VariantSubcontinentalVariables {
  variantId: string;
  dataset: string;
  referenceGenome: "GRCh37" | "GRCh38";
}

// Shape of the populations array items returned in exome/genome
export interface VariantSubcontinentalPopulation {
  id: string;
  ac: number;
  an: number;
  ac_hom: number;
}

// Full response shape for VARIANT_SUBCONTINENTAL_QUERY
export interface VariantSubcontinentalResponse {
  variant: {
    variant_id: string;
    exome: {
      populations: VariantSubcontinentalPopulation[];
    } | null;
    genome: {
      populations: VariantSubcontinentalPopulation[];
    } | null;
  } | null;
}
