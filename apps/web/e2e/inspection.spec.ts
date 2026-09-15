/**
 * Comprehensive UI/UX Audit & Inspection Spec
 *
 * Implements Step 1 of the Clinical Design Mandate:
 * 1. Viewport & Responsive Stress Test across 6 explicit breakpoints
 * 2. Layout Shift (CLS) & Flicker Probe across loads, steps, dialogs, theme toggle
 * 3. Component & Modal Sweep across all views, steps, modals, and drawers
 */

import { test, expect, type Page, type Route } from '@playwright/test'
import {
  GENE_SEARCH_RESPONSE,
  GENE_DETAILS_RESPONSE,
  GENE_VARIANTS_RESPONSE,
} from './fixtures/gnomad-responses'

const BREAKPOINTS = [
  { name: 'Mobile Compact', width: 320, height: 568 },
  { name: 'Mobile Standard', width: 375, height: 812 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Laptop / Desktop', width: 1280, height: 800 },
  { name: 'Full HD', width: 1920, height: 1080 },
  { name: 'Ultra-wide', width: 2560, height: 1440 },
]

async function interceptAllApis(page: Page): Promise<void> {
  await page.route('https://gnomad.broadinstitute.org/api', async (route: Route) => {
    const postData = route.request().postDataJSON() as { operationName?: string } | null
    switch (postData?.operationName) {
      case 'GeneSearch':
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GENE_SEARCH_RESPONSE) })
        break
      case 'GeneDetails':
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GENE_DETAILS_RESPONSE) })
        break
      case 'GeneVariants':
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GENE_VARIANTS_RESPONSE) })
        break
      default:
        await route.continue()
    }
  })

  await page.route('**/clingen-gene-validity.csv**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: [
        '"CLINGEN GENE DISEASE VALIDITY CURATIONS"',
        '"GENE SYMBOL","GENE ID (HGNC)","DISEASE LABEL","DISEASE ID (MONDO)","MOI","SOP","CLASSIFICATION","ONLINE REPORT","CLASSIFICATION DATE","GCEP"',
        '"CFTR","HGNC:1884","Cystic fibrosis","MONDO:0009061","AR","SOP8","Definitive","https://example.com","2023-01-01","CF GCEP"',
      ].join('\n'),
    })
  })

  await page.route('**/search.clinicalgenome.org/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
  })
}

async function dismissDisclaimer(page: Page): Promise<void> {
  const disclaimer = page.getByTestId('disclaimer-dialog')
  const isVisible = await disclaimer.isVisible().catch(() => false)
  if (isVisible) {
    await page.getByTestId('disclaimer-accept-btn').click()
    await expect(disclaimer).not.toBeVisible({ timeout: 5_000 })
  }
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean
  value: number
}

async function installClsTracker(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const win = window as unknown as Window & { __cumulativeLayoutShift?: number }
    win.__cumulativeLayoutShift = 0
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as unknown as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) {
            win.__cumulativeLayoutShift = (win.__cumulativeLayoutShift ?? 0) + entry.value
          }
        }
      })
      observer.observe({ type: 'layout-shift', buffered: true })
    } catch {
      // Ignore if not supported
    }
  })
}

async function getCls(page: Page): Promise<number> {
  return await page.evaluate(
    () => (window as unknown as { __cumulativeLayoutShift?: number }).__cumulativeLayoutShift ?? 0
  )
}

test.describe('Audit: Responsive Stress Test & Horizontal Overflow', () => {
  for (const bp of BREAKPOINTS) {
    test(`Viewport ${bp.name} (${bp.width}x${bp.height}) - checks overflow and touch targets`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await interceptAllApis(page)
      await page.goto('/')
      await dismissDisclaimer(page)

      // Check overflow on Step 1
      const overflowStep1 = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        }
      })
      console.log(`[${bp.name}] Step 1 overflow:`, overflowStep1)
      expect(overflowStep1.hasOverflow).toBe(false)

      // Navigate to CFTR
      const geneInput = page.getByTestId('gene-search-input').locator('input')
      await geneInput.fill('CFTR')
      await page.locator('.v-autocomplete__menu, .v-overlay-container').getByText('CFTR').first().click()
      await page.getByTestId('step-gene-next-btn').click()

      // Step 2
      await expect(page.getByTestId('step-status')).toBeVisible()
      const overflowStep2 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(overflowStep2).toBe(false)
      await page.getByTestId('step-status-next-btn').click()

      // Step 3
      await expect(page.getByTestId('step-frequency')).toBeVisible()
      const overflowStep3 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(overflowStep3).toBe(false)
      await page.getByTestId('step-frequency-next-btn').click()

      // Step 4
      await expect(page.getByTestId('step-results')).toBeVisible()
      const overflowStep4 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      console.log(`[${bp.name}] Step 4 overflow:`, overflowStep4)
      expect(overflowStep4).toBe(false)

      // Check touch targets on interactive controls
      if (bp.width <= 768) {
        const smallTargets = await page.evaluate(() => {
          const elements = Array.from(
            document.querySelectorAll('button:not([disabled]):not([aria-hidden="true"]), a:not([aria-hidden="true"]), input, select')
          )
          const issues: { tag: string; id: string; cls: string; w: number; h: number; text: string }[] = []
          for (const el of elements) {
            const rect = el.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40)) {
              issues.push({
                tag: el.tagName,
                id: el.id,
                cls: el.className.slice(0, 50),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                text: (el.textContent || '').trim().slice(0, 30),
              })
            }
          }
          return issues
        })
        console.log(`[${bp.name}] Small touch targets (<40px):`, smallTargets.length, smallTargets.slice(0, 5))
      }
    })
  }
})

test.describe('Audit: Layout Shift (CLS) & Flicker Probe', () => {
  test('measures CLS through full flow, dialogs, and theme toggle', async ({ page }) => {
    await installClsTracker(page)
    await interceptAllApis(page)
    await page.goto('/')

    const initialCls = await getCls(page)
    console.log('[CLS] Initial Load & Hydration:', initialCls)

    await dismissDisclaimer(page)
    const afterDisclaimerCls = await getCls(page)
    console.log('[CLS] After Disclaimer Dismissal:', afterDisclaimerCls)

    // Step 1 -> 2
    const geneInput = page.getByTestId('gene-search-input').locator('input')
    await geneInput.fill('CFTR')
    await page.locator('.v-autocomplete__menu, .v-overlay-container').getByText('CFTR').first().click()
    await page.getByTestId('step-gene-next-btn').click()
    const step2Cls = await getCls(page)
    console.log('[CLS] Step 2 transition:', step2Cls)

    // Step 2 -> 3
    await page.getByTestId('step-status-next-btn').click()
    const step3Cls = await getCls(page)
    console.log('[CLS] Step 3 transition:', step3Cls)

    // Step 3 -> 4
    await page.getByTestId('step-frequency-next-btn').click()
    await expect(page.getByTestId('step-results')).toBeVisible()
    const step4Cls = await getCls(page)
    console.log('[CLS] Step 4 transition & Table render:', step4Cls)

    // Theme toggle
    const themeBtn = page.getByRole('button', { name: 'Toggle theme' })
    await themeBtn.click()
    await page.waitForTimeout(300)
    await themeBtn.click()
    await page.waitForTimeout(300)
    const themeCls = await getCls(page)
    console.log('[CLS] After Theme Toggle:', themeCls)

    // Dialog openings
    const settingsBtn = page.getByTestId('footer-settings-btn')
    await settingsBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const settingsCls = await getCls(page)
    console.log('[CLS] After Settings Dialog:', settingsCls)

    expect(settingsCls).toBeLessThan(0.05)
  })
})

test.describe('Audit: Component & Modal Sweep', () => {
  test('verifies all modals, drawers, and tabs open cleanly', async ({ page }) => {
    await interceptAllApis(page)
    await page.goto('/')

    // Disclaimer Dialog test
    const disclaimer = page.getByTestId('disclaimer-dialog')
    await expect(disclaimer).toBeVisible()
    await dismissDisclaimer(page)

    // Footer re-trigger of Disclaimer
    await page.getByRole('button', { name: 'View clinical disclaimer' }).click()
    await expect(disclaimer).toBeVisible()
    await page.getByTestId('disclaimer-accept-btn').click()
    await expect(disclaimer).not.toBeVisible()

    // History Drawer
    await page.getByTestId('footer-history-btn').click()
    const historyDrawer = page.getByTestId('history-drawer')
    await expect(historyDrawer).toBeVisible()
    await page.locator('.history-panel button[aria-label="Close history panel"]').click()
    await expect(page.locator('.v-navigation-drawer--active[data-testid="history-drawer"]')).toHaveCount(0)

    // Settings Dialog: All 4 tabs
    await page.getByTestId('footer-settings-btn').click()
    const settingsDialog = page.getByRole('dialog')
    await expect(settingsDialog).toBeVisible()
    // Tabs: General, Filters, Quality, Templates
    const tabs = ['General', 'Filters', 'Quality', 'Templates']
    for (const tabName of tabs) {
      const tab = page.getByRole('tab', { name: tabName })
      if (await tab.isVisible()) {
        await tab.click()
        await page.waitForTimeout(100)
      }
    }
    // Close settings dialog via close button
    const closeBtn = settingsDialog.getByRole('button', { name: /close/i }).first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await expect(settingsDialog).not.toBeVisible()

    // Navigate to Step 4 for results modal sweep
    const geneInput = page.getByTestId('gene-search-input').locator('input')
    await geneInput.click()
    await geneInput.fill('CFTR')
    await page.getByRole('option', { name: /^CFTR\b/ }).first().click()
    await page.getByTestId('step-gene-next-btn').click()
    await page.getByTestId('step-status-next-btn').click()
    await page.getByTestId('step-frequency-next-btn').click()
    await expect(page.getByTestId('step-results')).toBeVisible()

    // Population Table & Chart Switch
    await page.getByTestId('chart-tab').click()
    await expect(page.locator('svg')).toBeVisible()
    await page.getByTestId('table-tab').click()

    // Export menu button
    const exportBtn = page.getByRole('button', { name: /export/i }).first()
    if (await exportBtn.isVisible()) {
      await exportBtn.click()
      await page.keyboard.press('Escape')
    }
  })
})
