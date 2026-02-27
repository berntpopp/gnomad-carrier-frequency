/** Raw response item from /rd-associated-genes/genes/symbols/{symbol} */
export interface OrphanetGeneResult {
  ORPHAcode: number;
  'Preferred term': string;
  OrphanetURL: string;
  Date: string;
  DisorderGeneAssociation: OrphanetGeneAssociation[];
}

export interface OrphanetGeneAssociation {
  DisorderGeneAssociationType: string;
  DisorderGeneAssociationStatus: string;
  Gene: {
    Symbol: string;
    name: string;
    GeneType: string;
    ExternalReference: Array<{ Source: string; Reference: string }>;
  };
}

/** Raw prevalence entry from /rd-epidemiology/orphacodes/{code} */
export interface OrphanetPrevalenceEntry {
  PrevalenceClass: string;             // "1-5 / 10 000", "1-9 / 100 000", etc.
  PrevalenceGeographic: string;        // "Europe", "France", "Specific population", etc.
  PrevalenceType: string;              // "Point prevalence", "Prevalence at birth", etc.
  PrevalenceQualification: string;     // "Value and class", "Class only"
  PrevalenceValidationStatus: string;  // "Validated", "Not yet validated"
  Source: string;
  ValMoy: string;                      // Float as string, per 100,000. Use for sorting only.
}

/** Processed disease record after enrichment */
export interface OrphanetDisease {
  orphacode: number;
  name: string;
  orphanetUrl: string;
  isAutosomalRecessive: boolean;
  bestPrevalence: {
    prevalenceClass: string;
    geographic: string;
    validationStatus: string;
    valMoy: number;  // Numeric for sorting (parsed from ValMoy string)
  } | null;
}

/** Final result stored per gene symbol in the Pinia cache */
export interface OrphanetResult {
  geneSymbol: string;
  diseases: OrphanetDisease[];  // empty array = no data found
  fetchedAt: number;            // Unix timestamp ms
  error: string | null;
}
