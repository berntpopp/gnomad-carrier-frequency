/**
 * URL State Roundtrip E2E Test
 *
 * Verifies that wizard state is encoded into the URL during navigation and
 * correctly restored when a fresh page is loaded with that URL.
 *
 * Flow:
 *   1. Navigate through wizard to Step 4 (results)
 *   2. Capture the URL (which includes ?gene=CFTR&step=4&...)
 *   3. Open a fresh page with the captured URL
 *   4. Wait for state restoration and verify results are shown
 *
 * All gnomAD API calls are intercepted — no real network dependency.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  GENE_SEARCH_RESPONSE,
  GENE_DETAILS_RESPONSE,
  GENE_VARIANTS_RESPONSE,
} from "./fixtures/gnomad-responses";

// ─── API interception ─────────────────────────────────────────────────────────

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
          await route.continue();
      }
    },
  );

  // Intercept ClinGen CSV to avoid external network dependency
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
    await expect(disclaimer).not.toBeVisible({ timeout: 5_000 });
  }
}

// ─── Helper: Navigate wizard to Step 4 ───────────────────────────────────────

async function navigateToStep4(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("wizard-stepper")).toBeVisible();

  // Dismiss disclaimer if visible
  await dismissDisclaimer(page);

  // Step 1: Select CFTR
  // The data-testid is on the outer v-autocomplete div; target inner input
  const geneInput = page.getByTestId("gene-search-input").locator("input");
  await geneInput.click();
  await geneInput.fill("CFTR");
  // Wait for dropdown and click the exact CFTR gene (not CFTRP1, CFTRP2, etc.)
  await expect(page.getByRole("option", { name: /CFTR/ }).first()).toBeVisible({
    timeout: 10_000,
  });
  await page
    .getByRole("option", { name: /^CFTR\b/ })
    .first()
    .click();
  await page.getByTestId("step-gene-next-btn").click();

  // Step 2: Status (default heterozygous is fine)
  await expect(page.getByTestId("step-status")).toBeVisible();
  await page.getByTestId("step-status-next-btn").click();

  // Step 3: Wait for gnomAD calculation
  // The success alert text is "Carrier frequency calculated from gnomAD data."
  await expect(
    page.getByText("Carrier frequency calculated from gnomAD data."),
  ).toBeVisible({
    timeout: 15_000,
  });
  const continueBtn3 = page.getByTestId("step-frequency-next-btn");
  await expect(continueBtn3).toBeEnabled({ timeout: 15_000 });
  await continueBtn3.click();

  // Step 4: Wait for results
  await expect(page.getByTestId("step-results")).toBeVisible();
  await expect(page.getByTestId("results-summary-card")).toBeVisible();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("URL state roundtrip", () => {
  test("URL contains gene=CFTR after reaching Step 4", async ({ page }) => {
    await interceptGnomadApi(page);
    await navigateToStep4(page);

    // Verify URL contains gene=CFTR
    const url = page.url();
    expect(url).toContain("gene=CFTR");
    expect(url).toContain("step=4");
  });

  test("fresh page with shared URL restores wizard state to Step 4", async ({
    page,
    context,
  }) => {
    // First pass: navigate to step 4 and capture URL
    await interceptGnomadApi(page);
    await navigateToStep4(page);

    const sharedUrl = page.url();
    expect(sharedUrl).toContain("gene=CFTR");

    // Second pass: open a completely fresh page with the captured URL
    const freshPage = await context.newPage();
    await interceptGnomadApi(freshPage);

    await freshPage.goto(sharedUrl);

    // Dismiss disclaimer on fresh page — fresh browser context triggers it again
    await dismissDisclaimer(freshPage);

    // Wait for URL state restoration — results should be visible without manual navigation
    await expect(freshPage.getByTestId("step-results")).toBeVisible({
      timeout: 20_000,
    });

    // Summary card should show CFTR
    const summaryCard = freshPage.getByTestId("results-summary-card");
    await expect(summaryCard).toBeVisible();
    await expect(summaryCard).toContainText("CFTR");

    // Clinical text should also be visible and contain CFTR
    await expect(freshPage.getByTestId("text-output")).toBeVisible();
    await expect(freshPage.getByTestId("text-content")).toContainText("CFTR");

    await freshPage.close();
  });
});
