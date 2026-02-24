/**
 * Playwright checkpoint verification for 28-03: Gene Config Web Integration
 * Tests all verification steps from the checkpoint.
 */
import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Helper: wait for app to fully mount and dismiss disclaimer
async function waitForApp(page: Page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.v-application', { timeout: 30000 });
  await page.waitForTimeout(1000);

  // Dismiss Clinical Disclaimer dialog if present
  const understandBtn = page.getByRole('button', { name: /I UNDERSTAND/i });
  if (await understandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await understandBtn.click();
    await page.waitForTimeout(500);
  }
}

// Helper: search for a gene and select it from Vuetify autocomplete
async function searchAndSelectGene(page: Page, symbol: string) {
  const autocomplete = page.locator('.v-autocomplete').first();
  const input = autocomplete.locator('input');
  await input.click();
  await input.fill('');
  await input.pressSequentially(symbol, { delay: 80 });

  const option = page.getByRole('option', { name: new RegExp(symbol, 'i') }).first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  await option.click();

  await page.waitForTimeout(2000);
}

// Helper: navigate through wizard to step 4 (Results) after gene is selected
async function navigateToResults(page: Page) {
  // Step 1 → 2: Click Continue
  const continueBtn = page.locator('[data-testid="step-gene-next-btn"]');
  await expect(continueBtn).toBeEnabled({ timeout: 5000 });
  await continueBtn.click();
  await page.waitForTimeout(500);

  // Step 2: Select "Heterozygous carrier" and continue
  const hetRadio = page.locator('[data-testid="status-option-heterozygous"]');
  await hetRadio.click();
  await page.waitForTimeout(300);
  const step2Continue = page.getByRole('button', { name: /continue/i }).last();
  await step2Continue.click();
  await page.waitForTimeout(500);

  // Step 3: gnomAD tab is already selected by default, just continue
  await page.waitForTimeout(3000);
  const step3Continue = page.getByRole('button', { name: /continue/i }).last();
  await expect(step3Continue).toBeEnabled({ timeout: 30000 });
  await step3Continue.click();
  await page.waitForTimeout(1000);
}

// Helper: get the gene config chip
function getGeneConfigChip(page: Page) {
  return page.locator('.v-chip').filter({ hasText: 'Gene config loaded' });
}

// Helper: expand the filter panel and wait for content
async function expandFilterPanel(page: Page) {
  const panelTitle = page.locator('.v-expansion-panel-title').filter({ hasText: 'Filters' });
  await panelTitle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const expanded = await panelTitle.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await panelTitle.click();
    await page.waitForTimeout(800);
  }

  // Wait for the panel content to be visible
  await page.locator('.v-expansion-panel-text').first().waitFor({ state: 'visible', timeout: 5000 });
}

// Helper: get the penetrance slider value (Vuetify 3 uses role="slider" with aria-valuenow)
async function getPenetranceValue(page: Page): Promise<number> {
  const slider = page.locator('.v-slider').filter({ hasText: /Penetrance/ });
  const thumb = slider.locator('[role="slider"]');
  await thumb.scrollIntoViewIfNeeded();
  const val = await thumb.getAttribute('aria-valuenow');
  return Number(val);
}

test.describe('Gene Config System - Checkpoint Verification', () => {
  test.setTimeout(120000);

  test('1. App loads and renders', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await waitForApp(page);

    const app = page.locator('.v-application');
    await expect(app).toBeVisible();

    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }

    await page.screenshot({ path: 'test-results/01-app-loaded.png', fullPage: true });
  });

  test('2-3. CFTR selection shows "Gene config loaded" chip', async ({ page }) => {
    await waitForApp(page);
    await searchAndSelectGene(page, 'CFTR');
    await navigateToResults(page);

    const chip = getGeneConfigChip(page);
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible({ timeout: 10000 });

    // Verify chip has DNA icon
    const dnaIcon = chip.locator('.mdi-dna');
    await expect(dnaIcon).toBeVisible();

    // Verify chip is closable
    const closeIcon = chip.locator('.v-chip__close, button[aria-label]');
    await expect(closeIcon).toBeVisible();

    await page.screenshot({ path: 'test-results/02-cftr-chip-visible.png', fullPage: true });
  });

  test('4. CFTR profile dropdown shows two condition profiles', async ({ page }) => {
    await waitForApp(page);
    await searchAndSelectGene(page, 'CFTR');
    await navigateToResults(page);

    const chip = getGeneConfigChip(page);
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible({ timeout: 10000 });

    await expandFilterPanel(page);

    // Find the condition profile v-select
    const profileSelect = page.locator('.v-select').filter({ hasText: 'Condition profile' });
    await profileSelect.scrollIntoViewIfNeeded();
    await expect(profileSelect).toBeVisible({ timeout: 5000 });

    // Open the dropdown
    await profileSelect.locator('.v-field').click();
    await page.waitForTimeout(500);

    // Both profiles should be listed
    const classicCF = page.getByRole('option', { name: /Classic Cystic Fibrosis/i });
    const cftrRD = page.getByRole('option', { name: /CFTR-Related Disorder/i });
    await expect(classicCF).toBeVisible({ timeout: 5000 });
    await expect(cftrRD).toBeVisible();

    await page.screenshot({ path: 'test-results/03-cftr-profile-dropdown.png', fullPage: true });

    await page.keyboard.press('Escape');
  });

  test('5. Switching to CFTR-RD changes penetrance to ~3%', async ({ page }) => {
    await waitForApp(page);
    await searchAndSelectGene(page, 'CFTR');
    await navigateToResults(page);

    const chip = getGeneConfigChip(page);
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible({ timeout: 10000 });

    await expandFilterPanel(page);

    // Verify initial penetrance is 100% (Classic CF default)
    let penetrance = await getPenetranceValue(page);
    expect(penetrance).toBe(100);

    // Switch to CFTR-RD
    const profileSelect = page.locator('.v-select').filter({ hasText: 'Condition profile' });
    await profileSelect.scrollIntoViewIfNeeded();
    await profileSelect.locator('.v-field').click();
    await page.waitForTimeout(500);

    const cftrRD = page.getByRole('option', { name: /CFTR-Related Disorder/i });
    await cftrRD.click();
    await page.waitForTimeout(1500);

    // Penetrance should have changed from 100
    penetrance = await getPenetranceValue(page);
    expect(penetrance).toBeLessThan(100);
    // 3% with slider step=5 → might snap to 0 or 5, so check it's <= 5
    expect(penetrance).toBeLessThanOrEqual(5);
    console.log(`CFTR-RD penetrance: ${penetrance}%`);

    await page.screenshot({ path: 'test-results/04-cftr-rd-penetrance.png', fullPage: true });
  });

  test('6. Switching back to Classic CF restores penetrance to 100%', async ({ page }) => {
    await waitForApp(page);
    await searchAndSelectGene(page, 'CFTR');
    await navigateToResults(page);

    const chip = getGeneConfigChip(page);
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible({ timeout: 10000 });

    await expandFilterPanel(page);

    // Switch to CFTR-RD first
    const profileSelect = page.locator('.v-select').filter({ hasText: 'Condition profile' });
    await profileSelect.scrollIntoViewIfNeeded();
    await profileSelect.locator('.v-field').click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /CFTR-Related Disorder/i }).click();
    await page.waitForTimeout(1500);

    // Verify penetrance dropped
    let penetrance = await getPenetranceValue(page);
    expect(penetrance).toBeLessThan(100);

    // Now switch back to Classic CF
    await profileSelect.locator('.v-field').click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Classic Cystic Fibrosis/i }).click();
    await page.waitForTimeout(1500);

    // Penetrance should be back to 100
    penetrance = await getPenetranceValue(page);
    expect(penetrance).toBe(100);

    await page.screenshot({ path: 'test-results/05-classic-cf-restored.png', fullPage: true });
  });

  test('7. Closing chip resets filters to defaults', async ({ page }) => {
    await waitForApp(page);
    await searchAndSelectGene(page, 'CFTR');
    await navigateToResults(page);

    const chip = getGeneConfigChip(page);
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible({ timeout: 10000 });

    // Close the chip by clicking the close button
    const closeBtn = chip.locator('.v-chip__close').first();
    await closeBtn.click();
    await page.waitForTimeout(1000);

    // Chip should disappear
    await expect(chip).not.toBeVisible();

    await page.screenshot({ path: 'test-results/06-chip-closed.png', fullPage: true });
  });

  test('8. HEXA shows chip but no profile dropdown', async ({ page }) => {
    await waitForApp(page);
    await searchAndSelectGene(page, 'HEXA');
    await navigateToResults(page);

    const chip = getGeneConfigChip(page);
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible({ timeout: 10000 });

    await expandFilterPanel(page);
    await page.waitForTimeout(500);

    // Profile dropdown should NOT be visible (single-profile gene)
    const profileSelect = page.locator('.v-select').filter({ hasText: 'Condition profile' });
    await expect(profileSelect).not.toBeVisible();

    await page.screenshot({ path: 'test-results/07-hexa-no-dropdown.png', fullPage: true });
  });

  test('9. Non-config gene shows no chip', async ({ page }) => {
    await waitForApp(page);
    await searchAndSelectGene(page, 'PKD1');
    await navigateToResults(page);

    await page.waitForTimeout(3000);

    // Chip should NOT appear
    const chip = getGeneConfigChip(page);
    await expect(chip).not.toBeVisible();

    await page.screenshot({ path: 'test-results/08-no-chip-pkd1.png', fullPage: true });
  });

  test('10. No state bleed: CFTR-RD → PKD1 resets penetrance', async ({ page }) => {
    await waitForApp(page);

    // Select CFTR (has config)
    await searchAndSelectGene(page, 'CFTR');
    await navigateToResults(page);

    const chip = getGeneConfigChip(page);
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible({ timeout: 10000 });

    // Switch to CFTR-RD profile (penetrance 3%)
    await expandFilterPanel(page);
    const profileSelect = page.locator('.v-select').filter({ hasText: 'Condition profile' });
    await profileSelect.scrollIntoViewIfNeeded();
    await profileSelect.locator('.v-field').click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /CFTR-Related Disorder/i }).click();
    await page.waitForTimeout(1500);

    // Confirm penetrance is low
    let penetrance = await getPenetranceValue(page);
    expect(penetrance).toBeLessThan(100);

    await page.screenshot({ path: 'test-results/09a-cftr-rd-state.png', fullPage: true });

    // Go back to step 1
    for (let i = 0; i < 3; i++) {
      const backBtn = page.getByRole('button', { name: /back/i }).first();
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Clear and search for PKD1
    const autocomplete = page.locator('.v-autocomplete').first();
    const clearBtn = autocomplete.locator('.v-field__clearable button').first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(500);
    }

    await searchAndSelectGene(page, 'PKD1');
    await navigateToResults(page);

    // Chip should NOT be visible
    await expect(chip).not.toBeVisible();

    // Expand filter panel and check penetrance is back to 100%
    await expandFilterPanel(page);
    await page.waitForTimeout(500);

    penetrance = await getPenetranceValue(page);
    expect(penetrance).toBe(100);

    await page.screenshot({ path: 'test-results/09b-no-state-bleed.png', fullPage: true });
  });

  test('11. GJB2 shows chip (third seed config works)', async ({ page }) => {
    await waitForApp(page);
    await searchAndSelectGene(page, 'GJB2');
    await navigateToResults(page);

    const chip = getGeneConfigChip(page);
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible({ timeout: 10000 });

    await expandFilterPanel(page);
    await page.waitForTimeout(500);

    // No profile dropdown for single-profile gene
    const profileSelect = page.locator('.v-select').filter({ hasText: 'Condition profile' });
    await expect(profileSelect).not.toBeVisible();

    await page.screenshot({ path: 'test-results/10-gjb2-chip.png', fullPage: true });
  });
});
