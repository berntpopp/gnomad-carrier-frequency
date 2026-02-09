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
const SERVER_TIMEOUT_MS = 30000;

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
    stdio: ['ignore', 'ignore', 'ignore'], // Detach from stdio
    detached: false,
  });

  // Simple approach: wait for server to be ready
  // Vite typically takes 15-25 seconds on WSL2
  console.log('Waiting for server to start (25 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 25000));
  console.log('Dev server should be ready.');

  return server;
}

function stopDevServer(server: ChildProcess): void {
  console.log('Stopping dev server...');

  // Kill npm and all its children (vite, esbuild, etc.)
  exec(`pkill -P ${server.pid} && pkill -9 -f "node.*vite"`, (error) => {
    if (error) {
      console.log('Force killing server process...');
      server.kill('SIGKILL');
    }
  });

  // Also kill the main process
  server.kill('SIGTERM');
}

// ============================================================================
// GraphQL Route Interception
// ============================================================================

async function setupRouteInterception(page: Page): Promise<void> {
  await page.route('https://gnomad.broadinstitute.org/api', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    const operationName = postData?.operationName;

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
        // Not needed for screenshots, return empty response
        responseData = { data: {} };
        break;

      default:
        console.warn(`Unmatched GraphQL operation: ${operationName}`);
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

  // Add localStorage entries for the app's origin
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
  console.log(`  -> ${name}.webp`);
}

async function waitForAnimations(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.evaluate(async () => {
    const allElements = document.querySelectorAll('*');
    const animations = Array.from(allElements).flatMap(el =>
      el.getAnimations({ subtree: false })
    );
    if (animations.length > 0) {
      await Promise.all(animations.map(a => a.finished));
    }
  }).catch(() => {});
  await page.waitForTimeout(500);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('Screenshot Generation Script');
  console.log('============================\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Start dev server
  const server = await startDevServer();

  // Ensure cleanup on exit
  const cleanup = () => {
    stopDevServer(server);
  };
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    // Launch browser
    const browser = await chromium.launch({ headless: true, timeout: 60000 });
    const context = await browser.newContext({
      viewport: VIEWPORT_DESKTOP,
      colorScheme: 'light',
    });

    // Inject Pinia state (includes disclaimerAcknowledged: true)
    await injectPiniaState(context);

    const page = await context.newPage();

    // Set up route interception before navigation
    await setupRouteInterception(page);

    // Navigate to app
    console.log('Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('Page loaded.');

    // Wait for animations (will be called before each screenshot in Plan 03)
    // await waitForAnimations(page);

    console.log('Browser ready. App loaded.\n');

    // === SCREENSHOT CAPTURES GO HERE (Plan 03) ===

    console.log('\nAll screenshots captured successfully!');
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
