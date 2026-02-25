/**
 * CFTR Wizard Happy Path E2E Test
 *
 * Verifies the full 4-step wizard flow for CFTR:
 *   Step 1: Gene search and selection
 *   Step 2: Index patient status selection
 *   Step 3: Frequency source (gnomAD tab with mocked data)
 *   Step 4: Results with clinical text containing 'CFTR'
 *
 * All gnomAD API calls are intercepted via page.route — no real network dependency.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  GENE_SEARCH_RESPONSE,
  GENE_DETAILS_RESPONSE,
  GENE_VARIANTS_RESPONSE,
} from "./fixtures/gnomad-responses";

// ─── API interception ─────────────────────────────────────────────────────────

/**
 * Route gnomAD GraphQL requests to fixture data.
 * Matches on operationName from the POST body.
 */
async function interceptGnomadApi(page: Page): Promise<void> {
  await page.route(
    "https://gnomad.broadinstitute.org/api",
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
            body: JSON.stringify(GENE_VARIANTS_RESPONSE),
          });
          break;

        default:
          // Pass unknown operations through (e.g., any future operations)
          await route.continue();
      }
    },
  );
}

/**
 * Intercept all external API calls to avoid network dependency.
 * Includes gnomAD API and ClinGen CSV.
 */
async function interceptAllApis(page: Page): Promise<void> {
  await interceptGnomadApi(page);

  // Intercept ClinGen CSV (local bundled + external fallback)
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

/**
 * Dismiss the clinical disclaimer dialog.
 * The DisclaimerBanner is a persistent v-dialog (persistent=true) that renders
 * on first visit via Pinia state and blocks all page interaction.
 * Since tests run in fresh browser contexts (no localStorage), it always appears.
 */
async function dismissDisclaimer(page: Page): Promise<void> {
  const disclaimer = page.getByTestId("disclaimer-dialog");
  const isVisible = await disclaimer.isVisible().catch(() => false);
  if (isVisible) {
    await page.getByTestId("disclaimer-accept-btn").click();
    // Wait for dialog to close
    await expect(disclaimer).not.toBeVisible({ timeout: 5_000 });
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("CFTR wizard happy path", () => {
  test.beforeEach(async ({ page }) => {
    await interceptAllApis(page);
  });

  test("completes full 4-step flow and shows clinical text containing CFTR", async ({
    page,
  }) => {
    // ── Navigate to app ────────────────────────────────────────────────────
    await page.goto("/");

    // Dismiss the clinical disclaimer that appears on first visit
    await dismissDisclaimer(page);

    // Confirm wizard is visible
    await expect(page.getByTestId("wizard-stepper")).toBeVisible();

    // ── Step 1: Select gene CFTR ───────────────────────────────────────────
    await expect(page.getByTestId("step-gene")).toBeVisible();

    // Type in the gene search field
    // The data-testid is on the outer v-autocomplete div; use locator to target inner input
    const geneInput = page.getByTestId("gene-search-input").locator("input");
    await geneInput.click();
    await geneInput.fill("CFTR");

    // Wait for autocomplete dropdown and click exact CFTR option (not CFTRP1, CFTRP2 etc.)
    // Use first() since gnomAD may return multiple CFTR-family genes; the exact gene is first
    await expect(
      page.getByRole("option", { name: /CFTR/ }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole("option", { name: /^CFTR\b/ })
      .first()
      .click();

    // Continue button should now be enabled
    const continueBtn1 = page.getByTestId("step-gene-next-btn");
    await expect(continueBtn1).toBeEnabled();
    await continueBtn1.click();

    // ── Step 2: Select index patient status ────────────────────────────────
    await expect(page.getByTestId("step-status")).toBeVisible();

    // Select heterozygous carrier (the first option, should already be selected by default)
    await page.getByTestId("status-option-heterozygous").click();

    const continueBtn2 = page.getByTestId("step-status-next-btn");
    await expect(continueBtn2).toBeEnabled();
    await continueBtn2.click();

    // ── Step 3: Frequency source — gnomAD tab ─────────────────────────────
    await expect(page.getByTestId("step-frequency")).toBeVisible();

    // The gnomAD tab should be active by default
    await expect(page.getByTestId("freq-tab-gnomad")).toBeVisible();

    // Wait for gnomAD calculation to complete (loading spinner disappears)
    // The success alert text is "Carrier frequency calculated from gnomAD data."
    await expect(
      page.getByText("Carrier frequency calculated from gnomAD data."),
    ).toBeVisible({
      timeout: 15_000,
    });

    // Continue button should be enabled once calculation is done
    const continueBtn3 = page.getByTestId("step-frequency-next-btn");
    await expect(continueBtn3).toBeEnabled({ timeout: 15_000 });
    await continueBtn3.click();

    // ── Step 4: Results ────────────────────────────────────────────────────
    await expect(page.getByTestId("step-results")).toBeVisible();

    // Summary card with CFTR results should be visible
    const summaryCard = page.getByTestId("results-summary-card");
    await expect(summaryCard).toBeVisible();
    await expect(summaryCard).toContainText("CFTR");

    // Population table should be present
    await expect(page.getByTestId("population-table")).toBeVisible();

    // Clinical text output section should be visible
    await expect(page.getByTestId("text-output")).toBeVisible();

    // Text content area should contain 'CFTR'
    const textContent = page.getByTestId("text-content");
    await expect(textContent).toBeVisible();
    await expect(textContent).toContainText("CFTR");
  });
});
