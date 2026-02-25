/**
 * TypeScript fixtures for gnomAD GraphQL API responses
 *
 * These fixtures match the actual response shapes from the gnomAD GraphQL API.
 * Types are derived from packages/core/src/queries/types.ts and
 * packages/core/src/types/variant.ts.
 *
 * Operation names come from the actual query strings in packages/core/src/queries/:
 *   - GeneSearch (gene-search.ts)
 *   - GeneDetails (gene-search.ts)
 *   - GeneVariants (gene-variants.ts)
 */

// ─── GeneSearch ────────────────────────────────────────────────────────────────
// Response shape for: query GeneSearch($query, $referenceGenome)

export const GENE_SEARCH_RESPONSE = {
  data: {
    gene_search: [
      {
        ensembl_id: "ENSG00000001626",
        symbol: "CFTR",
      },
    ],
  },
};

// ─── GeneDetails ───────────────────────────────────────────────────────────────
// Response shape for: query GeneDetails($geneSymbol, $referenceGenome)

export const GENE_DETAILS_RESPONSE = {
  data: {
    gene: {
      gene_id: "ENSG00000001626",
      symbol: "CFTR",
      gnomad_constraint: {
        exp_lof: 89.3,
        obs_lof: 25,
        oe_lof: 0.28,
        oe_lof_lower: 0.19,
        oe_lof_upper: 0.41,
        pLI: 0.999,
        lof_z: 4.98,
        flags: [],
      },
    },
  },
};

// ─── GeneVariants ──────────────────────────────────────────────────────────────
// Response shape for: query GeneVariants($geneSymbol, $dataset, $referenceGenome)
// Includes 2 representative CFTR pathogenic variants:
//   - 7-117559590-T-A: p.Phe508del (most common CF mutation, LoF HC)
//   - 7-117572531-G-T: p.Gly542* (stop gained, LoF HC)

const POPULATIONS = [
  { id: "afr", ac: 5, an: 24000, ac_hom: 0 },
  { id: "ami", ac: 0, an: 1200, ac_hom: 0 },
  { id: "amr", ac: 12, an: 18000, ac_hom: 0 },
  { id: "asj", ac: 8, an: 4000, ac_hom: 0 },
  { id: "eas", ac: 1, an: 10000, ac_hom: 0 },
  { id: "fin", ac: 18, an: 11000, ac_hom: 0 },
  { id: "mid", ac: 2, an: 3000, ac_hom: 0 },
  { id: "nfe", ac: 180, an: 72000, ac_hom: 1 },
  { id: "sas", ac: 3, an: 14000, ac_hom: 0 },
  { id: "remaining", ac: 4, an: 6000, ac_hom: 0 },
];

export const GENE_VARIANTS_RESPONSE = {
  data: {
    gene: {
      gene_id: "ENSG00000001626",
      symbol: "CFTR",
      variants: [
        {
          variant_id: "7-117559590-T-A",
          pos: 117559590,
          ref: "T",
          alt: "A",
          exome: {
            ac: 233,
            an: 163200,
            ac_hom: 1,
            populations: POPULATIONS,
          },
          genome: null,
          joint: null,
          transcript_consequence: {
            gene_symbol: "CFTR",
            transcript_id: "ENST00000003084",
            canonical: true,
            consequence_terms: ["frameshift_variant"],
            lof: "HC",
            lof_filter: null,
            lof_flags: null,
            hgvsc: "c.1521_1523delCTT",
            hgvsp: "p.Phe508del",
          },
        },
        {
          variant_id: "7-117572531-G-T",
          pos: 117572531,
          ref: "G",
          alt: "T",
          exome: {
            ac: 45,
            an: 163200,
            ac_hom: 0,
            populations: POPULATIONS.map((p) => ({
              ...p,
              ac: Math.floor(p.ac / 5),
            })),
          },
          genome: null,
          joint: null,
          transcript_consequence: {
            gene_symbol: "CFTR",
            transcript_id: "ENST00000003084",
            canonical: true,
            consequence_terms: ["stop_gained"],
            lof: "HC",
            lof_filter: null,
            lof_flags: null,
            hgvsc: "c.1624G>T",
            hgvsp: "p.Gly542*",
          },
        },
      ],
      clinvar_variants: [
        {
          variant_id: "7-117559590-T-A",
          clinvar_variation_id: "7105",
          clinical_significance: "Pathogenic",
          gold_stars: 4,
          review_status: "reviewed by expert panel",
          pos: 117559590,
          ref: "T",
          alt: "A",
        },
        {
          variant_id: "7-117572531-G-T",
          clinvar_variation_id: "7107",
          clinical_significance: "Pathogenic",
          gold_stars: 3,
          review_status: "criteria provided, multiple submitters, no conflicts",
          pos: 117572531,
          ref: "G",
          alt: "T",
        },
      ],
    },
  },
};
