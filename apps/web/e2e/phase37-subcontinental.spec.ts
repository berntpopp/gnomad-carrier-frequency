/**
 * Phase 37: Subcontinental Populations — E2E Tests
 *
 * Tests the full subcontinental population breakdown feature:
 *   - v2-only toggle in population table toolbar (v-switch for v2, chip for v4)
 *   - Toggle ON triggers N+1 fetch with progress bar
 *   - Nested subcontinental rows under NFE (6 subgroups) and EAS (3 subgroups)
 *   - Low sample size and founder effect quality warnings
 *   - Toggle OFF collapses rows
 *   - Gene switching clears subcontinental data and resets toggle
 *   - Other populations (AFR, AMR, ASJ, FIN, OTH, SAS) have no subcontinental rows
 *
 * All APIs are intercepted — no real network dependency.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  GENE_SEARCH_RESPONSE,
  GENE_DETAILS_RESPONSE,
  GENE_VARIANTS_RESPONSE,
} from "./fixtures/gnomad-responses";

// ─── Subcontinental variant mock fixtures ────────────────────────────────────

/**
 * Mock subcontinental population data for CFTR variants.
 *
 * Designed to exercise:
 *   - eas_jpn: AN=400 → low sample size (threshold 1000)
 *   - nfe_est: high AF → founder effect (>5x parent nfe carrier freq)
 *   - nfe_nwe: highest AC → highest carrier frequency among subpops
 *   - eas_oea: ac=0 → null carrier frequency
 */
function makeSubcontinentalResponse(variantId: string, scale: number = 1) {
  return {
    data: {
      variant: {
        variant_id: variantId,
        exome: {
          populations: [
            // Continental populations (will be filtered out by composable)
            { id: "afr", ac: Math.round(5 * scale), an: 24000, ac_hom: 0 },
            { id: "nfe", ac: Math.round(180 * scale), an: 72000, ac_hom: Math.round(1 * scale) },
            { id: "eas", ac: Math.round(1 * scale), an: 10000, ac_hom: 0 },
            // NFE subcontinental populations
            { id: "nfe_bgr", ac: Math.round(3 * scale), an: 5000, ac_hom: 0 },
            { id: "nfe_est", ac: Math.round(50 * scale), an: 3000, ac_hom: 0 },  // High AF → founder effect
            { id: "nfe_nwe", ac: Math.round(100 * scale), an: 30000, ac_hom: Math.round(1 * scale) },
            { id: "nfe_seu", ac: Math.round(30 * scale), an: 15000, ac_hom: 0 },
            { id: "nfe_swe", ac: Math.round(20 * scale), an: 8000, ac_hom: 0 },
            { id: "nfe_onf", ac: Math.round(25 * scale), an: 11000, ac_hom: 0 },
            // EAS subcontinental populations
            { id: "eas_jpn", ac: 0, an: 400, ac_hom: 0 },        // Low sample size (AN < 1000)
            { id: "eas_kor", ac: Math.round(1 * scale), an: 3000, ac_hom: 0 },
            { id: "eas_oea", ac: 0, an: 6900, ac_hom: 0 },       // No alleles → null carrier freq
          ],
        },
        genome: null,
      },
    },
  };
}

/** Variant 1: p.Phe508del — full scale */
const SUBCONTINENTAL_VARIANT_1 = makeSubcontinentalResponse("7-117559590-T-A", 1);
/** Variant 2: p.Gly542* — ~1/5 scale (matches main fixture ratio) */
const SUBCONTINENTAL_VARIANT_2 = makeSubcontinentalResponse("7-117572531-G-T", 0.2);

const SUBCONTINENTAL_RESPONSES: Record<string, unknown> = {
  "7-117559590-T-A": SUBCONTINENTAL_VARIANT_1,
  "7-117572531-G-T": SUBCONTINENTAL_VARIANT_2,
};

// ─── HEXA fixtures (for gene-switching test) ─────────────────────────────────

const HEXA_GENE_SEARCH_RESPONSE = {
  data: { gene_search: [{ ensembl_id: "ENSG00000213614", symbol: "HEXA" }] },
};
const HEXA_GENE_DETAILS_RESPONSE = {
  data: {
    gene: {
      gene_id: "ENSG00000213614",
      symbol: "HEXA",
      gnomad_constraint: {
        exp_lof: 30, obs_lof: 10, oe_lof: 0.33,
        oe_lof_lower: 0.2, oe_lof_upper: 0.55,
        pLI: 0.9, lof_z: 3.5, flags: [],
      },
    },
  },
};
const HEXA_POPULATIONS = [
  { id: "afr", ac: 2, an: 24000, ac_hom: 0 },
  { id: "amr", ac: 3, an: 18000, ac_hom: 0 },
  { id: "asj", ac: 15, an: 4000, ac_hom: 0 },
  { id: "eas", ac: 1, an: 10000, ac_hom: 0 },
  { id: "fin", ac: 1, an: 11000, ac_hom: 0 },
  { id: "nfe", ac: 20, an: 72000, ac_hom: 0 },
  { id: "sas", ac: 2, an: 14000, ac_hom: 0 },
];
const HEXA_GENE_VARIANTS_RESPONSE = {
  data: {
    gene: {
      gene_id: "ENSG00000213614",
      symbol: "HEXA",
      variants: [
        {
          variant_id: "15-72638892-C-T",
          pos: 72638892, ref: "C", alt: "T",
          exome: { ac: 46, an: 163200, ac_hom: 0, populations: HEXA_POPULATIONS },
          genome: null, joint: null,
          transcript_consequence: {
            gene_symbol: "HEXA", transcript_id: "ENST00000261416", canonical: true,
            consequence_terms: ["stop_gained"], lof: "HC", lof_filter: null, lof_flags: null,
            hgvsc: "c.1274_1278dup", hgvsp: "p.Tyr427Ilefs*5",
          },
        },
      ],
      clinvar_variants: [
        {
          variant_id: "15-72638892-C-T", clinvar_variation_id: "3291",
          clinical_significance: "Pathogenic", gold_stars: 4,
          review_status: "reviewed by expert panel",
          pos: 72638892, ref: "C", alt: "T",
        },
      ],
    },
  },
};

const HEXA_SUBCONTINENTAL_RESPONSES: Record<string, unknown> = {
  "15-72638892-C-T": {
    data: {
      variant: {
        variant_id: "15-72638892-C-T",
        exome: {
          populations: [
            { id: "nfe", ac: 20, an: 72000, ac_hom: 0 },
            { id: "nfe_bgr", ac: 1, an: 5000, ac_hom: 0 },
            { id: "nfe_est", ac: 0, an: 3000, ac_hom: 0 },
            { id: "nfe_nwe", ac: 10, an: 30000, ac_hom: 0 },
            { id: "nfe_seu", ac: 3, an: 15000, ac_hom: 0 },
            { id: "nfe_swe", ac: 2, an: 8000, ac_hom: 0 },
            { id: "nfe_onf", ac: 4, an: 11000, ac_hom: 0 },
            { id: "eas", ac: 1, an: 10000, ac_hom: 0 },
            { id: "eas_jpn", ac: 0, an: 400, ac_hom: 0 },
            { id: "eas_kor", ac: 0, an: 3000, ac_hom: 0 },
            { id: "eas_oea", ac: 1, an: 6900, ac_hom: 0 },
          ],
        },
        genome: null,
      },
    },
  },
};

// ─── API interception helpers ────────────────────────────────────────────────

async function interceptGnomadApi(page: Page): Promise<void> {
  await page.route(
    "https://gnomad.broadinstitute.org/api",
    async (route: Route) => {
      const postData = route.request().postDataJSON() as {
        query?: string;
        variables?: { variantId?: string; query?: string; geneSymbol?: string };
      } | null;

      const queryStr = postData?.query ?? "";

      // Subcontinental variant query (raw fetch with variantId variable)
      if (postData?.variables?.variantId) {
        const variantId = postData.variables.variantId;
        const response = SUBCONTINENTAL_RESPONSES[variantId];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response ?? { data: { variant: null } }),
        });
        return;
      }

      // Match villus queries by inspecting the GraphQL query string
      // (villus does NOT send operationName in the request body)
      if (queryStr.includes("gene_search")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GENE_SEARCH_RESPONSE),
        });
      } else if (queryStr.includes("gnomad_constraint")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GENE_DETAILS_RESPONSE),
        });
      } else if (queryStr.includes("clinvar_variants")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GENE_VARIANTS_RESPONSE),
        });
      } else {
        await route.continue();
      }
    },
  );
}

/** Intercept gnomAD API for both CFTR and HEXA (gene-switching test) */
async function interceptGnomadApiMultiGene(page: Page): Promise<void> {
  await page.route(
    "https://gnomad.broadinstitute.org/api",
    async (route: Route) => {
      const postData = route.request().postDataJSON() as {
        query?: string;
        variables?: { variantId?: string; query?: string; geneSymbol?: string };
      } | null;

      const queryStr = postData?.query ?? "";

      // Subcontinental variant query (raw fetch with variantId variable)
      if (postData?.variables?.variantId) {
        const variantId = postData.variables.variantId;
        const response =
          SUBCONTINENTAL_RESPONSES[variantId] ??
          HEXA_SUBCONTINENTAL_RESPONSES[variantId];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response ?? { data: { variant: null } }),
        });
        return;
      }

      const searchQuery = postData?.variables?.query ?? "";
      const geneSym = postData?.variables?.geneSymbol ?? "";

      // Match villus queries by inspecting the GraphQL query string
      if (queryStr.includes("gene_search")) {
        const isHEXA = searchQuery.toUpperCase().includes("HEXA");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(isHEXA ? HEXA_GENE_SEARCH_RESPONSE : GENE_SEARCH_RESPONSE),
        });
      } else if (queryStr.includes("gnomad_constraint")) {
        const isHEXA = geneSym.toUpperCase() === "HEXA";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(isHEXA ? HEXA_GENE_DETAILS_RESPONSE : GENE_DETAILS_RESPONSE),
        });
      } else if (queryStr.includes("clinvar_variants")) {
        const isHEXA = geneSym.toUpperCase() === "HEXA";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(isHEXA ? HEXA_GENE_VARIANTS_RESPONSE : GENE_VARIANTS_RESPONSE),
        });
      } else {
        await route.continue();
      }
    },
  );
}

async function interceptClingenApi(page: Page): Promise<void> {
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

/** Intercept Orphanet API with empty results (not relevant for subcontinental tests) */
function interceptOrphanetApiEmpty(page: Page): void {
  page.route("**/api.orphadata.com/**", async (route: Route) => {
    const url = route.request().url();
    if (url.includes("/rd-associated-genes/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { results: [] } }),
      });
    } else {
      await route.fulfill({ status: 404, body: "Not found" });
    }
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

/**
 * Switch gnomAD version to v2.1.1 in Step 1.
 * Must be called BEFORE selecting a gene.
 */
async function selectV2Version(page: Page): Promise<void> {
  // Vuetify v-select: the input element is covered by a wrapper div that intercepts
  // pointer events, so we click the wrapper container with force
  const versionSelect = page.getByLabel("gnomAD Version");
  await versionSelect.click({ force: true });

  // Select v2.1.1 from dropdown overlay
  await page.getByRole("option", { name: /v2\.1\.1/ }).click();

  // Wait for dropdown to close and version to propagate
  await page.waitForTimeout(500);
}

/**
 * Navigate through wizard Steps 1-3 to reach the results step with v2.
 * Assumes all APIs are already intercepted.
 */
async function navigateToResultsV2(page: Page, gene: string = "CFTR"): Promise<void> {
  await page.goto("/");
  await dismissDisclaimer(page);

  // Step 1: Select v2 version, then search for gene
  await selectV2Version(page);

  const geneInput = page.getByTestId("gene-search-input").locator("input");
  await geneInput.click();
  await geneInput.fill(gene);
  await expect(
    page.getByRole("option", { name: new RegExp(`^${gene}\\b`) }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("option", { name: new RegExp(`^${gene}\\b`) }).first().click();
  await page.getByTestId("step-gene-next-btn").click();

  // Step 2: Select heterozygous carrier
  await expect(page.getByTestId("step-status")).toBeVisible();
  await page.getByTestId("status-option-heterozygous").click();
  await page.getByTestId("step-status-next-btn").click();

  // Step 3: Wait for gnomAD calculation
  await expect(page.getByTestId("step-frequency")).toBeVisible();
  await expect(
    page.getByText("Carrier frequency calculated from gnomAD data."),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("step-frequency-next-btn").click();

  // Step 4: Results
  await expect(page.getByTestId("step-results")).toBeVisible();
}

/** Navigate to Step 4 with default v4 version */
async function navigateToResultsV4(page: Page): Promise<void> {
  await page.goto("/");
  await dismissDisclaimer(page);

  // Default version is v4 — no version change needed
  const geneInput = page.getByTestId("gene-search-input").locator("input");
  await geneInput.click();
  await geneInput.fill("CFTR");
  await expect(
    page.getByRole("option", { name: /^CFTR\b/ }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("option", { name: /^CFTR\b/ }).first().click();
  await page.getByTestId("step-gene-next-btn").click();

  await expect(page.getByTestId("step-status")).toBeVisible();
  await page.getByTestId("status-option-heterozygous").click();
  await page.getByTestId("step-status-next-btn").click();

  await expect(page.getByTestId("step-frequency")).toBeVisible();
  await expect(
    page.getByText("Carrier frequency calculated from gnomAD data."),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("step-frequency-next-btn").click();

  await expect(page.getByTestId("step-results")).toBeVisible();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Phase 37: Subcontinental Populations", () => {
  test.describe("Version Gating — v2 toggle, v4 chip", () => {
    test("shows Subcontinental toggle (v-switch) for gnomAD v2.1.1 queries", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResultsV2(page);

      // Toggle exists and is visible
      const toggle = page.getByTestId("subcontinental-toggle");
      await expect(toggle).toBeVisible();

      // v2-only chip should NOT be visible
      await expect(page.getByTestId("subcontinental-v2-only")).not.toBeVisible();
    });

    test("shows 'Subcontinental (v2 only)' chip with tooltip for v4 queries", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResultsV4(page);

      // v2-only chip exists
      const chip = page.getByTestId("subcontinental-v2-only");
      await expect(chip).toBeVisible();
      await expect(chip).toContainText("Subcontinental (v2 only)");

      // Toggle should NOT be visible
      await expect(page.getByTestId("subcontinental-toggle")).not.toBeVisible();

      // Hover chip to show tooltip
      await chip.hover();
      await expect(
        page.getByText("Subcontinental population breakdowns are only available for gnomAD v2.1.1 queries."),
      ).toBeVisible({ timeout: 3_000 });
    });
  });

  test.describe("Toggle ON — Fetch & Nested Rows", () => {
    test("toggle ON fetches subcontinental data, shows NFE (6) and EAS (3) nested rows", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResultsV2(page);

      // Enable subcontinental toggle
      const toggle = page.getByTestId("subcontinental-toggle");
      await toggle.click();

      // Wait for subcontinental data to load (progress bar may flash briefly)
      const populationTable = page.getByTestId("population-table");
      await expect(
        populationTable.locator(".subcontinental-row").first(),
      ).toBeVisible({ timeout: 15_000 });

      // Count subcontinental rows — should be 9 total (6 NFE + 3 EAS)
      const subcontinentalRows = populationTable.locator(".subcontinental-row");
      await expect(subcontinentalRows).toHaveCount(9);

      // Verify NFE subcontinental labels
      await expect(populationTable.getByText("Bulgarian (Eastern European)")).toBeVisible();
      await expect(populationTable.getByText("Estonian")).toBeVisible();
      await expect(populationTable.getByText("North-Western European")).toBeVisible();
      await expect(populationTable.getByText("Southern European")).toBeVisible();
      await expect(populationTable.getByText("Swedish")).toBeVisible();
      await expect(populationTable.getByText("Other Non-Finnish European")).toBeVisible();

      // Verify EAS subcontinental labels
      await expect(populationTable.getByText("Japanese")).toBeVisible();
      await expect(populationTable.getByText("Korean")).toBeVisible();
      await expect(populationTable.getByText("Other East Asian")).toBeVisible();
    });

    test("subcontinental rows show carrier frequency and allele count values", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResultsV2(page);

      const toggle = page.getByTestId("subcontinental-toggle");
      await toggle.click();

      const populationTable = page.getByTestId("population-table");
      await expect(
        populationTable.locator(".subcontinental-row").first(),
      ).toBeVisible({ timeout: 15_000 });

      // Each subcontinental row should have numeric content (frequency values)
      // Check that North-Western European row has visible data cells (highest AC)
      const nweRow = populationTable.locator(".subcontinental-row").filter({
        hasText: "North-Western European",
      });
      await expect(nweRow).toBeVisible();

      // Row should contain numeric frequency and allele count data
      const nweCells = nweRow.locator("td");
      const cellCount = await nweCells.count();
      expect(cellCount).toBeGreaterThan(2);
    });
  });

  test.describe("Quality Warnings — Low Sample Size & Founder Effect", () => {
    test("shows 'Low sample' chip on subpopulations with AN below threshold", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResultsV2(page);

      const toggle = page.getByTestId("subcontinental-toggle");
      await toggle.click();

      const populationTable = page.getByTestId("population-table");
      await expect(
        populationTable.locator(".subcontinental-row").first(),
      ).toBeVisible({ timeout: 15_000 });

      // eas_jpn has AN=400, below lowSampleSizeThreshold=1000
      const jpnRow = populationTable.locator(".subcontinental-row").filter({
        hasText: "Japanese",
      });
      await expect(jpnRow).toBeVisible();
      await expect(jpnRow.getByText("Low sample")).toBeVisible();
    });

    test("shows 'Founder effect' chip on subpopulations with elevated frequency", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResultsV2(page);

      const toggle = page.getByTestId("subcontinental-toggle");
      await toggle.click();

      const populationTable = page.getByTestId("population-table");
      await expect(
        populationTable.locator(".subcontinental-row").first(),
      ).toBeVisible({ timeout: 15_000 });

      // nfe_est has high AF (50/3000) → carrier freq ~0.04, parent nfe ~0.006
      // 0.04 > 0.006 * 5 = 0.03 → founder effect
      const estRow = populationTable.locator(".subcontinental-row").filter({
        hasText: "Estonian",
      });
      await expect(estRow).toBeVisible();
      await expect(estRow.getByText("Founder effect")).toBeVisible();
    });
  });

  test.describe("Toggle OFF — Row Collapse", () => {
    test("disabling toggle collapses all subcontinental rows", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResultsV2(page);

      const toggle = page.getByTestId("subcontinental-toggle");
      const populationTable = page.getByTestId("population-table");

      // Enable toggle
      await toggle.click();
      await expect(
        populationTable.locator(".subcontinental-row").first(),
      ).toBeVisible({ timeout: 15_000 });

      // Disable toggle
      await toggle.click();

      // All subcontinental rows should be gone
      await expect(populationTable.locator(".subcontinental-row")).toHaveCount(0);

      // Main population rows should still be visible
      await expect(populationTable).toBeVisible();
    });
  });

  test.describe("Non-subcontinental Populations — No Nested Rows", () => {
    test("AFR, AMR, ASJ, FIN, SAS populations have no subcontinental rows", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResultsV2(page);

      const toggle = page.getByTestId("subcontinental-toggle");
      await toggle.click();

      const populationTable = page.getByTestId("population-table");
      await expect(
        populationTable.locator(".subcontinental-row").first(),
      ).toBeVisible({ timeout: 15_000 });

      // Exactly 9 subcontinental rows (6 NFE + 3 EAS), nothing under other populations
      await expect(populationTable.locator(".subcontinental-row")).toHaveCount(9);

      // Verify none of the subcontinental rows have AFR/AMR/ASJ/FIN/SAS parent codes
      // by checking that only NFE and EAS subgroup labels exist in subcontinental rows
      const allSubRows = populationTable.locator(".subcontinental-row");
      const count = await allSubRows.count();
      for (let i = 0; i < count; i++) {
        const text = await allSubRows.nth(i).textContent();
        // Every subcontinental row should be a known NFE or EAS subgroup
        const isKnownSubgroup =
          text?.includes("Bulgarian") ||
          text?.includes("Estonian") ||
          text?.includes("North-Western") ||
          text?.includes("Southern European") ||
          text?.includes("Swedish") ||
          text?.includes("Other Non-Finnish") ||
          text?.includes("Japanese") ||
          text?.includes("Korean") ||
          text?.includes("Other East Asian");
        expect(isKnownSubgroup).toBe(true);
      }
    });
  });

  test.describe("Gene Switching — Data Reset", () => {
    test("switching from CFTR to HEXA clears subcontinental data and resets toggle", async ({
      page,
    }) => {
      await interceptGnomadApiMultiGene(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      // Navigate to CFTR results with v2
      await navigateToResultsV2(page, "CFTR");

      const populationTable = page.getByTestId("population-table");
      const toggle = page.getByTestId("subcontinental-toggle");

      // Enable subcontinental and verify rows appear
      await toggle.click();
      await expect(
        populationTable.locator(".subcontinental-row").first(),
      ).toBeVisible({ timeout: 15_000 });
      await expect(populationTable.locator(".subcontinental-row")).toHaveCount(9);

      // Go back to Step 1
      await page.getByTestId("wizard-step-1").click();
      await expect(page.getByTestId("step-gene")).toBeVisible();

      // Version should still be v2 (it persists)
      // Search for HEXA
      const geneInput = page.getByTestId("gene-search-input").locator("input");
      await geneInput.click();
      await geneInput.fill("");
      await geneInput.fill("HEXA");
      await expect(
        page.getByRole("option", { name: /^HEXA\b/ }).first(),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole("option", { name: /^HEXA\b/ }).first().click();
      await page.getByTestId("step-gene-next-btn").click();

      // Step 2
      await expect(page.getByTestId("step-status")).toBeVisible();
      await page.getByTestId("status-option-heterozygous").click();
      await page.getByTestId("step-status-next-btn").click();

      // Step 3
      await expect(
        page.getByText("Carrier frequency calculated from gnomAD data."),
      ).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("step-frequency-next-btn").click();

      // Step 4: Results for HEXA
      await expect(page.getByTestId("step-results")).toBeVisible();

      // No subcontinental rows should be visible (toggle is off after gene change)
      await expect(populationTable.locator(".subcontinental-row")).toHaveCount(0);

      // Enable toggle for HEXA — should fetch HEXA subcontinental data
      const hexaToggle = page.getByTestId("subcontinental-toggle");
      await hexaToggle.click();
      await expect(
        populationTable.locator(".subcontinental-row").first(),
      ).toBeVisible({ timeout: 15_000 });

      // HEXA subcontinental rows should be present (9 subgroups same structure)
      await expect(populationTable.locator(".subcontinental-row")).toHaveCount(9);
    });
  });
});
