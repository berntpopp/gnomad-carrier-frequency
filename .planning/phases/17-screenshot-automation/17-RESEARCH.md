# Phase 17: Screenshot Automation - Research

**Researched:** 2026-02-09
**Domain:** Playwright screenshot automation for Vue 3 SPA documentation
**Confidence:** HIGH

## Summary

Playwright is the standard tool for screenshot automation in Node.js/TypeScript projects, providing comprehensive browser control for capturing application states. However, a critical finding emerged: Playwright does NOT natively support WebP screenshot format as of 2026 - only PNG and JPEG are supported. This requires post-processing with the `sharp` library to convert PNG screenshots to WebP format.

The standard approach involves: (1) intercepting GraphQL API calls with `page.route()` and serving fixture responses based on operation name, (2) injecting Pinia persisted state into localStorage before page navigation, (3) capturing PNG screenshots with Playwright, (4) post-processing with sharp to convert to WebP, and (5) using Playwright's built-in webServer configuration or a standalone script with child_process to manage dev server lifecycle.

Key architectural patterns include: data-testid attributes for reliable element targeting, `page.emulateMedia()` for theme switching mid-script, `page.setViewportSize()` for mobile captures, animation completion detection via `waitForLoadState('networkidle')` combined with element-based waits, and sequential capture with fail-fast error handling.

**Primary recommendation:** Use Playwright for browser automation + sharp for WebP conversion, serve mocked GraphQL responses via route interception with operation name matching, inject localStorage state via `page.evaluate()` after navigation, and run as standalone TypeScript script using `npx tsx` with explicit server lifecycle management.

## Standard Stack

The established libraries/tools for Playwright screenshot automation:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| playwright | ^1.49.x | Browser automation & screenshot capture | Industry standard for E2E testing, comprehensive API, cross-browser support |
| sharp | ^0.33.x | PNG to WebP conversion | High-performance image processing, native Node.js module, battle-tested |
| tsx | ^4.x | TypeScript execution without compilation | Zero-config TS execution, fast startup, perfect for standalone scripts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @playwright/test | ^1.49.x | Test framework (optional) | If using webServer config - provides config scaffolding |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | Puppeteer | Playwright has better API, cross-browser support, but Puppeteer has native WebP |
| sharp | jimp, imagemagick | Sharp is significantly faster (4-5x), native performance via libvips |
| tsx | ts-node | tsx is faster, zero-config, but ts-node has more mature debugging support |

**Installation:**
```bash
npm install --save-dev playwright sharp tsx
npx playwright install chromium  # Install browser binaries
```

## Architecture Patterns

### Recommended Project Structure
```
gnomad-carrier-frequency/
├── scripts/
│   └── generate-screenshots.ts    # Standalone Playwright script
├── fixtures/
│   ├── gnomad/
│   │   ├── cftr-gene-search.json      # Gene search response fixture
│   │   └── cftr-variants.json          # Variants response fixture
│   └── pinia/
│       └── default-state.json          # Pinia persisted state fixture
├── docs/
│   └── public/
│       └── screenshots/                # Output directory (WebP files)
└── Makefile                            # `make screenshots` target
```

### Pattern 1: GraphQL Request Interception by Operation Name
**What:** Match GraphQL requests by `operationName` field since all queries go to same endpoint
**When to use:** Any SPA with GraphQL API (gnomAD, GitHub, Shopify, etc.)
**Example:**
```typescript
// Source: https://www.jayfreestone.com/writing/stubbing-graphql-playwright/
await page.route('**/api', async (route) => {
  const request = route.request();
  const postData = request.postDataJSON();

  // Match by operation name, not URL
  if (postData.operationName === 'GeneSearch') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: require('../fixtures/gnomad/cftr-gene-search.json')
      })
    });
  } else if (postData.operationName === 'GeneVariants') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: require('../fixtures/gnomad/cftr-variants.json')
      })
    });
  } else {
    // Let unhandled requests through or abort
    await route.continue();
  }
});
```

### Pattern 2: localStorage Injection for Pinia State
**What:** Set localStorage before first navigation to hydrate Pinia persisted state
**When to use:** Vue 3 apps with pinia-plugin-persistedstate
**Example:**
```typescript
// Source: https://www.browserstack.com/guide/playwright-local-storage
// Option 1: Via context storage state (before page creation)
const context = await browser.newContext({
  storageState: {
    cookies: [],
    origins: [{
      origin: 'http://localhost:5173',
      localStorage: [
        {
          name: 'templateStore',
          value: JSON.stringify({
            language: 'de',
            genderStyle: '*',
            enabledSections: ['gene', 'inheritance']
          })
        }
      ]
    }]
  }
});

// Option 2: Via page.evaluate() after navigation
await page.goto('http://localhost:5173');
await page.evaluate((state) => {
  localStorage.setItem('templateStore', JSON.stringify(state));
}, { language: 'de', genderStyle: '*' });
await page.reload(); // Reload to apply state
```

### Pattern 3: WebP Conversion Post-Processing
**What:** Capture PNG with Playwright, convert to WebP with sharp
**When to use:** Always - Playwright doesn't support WebP natively as of 2026
**Example:**
```typescript
// Source: https://github.com/microsoft/playwright/issues/22984 (WebP not supported)
import sharp from 'sharp';

// Step 1: Capture PNG
const pngBuffer = await page.screenshot({
  type: 'png',
  fullPage: false
});

// Step 2: Convert to WebP with sharp
await sharp(pngBuffer)
  .webp({ quality: 80 })  // 80 is good balance of quality/size
  .toFile('docs/public/screenshots/hero-preview.webp');
```

### Pattern 4: Wait for Animations/Transitions
**What:** Ensure animations complete before screenshot to avoid mid-transition captures
**When to use:** Vuetify apps (transitions on stepper, dialogs, cards), any animated UI
**Example:**
```typescript
// Source: https://dev.to/sergeyt/how-to-wait-animations-complete-in-playwright-script-50fb
// Combined approach: networkidle + element stability + explicit waits

// Wait for network idle (no requests for 500ms)
await page.waitForLoadState('networkidle');

// Wait for specific element to be stable (same position for 2 frames)
await page.locator('[data-testid="stepper"]').waitFor({ state: 'visible' });

// Wait for Vuetify animations using getAnimations API
await page.evaluate(async () => {
  const elements = document.querySelectorAll('.v-stepper, .v-card');
  const animations = Array.from(elements).flatMap(el =>
    el.getAnimations({ subtree: true })
  );
  await Promise.all(animations.map(anim => anim.finished));
});

// Additional fixed wait for safety (Vuetify transitions often 300ms)
await page.waitForTimeout(500);
```

### Pattern 5: Theme and Viewport Switching Mid-Script
**What:** Change colorScheme and viewport without browser restart
**When to use:** Capturing both light/dark modes, desktop/mobile views in one script
**Example:**
```typescript
// Source: https://playwright.dev/docs/emulation
// Light mode desktop screenshot
await page.emulateMedia({ colorScheme: 'light' });
await page.setViewportSize({ width: 1200, height: 800 });
await page.screenshot({ path: 'light-desktop.png' });

// Dark mode desktop screenshot (same page state)
await page.emulateMedia({ colorScheme: 'dark' });
await page.screenshot({ path: 'dark-desktop.png' });

// Mobile viewport screenshot
await page.emulateMedia({ colorScheme: 'light' });
await page.setViewportSize({ width: 375, height: 812 });
await page.screenshot({ path: 'mobile.png' });
```

### Pattern 6: Standalone Script with Dev Server Management
**What:** Script starts dev server, runs captures, stops server, all in one execution
**When to use:** Makefile target that should be self-contained (no manual server startup)
**Example:**
```typescript
// Source: https://playwright.dev/docs/test-webserver (config approach)
// Standalone script approach using child_process
import { spawn } from 'child_process';
import { chromium } from 'playwright';

async function main() {
  // Start dev server
  console.log('Starting dev server...');
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
  });

  // Wait for server ready (parse stdout for "Local: http://localhost:5173")
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Local:')) {
        resolve(null);
      }
    });
  });

  try {
    // Run screenshot captures
    const browser = await chromium.launch();
    const page = await browser.newPage();
    // ... screenshot logic ...
    await browser.close();

    console.log('Screenshots complete!');
  } finally {
    // Always kill server
    server.kill('SIGTERM');
  }
}

main().catch(err => {
  console.error('Screenshot generation failed:', err);
  process.exit(1);
});
```

### Anti-Patterns to Avoid
- **Using waitForLoadState('networkidle') as sole wait mechanism:** SPAs with analytics/polling may never reach networkidle, causing timeouts. Combine with element-based waits.
- **Capturing screenshots immediately after navigation:** Vuetify animations (steppers, cards) take 200-300ms. Always wait for animations.
- **Relying on fixed timeouts alone:** Brittle in CI. Use `waitFor()` on specific elements as primary strategy, timeouts as fallback.
- **Converting WebP in separate post-processing script:** Doubles I/O overhead. Convert inline in same script after PNG capture.
- **Using CSS selectors without data-testid:** Fragile to UI refactoring. Always add data-testid to key elements first.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PNG to WebP conversion | Custom ImageMagick wrapper | sharp library | 4-5x faster, native performance, handles formats/quality/metadata, battle-tested |
| TypeScript execution | Manual tsc + node pipeline | tsx (npx tsx script.ts) | Zero-config, instant startup, ESM support, watch mode built-in |
| GraphQL request matching | URL-based routing | Operation name matching via postDataJSON() | GraphQL uses single endpoint, operation name is canonical identifier |
| localStorage injection | Manual fetch + localStorage.setItem | context storageState or page.evaluate() | Playwright APIs handle origin/serialization correctly, avoid timing issues |
| Dev server lifecycle | Manual terminal + sleep | child_process spawn with stdout monitoring | Reliable detection of server ready state, clean shutdown, integrates with script |
| Animation detection | Fixed setTimeout() | getAnimations() + Promise.all(finished) | Detects actual animation state, adapts to variable duration, no over-waiting |
| Screenshot comparison | Pixel-by-pixel diff | Playwright's toHaveScreenshot() (for testing) | Handles anti-aliasing, sub-pixel rendering differences, platform variations |

**Key insight:** Playwright's API surface is comprehensive - almost every screenshot automation need has a built-in method. The main gap is WebP support (use sharp) and operation-name-based GraphQL mocking (use postDataJSON() pattern from community).

## Common Pitfalls

### Pitfall 1: Assuming WebP Support in Playwright
**What goes wrong:** Script fails with "unsupported mime type 'image/webp'" error when using `type: 'webp'`
**Why it happens:** Playwright only supports PNG and JPEG natively. WebP has been requested since 2023 but remains unimplemented as of 2026 (GitHub issues #22984, #13385)
**How to avoid:** Always capture as PNG, then convert with sharp:
```typescript
const png = await page.screenshot({ type: 'png' });
await sharp(png).webp({ quality: 80 }).toFile('output.webp');
```
**Warning signs:** Type parameter with 'webp', direct file extension .webp without conversion step

### Pitfall 2: networkidle Timeout on SPAs with Background Polling
**What goes wrong:** Script hangs indefinitely or times out waiting for networkidle state
**Why it happens:** Modern SPAs make continuous background requests (analytics, live updates, polling). Network never becomes idle for 500ms.
**How to avoid:** Combine networkidle with element-based waits, use shorter timeout:
```typescript
// Bad: await page.waitForLoadState('networkidle'); // May hang forever

// Good: Combined approach
await Promise.race([
  page.waitForLoadState('networkidle', { timeout: 5000 }),
  page.locator('[data-testid="results-table"]').waitFor()
]);
```
**Warning signs:** Timeout errors in CI, script works locally but fails in longer-running environments, SPA with real-time features

### Pitfall 3: Missing data-testid Attributes Before Screenshot Script Development
**What goes wrong:** Selectors like `.v-btn.primary >> nth=2` break when UI changes, causing all screenshots to fail
**Why it happens:** CSS selectors and positional selectors are fragile. Vuetify class names change between versions.
**How to avoid:** Add data-testid attributes to application code FIRST, before writing screenshot script:
```typescript
// Bad: await page.locator('.v-stepper__step:nth-child(1)').click();

// Good: await page.locator('[data-testid="step-1-gene-search"]').click();
```
**Warning signs:** Selectors with `>>`, `:nth-child()`, or Vuetify class names (`.v-*`)

### Pitfall 4: Dismissing Vue/Vuetify Dialogs as Browser Alerts
**What goes wrong:** `page.on('dialog', ...)` handler never triggers, clinical disclaimer stays visible
**Why it happens:** Vuetify dialogs (v-dialog) are DOM elements, not browser-native alerts. They need DOM interaction, not dialog API.
**How to avoid:** Use standard Playwright locators for Vue/Vuetify modals:
```typescript
// Bad (won't work for v-dialog):
// page.on('dialog', dialog => dialog.dismiss());

// Good (Vuetify v-dialog):
await page.locator('[data-testid="disclaimer-dialog"] button[data-testid="accept-button"]').click();
```
**Warning signs:** Using page.on('dialog'), dialog.accept(), dialog.dismiss() for Vue component modals

### Pitfall 5: Race Conditions Between localStorage Injection and Pinia Hydration
**What goes wrong:** Screenshots show default state instead of injected state (e.g., English text instead of German)
**Why it happens:** Pinia hydrates from localStorage on app mount. If localStorage is set after mount, state isn't applied.
**How to avoid:** Set localStorage BEFORE first navigation or reload after setting:
```typescript
// Bad: goto then set localStorage (too late)
// await page.goto('http://localhost:5173');
// await page.evaluate(() => localStorage.setItem(...));

// Good Option 1: storageState in context (before page creation)
const context = await browser.newContext({
  storageState: { origins: [{ origin: 'http://localhost:5173', localStorage: [...] }] }
});

// Good Option 2: evaluate then reload
await page.goto('http://localhost:5173');
await page.evaluate(() => localStorage.setItem(...));
await page.reload(); // Triggers Pinia re-hydration
```
**Warning signs:** State in screenshots doesn't match injected values, test passes locally but fails in CI

### Pitfall 6: Capturing Screenshots Before Vuetify Transitions Complete
**What goes wrong:** Screenshots show partially-rendered steppers, cards sliding in, or opacity fades mid-transition
**Why it happens:** Vuetify components use CSS transitions (200-300ms). Playwright's auto-wait doesn't detect CSS transitions.
**How to avoid:** Wait for animations explicitly using getAnimations() API + fixed timeout:
```typescript
await page.locator('[data-testid="stepper"]').waitFor();
await page.evaluate(() => {
  const elements = document.querySelectorAll('.v-stepper');
  const anims = Array.from(elements).flatMap(el => el.getAnimations({ subtree: true }));
  return Promise.all(anims.map(a => a.finished));
});
await page.waitForTimeout(500); // Buffer for any remaining transitions
```
**Warning signs:** Screenshots look "incomplete", elements partially visible, inconsistent captures between runs

## Code Examples

Verified patterns from official sources and community best practices:

### Minimal Screenshot Script Structure
```typescript
// Source: https://playwright.dev/docs/screenshots + tsx.is
// scripts/generate-screenshots.ts
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'fs';

async function capture(page: Page, name: string) {
  console.log(`Capturing ${name}...`);
  const png = await page.screenshot({
    type: 'png',
    fullPage: false,
    animations: 'disabled' // Disable animations during capture
  });

  await sharp(png)
    .webp({ quality: 80 })
    .toFile(`docs/public/screenshots/${name}.webp`);
}

async function main() {
  // Ensure output directory exists
  mkdirSync('docs/public/screenshots', { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    colorScheme: 'light'
  });

  // Mock GraphQL
  await page.route('**/api', async (route) => {
    const req = route.request().postDataJSON();
    if (req.operationName === 'GeneSearch') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: require('../fixtures/gnomad/cftr-gene-search.json')
        })
      });
    } else {
      await route.continue();
    }
  });

  // Navigate and capture
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await capture(page, 'hero-preview');

  await browser.close();
  console.log('✓ Screenshots generated');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
```

### Dismissing Vuetify Dialog
```typescript
// Source: https://playwright.dev/docs/dialogs + Vuetify docs
// For Vuetify v-dialog (DOM-based, not browser alert)
await page.goto('http://localhost:5173');

// Wait for dialog to appear
await page.locator('[data-testid="clinical-disclaimer-dialog"]').waitFor();

// Click accept button
await page.locator('[data-testid="accept-disclaimer-button"]').click();

// Wait for dialog to close (check for absence)
await page.locator('[data-testid="clinical-disclaimer-dialog"]').waitFor({
  state: 'hidden'
});
```

### Adding data-testid to Vue 3 + Vuetify Components
```vue
<!-- Source: https://vuejs.org/guide/scaling-up/testing + Vuetify docs -->
<!-- Before: Fragile selector .v-stepper .v-stepper__step:first-child -->
<template>
  <v-stepper data-testid="wizard-stepper">
    <v-stepper-header>
      <v-stepper-step
        data-testid="step-1-gene-search"
        :complete="currentStep > 1"
        :step="1"
      >
        Gene Search
      </v-stepper-step>

      <v-divider />

      <v-stepper-step
        data-testid="step-2-patient-status"
        :complete="currentStep > 2"
        :step="2"
      >
        Patient Status
      </v-stepper-step>
    </v-stepper-header>

    <!-- Key buttons -->
    <v-btn
      data-testid="next-step-button"
      color="primary"
      @click="nextStep"
    >
      Next
    </v-btn>
  </v-stepper>
</template>
```

### Makefile Target with Dev Server Lifecycle
```makefile
# Source: https://www.gnu.org/software/make/manual/ + project patterns
# Makefile
screenshots:
	@echo "Generating screenshots..."
	@npx tsx scripts/generate-screenshots.ts
	@echo "✓ Screenshots saved to docs/public/screenshots/"

# If script doesn't manage server internally, use shell backgrounding:
screenshots-with-server:
	@echo "Starting dev server..."
	@npm run dev > /dev/null 2>&1 & echo $$! > .dev-server.pid
	@sleep 3  # Wait for server startup
	@npx tsx scripts/generate-screenshots.ts
	@kill `cat .dev-server.pid` && rm .dev-server.pid
	@echo "✓ Screenshots complete, server stopped"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer for screenshots | Playwright | 2020-2021 | Better API, cross-browser, official Microsoft support |
| ImageMagick CLI for conversions | sharp (Node.js native) | 2018-2019 | 4-5x faster, programmatic API, better integration |
| ts-node for TS execution | tsx | 2023-2024 | Zero-config, faster startup, ESM native support |
| Manual sleep() for server ready | stdout parsing or webServer config | 2021-2022 | Reliable, no arbitrary timeouts, faster in CI |
| CSS selectors for test automation | data-testid attributes | 2019-2020 | Decouples tests from implementation, survives refactoring |
| waitForTimeout() everywhere | Element-based waits + getAnimations() | 2022-2023 | Faster, more reliable, adapts to actual state |

**Deprecated/outdated:**
- **Puppeteer**: Still maintained but Playwright has surpassed it in features and community adoption (2024 NPM trends show Playwright 2x downloads)
- **PhantomJS**: Discontinued 2018, replaced by headless Chrome/Firefox via Playwright/Puppeteer
- **CasperJS**: Unmaintained since 2017, don't use
- **Playwright's `toHaveScreenshot()` without animations: 'disabled'**: Default changed in v1.40 (2023) to disable animations during visual comparison to reduce flakiness

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Vuetify transition durations for v3.8.1**
   - What we know: Vuetify uses CSS transitions (typically 200-300ms), getAnimations() API can detect them
   - What's unclear: Exact duration for v-stepper, v-card, v-dialog transitions in current version
   - Recommendation: Use getAnimations() + 500ms buffer (safe for all transitions)

2. **Sharp WebP quality vs file size tradeoff for documentation screenshots**
   - What we know: sharp supports quality 0-100, WebP lossy images are 25-34% smaller than JPEG
   - What's unclear: Optimal quality setting for documentation (balancing file size vs visual quality)
   - Recommendation: Start with quality: 80 (good balance per sharp docs), adjust if screenshots look degraded

3. **Whether to commit fixtures to repo or generate dynamically**
   - What we know: Context decisions say "fixtures committed to repo" for easy refresh
   - What's unclear: How often gnomAD API response structure changes (affects fixture maintenance)
   - Recommendation: Commit fixtures, add comment with capture date, refresh quarterly or when API changes

## Sources

### Primary (HIGH confidence)
- Playwright Official Docs - Screenshots: https://playwright.dev/docs/screenshots
- Playwright Official Docs - Emulation: https://playwright.dev/docs/emulation
- Playwright Official Docs - API Testing: https://playwright.dev/docs/mock
- Playwright Official Docs - Page API: https://playwright.dev/docs/api/class-page
- Playwright Official Docs - Web Server: https://playwright.dev/docs/test-webserver
- tsx Official Docs - Getting Started: https://tsx.is/getting-started
- sharp Official Docs: https://sharp.pixelplumbing.com/
- Jay Freestone - Stubbing GraphQL using Playwright: https://www.jayfreestone.com/writing/stubbing-graphql-playwright/

### Secondary (MEDIUM confidence)
- BrowserStack Guide - Mock APIs with Playwright (2026): https://www.browserstack.com/guide/how-to-mock-api-with-playwright
- BrowserStack Guide - Playwright localStorage (2026): https://www.browserstack.com/guide/playwright-local-storage
- BrowserStack Guide - Playwright Best Practices (2026): https://www.browserstack.com/guide/playwright-best-practices
- BrowserStack Guide - waitForLoadState (2026): https://www.browserstack.com/guide/playwright-waitforloadstate
- DEV Community - How to wait for animations complete: https://dev.to/sergeyt/how-to-wait-animations-complete-in-playwright-script-50fb
- ScrapeOps - NodeJS Playwright Take Screenshots: https://scrapeops.io/playwright-web-scraping-playbook/nodejs-playwright-take-screenshots/

### Tertiary (LOW confidence - WebP support status)
- GitHub Issue #22984 - WebP support: https://github.com/microsoft/playwright/issues/22984 (OPEN as of 2026)
- GitHub Issue #13385 - WebP/AVIF support: https://github.com/microsoft/playwright/issues/13385 (OPEN)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are industry-standard with extensive documentation
- Architecture: HIGH - Patterns verified with official docs + community sources
- Pitfalls: MEDIUM-HIGH - Mix of documented issues (WebP, networkidle) and community experience (Vuetify dialogs)
- WebP support: HIGH - Definitively NOT supported, verified via official GitHub issues + API docs

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain)

**Critical finding:** Playwright does NOT support WebP screenshots natively. Any plans using `type: 'webp'` must be updated to use PNG + sharp conversion pipeline.
