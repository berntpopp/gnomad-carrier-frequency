# Contributing Gene Configs

Thank you for your interest in contributing a gene configuration to the gnomAD Carrier Frequency Calculator. This guide explains what gene configs are, how to create one, and how to submit it for review.

You do **not** need to be a software developer to contribute. If you have clinical expertise in a gene's pathogenic variant landscape, your contribution is valuable.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Config File Location](#config-file-location)
4. [Schema Reference — Field by Field](#schema-reference--field-by-field)
5. [OMIM Gene ID vs OMIM Phenotype ID](#omim-gene-id-vs-omim-phenotype-id)
6. [Complete Examples](#complete-examples)
7. [Finding Penetrance Values](#finding-penetrance-values)
8. [Finding Disease Identifiers](#finding-disease-identifiers)
9. [Submitting Your Config](#submitting-your-config)
10. [What CI Validates](#what-ci-validates)
11. [FAQ](#faq)
12. [Resources](#resources)

---

## Introduction

### What are gene configs?

Gene configs are JSON files that encode curated, gene-specific settings for the carrier frequency calculator. When a gene has a config file, the calculator automatically:

- Pre-populates recommended variant filter settings (e.g., ClinVar star threshold, whether to include missense variants)
- Applies the correct disease penetrance for recurrence risk calculations
- Excludes known benign or technically problematic variants
- Links the condition to standard disease identifiers (OMIM, MONDO)

### Why do they matter?

Carrier frequency calculations are only as good as the variant filtering they use. For CFTR, an expert panel ClinVar star threshold of 2 is appropriate. For HEXA, including missense variants with ≥1 ClinVar star captures important pathogenic alleles that a LoF-only approach would miss. These gene-specific recommendations live in the config, so users get clinically appropriate defaults without needing deep variant knowledge.

### Who should contribute?

Anyone with domain knowledge of a gene's pathogenic variant landscape:

- Clinical geneticists and genetic counselors
- Laboratory specialists familiar with a gene's ClinVar curation history
- Researchers with expertise in a specific condition

---

## Quick Start

1. Browse existing configs in [`configs/genes/`](genes/) — [`HEXA.json`](genes/HEXA.json) is the simplest example.
2. Copy `HEXA.json` as your starting template.
3. Rename it to `{YOUR_GENE_SYMBOL}.json` (uppercase, e.g., `PAH.json`).
4. Fill in the fields for your gene (see [Schema Reference](#schema-reference--field-by-field) below).
5. [Submit a pull request](#submitting-your-config) — CI will validate the JSON automatically.

---

## Config File Location

All gene config files live in the `configs/genes/` directory of this repository:

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

---

## Schema Reference — Field by Field

A gene config file is a JSON object with the following structure. Fields marked **(required)** must be present; **(optional)** fields may be omitted.

### Top-Level Fields

#### `schemaVersion` (required)

- **Type:** string
- **Value:** Always `"1.0"`
- **Example:** `"schemaVersion": "1.0"`

This tells the validator which version of the schema to use. Always set to `"1.0"`.

---

#### `geneSymbol` (required)

- **Type:** string, 1–20 characters
- **Value:** HGNC gene symbol, uppercase
- **Example:** `"geneSymbol": "PAH"`

Must match the filename exactly. Use the official HGNC symbol — look it up at [genenames.org](https://www.genenames.org/) if unsure.

---

#### `displayName` (optional)

- **Type:** string
- **Value:** Full human-readable gene name
- **Example:** `"displayName": "Phenylalanine Hydroxylase"`

Shown in the calculator UI. If omitted, the geneSymbol is used instead.

---

#### `omimGeneId` (optional)

- **Type:** string, exactly 6 digits
- **Value:** The OMIM **gene** entry number (the asterisk * entry)
- **Example:** `"omimGeneId": "612349"` (PAH gene)

> **Important:** This is the OMIM entry for the **gene itself**, not for any disease it causes.
> See [OMIM Gene ID vs OMIM Phenotype ID](#omim-gene-id-vs-omim-phenotype-id) for a full explanation.

---

#### `inheritance` (optional)

- **Type:** string, one of `"AR"`, `"XL"`, `"AD"`
- **Example:** `"inheritance": "AR"`

The inheritance pattern. Use `"AR"` for autosomal recessive (the primary use case of this calculator), `"XL"` for X-linked, `"AD"` for autosomal dominant.

---

#### `profiles` (required)

- **Type:** array of [condition profile objects](#profile-fields)
- **Constraint:** At least 1 profile; exactly 1 profile must have `isDefault: true`
- **Example:** See [Complete Examples](#complete-examples)

Each profile represents one clinical condition associated with this gene. Most genes have one profile. Genes like CFTR, where pathogenic variants cause clinically distinct conditions with different penetrance (classic CF vs. CFTR-related disorders), may have multiple profiles.

---

### Profile Fields

Each object inside the `profiles` array has these fields:

#### `profileId` (required)

- **Type:** string
- **Value:** A short, unique identifier for this profile within the gene config. Use lowercase with hyphens.
- **Example:** `"profileId": "classic-cf"` or `"profileId": "tay-sachs"`

Used internally to identify the profile. Does not appear in the UI but must be unique within the file.

---

#### `displayName` (required)

- **Type:** string
- **Value:** Human-readable condition name
- **Example:** `"displayName": "Phenylketonuria"`

Shown in the calculator's condition selector UI.

---

#### `isDefault` (required)

- **Type:** boolean (`true` or `false`)
- **Constraint:** Exactly **one** profile in the entire file must have `isDefault: true`
- **Example:** `"isDefault": true`

The default profile is automatically selected when a user loads this gene. For genes with one profile, set it to `true`. For multi-profile genes, set `true` for the most clinically important or most commonly screened condition.

---

#### `disease` (required)

- **Type:** [disease identifier object](#disease-identifier-fields)
- **Constraint:** At least one of `omimId` or `mondoId` must be provided

Links the condition profile to standard disease ontology identifiers.

---

#### `penetrance` (optional)

- **Type:** number, 0.0–1.0
- **Default if omitted:** 1.0 (fully penetrant)
- **Example:** `"penetrance": 0.03` (3% penetrance, as in CFTR-related disorders)

The probability that a person with two pathogenic alleles will develop the condition. Fully penetrant conditions (the vast majority of autosomal recessive conditions) use `1.0`. Use a value less than 1.0 only when there is published evidence for reduced penetrance, and cite the source in `references`.

---

#### `filterOverrides` (optional)

- **Type:** [filter override object](#filter-override-fields)
- **Default if omitted:** Calculator applies its built-in defaults

Recommended variant filter settings for this gene/condition. Only specify fields where the gene-specific recommendation differs from or refines the user's current settings. See [Filter Override Fields](#filter-override-fields) for details.

---

#### `variantExclusions` (optional)

- **Type:** array of strings
- **Value:** Variant identifiers (gnomAD variant IDs) to exclude from the carrier frequency calculation
- **Example:** `"variantExclusions": ["1-12345678-A-G"]`

Use this to exclude specific variants that are known to be:
- Benign or likely benign with high allele frequency (would inflate carrier frequency)
- Technically problematic (pseudogene interference, alignment artifacts)

Leave as `[]` or omit if no exclusions are needed.

---

#### `notes` (optional)

- **Type:** string
- **Value:** Free-text clinical commentary
- **Example:** `"notes": "Classic infantile form results in progressive neurodegeneration. Ashkenazi Jewish carrier frequency ~1/30."`

Important clinical context about this condition, variant landscape, or calculation considerations. Written for genetic counselors and geneticists. Displayed in the calculator UI.

---

#### `references` (optional)

- **Type:** array of URL strings
- **Value:** PubMed or other literature URLs supporting the config values
- **Example:** `"references": ["https://pubmed.ncbi.nlm.nih.gov/20301406/"]`

Cite the sources for penetrance values, filter recommendations, or clinical notes. All values must be valid URLs.

---

### Disease Identifier Fields

The `disease` object inside each profile has these fields:

#### `omimId` (optional but recommended)

- **Type:** string, exactly 6 digits
- **Value:** OMIM **phenotype** MIM number (the hash # entry)
- **Example:** `"omimId": "261600"` (Phenylketonuria)

> **Important:** This is the OMIM number for the **disease**, not the gene. Phenotype entries are marked with # on OMIM.
> See [OMIM Gene ID vs OMIM Phenotype ID](#omim-gene-id-vs-omim-phenotype-id).

---

#### `mondoId` (optional but recommended)

- **Type:** string, format `MONDO:XXXXXXX` (7 digits)
- **Example:** `"mondoId": "MONDO:0009861"` (Phenylketonuria)

The MONDO ontology identifier. Look it up at [monarchinitiative.org](https://monarchinitiative.org/).

---

#### `name` (required)

- **Type:** string
- **Value:** Standard disease name
- **Example:** `"name": "Phenylketonuria"`

The official or widely-used disease name. Used for display and search.

---

**Constraint:** At least one of `omimId` or `mondoId` must be present. Providing both is preferred.

---

### Filter Override Fields

All filter override fields are **optional**. Only specify fields where you have a gene-specific recommendation.

#### `lofHcEnabled` (optional)

- **Type:** boolean
- **Default:** `true` (in calculator defaults)
- **Example:** `"lofHcEnabled": true`

Whether to include Loss-of-Function High Confidence (LoF HC) variants. These are predicted stop-gain, frameshift, and splice-site variants classified as high confidence by LOFTEE. Nearly always `true` for autosomal recessive conditions.

---

#### `missenseEnabled` (optional)

- **Type:** boolean
- **Default:** `false` (in calculator defaults)
- **Example:** `"missenseEnabled": true`

Whether to include missense variants. For most genes, ClinVar filtering is preferred over broad missense inclusion. However, for genes where ClinVar pathogenic missense variants are well-curated (e.g., HEXA), setting `true` improves sensitivity.

---

#### `clinvarEnabled` (optional)

- **Type:** boolean
- **Default:** `true` (in calculator defaults)
- **Example:** `"clinvarEnabled": true`

Whether to include ClinVar Pathogenic/Likely Pathogenic variants.

---

#### `clinvarStarThreshold` (optional)

- **Type:** integer, 0–4
- **Default:** `0` (in calculator defaults)
- **Example:** `"clinvarStarThreshold": 2`

Minimum number of ClinVar review stars required for a variant to be included.

| Stars | Meaning |
|-------|---------|
| 0 | No assertion criteria provided |
| 1 | Single submitter |
| 2 | Multiple submitters with no conflicts, or reviewed by expert panel |
| 3 | Reviewed by expert panel |
| 4 | Practice guideline |

For genes with established expert panel curation (e.g., ClinGen, ENIGMA), using star threshold 2 or 3 reduces false positives. For genes without expert panel review, star threshold 1 may be appropriate.

---

#### `clinvarIncludeConflicting` (optional)

- **Type:** boolean
- **Default:** `false` (in calculator defaults)
- **Example:** `"clinvarIncludeConflicting": true`

Whether to include variants with conflicting ClinVar classifications (e.g., submitted as both Pathogenic and Likely Benign by different submitters). When `true`, use `clinvarConflictingThreshold` to control what fraction must be P/LP.

---

#### `clinvarConflictingThreshold` (optional)

- **Type:** integer, 50–100
- **Default:** `75` (in calculator defaults, when conflicting variants are enabled)
- **Example:** `"clinvarConflictingThreshold": 80`

When `clinvarIncludeConflicting` is `true`, only variants where at least this percentage of classifications are Pathogenic or Likely Pathogenic are included. For example, `80` means 80% of submissions must be P/LP.

---

## OMIM Gene ID vs OMIM Phenotype ID

This is the most common source of confusion when creating gene configs. OMIM has two different types of entries, each with a different number:

| Config Field | OMIM Entry Type | Symbol on OMIM | Example (CFTR) | How to Find It |
|---|---|---|---|---|
| `omimGeneId` (top-level) | **Gene** entry | Asterisk (*) | `602421` | Search OMIM for the gene symbol; look for the * entry |
| `disease.omimId` (inside profiles) | **Phenotype/Disease** entry | Hash (#) | `219700` | Search OMIM for the disease name; look for the # entry |

**How to use OMIM correctly:**

1. Go to [https://omim.org/](https://omim.org/)
2. **For `omimGeneId`:** Search for your gene symbol (e.g., "CFTR"). Find the entry marked with an asterisk (*). The 6-digit number after the * is the gene ID.
3. **For `disease.omimId`:** Search for the disease name (e.g., "cystic fibrosis"). Find the entry marked with a hash (#). The 6-digit number after the # is the phenotype ID.

**Common mistake:** Putting the gene entry number (e.g., `602421`) in the `disease.omimId` field. The `disease.omimId` must be the phenotype entry number (e.g., `219700`).

---

## Complete Examples

### Simple Example — HEXA (single condition, single profile)

HEXA is the simplest real-world example. One gene, one condition, fully penetrant.

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
      "notes": "Tay-Sachs disease is a fully penetrant autosomal recessive lysosomal storage disorder caused by HEXA deficiency. Classic infantile form results in progressive neurodegeneration and death in early childhood. Ashkenazi Jewish carrier frequency ~1/30 vs ~1/300 in general population.",
      "references": [
        "https://pubmed.ncbi.nlm.nih.gov/8490627/",
        "https://pubmed.ncbi.nlm.nih.gov/20301406/"
      ]
    }
  ]
}
```

---

### Multi-Profile Example — CFTR (two conditions, different penetrance)

CFTR illustrates a gene where the same pathogenic variants cause clinically distinct conditions with very different penetrance:

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
      "notes": "Classic cystic fibrosis is fully penetrant. ClinVar star threshold 2 is recommended to minimize false positives.",
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

Note that only `classic-cf` has `"isDefault": true`. The second profile `cftr-rd` has `"isDefault": false`.

---

### Minimal Valid Example — New Gene (PAH)

The absolute minimum required fields for a valid config:

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

This is valid but minimal. Adding `omimGeneId`, `displayName`, `mondoId`, `penetrance`, `filterOverrides`, `notes`, and `references` is strongly recommended.

---

## Finding Penetrance Values

**Default assumption:** If you are unsure, use `1.0` (fully penetrant). The vast majority of classic autosomal recessive conditions are fully penetrant. This is the conservative choice.

**When to use a value less than 1.0:**

- The condition has documented reduced penetrance in the literature
- The condition spectrum includes asymptomatic carriers with two pathogenic alleles
- Examples: CFTR-related disorders (~3%), some HFE-associated hemochromatosis presentations

**Where to find penetrance values:**

1. **GeneReviews** (authoritative gene-specific reviews): [https://www.ncbi.nlm.nih.gov/books/NBK1116/](https://www.ncbi.nlm.nih.gov/books/NBK1116/)
2. **OMIM** disease entry (# entry): Often cites penetrance in the clinical synopsis
3. **Published literature**: Use PubMed to search for the gene + "penetrance" or "carrier frequency"

**Always cite your source** in the `references` array when using penetrance < 1.0.

---

## Finding Disease Identifiers

### OMIM Phenotype ID (`disease.omimId`)

1. Go to [https://omim.org/](https://omim.org/)
2. Search for the **disease name** (e.g., "phenylketonuria")
3. Look for entries marked with **#** (phenotype entries)
4. The 6-digit number is the omimId

### MONDO ID (`disease.mondoId`)

1. Go to [https://monarchinitiative.org/](https://monarchinitiative.org/)
2. Search for the disease name
3. Find the MONDO entry (format: `MONDO:0000000`)
4. Copy the full identifier including "MONDO:"

Both identifiers are optional individually, but **at least one is required**. Providing both is preferred for interoperability.

---

## Submitting Your Config

### Step 1: Fork the repository

Fork [https://github.com/berntpopp/gnomad-carrier-frequency](https://github.com/berntpopp/gnomad-carrier-frequency) on GitHub.

### Step 2: Create your config file

Create `configs/genes/{YOUR_GENE_SYMBOL}.json` in your fork.

### Step 3: Validate locally (optional but recommended)

If you have Node.js or Bun installed:

```bash
bun install
bun run test
```

### Step 4: Open a pull request

- Target branch: `main`
- Title: `Add gene config for {GENE_SYMBOL}`
- Description: Brief explanation of the gene, the condition(s), and why you chose the filter settings you did

### Step 5: CI validation

When you open the PR, GitHub Actions will automatically:
- Parse the JSON for syntax errors
- Validate the config against the schema
- Check all constraints (exactly one default profile, valid IDs, etc.)

If CI fails, the error message will tell you exactly which field failed and why. Fix the issue and push — CI will re-run automatically.

### Step 6: Maintainer review

A maintainer will review the **clinical content** (filter recommendations, penetrance, notes) and may ask questions or suggest changes. After approval, your config will be merged.

---

## What CI Validates

The automated CI check validates:

| Check | What it verifies |
|-------|-----------------|
| JSON syntax | File is valid JSON |
| Required fields | `schemaVersion`, `geneSymbol`, `profiles`, each profile's required fields |
| Schema version | `schemaVersion` is `"1.0"` |
| Gene symbol | `geneSymbol` is 1–20 characters |
| Filename match | Filename matches `geneSymbol` field |
| OMIM Gene ID format | `omimGeneId` is exactly 6 digits (if provided) |
| Profiles array | At least 1 profile present |
| Default profile | Exactly 1 profile has `isDefault: true` |
| Disease identifier | At least 1 of `omimId` or `mondoId` per profile |
| OMIM Phenotype ID format | `disease.omimId` is exactly 6 digits (if provided) |
| MONDO ID format | `disease.mondoId` matches `MONDO:XXXXXXX` format (if provided) |
| Penetrance range | `penetrance` is between 0.0 and 1.0 (if provided) |
| ClinVar star range | `clinvarStarThreshold` is 0–4 (if provided) |
| Conflicting threshold | `clinvarConflictingThreshold` is 50–100 (if provided) |
| Reference URLs | All `references` entries are valid URLs (if provided) |

CI does **not** validate the clinical correctness of filter choices or penetrance values — that is the job of the maintainer review.

---

## FAQ

**Can I add a gene that already has a config?**

If the existing config is incorrect or missing important conditions, open a GitHub issue to discuss an update. Do not open a PR that replaces an existing config without prior discussion.

**What if I don't know the penetrance?**

Use `1.0` (fully penetrant) and add a note explaining the condition is well-characterized as fully penetrant, or that penetrance data is not available. You can omit the `penetrance` field entirely — it defaults to 1.0.

**Can I add multiple conditions for one gene?**

Yes. Add multiple objects to the `profiles` array. See the [CFTR example](#multi-profile-example--cftr-two-conditions-different-penetrance) above. Remember: exactly one profile must have `"isDefault": true`.

**What variant exclusions should I add?**

Exclude specific variants that are known to be benign with high allele frequency — ones that would artificially inflate the carrier frequency calculation. Common examples: variants in gene segments with pseudogene interference, or population-specific benign variants that have been reclassified. If you're not sure, leave `variantExclusions` empty or omit it.

**My config fails CI — what should I do?**

Read the CI error message carefully. It will state which field failed and why (e.g., "OMIM Gene ID must be exactly 6 digits", "Exactly one profile must have isDefault: true"). Fix the field and push again. If the error is unclear, comment on the PR and ask for help.

**What ClinVar star threshold should I use?**

- **Star 0:** Accepts any ClinVar assertion — highest sensitivity, highest false positive rate. Not recommended for most genes.
- **Star 1:** Single submitter. Acceptable for genes without expert panel review.
- **Star 2:** Multiple submitters or expert panel review. Recommended for well-curated genes.
- **Star 3+:** Expert panel review. Use for genes with active ClinGen curation.

**Do I need to include `missenseEnabled: true`?**

Only if ClinVar pathogenic missense variants are well-characterized for this gene. For genes where most pathogenic alleles are LoF (stop-gain, frameshift, splice-site), missense inclusion adds noise. For genes like HEXA where ClinVar-curated missense variants are important contributors to carrier frequency, set `true`.

---

## Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| OMIM | [https://omim.org/](https://omim.org/) | Gene and phenotype identifiers |
| MONDO / Monarch Initiative | [https://monarchinitiative.org/](https://monarchinitiative.org/) | MONDO disease identifiers |
| GeneReviews | [https://www.ncbi.nlm.nih.gov/books/NBK1116/](https://www.ncbi.nlm.nih.gov/books/NBK1116/) | Authoritative gene-condition reviews, penetrance data |
| HGNC Gene Names | [https://www.genenames.org/](https://www.genenames.org/) | Official gene symbols |
| gnomAD | [https://gnomad.broadinstitute.org/](https://gnomad.broadinstitute.org/) | Population allele frequency data |
| gnomAD Carrier Frequency Calculator | [https://gnomad-carrier-frequency.kidney-genetics.org/](https://gnomad-carrier-frequency.kidney-genetics.org/) | Test your gene config here |
| ClinGen | [https://clinicalgenome.org/](https://clinicalgenome.org/) | Gene-disease validity, expert panel curation status |
| PubMed | [https://pubmed.ncbi.nlm.nih.gov/](https://pubmed.ncbi.nlm.nih.gov/) | Literature for penetrance and filter recommendations |

---

*See also: [CONTRIBUTING.md](../CONTRIBUTING.md) for code contributions, development setup, and general pull request process.*
