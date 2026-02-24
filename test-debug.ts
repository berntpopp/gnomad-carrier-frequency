import { test, expect } from '@playwright/test';

test('debug: filter panel expansion', async ({ page }) => {
  const BASE_URL = 'http://localhost:5173';

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.v-application', { timeout: 30000 });
  await page.waitForTimeout(1000);

  // Dismiss disclaimer
  const understandBtn = page.getByRole('button', { name: /I UNDERSTAND/i });
  if (await understandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await understandBtn.click();
    await page.waitForTimeout(500);
  }

  // Select CFTR
  const autocomplete = page.locator('.v-autocomplete').first();
  const input = autocomplete.locator('input');
  await input.click();
  await input.fill('');
  await input.pressSequentially('CFTR', { delay: 80 });
  const option = page.getByRole('option', { name: /CFTR/i }).first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  await option.click();
  await page.waitForTimeout(2000);

  // Navigate through wizard
  // Step 1 → 2
  await page.locator('[data-testid="step-gene-next-btn"]').click();
  await page.waitForTimeout(500);

  // Step 2: Select heterozygous and continue
  await page.locator('[data-testid="status-option-heterozygous"]').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /continue/i }).last().click();
  await page.waitForTimeout(500);

  // Step 3: Continue (gnomAD default)
  await page.waitForTimeout(3000);
  const step3Btn = page.getByRole('button', { name: /continue/i }).last();
  await expect(step3Btn).toBeEnabled({ timeout: 30000 });
  await step3Btn.click();
  await page.waitForTimeout(1000);

  // Now at step 4
  console.log('=== At step 4');

  // Check for expansion panels
  const panels = page.locator('.v-expansion-panel-title');
  const panelCount = await panels.count();
  console.log('=== Expansion panel titles found:', panelCount);

  for (let i = 0; i < panelCount; i++) {
    const text = await panels.nth(i).textContent();
    const expanded = await panels.nth(i).getAttribute('aria-expanded');
    console.log(`=== Panel ${i}: text="${text?.trim()}", aria-expanded="${expanded}"`);
  }

  // Try clicking the Filters panel
  const filtersPanel = panels.filter({ hasText: 'Filters' });
  const filtersPanelCount = await filtersPanel.count();
  console.log('=== Filters panel count:', filtersPanelCount);

  if (filtersPanelCount > 0) {
    await filtersPanel.first().scrollIntoViewIfNeeded();
    await filtersPanel.first().click();
    await page.waitForTimeout(1000);

    // Check expansion state after click
    const expandedAfter = await filtersPanel.first().getAttribute('aria-expanded');
    console.log('=== After click, aria-expanded:', expandedAfter);

    // Check for panel text content
    const panelText = page.locator('.v-expansion-panel-text');
    const panelTextCount = await panelText.count();
    console.log('=== Panel text elements found:', panelTextCount);

    for (let i = 0; i < panelTextCount; i++) {
      const visible = await panelText.nth(i).isVisible();
      console.log(`=== Panel text ${i} visible: ${visible}`);
    }

    // Look for all sliders
    const sliders = page.locator('.v-slider');
    const sliderCount = await sliders.count();
    console.log('=== Slider count:', sliderCount);

    // Look for all range inputs
    const rangeInputs = page.locator('input[type="range"]');
    const rangeCount = await rangeInputs.count();
    console.log('=== Range input count:', rangeCount);

    // Look for labels containing "Penetrance"
    const penLabels = page.locator('label:has-text("Penetrance")');
    const penLabelCount = await penLabels.count();
    console.log('=== Penetrance label count:', penLabelCount);

    await page.screenshot({ path: 'test-results/debug-filter-expanded.png', fullPage: true });
  }
});
