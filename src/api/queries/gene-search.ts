// Gene search query - variables (referenceGenome) passed at runtime from config
export const GENE_SEARCH_QUERY = `
  query GeneSearch($query: String!, $referenceGenome: ReferenceGenomeId!) {
    gene_search(query: $query, reference_genome: $referenceGenome) {
      ensembl_id
      symbol
    }
  }
`;

// Separate query for gene details including constraint (used after selection)
export const GENE_DETAILS_QUERY = `
  query GeneDetails($geneSymbol: String!, $referenceGenome: ReferenceGenomeId!) {
    gene(gene_symbol: $geneSymbol, reference_genome: $referenceGenome) {
      gene_id
      symbol
      gnomad_constraint {
        exp_lof
        obs_lof
        oe_lof
        oe_lof_lower
        oe_lof_upper
        pLI
        lof_z
        flags
      }
    }
  }
`;

export interface GeneSearchVariables {
  query: string;
  referenceGenome: 'GRCh37' | 'GRCh38';
}

export interface GeneDetailsVariables {
  geneSymbol: string;
  referenceGenome: 'GRCh37' | 'GRCh38';
}
