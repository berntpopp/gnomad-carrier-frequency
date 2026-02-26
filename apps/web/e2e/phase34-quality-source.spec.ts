/**
 * Phase 34: Quality Flags & Source Breakdown E2E Tests
 *
 * Verifies the complete Phase 34 feature set:
 *   - Quality flag chips on variants (High AF, High Hom, gnomAD Filtered, Genomes Only)
 *   - Source category chips (ClinVar, pLoF, Both) on each variant
 *   - Per-population source frequency breakdown via expandable rows
 *   - Quality settings in Settings dialog Quality tab
 *   - Quality exclusion toggles in FilterPanel
 *   - Flagged variant count in summary
 *
 * Uses fixture data with 4 variants designed to trigger different flags and source categories:
 *   Variant 1: LoF HC + ClinVar → source "Both"
 *   Variant 2: LoF HC + ClinVar → source "Both"
 *   Variant 3: ClinVar-only (missense) + High AF in NFE → source "ClinVar", flag "High AF"
 *   Variant 4: LoF HC only, genome-only → source "pLoF", flag "Genomes Only"
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  GENE_SEARCH_RESPONSE,
  GENE_DETAILS_RESPONSE,
} from "./fixtures/gnomad-responses";

// ─── Fixture data with quality flags and mixed source categories ─────────────

const POPULATIONS_NORMAL = [
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

// NFE population has >5% AF to trigger High AF flag
const POPULATIONS_HIGH_AF = [
  { id: "afr", ac: 5, an: 24000, ac_hom: 0 },
  { id: "ami", ac: 0, an: 1200, ac_hom: 0 },
  { id: "amr", ac: 12, an: 18000, ac_hom: 0 },
  { id: "asj", ac: 8, an: 4000, ac_hom: 0 },
  { id: "eas", ac: 1, an: 10000, ac_hom: 0 },
  { id: "fin", ac: 18, an: 11000, ac_hom: 0 },
  { id: "mid", ac: 2, an: 3000, ac_hom: 0 },
  { id: "nfe", ac: 4000, an: 72000, ac_hom: 10 }, // 5.56% AF → High AF
  { id: "sas", ac: 3, an: 14000, ac_hom: 0 },
  { id: "remaining", ac: 4, an: 6000, ac_hom: 0 },
];

const GENE_VARIANTS_PHASE34 = {
  data: {
    gene: {
      gene_id: "ENSG00000001626",
      symbol: "CFTR",
      variants: [
        // Variant 1: LoF HC + ClinVar Pathogenic → source "Both"
        {
          variant_id: "7-117559590-T-A",
          pos: 117559590,
          ref: "T",
          alt: "A",
          exome: {
            ac: 233,
            an: 163200,
            ac_hom: 1,
            filters: [],
            populations: POPULATIONS_NORMAL,
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
        // Variant 2: LoF HC + ClinVar Pathogenic → source "Both"
        {
          variant_id: "7-117572531-G-T",
          pos: 117572531,
          ref: "G",
          alt: "T",
          exome: {
            ac: 45,
            an: 163200,
            ac_hom: 0,
            filters: [],
            populations: POPULATIONS_NORMAL.map((p) => ({
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
        // Variant 3: ClinVar pathogenic, missense (NOT LoF HC), High AF in NFE
        // → source "ClinVar", flag "High AF (BA1)"
        {
          variant_id: "7-117587800-C-T",
          pos: 117587800,
          ref: "C",
          alt: "T",
          exome: {
            ac: 4053,
            an: 163200,
            ac_hom: 10,
            filters: [],
            populations: POPULATIONS_HIGH_AF,
          },
          genome: null,
          joint: null,
          transcript_consequence: {
            gene_symbol: "CFTR",
            transcript_id: "ENST00000003084",
            canonical: true,
            consequence_terms: ["missense_variant"],
            lof: null,
            lof_filter: null,
            lof_flags: null,
            hgvsc: "c.350G>A",
            hgvsp: "p.Arg117His",
          },
        },
        // Variant 4: LoF HC, NOT in ClinVar, genome-only
        // → source "pLoF", flag "Genomes Only"
        {
          variant_id: "7-117600100-A-G",
          pos: 117600100,
          ref: "A",
          alt: "G",
          exome: null,
          genome: {
            ac: 3,
            an: 30000,
            ac_hom: 0,
            filters: [],
            populations: [
              { id: "afr", ac: 1, an: 8000, ac_hom: 0 },
              { id: "nfe", ac: 2, an: 15000, ac_hom: 0 },
            ],
          },
          joint: null,
          transcript_consequence: {
            gene_symbol: "CFTR",
            transcript_id: "ENST00000003084",
            canonical: true,
            consequence_terms: ["splice_donor_variant"],
            lof: "HC",
            lof_filter: null,
            lof_flags: null,
            hgvsc: "c.3718-1G>A",
            hgvsp: null,
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
          review_status:
            "criteria provided, multiple submitters, no conflicts",
          pos: 117572531,
          ref: "G",
          alt: "T",
        },
        {
          variant_id: "7-117587800-C-T",
          clinvar_variation_id: "7200",
          clinical_significance: "Pathogenic/Likely pathogenic",
          gold_stars: 3,
          review_status:
            "criteria provided, multiple submitters, no conflicts",
          pos: 117587800,
          ref: "C",
          alt: "T",
        },
        // Note: Variant 4 (7-117600100-A-G) intentionally NOT in ClinVar → pLoF-only
      ],
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function interceptAllApis(page: Page): Promise<void> {
  // Use URL predicate for robust matching (villus may vary the URL slightly)
  await page.route(
    (url) => url.href.includes("gnomad.broadinstitute.org/api"),
    async (route: Route) => {
      const postData = route.request().postDataJSON() as {
        operationName?: string;
      } | null;

      switch (postData?.operationName) {
        case "GeneSearch":
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(GENE_SEARCH_RESPONSE),
          });
          break;
        case "GeneDetails":
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(GENE_DETAILS_RESPONSE),
          });
          break;
        case "GeneVariants":
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(GENE_VARIANTS_PHASE34),
          });
          break;
        default:
          await route.continue();
      }
    },
  );

  // Intercept ClinGen CSV
  await page.route("**/clingen-gene-validity.csv**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: [
        '"CLINGEN GENE DISEASE VALIDITY CURATIONS"',
        '"File Created: 2024-01-01"',
        '"https://search.clinicalgenome.org"',
        '"++++++++++++++++++++++++++++++++++++"',
        '"GENE SYMBOL","GENE ID (HGNC)","DISEASE LABEL","DISEASE ID (MONDO)","MOI","SOP","CLASSIFICATION","ONLINE REPORT","CLASSIFICATION DATE","GCEP"',
        '"++++++++++++++++++++++++++++++++++++"',
        '"CFTR","HGNC:1884","Cystic fibrosis","MONDO:0009061","AR","SOP8","Definitive","https://example.com","2023-01-01","CF GCEP"',
      ].join("\n"),
    });
  });
  await page.route("**/search.clinicalgenome.org/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/plain", body: "" });
  });
}

async function dismissDisclaimer(page: Page): Promise<void> {
  const disclaimer = page.getByTestId("disclaimer-dialog");
  const isVisible = await disclaimer.isVisible().catch(() => false);
  if (isVisible) {
    await page.getByTestId("disclaimer-accept-btn").click();
    await expect(disclaimer).not.toBeVisible({ timeout: 5_000 });
  }
}

/** Navigate the wizard to the results step (step 4). */
async function navigateToResults(page: Page): Promise<void> {
  await page.goto("/");
  await dismissDisclaimer(page);

  // Step 1: Gene search
  const geneInput = page.getByTestId("gene-search-input").locator("input");
  await geneInput.click();
  await geneInput.fill("CFTR");
  await page.getByRole("option", { name: /^CFTR\b/ }).first().click();
  await page.getByTestId("step-gene-next-btn").click();

  // Step 2: Index patient status
  await page.getByTestId("status-option-heterozygous").click();
  await page.getByTestId("step-status-next-btn").click();

  // Step 3: Frequency source
  await expect(
    page.getByText("Carrier frequency calculated from gnomAD data."),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("step-frequency-next-btn").click();

  // Step 4: Results
  await expect(page.getByTestId("step-results")).toBeVisible();
  await expect(page.getByTestId("results-summary-card")).toBeVisible();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Phase 34: Quality Flags & Source Breakdown", () => {
  test.beforeEach(async ({ page }) => {
    await interceptAllApis(page);
  });

  test("shows quality flags, source chips in variant table, and expandable source breakdown rows", async ({
    page,
  }) => {
    await navigateToResults(page);

    // ── Summary shows flagged variant count ───────────────────────────────
    // Variants 3 and 4 have quality flags → "2 flagged" in summary
    await expect(page.getByText(/\d+ flagged/)).toBeVisible();

    // ── Source breakdown: expand a population row via chevron ──────────────
    // Find chevron button on a non-global population row
    const expandBtn = page
      .getByRole("button", { name: "Expand source breakdown" })
      .first();
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    // Source breakdown sub-rows should appear with category chips
    // Our fixture has Both, ClinVar, and pLoF variants, so up to 3 source rows
    const sourceChips = page.locator(".source-breakdown-row .v-chip");
    await expect(sourceChips.first()).toBeVisible({ timeout: 5_000 });

    // Verify at least one source breakdown row exists
    const sourceRows = page.locator("tr.source-breakdown-row");
    const sourceRowCount = await sourceRows.count();
    expect(sourceRowCount).toBeGreaterThan(0);

    // Collapse the expanded row
    const collapseBtn = page
      .getByRole("button", { name: "Collapse source breakdown" })
      .first();
    await collapseBtn.click();

    // Source breakdown rows should be hidden
    await expect(sourceRows.first()).not.toBeVisible();

    // ── Row click still opens VariantModal ─────────────────────────────────
    // Click a population row text (not the chevron) to open modal
    const populationRow = page.locator("tr.population-row").first();
    await populationRow.click();
    await expect(page.getByTestId("variant-modal")).toBeVisible({
      timeout: 5_000,
    });

    // ── Variant table: quality flags and source chips ──────────────────────
    const variantTable = page.getByTestId("variant-table");
    await expect(variantTable).toBeVisible();

    // Quality flags column: at least one variant should have a warning icon
    // Variant 3 has High AF, Variant 4 has Genomes Only
    const alertIcons = variantTable.locator(
      ".mdi-alert, i.mdi-alert",
    );
    await expect(alertIcons.first()).toBeVisible({ timeout: 5_000 });

    // Source column: verify source chips exist (Both, ClinVar, pLoF)
    // At least "Both" chip should appear for variants 1 and 2
    await expect(variantTable.getByText("Both").first()).toBeVisible();

    // Close variant modal
    await page.getByTestId("variant-modal-close-btn").click();
    await expect(page.getByTestId("variant-modal")).not.toBeVisible();
  });

  test("quality settings tab has 4 flag configuration cards", async ({
    page,
  }) => {
    await navigateToResults(page);

    // Open Settings dialog via footer button
    await page.getByTestId("footer-settings-btn").click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();

    // Navigate to Quality tab
    await page.getByTestId("settings-tab-quality").click();

    // Verify 4 quality flag configuration cards are present
    const settingsDialog = page.getByTestId("settings-dialog");
    await expect(
      settingsDialog.getByText("High Allele Frequency (BA1)"),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      settingsDialog.getByText("High Homozygote Count"),
    ).toBeVisible();
    await expect(
      settingsDialog.getByText("gnomAD Quality Filters"),
    ).toBeVisible();
    await expect(settingsDialog.getByText("Genomes Only")).toBeVisible();

    // Verify Reset to Defaults button exists
    await expect(
      settingsDialog.getByRole("button", { name: /reset/i }),
    ).toBeVisible();

    // Close settings
    await page.keyboard.press("Escape");
  });

  test("filter panel quality exclusion toggles update carrier frequency", async ({
    page,
  }) => {
    await navigateToResults(page);

    // Record initial carrier frequency value
    const summaryCard = page.getByTestId("results-summary-card");
    const initialFrequency = await summaryCard
      .locator(".stat-value")
      .first()
      .textContent();

    // Expand the FilterPanel (Settings expansion panel)
    // Scope to the .settings-panel class to avoid matching other "Settings" text
    await page.locator(".settings-panel .v-expansion-panel-title").click();

    // Find and verify quality exclusion section
    await expect(
      page.getByText("Quality Flag Exclusions"),
    ).toBeVisible({ timeout: 5_000 });

    // Verify all 4 exclusion toggles are present
    await expect(page.getByText("Exclude High AF")).toBeVisible();
    await expect(page.getByText("Exclude High Hom")).toBeVisible();
    await expect(page.getByText("Exclude gnomAD Filtered")).toBeVisible();
    await expect(page.getByText("Exclude Genomes Only")).toBeVisible();

    // Toggle ALL exclusion switches ON to ensure we exclude flagged variants
    // (with real CFTR data, not all individual flag types may have matches)
    const flagLabels = [
      "Exclude High AF",
      "Exclude High Hom",
      "Exclude gnomAD Filtered",
      "Exclude Genomes Only",
    ];
    for (const label of flagLabels) {
      await page.getByText(label).click();
    }

    // With all exclusions enabled, frequency should change
    await expect(async () => {
      const updatedFrequency = await summaryCard
        .locator(".stat-value")
        .first()
        .textContent();
      expect(updatedFrequency).not.toBe(initialFrequency);
    }).toPass({ timeout: 5_000 });

    // Toggle all OFF — frequency should restore to initial value
    for (const label of flagLabels) {
      await page.getByText(label).click();
    }

    await expect(summaryCard.locator(".stat-value").first()).toContainText(
      initialFrequency!,
      { timeout: 5_000 },
    );
  });
});
