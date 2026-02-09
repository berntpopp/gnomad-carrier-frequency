import { chromium, type Page, type BrowserContext } from 'playwright';
import sharp from 'sharp';
import { spawn, exec, type ChildProcess } from 'child_process';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Screenshot generation script for gnomAD Carrier Frequency Calculator documentation.
 *
 * This script:
 * - Starts a dev server
 * - Launches Chromium with Playwright
 * - Intercepts GraphQL requests and serves fixture data
 * - Captures screenshots of the app in various states
 * - Converts PNG to WebP format
 * - Saves screenshots to docs/public/screenshots/
 */

// ============================================================================
// Configuration
// ============================================================================

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173/gnomad-carrier-frequency/';
const OUTPUT_DIR = resolve(__dirname, '../docs/public/screenshots');
const FIXTURES_DIR = resolve(__dirname, '../fixtures');
const VIEWPORT_DESKTOP = { width: 1200, height: 800 };
const VIEWPORT_MOBILE = { width: 375, height: 812 };
const WEBP_QUALITY = 80;

// ============================================================================
// Fixture Loading
// ============================================================================

function loadFixture(path: string): unknown {
  const fixturePath = resolve(FIXTURES_DIR, path);
  const content = readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}

// ============================================================================
// Dev Server Management
// ============================================================================

async function startDevServer(): Promise<ChildProcess> {
  console.log('Starting dev server...');

  const server = spawn('npm', ['run', 'dev'], {
    cwd: resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  // Wait for "Local:" in stdout to detect server ready
  await new Promise<void>((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Dev server failed to start within 60 seconds'));
    }, 60000);

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready in')) {
        clearTimeout(timeout);
        resolvePromise();
      }
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });
  });

  console.log('Dev server ready.');
  return server;
}

function stopDevServer(server: ChildProcess): void {
  console.log('Stopping dev server...');
  try {
    if (server.pid) {
      // Kill the process group
      exec(`pkill -P ${server.pid} 2>/dev/null; kill -9 ${server.pid} 2>/dev/null`);
    }
    server.kill('SIGTERM');
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// GraphQL Route Interception
// ============================================================================

async function setupRouteInterception(page: Page): Promise<void> {
  await page.route('https://gnomad.broadinstitute.org/api', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    // Extract operation name from either the operationName field or the query string
    let operationName = postData?.operationName;
    if (!operationName && postData?.query) {
      const match = postData.query.match(/(?:query|mutation)\s+(\w+)/);
      operationName = match ? match[1] : null;
    }

    let responseData: unknown;

    switch (operationName) {
      case 'GeneSearch':
        responseData = loadFixture('gnomad/cftr-gene-search.json');
        break;
      case 'GeneDetails':
        responseData = loadFixture('gnomad/cftr-gene-details.json');
        break;
      case 'GeneVariants':
        responseData = loadFixture('gnomad/cftr-variants.json');
        break;
      case 'ClinVarSubmissions':
        responseData = { data: {} };
        break;
      default:
        console.warn(`  [route] Unmatched GraphQL operation: ${operationName}`);
        responseData = { data: {} };
        break;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseData),
    });
  });
}

// ============================================================================
// Pinia State Injection
// ============================================================================

async function injectPiniaState(context: BrowserContext): Promise<void> {
  const piniaState = loadFixture('pinia/default-state.json') as Record<string, unknown>;

  await context.addInitScript((state) => {
    for (const [key, value] of Object.entries(state)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, piniaState);
}

// ============================================================================
// Screenshot Helpers
// ============================================================================

async function capture(page: Page, name: string): Promise<void> {
  console.log(`  Capturing ${name}...`);
  const png = await page.screenshot({ type: 'png', fullPage: false });
  await sharp(png).webp({ quality: WEBP_QUALITY }).toFile(resolve(OUTPUT_DIR, `${name}.webp`));
  console.log(`  ✓ ${name}.webp`);
}

async function waitForAnimations(page: Page): Promise<void> {
  // Wait for Vuetify transitions and Vue reactivity to settle
  await page.waitForTimeout(1000);
}

// ============================================================================
// Screenshot Capture Sequences
// ============================================================================

async function captureWizardFlow(page: Page): Promise<void> {
  // --- SCREENSHOT 1: hero-preview ---
  console.log('\n[1/14] hero-preview (Step 1 with gene selected)');
  const searchInput = page.locator('[data-testid="gene-search-input"]').locator('input');
  await searchInput.click();
  await searchInput.fill('CFTR');
  await page.waitForTimeout(800);
  // Wait for and click autocomplete result
  const cftrItem = page.locator('.v-overlay--active .v-list-item', { hasText: 'CFTR' });
  await cftrItem.waitFor({ timeout: 10000 });
  await cftrItem.click();
  // Wait for gene details cards
  await page.locator('[data-testid="gene-constraint-card"]').waitFor({ timeout: 10000 });
  await waitForAnimations(page);
  await capture(page, 'hero-preview');

  // --- SCREENSHOT 2: step-1-gene-search (autocomplete dropdown visible) ---
  console.log('\n[2/14] step-1-gene-search (autocomplete dropdown)');
  // Clear the selected gene
  const clearBtn = page.locator('[data-testid="gene-search-input"]').locator('.v-field__clearable button, .v-field__clearable');
  await clearBtn.first().click().catch(async () => {
    // Fallback: triple-click to select all then delete
    const input = page.locator('[data-testid="gene-search-input"]').locator('input');
    await input.click({ clickCount: 3 });
    await input.press('Backspace');
  });
  await page.waitForTimeout(300);
  const searchInput2 = page.locator('[data-testid="gene-search-input"]').locator('input');
  await searchInput2.click();
  await searchInput2.fill('CFT');
  await page.waitForTimeout(800);
  await page.locator('.v-overlay--active .v-list-item').first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(200);
  await capture(page, 'step-1-gene-search');

  // --- SCREENSHOT 3: step-1-gene-selected ---
  console.log('\n[3/14] step-1-gene-selected (CFTR with info cards)');
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'CFTR' }).click();
  await page.locator('[data-testid="gene-constraint-card"]').waitFor({ timeout: 10000 });
  await waitForAnimations(page);
  await capture(page, 'step-1-gene-selected');

  // --- SCREENSHOT 4: step-2-patient-status ---
  console.log('\n[4/14] step-2-patient-status (heterozygous selected)');
  await page.locator('[data-testid="step-gene-next-btn"]').click();
  await page.locator('[data-testid="step-status"]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(1000);
  // Click the label text inside the radio — Vuetify v-radio wraps input in layers
  await page.locator('text=Heterozygous carrier').click();
  await page.waitForTimeout(500);
  await capture(page, 'step-2-patient-status');

  // --- SCREENSHOT 5: step-3-frequency ---
  console.log('\n[5/14] step-3-frequency (gnomAD frequency)');
  await page.locator('[data-testid="step-status-next-btn"]').click();
  await page.locator('[data-testid="step-frequency"]').waitFor({ timeout: 10000 });
  await waitForAnimations(page);
  // Wait for frequency calculation to complete (success alert appears)
  await page.locator('.v-alert[type="success"]').waitFor({ timeout: 15000 }).catch(() => {});
  await waitForAnimations(page);
  await capture(page, 'step-3-frequency');

  // --- SCREENSHOT 6: step-4-results ---
  console.log('\n[6/14] step-4-results (results page)');
  await page.locator('[data-testid="step-frequency-next-btn"]').click();
  await page.locator('[data-testid="step-results"]').waitFor({ timeout: 10000 });
  await page.locator('[data-testid="population-table"]').waitFor({ timeout: 15000 });
  await waitForAnimations(page);
  await capture(page, 'step-4-results');

  // --- SCREENSHOT 7: text-output ---
  console.log('\n[7/14] text-output (clinical text)');
  await page.locator('[data-testid="text-output"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid="text-content"]').waitFor({ timeout: 10000 });
  await waitForAnimations(page);
  await capture(page, 'text-output');

  // --- SCREENSHOT 8: variant-table ---
  console.log('\n[8/14] variant-table (variant modal)');
  await page.locator('[data-testid="step-results"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  // The button text includes the variant count, use partial match
  const variantBtn = page.locator('[data-testid="step-results"] button', { hasText: /[Vv]iew all variants/ });
  await variantBtn.scrollIntoViewIfNeeded();
  await variantBtn.click();
  await page.locator('[data-testid="variant-modal"]').waitFor({ timeout: 10000 });
  await page.locator('[data-testid="variant-table"]').waitFor({ timeout: 10000 });
  await waitForAnimations(page);
  await capture(page, 'variant-table');
  // Close modal
  await page.locator('[data-testid="variant-modal-close-btn"]').click();
  await page.waitForTimeout(500);
}

async function captureFeatureScreenshots(page: Page, context: BrowserContext): Promise<void> {
  // --- SCREENSHOT 9: filter-chips ---
  console.log('\n[9/14] filter-chips (filter section)');
  // Scroll to the results summary card area where FilterPanel is embedded
  await page.locator('[data-testid="results-summary-card"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  // FilterPanel is an expansion panel inside results-summary-card
  // FilterChips are inline - capture the results area showing filters
  await capture(page, 'filter-chips');

  // --- SCREENSHOT 10: settings-dialog ---
  console.log('\n[10/14] settings-dialog (General tab)');
  await page.locator('[data-testid="footer-settings-btn"]').click();
  await page.locator('[data-testid="settings-dialog"]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500); // Wait for dialog animation + content render
  // General tab is already active by default, just capture
  await capture(page, 'settings-dialog');
  // Close settings dialog — click the X button inside
  await page.locator('[data-testid="settings-dialog"] .v-card-title .v-btn').click();
  await page.waitForTimeout(500);

  // --- SCREENSHOT 11: dark-mode-results ---
  console.log('\n[11/14] dark-mode-results (dark theme)');
  // Use emulateMedia to trigger prefers-color-scheme: dark
  // VueUse useDark detects system preference changes
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(1500);
  // Scroll to results to ensure they're in view
  await page.locator('[data-testid="step-results"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await capture(page, 'dark-mode-results');
  // Switch back to light
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(1000);

  // --- SCREENSHOT 12: mobile-results ---
  console.log('\n[12/14] mobile-results (mobile viewport)');
  await page.setViewportSize(VIEWPORT_MOBILE);
  await waitForAnimations(page);
  await capture(page, 'mobile-results');
  // Reset to desktop
  await page.setViewportSize(VIEWPORT_DESKTOP);
  await waitForAnimations(page);

  // --- SCREENSHOT 13: population-drilldown ---
  console.log('\n[13/14] population-drilldown (Ashkenazi Jewish)');
  await page.locator('[data-testid="population-table"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  // Click on Ashkenazi Jewish row in population table
  const asjRow = page.locator('[data-testid="population-table"] tr', { hasText: /Ashkenazi/ });
  await asjRow.click();
  await page.locator('[data-testid="variant-modal"]').waitFor({ timeout: 10000 });
  await waitForAnimations(page);
  await capture(page, 'population-drilldown');
  // Close modal
  await page.locator('[data-testid="variant-modal-close-btn"]').click();
  await page.waitForTimeout(500);

  // --- SCREENSHOT 14: search-history ---
  console.log('\n[14/14] search-history (history panel)');
  await page.locator('[data-testid="footer-history-btn"]').click();
  await page.locator('[data-testid="history-drawer"]').waitFor({ timeout: 10000 });
  await waitForAnimations(page);
  await capture(page, 'search-history');
  // Close drawer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('Screenshot Generation Script');
  console.log('============================\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const server = await startDevServer();

  const cleanup = () => { stopDevServer(server); };
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: VIEWPORT_DESKTOP,
      colorScheme: 'light',
    });

    await injectPiniaState(context);
    const page = await context.newPage();
    await setupRouteInterception(page);

    console.log('Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Brief pause for Vue to mount — don't use waitForAnimations here (networkidle hangs on SPA)
    await page.waitForTimeout(2000);
    console.log('Browser ready. App loaded.');

    // Capture wizard flow screenshots (1-8)
    await captureWizardFlow(page);

    // Capture feature screenshots (9-14)
    await captureFeatureScreenshots(page, context);

    console.log('\n============================');
    console.log('All 14 screenshots captured successfully!');
    console.log(`Output: ${OUTPUT_DIR}/`);

    await browser.close();
  } finally {
    stopDevServer(server);
  }
}

main().catch((err) => {
  console.error('\nScreenshot generation FAILED:', err.message);
  process.exit(1);
});
