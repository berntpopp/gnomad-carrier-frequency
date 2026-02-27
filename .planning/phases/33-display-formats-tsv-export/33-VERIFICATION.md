---
phase: 33-display-formats-tsv-export
verified: 2026-02-26T12:38:03Z
status: passed
score: 5/5 must-haves verified
---

# Phase 33: Display Formats and TSV Export Verification Report

**Phase Goal:** Users can view carrier frequencies in their preferred display format (scientific notation, per-100k, percentage, ratio) and export results as TSV files compatible with bioinformatics pipelines and Excel.
**Verified:** 2026-02-26T12:38:03Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Format selector lets user switch between %, 1:N, sci, /100k -- table, summary card, and range text all update | VERIFIED | StepResults.vue v-btn-toggle (lines 259-281). formatFrequency() in table cells (line 390), range text (lines 212-214), summaryPrimary computed at template line 107 |
| 2 | Scientific notation uses Unicode superscripts; per-100k shows X / 100,000; locale-aware separators | VERIFIED | SUPERSCRIPT_MAP in formatters.ts (lines 55-67). frequencyToScientific() uses Intl.NumberFormat.formatToParts(). frequencyToPerHundredK() uses toLocaleString(locale) |
| 3 | Default format persists across sessions; clinical text always uses dual format regardless of selector | VERIFIED | useFormatStore pick:[defaultFormat] (lines 42-46) - only defaultFormat to localStorage. TextOutput.vue has zero references to format system |
| 4 | Two TSV download options produce UTF-8 BOM-prefixed files with raw decimal values | VERIFIED | exportPopulationsTsv and exportVariantsTsv both prepend BOM. buildPopulationsTsv and buildVariantsTsv output raw decimals. Dropdown items in StepResults lines 320-333 |
| 5 | CLI TSV output includes source_category and quality_flags columns | VERIFIED | VARIANT_HEADER in tsv-formatter.ts line 37 contains hgvs_c, hgvs_p, source_category, quality_flags. VariantDetail in types.ts lines 12-15 has hgvsC, hgvsP, sourceCategory, qualityFlags |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/core/src/calculations/formatters.ts | frequencyToScientific, frequencyToPerHundredK, DisplayFormat type, SUPERSCRIPT_MAP | VERIFIED | 144 lines. All four present. SUPERSCRIPT_MAP uses explicit entries (not contiguous range). DisplayFormat exported at line 15. |
| packages/core/tests/formatters.test.ts | Test coverage for new formatters, null/zero edge cases, locale variants | VERIFIED | 119 lines, 18 tests across 4 describe blocks. Covers en-US, de-DE, null, zero, small frequencies, positive exponents. All pass. |
| apps/web/src/stores/useFormatStore.ts | Pinia store with defaultFormat persisted, currentFormat session-only, resetToDefault() | VERIFIED | 49 lines. Options-style Pinia store. pick:[defaultFormat] persists only preference. resetToDefault() sets currentFormat = defaultFormat. |
| apps/web/src/composables/useDisplayFormat.ts | Composable with formatFrequency() dispatcher, locale from templateStore.language | VERIFIED | 81 lines. Switch dispatch to all 4 formatters. Locale is de-DE or en-US from templateStore.language. |
| apps/web/src/composables/useWizard.ts | safeResetFormat() in resetWizard() and gene-change watcher | VERIFIED | safeResetFormat() guards with getActivePinia(). Called in resetWizard() (line 132) and gene-change watcher (line 45). |
| apps/web/src/components/wizard/StepResults.vue | v-btn-toggle, summaryPrimary, formatFrequency usage, TSV export menu items | VERIFIED | v-btn-toggle lines 259-281. summaryPrimary/summaryDetail computeds lines 785-797. formatFrequency() in table cells and range text. TSV dropdown items lines 320-333. |
| apps/web/src/components/SettingsDialog.vue | Default Frequency Format card with formatStore.defaultFormat binding | VERIFIED | useFormatStore imported (line 536), instantiated (line 563). v-model=formatStore.defaultFormat at line 254. All 4 format values present. |
| apps/web/src/utils/export-utils.ts | buildPopulationsTsv, buildVariantsTsv, escapeTsv | VERIFIED | escapeTsv lines 180-189. buildPopulationsTsv lines 195-212: 7-column TSV raw decimals. buildVariantsTsv lines 220-250: 10-column TSV with Phase 34 empty placeholder columns. |
| apps/web/src/composables/useExport.ts | exportPopulationsTsv, exportVariantsTsv, BOM prefix, UseExportReturn interface | VERIFIED | Both functions prepend BOM. UseExportReturn interface lines 26-32 includes both with correct signatures. Filename pattern: GENE_populations_DATE.tsv and GENE_variants_DATE.tsv. |
| packages/cli/src/output/tsv-formatter.ts | VARIANT_HEADER with new columns | VERIFIED | Line 37: VARIANT_HEADER has carrier_frequency, hgvs_c, hgvs_p, source_category, quality_flags. Row generation lines 149-163 outputs all columns. |
| packages/cli/src/types.ts | VariantDetail with hgvsC, hgvsP fields | VERIFIED | Lines 12-15: optional hgvsC, hgvsP, sourceCategory, qualityFlags with correct camelCase (capital C/P). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| useDisplayFormat.ts | formatters.ts | import frequencyToScientific, frequencyToPerHundredK | WIRED | Lines 7-11 import all four formatters from @gnomad-cf/core/calculations |
| useDisplayFormat.ts | useFormatStore.ts | useFormatStore() call | WIRED | Line 23: formatStore = useFormatStore(). Dispatch reads formatStore.currentFormat |
| useWizard.ts | useFormatStore.ts | safeResetFormat() in resetWizard() and gene watcher | WIRED | Calls useFormatStore().resetToDefault() at lines 19 and 45 |
| StepResults.vue | useDisplayFormat.ts | useDisplayFormat() composable | WIRED | Line 578: destructures currentFormat, setFormat, formatFrequency, formatRatio |
| StepResults.vue | useExport.ts | exportPopulationsTsv, exportVariantsTsv calls | WIRED | Line 575: destructures both from useExport(). Both in handleExport() switch (lines 647-651) |
| SettingsDialog.vue | useFormatStore.ts | formatStore.defaultFormat v-model | WIRED | Import line 536, instantiation line 563, v-model at line 254 in template |
| useExport.ts | export-utils.ts | buildPopulationsTsv, buildVariantsTsv imports | WIRED | Lines 8-10 import both builder functions |
| calculations/index.ts | formatters.ts | export * from formatters.js | WIRED | Line 2 re-exports everything - DisplayFormat and all formatters accessible from @gnomad-cf/core/calculations |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| FMT-01: Format selector (%, 1:N, sci, /100k) | SATISFIED | v-btn-toggle in population table toolbar; all 4 options present |
| FMT-02: Scientific notation with Unicode superscripts; per-100k X / 100,000; locale-aware | SATISFIED | SUPERSCRIPT_MAP with explicit entries; toLocaleString(locale) for both numerator and denominator |
| FMT-03: Default format persists to localStorage | SATISFIED | pick:[defaultFormat]; currentFormat is session-only, not persisted |
| FMT-04: Summary card, population table, range text all update with format | SATISFIED | summaryPrimary computed, table cells, range text all call formatFrequency() |
| FMT-05: Clinical text unaffected by format selector | SATISFIED | TextOutput.vue has zero references to format system |
| FMT-06: Default format configurable in Settings dialog | SATISFIED | Default Frequency Format card in General tab with v-model on formatStore.defaultFormat |
| EXP-01: Populations TSV with UTF-8 BOM | SATISFIED | BOM prepended in exportPopulationsTsv; 7 columns with raw decimals |
| EXP-02: Variants TSV with UTF-8 BOM | SATISFIED | BOM prepended in exportVariantsTsv; 10 columns including Phase 34 placeholders |
| EXP-03: CLI TSV variant columns include hgvs_c, hgvs_p, source_category, quality_flags | SATISFIED | VARIANT_HEADER contains all four new columns; row generation outputs them |
| EXP-04: Two TSV download options in export dropdown | SATISFIED | Populations TSV and Variants TSV items in v-list inside export v-menu |

### Anti-Patterns Found

No blocker anti-patterns detected. The Phase 34 placeholder columns in TSV exports (empty strings for Stars, Source Category, Quality Flags) are intentional, documented with inline comments, and part of the schema stability design - not stubs.

### Human Verification Required

Three items require human testing that cannot be verified statically:

#### 1. Format Selector Live Switching

**Test:** Run bun run dev, search a gene (e.g. CFTR), reach Step 4 (Results). Click each format button (%, 1:N, sci, /100k) in the population table toolbar.
**Expected:** Summary card hero stat, all carrier frequency cells, and range text instantly update. Scientific notation shows Unicode multiplication sign and superscript digits. Per-100k shows locale-appropriate separators.
**Why human:** Reactive updates and rendered Unicode characters require browser execution.

#### 2. TSV File Downloads and Excel Compatibility

**Test:** In the Results step, open the Export dropdown and click Populations TSV, then Variants TSV. Open each file in Excel on Windows and in a plain text editor.
**Expected:** Files open in Excel without an encoding prompt (BOM detected). German characters display correctly. First 3 bytes are EF BB BF. Columns are tab-separated, first row is header.
**Why human:** Blob download behavior and Excel encoding detection require browser execution.

#### 3. Default Format Persistence Across Reload

**Test:** In Settings > General > Default Frequency Format, select sci. Close settings. Reload the page. Start a new analysis and reach the Results step.
**Expected:** Format selector shows sci as the active format. Changing gene during the session resets to sci (the persisted default), not percent (the hardcoded initial).
**Why human:** localStorage persistence and session reset behavior require browser execution.

## Test Results

All 444 automated tests pass (29 test files):

```
Test Files  29 passed (29)
      Tests 444 passed (444)
   Duration  11.15s
```

Key formatter tests in packages/core/tests/formatters.test.ts: 18 tests covering frequencyToScientific (en-US, de-DE, null, zero, small freq, positive exponent) and frequencyToPerHundredK (en-US, de-DE, null, zero, small freq, default locale).

---

*Verified: 2026-02-26T12:38:03Z*
*Verifier: Claude (gsd-verifier)*
