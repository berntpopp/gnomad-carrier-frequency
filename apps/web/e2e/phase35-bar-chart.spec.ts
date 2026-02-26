/**
 * Phase 35: Population Bar Chart E2E Tests
 *
 * Verifies the Population Bar Chart feature introduced in Phase 35:
 *   - Chart tab visible in Population Frequencies card
 *   - SVG and PNG download buttons present
 *   - Can switch between Chart and Table tabs
 *   - Chart SVG renders with population bars
 *   - Table tab still shows the existing data table
 *
 * Uses fixture data from gnomad-responses.ts.
 * All gnomAD API calls are intercepted — no real network dependency.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  GENE_SEARCH_RESPONSE,
  GENE_DETAILS_RESPONSE,
  GENE_VARIANTS_RESPONSE,
} from "./fixtures/gnomad-responses";

// ─── API interception ─────────────────────────────────────────────────────────

async function interceptAllApis(page: Page): Promise<void> {
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
            body: JSON.stringify(GENE_VARIANTS_RESPONSE),
          });
          break;

        default:
          await route.continue();
      }
    },
  );

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function dismissDisclaimer(page: Page): Promise<void> {
  const disclaimer = page.getByTestId("disclaimer-dialog");
  const isVisible = await disclaimer.isVisible().catch(() => false);
  if (isVisible) {
    await page.getByTestId("disclaimer-accept-btn").click();
    await expect(disclaimer).not.toBeVisible({ timeout: 5_000 });
  }
}

/**
 * Navigate the wizard to the results step (step 4) for CFTR.
 * Copies the pattern from cftr-wizard.spec.ts and phase34-quality-source.spec.ts.
 */
async function navigateToResults(page: Page): Promise<void> {
  await page.goto("/");
  await dismissDisclaimer(page);

  // Step 1: Gene search — select CFTR
  const geneInput = page.getByTestId("gene-search-input").locator("input");
  await geneInput.click();
  await geneInput.fill("CFTR");
  await page.getByRole("option", { name: /^CFTR\b/ }).first().click();
  await page.getByTestId("step-gene-next-btn").click();

  // Step 2: Index patient status
  await page.getByTestId("status-option-heterozygous").click();
  await page.getByTestId("step-status-next-btn").click();

  // Step 3: Frequency source — wait for calculation to complete
  await expect(
    page.getByText("Carrier frequency calculated from gnomAD data."),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("step-frequency-next-btn").click();

  // Step 4: Results — verify we've arrived
  await expect(page.getByTestId("step-results")).toBeVisible();
  await expect(page.getByTestId("results-summary-card")).toBeVisible();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Phase 35: Population Bar Chart", () => {
  test.beforeEach(async ({ page }) => {
    await interceptAllApis(page);
  });

  test("shows Chart tab in population frequencies section", async ({
    page,
  }) => {
    await navigateToResults(page);

    // The Chart tab should be visible in the population card
    const chartTab = page.getByTestId("chart-tab");
    await expect(chartTab).toBeVisible({ timeout: 5_000 });
    await expect(chartTab).toContainText("Chart");
  });

  test("shows SVG download button in chart view", async ({ page }) => {
    await navigateToResults(page);

    // Chart tab is active by default — SVG export button should be visible
    await expect(page.getByRole("button", { name: /Download SVG/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("shows PNG download button in chart view", async ({ page }) => {
    await navigateToResults(page);

    // PNG export button should also be visible in chart view
    await expect(page.getByRole("button", { name: /Download PNG/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("can switch to Table tab and see data table", async ({ page }) => {
    await navigateToResults(page);

    // Click the Table tab
    const tableTab = page.getByTestId("table-tab");
    await expect(tableTab).toBeVisible({ timeout: 5_000 });
    await tableTab.click();

    // The population data table should now be visible
    await expect(page.getByTestId("population-table")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("can switch back to Chart tab after viewing Table", async ({ page }) => {
    await navigateToResults(page);

    // Switch to Table tab
    await page.getByTestId("table-tab").click();
    await expect(page.getByTestId("population-table")).toBeVisible({
      timeout: 5_000,
    });

    // Switch back to Chart tab
    await page.getByTestId("chart-tab").click();

    // Chart SVG should now be visible
    await expect(
      page.getByTestId("population-chart").locator("svg"),
    ).toBeVisible({ timeout: 5_000 });
  });
});
