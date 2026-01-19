// Gene variants query - variables (dataset, referenceGenome) passed at runtime from config
// Note: Population AF must be calculated from ac/an (not directly available)
export const GENE_VARIANTS_QUERY = `
  query GeneVariants($geneSymbol: String!, $dataset: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
    gene(gene_symbol: $geneSymbol, reference_genome: $referenceGenome) {
      gene_id
      symbol
      variants(dataset: $dataset) {
        variant_id
        pos
        ref
        alt
        exome {
          ac
          an
          populations {
            id
            ac
            an
          }
        }
        genome {
          ac
          an
          populations {
            id
            ac
            an
          }
        }
        transcript_consequence {
          gene_symbol
          transcript_id
          canonical
          consequence_terms
          lof
          lof_filter
          lof_flags
          hgvsc
          hgvsp
        }
      }
      clinvar_variants {
        variant_id
        clinical_significance
        gold_stars
        review_status
        pos
        ref
        alt
      }
    }
  }
`;

export interface GeneVariantsVariables {
  geneSymbol: string;
  dataset: string; // From config: 'gnomad_r4', 'gnomad_r3', 'gnomad_r2_1'
  referenceGenome: 'GRCh37' | 'GRCh38';
}
