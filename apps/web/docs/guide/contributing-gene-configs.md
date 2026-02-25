---
title: Contributing Gene Configs
description: How to create and submit a gene configuration file to improve carrier frequency calculations for your gene of interest
outline: deep
---

# Contributing Gene Configs

Thank you for your interest in contributing a gene configuration to the gnomAD Carrier Frequency Calculator.

You **do not** need to be a software developer to contribute. If you have clinical expertise in a gene's pathogenic variant landscape, your contribution is valuable.

:::tip Who should contribute?
Clinical geneticists, genetic counselors, and laboratory specialists with domain knowledge of a specific gene's pathogenic variant landscape are ideal contributors. No coding experience required.
:::

## Introduction

### What are gene configs?

Gene configs are JSON files that encode curated, gene-specific settings for the carrier frequency calculator. When a gene has a config file, the calculator automatically:

- Pre-populates recommended variant filter settings (e.g., ClinVar star threshold, whether to include missense variants)
- Applies the correct disease penetrance for recurrence risk calculations
- Excludes known benign or technically problematic variants
- Links the condition to standard disease identifiers (OMIM, MONDO)

### Why do they matter?

Carrier frequency calculations are only as good as the variant filtering they use. For CFTR, an expert panel ClinVar star threshold of 2 is appropriate. For HEXA, including missense variants with ≥1 ClinVar star captures important pathogenic alleles that a LoF-only approach would miss. These gene-specific recommendations live in the config, so users get clinically appropriate defaults without needing deep variant knowledge.

## Quick Start

1. Browse existing configs in the [`configs/genes/`](https://github.com/berntpopp/gnomad-carrier-frequency/tree/main/configs/genes) directory — `HEXA.json` is the simplest example.
2. Copy `HEXA.json` as your starting template.
3. Rename it to `{YOUR_GENE_SYMBOL}.json` (uppercase, e.g., `PAH.json`).
4. Fill in the fields for your gene (see [Schema Reference](#schema-reference-field-by-field) below).
5. [Submit a pull request](#submitting-your-config) — CI will validate the JSON automatically.

## Config File Location

All gene config files live in the `configs/genes/` directory of the repository:

```
configs/
  genes/
    CFTR.json    ← Cystic fibrosis (multi-profile example)
    GJB2.json    ← Connexin 26 hearing loss
    HEXA.json    ← Tay-Sachs (simple single-profile example)
    PAH.json     ← Your new file here
```

**Naming rules:**
- Filename must be the HGNC gene symbol in **uppercase** (e.g., `PAH.json`, not `pah.json` or `Pah.json`)
- The filename must match the `geneSymbol` field inside the file
- One file per gene

## Schema Reference — Field by Field

A gene config file is a JSON object. Fields marked **(required)** must be present; **(optional)** fields may be omitted.

### Top-Level Fields

#### `schemaVersion` (required)

Always `"1.0"`.

```json
"schemaVersion": "1.0"
```

---

#### `geneSymbol` (required)

HGNC gene symbol, uppercase, 1–20 characters. Must match the filename exactly. Look up official symbols at [genenames.org](https://www.genenames.org/).

```json
"geneSymbol": "PAH"
```

---

#### `displayName` (optional)

Full human-readable gene name. Shown in the calculator UI.

```json
"displayName": "Phenylalanine Hydroxylase"
```

---

#### `omimGeneId` (optional)

The OMIM **gene** entry number (the asterisk * entry on OMIM), exactly 6 digits.

```json
"omimGeneId": "612349"
```

:::warning OMIM Gene ID vs Disease ID
This is the OMIM entry for the **gene itself**, not for any disease it causes. See [OMIM Gene ID vs OMIM Phenotype ID](#omim-gene-id-vs-omim-phenotype-id) for a full explanation with examples.
:::

---

#### `inheritance` (optional)

Inheritance pattern. One of `"AR"`, `"XL"`, or `"AD"`.

```json
"inheritance": "AR"
```

---

#### `profiles` (required)

Array of [condition profile objects](#profile-fields). At least 1 profile required. Exactly 1 profile must have `isDefault: true`.

Most genes have one profile. Genes like CFTR, where pathogenic variants cause clinically distinct conditions with different penetrance (classic CF vs. CFTR-related disorders), may have multiple profiles.

---

### Profile Fields

Each object in the `profiles` array:

#### `profileId` (required)

A short, unique identifier within this config. Use lowercase with hyphens.

```json
"profileId": "tay-sachs"
```

---

#### `displayName` (required)

Human-readable condition name. Shown in the calculator's condition selector.

```json
"displayName": "Phenylketonuria"
```

---

#### `isDefault` (required)

Boolean. Exactly **one** profile in the file must be `true`.

```json
"isDefault": true
```

---

#### `disease` (required)

Disease identifier object. At least one of `omimId` or `mondoId` is required. See [Disease Identifier Fields](#disease-identifier-fields).

---

#### `penetrance` (optional)

Number from 0.0 to 1.0. Defaults to `1.0` (fully penetrant) if omitted.

```json
"penetrance": 0.03
```

:::tip When to use penetrance < 1.0
Only when there is published evidence for reduced penetrance (e.g., CFTR-related disorders ~3%). Always cite the source in `references`. For most autosomal recessive conditions, use `1.0` or omit the field.
:::

---

#### `filterOverrides` (optional)

Recommended variant filter settings. See [Filter Override Fields](#filter-override-fields).

---

#### `variantExclusions` (optional)

Array of gnomAD variant ID strings to exclude from carrier frequency calculations.

```json
"variantExclusions": ["1-12345678-A-G"]
```

Use for known benign variants with high allele frequency that would inflate the calculation, or for technically problematic variants (pseudogene interference, alignment artifacts). Omit or leave as `[]` if no exclusions are needed.

---

#### `notes` (optional)

Free-text clinical commentary. Displayed in the calculator UI.

```json
"notes": "Classic infantile form results in progressive neurodegeneration. Ashkenazi Jewish carrier frequency ~1/30."
```

---

#### `references` (optional)

Array of URLs to PubMed or other literature. All values must be valid URLs.

```json
"references": [
  "https://pubmed.ncbi.nlm.nih.gov/20301406/"
]
```

---

### Disease Identifier Fields

#### `omimId` (optional but recommended)

OMIM **phenotype** MIM number (the hash # entry on OMIM), exactly 6 digits.

```json
"omimId": "261600"
```

:::warning Not the gene ID
This is the disease/phenotype entry number, not the gene entry number. See [OMIM Gene ID vs OMIM Phenotype ID](#omim-gene-id-vs-omim-phenotype-id).
:::

---

#### `mondoId` (optional but recommended)

MONDO ontology identifier. Format: `MONDO:XXXXXXX` (7 digits after the colon).

```json
"mondoId": "MONDO:0009861"
```

---

#### `name` (required)

Standard disease name.

```json
"name": "Phenylketonuria"
```

**Constraint:** At least one of `omimId` or `mondoId` must be present. Both is preferred.

---

### Filter Override Fields

All filter override fields are optional. Only specify fields where you have a gene-specific recommendation.

#### `lofHcEnabled` (optional)

Include Loss-of-Function High Confidence variants. Nearly always `true` for AR conditions.

#### `missenseEnabled` (optional)

Include missense variants. Set `true` only when ClinVar-curated missense variants are well-characterized contributors for this gene.

#### `clinvarEnabled` (optional)

Include ClinVar Pathogenic/Likely Pathogenic variants.

#### `clinvarStarThreshold` (optional)

Minimum ClinVar review stars, 0–4.

| Stars | Meaning |
|-------|---------|
| 0 | No assertion criteria provided |
| 1 | Single submitter |
| 2 | Multiple submitters, no conflicts; or reviewed by expert panel |
| 3 | Expert panel review |
| 4 | Practice guideline |

For genes with established ClinGen expert panel curation, use star 2 or 3.

#### `clinvarIncludeConflicting` (optional)

Include variants with conflicting ClinVar classifications.

#### `clinvarConflictingThreshold` (optional)

Minimum percentage of P/LP classifications for conflicting variants to be included (50–100).

---

## OMIM Gene ID vs OMIM Phenotype ID

This is the most common source of confusion. OMIM has two different types of entries:

| Config Field | OMIM Entry Type | Symbol on OMIM | Example (CFTR) | How to Find It |
|---|---|---|---|---|
| `omimGeneId` (top-level) | **Gene** entry | Asterisk (*) | `602421` | Search OMIM for the gene symbol; use the * entry |
| `disease.omimId` (inside profiles) | **Phenotype/Disease** entry | Hash (#) | `219700` | Search OMIM for the disease name; use the # entry |

**How to use OMIM correctly:**

1. Go to [https://omim.org/](https://omim.org/)
2. **For `omimGeneId`:** Search for your gene symbol (e.g., "CFTR"). Find the entry marked with an asterisk (*).
3. **For `disease.omimId`:** Search for the disease name (e.g., "cystic fibrosis"). Find the entry marked with a hash (#).

:::danger Common mistake
Putting the gene entry number (e.g., `602421`) in the `disease.omimId` field. The `disease.omimId` must be the **phenotype** entry number (e.g., `219700`).
:::

## Complete Examples

### Simple Example — HEXA (single condition)

```json
{
  "schemaVersion": "1.0",
  "geneSymbol": "HEXA",
  "displayName": "Hexosaminidase A",
  "omimGeneId": "606869",
  "inheritance": "AR",
  "profiles": [
    {
      "profileId": "tay-sachs",
      "displayName": "Tay-Sachs Disease",
      "isDefault": true,
      "disease": {
        "omimId": "272800",
        "mondoId": "MONDO:0019530",
        "name": "Tay-Sachs disease"
      },
      "penetrance": 1.0,
      "filterOverrides": {
        "lofHcEnabled": true,
        "missenseEnabled": true,
        "clinvarEnabled": true,
        "clinvarStarThreshold": 1
      },
      "notes": "Tay-Sachs disease is a fully penetrant autosomal recessive lysosomal storage disorder caused by HEXA deficiency. Ashkenazi Jewish carrier frequency ~1/30 vs ~1/300 in the general population.",
      "references": [
        "https://pubmed.ncbi.nlm.nih.gov/8490627/",
        "https://pubmed.ncbi.nlm.nih.gov/20301406/"
      ]
    }
  ]
}
```

### Multi-Profile Example — CFTR (two conditions, different penetrance)

```json
{
  "schemaVersion": "1.0",
  "geneSymbol": "CFTR",
  "displayName": "Cystic Fibrosis Transmembrane Conductance Regulator",
  "omimGeneId": "602421",
  "inheritance": "AR",
  "profiles": [
    {
      "profileId": "classic-cf",
      "displayName": "Classic Cystic Fibrosis",
      "isDefault": true,
      "disease": {
        "omimId": "219700",
        "mondoId": "MONDO:0009061",
        "name": "Cystic fibrosis"
      },
      "penetrance": 1.0,
      "filterOverrides": {
        "lofHcEnabled": true,
        "missenseEnabled": true,
        "clinvarEnabled": true,
        "clinvarStarThreshold": 2
      },
      "notes": "Classic cystic fibrosis is fully penetrant. ClinVar star threshold 2 is recommended.",
      "references": [
        "https://pubmed.ncbi.nlm.nih.gov/11158515/",
        "https://pubmed.ncbi.nlm.nih.gov/32666735/"
      ]
    },
    {
      "profileId": "cftr-rd",
      "displayName": "CFTR-Related Disorder",
      "isDefault": false,
      "disease": {
        "omimId": "277180",
        "name": "CFTR-related disorder"
      },
      "penetrance": 0.03,
      "filterOverrides": {
        "lofHcEnabled": true,
        "missenseEnabled": true,
        "clinvarEnabled": true,
        "clinvarStarThreshold": 1
      },
      "notes": "CFTR-related disorders have approximately 3% penetrance. Includes CBAVD, bronchiectasis, and pancreatitis.",
      "references": [
        "https://pubmed.ncbi.nlm.nih.gov/23757202/"
      ]
    }
  ]
}
```

:::tip Multi-profile rule
Note that only `classic-cf` has `"isDefault": true`. Exactly one profile per config must be the default.
:::

### Minimal Valid Example — New Gene (PAH)

```json
{
  "schemaVersion": "1.0",
  "geneSymbol": "PAH",
  "profiles": [
    {
      "profileId": "pku",
      "displayName": "Phenylketonuria",
      "isDefault": true,
      "disease": {
        "omimId": "261600",
        "name": "Phenylketonuria"
      }
    }
  ]
}
```

This passes validation, but adding `omimGeneId`, `displayName`, `mondoId`, `penetrance`, `filterOverrides`, `notes`, and `references` is strongly recommended.

## Finding Penetrance Values

**Default assumption:** If you are unsure, use `1.0` (fully penetrant). The vast majority of classic autosomal recessive conditions are fully penetrant.

**Where to look:**

1. **[GeneReviews](https://www.ncbi.nlm.nih.gov/books/NBK1116/)** — Authoritative gene-specific reviews, often include penetrance estimates
2. **[OMIM](https://omim.org/)** — The # (phenotype) entry often cites penetrance in the clinical synopsis
3. **PubMed** — Search for `{gene} penetrance` or `{gene} carrier frequency`

**Always cite your source** in the `references` array when using penetrance < 1.0.

## Finding Disease Identifiers

### OMIM Phenotype ID

1. Go to [https://omim.org/](https://omim.org/)
2. Search for the **disease name** (not the gene)
3. Look for entries marked with **#** (phenotype entries)
4. Copy the 6-digit number

### MONDO ID

1. Go to [https://monarchinitiative.org/](https://monarchinitiative.org/)
2. Search for the disease name
3. Find the MONDO entry (format: `MONDO:0000000`)
4. Copy the full identifier including `MONDO:`

Providing both identifiers is preferred for interoperability.

## Submitting Your Config

### Step 1: Fork the repository

Fork [https://github.com/berntpopp/gnomad-carrier-frequency](https://github.com/berntpopp/gnomad-carrier-frequency) on GitHub.

### Step 2: Create your config file

Create `configs/genes/{YOUR_GENE_SYMBOL}.json` in your fork, using one of the [examples above](#complete-examples) as a template.

### Step 3: Open a pull request

Target branch: `main`. Title: `Add gene config for {GENE_SYMBOL}`. Include a brief description of the gene, condition(s), and your filter choices.

### Step 4: CI validation

CI automatically validates JSON syntax, schema compliance, and all constraints. If CI fails, the error message identifies the exact field and issue.

### Step 5: Maintainer review

A maintainer will review the clinical content (filter recommendations, penetrance, notes) and may ask questions. After approval, your config will be merged.

## What CI Validates

| Check | What it verifies |
|-------|-----------------|
| JSON syntax | File is valid JSON |
| Required fields | All required fields present |
| Schema version | `schemaVersion` is `"1.0"` |
| Gene symbol | `geneSymbol` is 1–20 characters |
| Filename match | Filename matches `geneSymbol` field |
| OMIM Gene ID format | `omimGeneId` is exactly 6 digits (if provided) |
| Profiles array | At least 1 profile present |
| Default profile | Exactly 1 profile has `isDefault: true` |
| Disease identifier | At least 1 of `omimId` or `mondoId` per profile |
| OMIM Phenotype ID format | `disease.omimId` is exactly 6 digits (if provided) |
| MONDO ID format | `disease.mondoId` matches `MONDO:XXXXXXX` (if provided) |
| Penetrance range | `penetrance` is 0.0–1.0 (if provided) |
| ClinVar star range | `clinvarStarThreshold` is 0–4 (if provided) |
| Conflicting threshold | `clinvarConflictingThreshold` is 50–100 (if provided) |
| Reference URLs | All `references` entries are valid URLs (if provided) |

CI does **not** validate the clinical correctness of filter choices or penetrance values — that is the job of the maintainer review.

## FAQ

:::details Can I add a gene that already has a config?
If the existing config is incorrect or missing important conditions, open a GitHub issue to discuss an update first. Do not open a PR replacing an existing config without prior discussion.
:::

:::details What if I don't know the penetrance?
Use `1.0` (fully penetrant), or omit the `penetrance` field — it defaults to 1.0. Add a note explaining the situation if helpful.
:::

:::details Can I add multiple conditions for one gene?
Yes. Add multiple objects to the `profiles` array. See the [CFTR example](#multi-profile-example-cftr-two-conditions-different-penetrance). Remember: exactly one profile must have `"isDefault": true`.
:::

:::details What variant exclusions should I add?
Exclude specific variants known to be benign with high allele frequency, or technically problematic (pseudogene interference, alignment artifacts). If unsure, leave `variantExclusions` empty or omit it.
:::

:::details My config fails CI — what should I do?
Read the error message carefully. It states which field failed and why (e.g., "OMIM Gene ID must be exactly 6 digits"). Fix the field and push again. Comment on the PR if the error message is unclear.
:::

:::details What ClinVar star threshold should I use?
Use star 1 for genes without expert panel review. Use star 2 or higher for genes with established ClinGen expert panel curation. Star 0 accepts any ClinVar assertion and is generally not recommended.
:::

:::details Do I need missenseEnabled: true?
Only if ClinVar-curated missense variants are well-characterized contributors for your gene. For genes where most pathogenic alleles are LoF variants, missense inclusion adds noise. For genes like HEXA, set `true`.
:::

## Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| OMIM | [omim.org](https://omim.org/) | Gene and phenotype identifiers |
| MONDO / Monarch Initiative | [monarchinitiative.org](https://monarchinitiative.org/) | MONDO disease identifiers |
| GeneReviews | [ncbi.nlm.nih.gov/books/NBK1116/](https://www.ncbi.nlm.nih.gov/books/NBK1116/) | Authoritative gene-condition reviews |
| HGNC Gene Names | [genenames.org](https://www.genenames.org/) | Official gene symbols |
| gnomAD | [gnomad.broadinstitute.org](https://gnomad.broadinstitute.org/) | Population allele frequency data |
| gnomAD Calculator | [gnomad-carrier-frequency.kidney-genetics.org](https://gnomad-carrier-frequency.kidney-genetics.org/) | Test your gene config here |
| ClinGen | [clinicalgenome.org](https://clinicalgenome.org/) | Expert panel curation status |
| PubMed | [pubmed.ncbi.nlm.nih.gov](https://pubmed.ncbi.nlm.nih.gov/) | Literature for penetrance and filter sources |

## See Also

- [Methodology Reference](/reference/methodology) — How carrier frequency is calculated
- [Filters Reference](/reference/filters) — Detailed explanation of all variant filter options
- [Contributing (Code)](/about/contributing) — Development setup and code contribution guide
