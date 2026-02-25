/**
 * History Restore E2E Test
 *
 * Verifies the full history restore user flow:
 *   1. Complete CFTR wizard to Step 4 (auto-save creates history entry)
 *   2. Navigate to a fresh page (history persists in localStorage)
 *   3. Open the HistoryDrawer via the AppBar history button
 *   4. Click the saved CFTR entry to trigger restore
 *   5. Verify wizard navigates to Step 4 with CFTR results
 *
 * All gnomAD API calls are intercepted — no real network dependency.
 *
 * Closes Gap 1 from 29-VERIFICATION.md: ROADMAP criterion 2 requires
 * Playwright E2E tests that "validate URL sharing AND history restore."
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

test.describe("History restore", () => {
  test("completing a calculation and restoring from history shows Step 4 results", async ({
    page,
  }) => {
    // ── Phase 1: Complete wizard to Step 4 (auto-save creates history entry) ──
    await interceptGnomadApi(page);
    await navigateToStep4(page);

    // Verify Step 4 results are shown with CFTR data
    await expect(page.getByTestId("step-results")).toBeVisible();
    await expect(page.getByTestId("results-summary-card")).toContainText(
      "CFTR",
    );

    // ── Phase 2: Navigate to fresh page (history persists in localStorage) ────
    // The useHistoryAutoSave composable saved to Pinia store (persisted to
    // localStorage with key 'carrier-freq-history') when entering Step 4.
    // A fresh page load rehydrates the store from localStorage.
    await page.goto("/");

    // Re-register route handlers for new page navigation context
    await interceptGnomadApi(page);

    // Disclaimer reappears on fresh page load (pinia state rehydrated from localStorage
    // but disclaimer accepted state persists — so disclaimer may NOT reappear;
    // dismissDisclaimer handles both cases gracefully)
    await dismissDisclaimer(page);

    // Verify we're back on Step 1 (fresh page, wizard starts at gene step)
    await expect(page.getByTestId("step-gene")).toBeVisible({
      timeout: 10_000,
    });

    // ── Phase 3: Open HistoryDrawer and click the saved CFTR entry ────────────
    // Click history button in AppBar
    await page.getByTestId("footer-history-btn").click();

    // Wait for HistoryDrawer to become visible (v-navigation-drawer from right)
    await expect(page.getByTestId("history-drawer")).toBeVisible({
      timeout: 5_000,
    });

    // HistoryPanel should be visible inside the drawer with at least one entry
    await expect(page.getByTestId("history-panel")).toBeVisible();

    // At least one history entry with CFTR gene symbol should exist
    const historyEntry = page.getByTestId("history-entry").first();
    await expect(historyEntry).toBeVisible({ timeout: 5_000 });
    await expect(historyEntry).toContainText("CFTR");

    // ── Phase 4: Click entry to trigger restore ───────────────────────────────
    // Clicking triggers: HistoryPanel 'restore' emit -> HistoryDrawer closes
    // and emits 'restore' -> App.vue handleHistoryRestore ->
    // useHistoryRestore.restoreFromHistory() -> sets wizardState.currentStep = 4
    await historyEntry.click();

    // ── Phase 5: Verify state restored to Step 4 with CFTR results ───────────
    // restoreFromHistory() sets currentStep = 4 and re-fetches gene data
    // Use generous timeout (15s) for reactive state propagation through multiple composables
    await expect(page.getByTestId("step-results")).toBeVisible({
      timeout: 15_000,
    });

    // Results summary card should be visible and contain CFTR
    const summaryCard = page.getByTestId("results-summary-card");
    await expect(summaryCard).toBeVisible({ timeout: 15_000 });
    await expect(summaryCard).toContainText("CFTR");
  });
});
