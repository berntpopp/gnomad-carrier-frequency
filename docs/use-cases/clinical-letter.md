# Clinical Letter Generation

## The Scenario

A patient has been tested as part of a family cascade screening and found to carry the HFE C282Y variant (hereditary hemochromatosis). You need to write a clinical letter explaining the carrier status and its reproductive implications. The letter should be in German with gender-inclusive language appropriate for the practice's house style.

This scenario covers the full letter generation workflow: setting up the calculation for HFE, selecting the right clinical perspective, generating German text, and customizing the output.

## Using the Calculator

### Setting Up with HFE

Search for HFE and allow the variant table to load. Unlike CFTR — where dozens of variants meet the automatic inclusion criteria — HFE typically shows a small number of qualifying variants.

For hereditary hemochromatosis carrier screening, the two clinically relevant variants are:

- **C282Y** (p.Cys282Tyr) — the primary disease-causing variant; homozygosity is responsible for the majority of clinically significant HFE-related hemochromatosis
- **H63D** (p.His63Asp) — associated with mild iron overload, particularly in compound heterozygosity with C282Y; pathogenicity in isolation is debated

Review the variant table and activate or deactivate variants to reflect the clinical scope of the counseling. For a patient who is a C282Y carrier, you may choose to include both C282Y and H63D to provide a full picture of the HFE carrier frequency, or limit the calculation to C282Y if the letter focuses specifically on that variant.

### Selecting the Right Perspective

Set the patient status to **Heterozygous carrier** — the patient carries one C282Y allele and is not affected with hemochromatosis. Then, in the results view, select the **Healthy Carrier** perspective for clinical text generation.

The three perspectives produce substantively different text:

| Perspective | Clinical situation | Text content |
|---|---|---|
| **Affected Patient** | Confirmed disease (e.g., hemochromatosis with clinical findings) | Explains the diagnosis, management, and family implications |
| **Healthy Carrier** | Carrier identified, not affected | Explains carrier status, reproductive implications, partner testing recommendation |
| **Family Member** | Relative who may want testing | Explains why testing was recommended and what a result would mean |

For this cascade screening patient, **Healthy Carrier** is the correct choice. The text explains what it means to carry one C282Y variant without the condition being clinically apparent, and recommends that the patient's partner consider testing if the couple is planning a family.

### Generating German Clinical Text

Select **German** as the output language, then choose the gender-inclusive style that matches your practice's standards:

- **Asterisk (\*)** — Träger\*in — most widely used in clinical correspondence in German-speaking countries
- **Colon (:)** — Träger:in — accepted in official contexts, used by some institutions
- **Slash (/)** — Träger/in — traditional gender-inclusive style, less common in newer documentation
- **Traditional** — Träger/Trägerin (long form) — explicit dual form, appropriate where space permits

The generated text uses your calculation results automatically — the carrier frequency, recurrence risk, gene name, and data source are substituted into the template wherever the corresponding `{{variable}}` placeholders appear.

<figure class="screenshot-frame">
  <img src="/screenshots/text-output.webp" alt="Generated clinical text with copy button" />
  <figcaption>Generated clinical text ready to copy into a patient letter. The text includes carrier frequency, risk calculations, and source citations.</figcaption>
</figure>

The output in English uses a similar structure:

> *"A heterozygous pathogenic variant in the HFE gene was identified. Based on data from gnomAD v4.1, the carrier frequency for pathogenic variants in HFE is approximately X% (1:Y). For a known carrier, the probability that a partner of the same ancestry also carries a pathogenic HFE variant is equal to the population carrier frequency."*

In German, the same content is produced with appropriate clinical phrasing, gender-inclusive language, and the local convention for expressing probabilities.

::: tip Template Customization
You can control which sections appear in the generated text through the template editor (click the settings icon). The available sections are:

- **geneIntro** — Introduction to the gene and condition
- **inheritance** — Autosomal recessive inheritance pattern
- **carrierFrequency** — The calculated carrier frequency
- **recurrenceRisk** — The recurrence risk given the patient's status
- **populationContext** — Notes on population-specific variation
- **founderEffect** — Founder effect explanation (if relevant)
- **sourceCitation** — gnomAD version, dataset, and access date
- **recommendation** — Partner testing and follow-up recommendation

See the [Templates reference](/reference/templates) for the complete variable reference and guidance on customizing template text.
:::

### Copying and Using the Text

Click the copy button above the generated text to copy it to your clipboard. Paste directly into your word processor or EHR system. The source citation section (if enabled) automatically includes the gnomAD version, population dataset, and access date — supporting traceability in the clinical record.

Review the generated text before sending. The calculator fills in numeric values and standard phrasing, but clinical context — the patient's specific variant, testing method, referral source — will need to be added in the letter preamble.

## See Also

- [Templates](/reference/templates) — Full variable reference, section descriptions, and customization guide
- [Carrier Screening](/use-cases/carrier-screening) — CFTR-specific carrier screening workflow with variant exclusion
- [Getting Started](/guide/getting-started) — Basic calculator walkthrough for new users
