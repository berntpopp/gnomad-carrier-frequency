# Project Milestones: gnomAD Carrier Frequency Calculator

## v1.2 Sharing & Collaboration (Shipped: 2026-01-20)

**Delivered:** Shareable calculation URLs, offline-capable PWA, manual variant exclusion, mobile-optimized UI, and search history with auto-save.

**Phases completed:** 11-15 (15 plans total)

**Key accomplishments:**

- Shareable URLs with Zod-validated state encoding (gene, step, filters, exclusions)
- Progressive Web App with offline support (Workbox caching, installable, service worker)
- Manual variant exclusion with real-time frequency recalculation
- Mobile-optimized UI (fullscreen dialogs, responsive tables, touch-friendly 44px targets)
- Search history with auto-save, restore, and configurable settings
- Cross-phase integration (exclusions sync to URLs and history entries)

**Stats:**

- 53 files created/modified (code only, +11k/-3k lines)
- 12,956 lines total TypeScript/Vue
- 5 phases, 15 plans
- 2 days from v1.1 to ship

**Git range:** `feat(11-01)` → `feat(15-03)`

**What's next:** v1.3 features (X-linked inheritance, batch processing, PDF export)

---

## v1.1 Release-Ready (Shipped: 2026-01-19)

**Delivered:** Professional app shell, configurable filtering, ClinGen validation, data export, template editing, browser logging, and full accessibility compliance.

**Phases completed:** 5-10 (27 plans total)

**Key accomplishments:**

- Settings store with dark/light/system theme toggle and persistence
- App shell with branded logo, favicon, navigation, and version display
- WCAG 2.1 AA accessibility with Lighthouse 95+ scores
- Configurable variant filters (LoF, missense, ClinVar, star threshold)
- ClinGen gene-disease validity integration with cached lookups
- Data export (JSON/Excel), template editor, and browser logging panel

**Stats:**

- 85+ files created/modified
- 9,500+ lines TypeScript/Vue (from 3,285)
- 6 phases, 27 plans
- Same day (rapid development from v1.0)

**Git range:** `feat(05-01)` → `feat(10-08)`

**What's next:** v1.2 Sharing & Collaboration (URL state, PWA, variant exclusion)

---

## v1.0 MVP (Shipped: 2026-01-19)

**Delivered:** Carrier frequency calculator with gnomAD API integration, 4-step wizard UI, German clinical text generation, and GitHub Pages deployment.

**Phases completed:** 1-4 (15 plans total)

**Key accomplishments:**

- gnomAD API integration with multi-version support (v4, v3, v2)
- Carrier frequency calculation using Hardy-Weinberg formula (2 × sum AF)
- 4-step wizard UI with Vuetify stepper and sortable data tables
- German clinical text generation with 3 perspectives, 4 statuses, patient sex grammar
- CI/CD pipeline with ESLint, TypeScript, and automated GitHub Pages deployment
- Validated calculations for CFTR (NFE ~1:15) and HEXA (ASJ ~1:26 with founder effect)

**Stats:**

- 3,285 lines of TypeScript/Vue code
- 4 phases, 15 plans
- ~12 hours from start to ship
- Deployed at https://berntpopp.github.io/gnomad-carrier-frequency/

**Git range:** `58fbdec` → `00cb3e3`

**What's next:** v1.1 features (X-linked inheritance, batch processing, PDF export)

---
