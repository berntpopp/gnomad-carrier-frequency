/**
 * Phase 36: Orphanet Prevalence Integration — E2E Tests
 *
 * Tests the full Orphanet integration from a senior geneticist + UI/UX perspective:
 *   - Eager prefetch fires at gene selection (Step 1), not Step 4
 *   - Summary card shows Orphanet prevalence section with correct clinical data
 *   - Disease names link to Orphanet pages (target="_blank")
 *   - AR badge appears for autosomal recessive diseases
 *   - +N more chip expands additional diseases
 *   - Disclaimer text is present and accurate
 *   - Graceful degradation when Orphanet API fails
 *   - Section hides entirely when no diseases found
 *
 * All APIs are intercepted — no real network dependency.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import {
  GENE_SEARCH_RESPONSE,
  GENE_DETAILS_RESPONSE,
  GENE_VARIANTS_RESPONSE,
} from "./fixtures/gnomad-responses";

// ─── Orphanet API mock fixtures ───────────────────────────────────────────────

/** Mock: /rd-associated-genes/genes/symbols/cftr → CFTR diseases */
const ORPHANET_GENE_DISEASES_CFTR = {
  data: {
    results: [
      {
        ORPHAcode: 586,
        "Preferred term": "Cystic fibrosis",
        OrphanetURL: "https://www.orpha.net/en/disease/detail/586",
        Date: "2024-01-01",
        DisorderGeneAssociation: [
          {
            DisorderGeneAssociationType:
              "Disease-causing germline mutation(s) in",
            DisorderGeneAssociationStatus: "Assessed",
            Gene: {
              Symbol: "CFTR",
              name: "CF transmembrane conductance regulator",
              GeneType: "gene with protein product",
              ExternalReference: [],
            },
          },
        ],
      },
      {
        ORPHAcode: 48,
        "Preferred term": "Congenital bilateral absence of vas deferens",
        OrphanetURL: "https://www.orpha.net/en/disease/detail/48",
        Date: "2024-01-01",
        DisorderGeneAssociation: [
          {
            DisorderGeneAssociationType:
              "Disease-causing germline mutation(s) in",
            DisorderGeneAssociationStatus: "Assessed",
            Gene: {
              Symbol: "CFTR",
              name: "CF transmembrane conductance regulator",
              GeneType: "gene with protein product",
              ExternalReference: [],
            },
          },
        ],
      },
    ],
  },
};

/** Mock: /rd-epidemiology/orphacodes/586 → CF prevalence */
const ORPHANET_EPI_586 = {
  data: {
    results: {
      Prevalence: [
        {
          PrevalenceClass: "1-5 / 10 000",
          PrevalenceGeographic: "Europe",
          PrevalenceType: "Point prevalence",
          PrevalenceQualification: "Value and class",
          PrevalenceValidationStatus: "Validated",
          Source: "EUROCAT",
          ValMoy: "8.0",
        },
        {
          PrevalenceClass: "1-9 / 100 000",
          PrevalenceGeographic: "United States",
          PrevalenceType: "Point prevalence",
          PrevalenceQualification: "Value and class",
          PrevalenceValidationStatus: "Validated",
          Source: "CFF Registry",
          ValMoy: "3.2",
        },
      ],
    },
  },
};

/** Mock: /rd-epidemiology/orphacodes/48 → CBAVD prevalence */
const ORPHANET_EPI_48 = {
  data: {
    results: {
      Prevalence: [
        {
          PrevalenceClass: "1-9 / 100 000",
          PrevalenceGeographic: "Europe",
          PrevalenceType: "Point prevalence",
          PrevalenceQualification: "Value and class",
          PrevalenceValidationStatus: "Validated",
          Source: "Literature",
          ValMoy: "2.0",
        },
      ],
    },
  },
};

/** Mock: /rd-natural_history/orphacodes/586 → CF inheritance */
const ORPHANET_NAT_HIST_586 = {
  data: {
    results: {
      TypeOfInheritance: ["Autosomal recessive"],
    },
  },
};

/** Mock: /rd-natural_history/orphacodes/48 → CBAVD inheritance */
const ORPHANET_NAT_HIST_48 = {
  data: {
    results: {
      TypeOfInheritance: ["Autosomal recessive"],
    },
  },
};

// ─── API interception helpers ─────────────────────────────────────────────────

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
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "",
    });
  });
}

/**
 * Intercept all Orphanet API calls with mock data.
 * Track which endpoints were called to verify eager fetch timing.
 */
function interceptOrphanetApi(page: Page): { calledEndpoints: string[] } {
  const calledEndpoints: string[] = [];

  page.route("**/api.orphadata.com/**", async (route: Route) => {
    const url = route.request().url();
    calledEndpoints.push(url);

    if (url.includes("/rd-associated-genes/genes/symbols/cftr")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ORPHANET_GENE_DISEASES_CFTR),
      });
    } else if (url.includes("/rd-epidemiology/orphacodes/586")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ORPHANET_EPI_586),
      });
    } else if (url.includes("/rd-epidemiology/orphacodes/48")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ORPHANET_EPI_48),
      });
    } else if (url.includes("/rd-natural_history/orphacodes/586")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ORPHANET_NAT_HIST_586),
      });
    } else if (url.includes("/rd-natural_history/orphacodes/48")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ORPHANET_NAT_HIST_48),
      });
    } else {
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });

  return { calledEndpoints };
}

/** Intercept Orphanet API with error responses (simulates offline/timeout) */
function interceptOrphanetApiWithError(page: Page): void {
  page.route("**/api.orphadata.com/**", async (route: Route) => {
    await route.abort("connectionfailed");
  });
}

/** Intercept Orphanet API with empty results (gene has no Orphanet diseases) */
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
 * Navigate through wizard Steps 1-3 to reach the results step.
 * Assumes all APIs are already intercepted.
 */
async function navigateToResults(page: Page): Promise<void> {
  await page.goto("/");
  await dismissDisclaimer(page);

  // Step 1: Select CFTR gene
  const geneInput = page.getByTestId("gene-search-input").locator("input");
  await geneInput.click();
  await geneInput.fill("CFTR");
  await expect(
    page.getByRole("option", { name: /CFTR/ }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("option", { name: /^CFTR\b/ }).first().click();
  await page.getByTestId("step-gene-next-btn").click();

  // Step 2: Select heterozygous carrier
  await expect(page.getByTestId("step-status")).toBeVisible();
  await page.getByTestId("status-option-heterozygous").click();
  await page.getByTestId("step-status-next-btn").click();

  // Step 3: Wait for gnomAD calculation and continue
  await expect(page.getByTestId("step-frequency")).toBeVisible();
  await expect(
    page.getByText("Carrier frequency calculated from gnomAD data."),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("step-frequency-next-btn").click();

  // Step 4: Results
  await expect(page.getByTestId("step-results")).toBeVisible();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Phase 36: Orphanet Prevalence Integration", () => {
  test.describe("Senior Geneticist — Clinical Data Accuracy", () => {
    test("shows Cystic fibrosis as primary AR disease with validated European prevalence", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      const { calledEndpoints } = interceptOrphanetApi(page);

      await navigateToResults(page);

      const orphanetSection = page.getByTestId("orphanet-section");
      await expect(orphanetSection).toBeVisible({ timeout: 10_000 });

      // Verify label
      await expect(
        orphanetSection.locator("text=Orphanet Prevalence"),
      ).toBeVisible();

      // Primary disease must be "Cystic fibrosis" (AR + highest valMoy)
      await expect(
        orphanetSection.locator('a:has-text("Cystic fibrosis")'),
      ).toBeVisible();

      // [AR] badge
      await expect(
        orphanetSection.locator("text=[AR]").first(),
      ).toBeVisible();

      // Prevalence class from validated European data
      await expect(orphanetSection).toContainText("1-5 / 10 000");

      // Geographic region
      await expect(orphanetSection).toContainText("Europe");

      // Disclaimer
      await expect(orphanetSection).toContainText(
        "Orphanet reports clinical prevalence (diagnosed cases), not genetic carrier prevalence",
      );

      // Verify Orphanet API was called
      expect(
        calledEndpoints.some((u) => u.includes("/rd-associated-genes/")),
      ).toBe(true);
    });

    test("disease name links to Orphanet entry (opens in new tab)", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApi(page);

      await navigateToResults(page);

      const orphanetSection = page.getByTestId("orphanet-section");
      await expect(orphanetSection).toBeVisible({ timeout: 10_000 });

      const cfLink = orphanetSection.locator('a:has-text("Cystic fibrosis")');
      await expect(cfLink).toBeVisible();

      const href = await cfLink.getAttribute("href");
      expect(href).toContain("orpha.net");
      expect(href).toContain("586");

      expect(await cfLink.getAttribute("target")).toBe("_blank");
      expect(await cfLink.getAttribute("rel")).toContain("noopener");
    });

    test("+N more chip expands additional diseases for multi-disease genes", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApi(page);

      await navigateToResults(page);

      const orphanetSection = page.getByTestId("orphanet-section");
      await expect(orphanetSection).toBeVisible({ timeout: 10_000 });

      // +1 more chip (CBAVD)
      const moreChip = orphanetSection.locator("text=+1 more");
      await expect(moreChip).toBeVisible();

      // CBAVD hidden before expand
      await expect(
        orphanetSection.locator(
          'a:has-text("Congenital bilateral absence of vas deferens")',
        ),
      ).not.toBeVisible();

      // Expand
      await moreChip.click();

      // CBAVD visible after expand
      const cbavdLink = orphanetSection.locator(
        'a:has-text("Congenital bilateral absence of vas deferens")',
      );
      await expect(cbavdLink).toBeVisible();
      await expect(orphanetSection.locator("text=1-9 / 100 000")).toBeVisible();

      // Chip changes to "show less"
      await expect(orphanetSection.locator("text=show less")).toBeVisible();

      // Collapse
      await orphanetSection.locator("text=show less").click();
      await expect(cbavdLink).not.toBeVisible({ timeout: 2_000 });
    });
  });

  test.describe("UI/UX — Eager Fetch & Loading States", () => {
    test("Orphanet API is called at Step 1 gene selection (eager prefetch)", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      const { calledEndpoints } = interceptOrphanetApi(page);

      await page.goto("/");
      await dismissDisclaimer(page);

      // Step 1: Select CFTR
      const geneInput = page.getByTestId("gene-search-input").locator("input");
      await geneInput.click();
      await geneInput.fill("CFTR");
      await expect(
        page.getByRole("option", { name: /CFTR/ }).first(),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole("option", { name: /^CFTR\b/ }).first().click();

      // Wait for eager fetch
      await page.waitForTimeout(2000);

      // API called BEFORE clicking Next
      expect(
        calledEndpoints.find((u) => u.includes("/rd-associated-genes/")),
      ).toBeTruthy();
      expect(
        calledEndpoints.find((u) => u.includes("/rd-epidemiology/")),
      ).toBeTruthy();
    });

    test("section is NOT a skeleton when user reaches Step 4 (data pre-loaded)", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApi(page);

      await navigateToResults(page);

      const orphanetSection = page.getByTestId("orphanet-section");
      await expect(orphanetSection).toBeVisible({ timeout: 10_000 });

      // Content, not skeleton
      await expect(orphanetSection).toContainText("Cystic fibrosis");
      await expect(
        orphanetSection.locator(".v-skeleton-loader"),
      ).toHaveCount(0);
    });
  });

  test.describe("UI/UX — Graceful Degradation", () => {
    test("hides Orphanet section entirely when API fails (no error UI)", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiWithError(page);

      await navigateToResults(page);

      // Summary card still works
      const summaryCard = page.getByTestId("results-summary-card");
      await expect(summaryCard).toBeVisible();
      await expect(summaryCard).toContainText("CFTR");

      await page.waitForTimeout(3000);

      // Orphanet section hidden
      await expect(page.getByTestId("orphanet-section")).not.toBeVisible();

      // No Orphanet error text visible
      await expect(page.locator("text=Orphanet")).not.toBeVisible();

      // Population table still works
      await expect(page.getByTestId("population-table")).toBeVisible();
    });

    test("hides section when gene has no Orphanet diseases", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApiEmpty(page);

      await navigateToResults(page);

      await expect(page.getByTestId("results-summary-card")).toBeVisible();
      await page.waitForTimeout(2000);

      await expect(page.getByTestId("orphanet-section")).not.toBeVisible();
      await expect(page.getByTestId("population-table")).toBeVisible();
      await expect(page.getByTestId("text-output")).toBeVisible();
    });
  });

  test.describe("UI/UX — Visual Design & Accessibility", () => {
    test("Orphanet section has correct visual hierarchy in summary card", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApi(page);

      await navigateToResults(page);

      const orphanetSection = page.getByTestId("orphanet-section");
      await expect(orphanetSection).toBeVisible({ timeout: 10_000 });

      // Inside summary card
      const sectionInCard = page
        .getByTestId("results-summary-card")
        .getByTestId("orphanet-section");
      await expect(sectionInCard).toBeVisible();

      // Top border separator
      const borderStyle = await orphanetSection.evaluate(
        (el) => window.getComputedStyle(el).borderTopStyle,
      );
      expect(borderStyle).toBe("solid");
    });

    test("all disease links have proper accessibility attributes", async ({
      page,
    }) => {
      await interceptGnomadApi(page);
      await interceptClingenApi(page);
      interceptOrphanetApi(page);

      await navigateToResults(page);

      const orphanetSection = page.getByTestId("orphanet-section");
      await expect(orphanetSection).toBeVisible({ timeout: 10_000 });

      // Primary link attributes
      const primaryLink = orphanetSection.locator(
        'a:has-text("Cystic fibrosis")',
      );
      expect(await primaryLink.getAttribute("target")).toBe("_blank");
      expect(await primaryLink.getAttribute("rel")).toContain("noopener");
      expect(await primaryLink.getAttribute("rel")).toContain("noreferrer");

      // Expand and check additional link
      await orphanetSection.locator("text=+1 more").click();
      const additionalLink = orphanetSection.locator(
        'a:has-text("Congenital bilateral absence of vas deferens")',
      );
      await expect(additionalLink).toBeVisible();
      expect(await additionalLink.getAttribute("target")).toBe("_blank");
      expect(await additionalLink.getAttribute("rel")).toContain("noopener");
    });
  });
});
