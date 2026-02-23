import { chromium, type Page, type BrowserContext } from 'playwright';
import sharp from 'sharp';
import { spawn, exec, type ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * OG image generation script for gnomAD Carrier Frequency Calculator.
 *
 * Captures a 1200x630 screenshot of the calculator showing CFTR results
 * using Playwright with GraphQL fixture interception.
 *
 * Falls back to converting the existing SVG if Playwright approach fails.
 */

// ============================================================================
// Configuration
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173/';
const OUTPUT_PATH = resolve(__dirname, '../public/og-image.png');
const FIXTURES_DIR = resolve(__dirname, '../fixtures');
const OG_VIEWPORT = { width: 1200, height: 630 };

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

  const server = spawn('bun', ['run', 'dev'], {
    cwd: resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

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
// OG Image Capture via Playwright
// ============================================================================

async function captureViaPlaywright(): Promise<void> {
  const server = await startDevServer();

  const cleanup = () => { stopDevServer(server); };
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: OG_VIEWPORT,
      colorScheme: 'light',
    });

    await injectPiniaState(context);
    const page = await context.newPage();
    await setupRouteInterception(page);

    console.log('Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('App loaded. Navigating to results step...');

    // Step 1: Search for CFTR
    const searchInput = page.locator('[data-testid="gene-search-input"]').locator('input');
    await searchInput.click();
    await searchInput.fill('CFTR');
    await page.waitForTimeout(800);

    // Click CFTR in autocomplete
    const cftrItem = page.locator('.v-overlay--active .v-list-item', { hasText: 'CFTR' });
    await cftrItem.waitFor({ timeout: 10000 });
    await cftrItem.click();

    // Wait for gene details to load
    await page.locator('[data-testid="gene-constraint-card"]').waitFor({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Step 2: Advance to patient status
    await page.locator('[data-testid="step-gene-next-btn"]').click();
    await page.locator('[data-testid="step-status"]').waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Select heterozygous carrier
    await page.locator('text=Heterozygous carrier').click();
    await page.waitForTimeout(300);

    // Step 3: Advance to frequency step
    await page.locator('[data-testid="step-status-next-btn"]').click();
    await page.locator('[data-testid="step-frequency"]').waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Wait for frequency calculation to complete
    await page.locator('.v-alert[type="success"]').waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Step 4: Advance to results
    await page.locator('[data-testid="step-frequency-next-btn"]').click();
    await page.locator('[data-testid="step-results"]').waitFor({ timeout: 10000 });
    await page.locator('[data-testid="population-table"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);

    console.log('Results step visible. Capturing OG screenshot...');

    // Capture at exact 1200x630 viewport
    const png = await page.screenshot({ type: 'png', fullPage: false });

    // Save to public/og-image.png
    await sharp(png)
      .resize(1200, 630, { fit: 'cover', position: 'top' })
      .png()
      .toFile(OUTPUT_PATH);

    console.log(`OG image saved to ${OUTPUT_PATH}`);

    await browser.close();
  } finally {
    stopDevServer(server);
  }
}

// ============================================================================
// SVG Fallback
// ============================================================================

async function captureViaSvgFallback(): Promise<void> {
  const svgPath = resolve(__dirname, '../public/og-image.svg');

  if (!existsSync(svgPath)) {
    throw new Error(`SVG fallback not found at ${svgPath}`);
  }

  console.log('Using SVG fallback approach...');
  const svg = readFileSync(svgPath);

  await sharp(svg)
    .resize(1200, 630, { fit: 'fill' })
    .png()
    .toFile(OUTPUT_PATH);

  console.log(`OG image saved (from SVG) to ${OUTPUT_PATH}`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('OG Image Generation Script');
  console.log('==========================\n');

  try {
    console.log('Attempting Playwright screenshot approach...');
    await captureViaPlaywright();
  } catch (err) {
    console.warn(`\nPlaywright approach failed: ${(err as Error).message}`);
    console.log('Falling back to SVG conversion...\n');
    await captureViaSvgFallback();
  }

  // Verify dimensions
  const metadata = await sharp(OUTPUT_PATH).metadata();
  console.log(`\nVerification: ${metadata.width}x${metadata.height} ${metadata.format}`);

  if (metadata.width !== 1200 || metadata.height !== 630) {
    throw new Error(`Unexpected dimensions: ${metadata.width}x${metadata.height} (expected 1200x630)`);
  }

  console.log('\nOG image generation complete!');
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('\nOG image generation FAILED:', err.message);
  process.exit(1);
});
