// Gene search query - variables (referenceGenome) passed at runtime from config
export const GENE_SEARCH_QUERY = `
  query GeneSearch($query: String!, $referenceGenome: ReferenceGenomeId!) {
    gene_search(query: $query, reference_genome: $referenceGenome) {
      ensembl_id
      symbol
    }
  }
`;

export interface GeneSearchVariables {
  query: string;
  referenceGenome: 'GRCh37' | 'GRCh38';
}
