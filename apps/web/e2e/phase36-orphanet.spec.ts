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

// ─── HEXA fixtures (for gene-switching regression test) ───────────────────────

const HEXA_GENE_SEARCH_RESPONSE = {
  data: { gene_search: [{ ensembl_id: "ENSG00000213614", symbol: "HEXA" }] },
};
const HEXA_GENE_DETAILS_RESPONSE = {
  data: {
    gene: {
      gene_id: "ENSG00000213614",
      symbol: "HEXA",
      gnomad_constraint: {
        exp_lof: 30,
        obs_lof: 10,
        oe_lof: 0.33,
        oe_lof_lower: 0.2,
        oe_lof_upper: 0.55,
        pLI: 0.9,
        lof_z: 3.5,
        flags: [],
      },
    },
  },
};
const HEXA_POPULATIONS = [
  { id: "afr", ac: 2, an: 24000, ac_hom: 0 },
  { id: "ami", ac: 0, an: 1200, ac_hom: 0 },
  { id: "amr", ac: 3, an: 18000, ac_hom: 0 },
  { id: "asj", ac: 15, an: 4000, ac_hom: 0 },
  { id: "eas", ac: 1, an: 10000, ac_hom: 0 },
  { id: "fin", ac: 1, an: 11000, ac_hom: 0 },
  { id: "mid", ac: 1, an: 3000, ac_hom: 0 },
  { id: "nfe", ac: 20, an: 72000, ac_hom: 0 },
  { id: "sas", ac: 2, an: 14000, ac_hom: 0 },
  { id: "remaining", ac: 1, an: 6000, ac_hom: 0 },
];
const HEXA_GENE_VARIANTS_RESPONSE = {
  data: {
    gene: {
      gene_id: "ENSG00000213614",
      symbol: "HEXA",
      variants: [
        {
          variant_id: "15-72638892-C-T",
          pos: 72638892,
          ref: "C",
          alt: "T",
          exome: { ac: 46, an: 163200, ac_hom: 0, populations: HEXA_POPULATIONS },
          genome: null,
          joint: null,
          transcript_consequence: {
            gene_symbol: "HEXA",
            transcript_id: "ENST00000261416",
            canonical: true,
            consequence_terms: ["stop_gained"],
            lof: "HC",
            lof_filter: null,
            lof_flags: null,
            hgvsc: "c.1274_1278dup",
            hgvsp: "p.Tyr427Ilefs*5",
          },
        },
      ],
      clinvar_variants: [
        {
          variant_id: "15-72638892-C-T",
          clinvar_variation_id: "3291",
          clinical_significance: "Pathogenic",
          gold_stars: 4,
          review_status: "reviewed by expert panel",
          pos: 72638892,
          ref: "C",
          alt: "T",
        },
      ],
    },
  },
};

/** Orphanet mock for HEXA — Tay-Sachs disease */
const ORPHANET_GENE_DISEASES_HEXA = {
  data: {
    results: [
      {
        ORPHAcode: 845,
        "Preferred term": "Tay-Sachs disease",
        OrphanetURL: "https://www.orpha.net/en/disease/detail/845",
        Date: "2024-01-01",
        DisorderGeneAssociation: [
          {
            DisorderGeneAssociationType: "Disease-causing germline mutation(s) in",
            DisorderGeneAssociationStatus: "Assessed",
            Gene: { Symbol: "HEXA", name: "hexosaminidase subunit alpha", GeneType: "gene with protein product", ExternalReference: [] },
          },
        ],
      },
    ],
  },
};
const ORPHANET_EPI_845 = {
  data: {
    results: {
      Prevalence: [
        {
          PrevalenceClass: "1-9 / 1 000 000",
          PrevalenceGeographic: "Europe",
          PrevalenceType: "Point prevalence",
          PrevalenceQualification: "Value and class",
          PrevalenceValidationStatus: "Validated",
          Source: "Literature",
          ValMoy: "0.5",
        },
      ],
    },
  },
};
const ORPHANET_NAT_HIST_845 = {
  data: { results: { TypeOfInheritance: ["Autosomal recessive"] } },
};

/**
 * Intercept gnomAD API that responds differently based on gene query.
 * Routes CFTR queries to CFTR fixtures, HEXA queries to HEXA fixtures.
 */
async function interceptGnomadApiMultiGene(page: Page): Promise<void> {
  await page.route(
    "https://gnomad.broadinstitute.org/api",
    async (route: Route) => {
      const postData = route.request().postDataJSON() as {
        operationName?: string;
        variables?: { query?: string; geneSymbol?: string };
      } | null;
      const op = postData?.operationName;
      const query = postData?.variables?.query ?? "";
      const geneSym = postData?.variables?.geneSymbol ?? "";

      if (op === "GeneSearch") {
        const isHEXA = query.toUpperCase().includes("HEXA");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(isHEXA ? HEXA_GENE_SEARCH_RESPONSE : GENE_SEARCH_RESPONSE),
        });
      } else if (op === "GeneDetails") {
        const isHEXA = geneSym.toUpperCase() === "HEXA";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(isHEXA ? HEXA_GENE_DETAILS_RESPONSE : GENE_DETAILS_RESPONSE),
        });
      } else if (op === "GeneVariants") {
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

/**
 * Intercept Orphanet API for both CFTR and HEXA genes.
 */
function interceptOrphanetApiMultiGene(page: Page): void {
  page.route("**/api.orphadata.com/**", async (route: Route) => {
    const url = route.request().url();
    // CFTR routes
    if (url.includes("/genes/symbols/cftr")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ORPHANET_GENE_DISEASES_CFTR) });
    } else if (url.includes("/rd-epidemiology/orphacodes/586")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ORPHANET_EPI_586) });
    } else if (url.includes("/rd-epidemiology/orphacodes/48")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ORPHANET_EPI_48) });
    } else if (url.includes("/rd-natural_history/orphacodes/586")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ORPHANET_NAT_HIST_586) });
    } else if (url.includes("/rd-natural_history/orphacodes/48")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ORPHANET_NAT_HIST_48) });
    }
    // HEXA routes
    else if (url.includes("/genes/symbols/hexa")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ORPHANET_GENE_DISEASES_HEXA) });
    } else if (url.includes("/rd-epidemiology/orphacodes/845")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ORPHANET_EPI_845) });
    } else if (url.includes("/rd-natural_history/orphacodes/845")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ORPHANET_NAT_HIST_845) });
    } else {
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });
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

  test.describe("Regression — Gene Switching (stale data bug)", () => {
    test("switching from CFTR to HEXA shows Tay-Sachs, not Cystic fibrosis", async ({
      page,
    }) => {
      await interceptGnomadApiMultiGene(page);
      await interceptClingenApi(page);
      interceptOrphanetApiMultiGene(page);

      // First: complete CFTR flow to Step 4
      await page.goto("/");
      await dismissDisclaimer(page);

      const geneInput = page.getByTestId("gene-search-input").locator("input");
      await geneInput.click();
      await geneInput.fill("CFTR");
      await expect(
        page.getByRole("option", { name: /CFTR/ }).first(),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole("option", { name: /^CFTR\b/ }).first().click();
      await page.getByTestId("step-gene-next-btn").click();

      await expect(page.getByTestId("step-status")).toBeVisible();
      await page.getByTestId("status-option-heterozygous").click();
      await page.getByTestId("step-status-next-btn").click();

      await expect(
        page.getByText("Carrier frequency calculated from gnomAD data."),
      ).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("step-frequency-next-btn").click();

      // Verify CFTR Orphanet data at Step 4
      const orphanetSection = page.getByTestId("orphanet-section");
      await expect(orphanetSection).toBeVisible({ timeout: 10_000 });
      await expect(
        orphanetSection.locator('a:has-text("Cystic fibrosis")'),
      ).toBeVisible();

      // Go BACK to Step 1 by clicking the step header (editable when completed)
      await page.getByTestId("wizard-step-1").click();
      await expect(page.getByTestId("step-gene")).toBeVisible();

      // Select HEXA
      const geneInput2 = page.getByTestId("gene-search-input").locator("input");
      await geneInput2.click();
      await geneInput2.fill("");
      await geneInput2.fill("HEXA");
      await expect(
        page.getByRole("option", { name: /HEXA/ }).first(),
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

      // Step 4: Verify HEXA Orphanet data (NOT CFTR!)
      await expect(page.getByTestId("step-results")).toBeVisible();
      const orphanetSection2 = page.getByTestId("orphanet-section");
      await expect(orphanetSection2).toBeVisible({ timeout: 10_000 });

      // Must show Tay-Sachs (HEXA), NOT Cystic fibrosis (CFTR)
      await expect(
        orphanetSection2.locator('a:has-text("Tay-Sachs disease")'),
      ).toBeVisible();
      await expect(
        orphanetSection2.locator('a:has-text("Cystic fibrosis")'),
      ).not.toBeVisible();

      // Verify HEXA-specific prevalence
      await expect(orphanetSection2).toContainText("1-9 / 1 000 000");
    });
  });
});
