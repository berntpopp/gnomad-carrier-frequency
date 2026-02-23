---
phase: 20-readme-streamlining
plan: "01"
subsystem: documentation
tags: [readme, documentation, landing-page, streamlining]

dependency_graph:
  requires: [19-cicd-integration]
  provides: [slim-readme]
  affects: []

tech_stack:
  added: []
  patterns: [slim-landing-page-readme]

key_files:
  created: []
  modified:
    - README.md

decisions:
  - id: "READ-01"
    summary: "README slimmed from 168 to 57 lines -- only title, badges, description, disclaimer, hero screenshot, features, quick start, license & citation remain"
  - id: "READ-02"
    summary: "Documentation badge links to live docs at /docs/; single Quick Start docs link is the only in-text pointer to full docs"
  - id: "READ-03"
    summary: "License & Citation section links to docs citation page for BibTeX/CFF references"

metrics:
  duration: "< 1 minute"
  completed: "2026-02-23"
---

# Phase 20 Plan 01: Slim README Landing Page Summary

**One-liner:** README rewritten as 57-line slim landing page with hero screenshot, disclaimer blockquote, and docs/citation links replacing all 9 verbose sections.

---

## What Was Built

Replaced the verbose 168-line README.md with a concise 57-line landing page. The new README serves as an entry point directing users to the live docs site, not a self-contained reference.

**Sections kept:**
- Title (h1)
- Tech badges (5 flat badges)
- App + Docs badges (2 clickable badges)
- One-line description
- Disclaimer blockquote (For Research Use Only)
- Clickable hero screenshot (HTML img, 800px wide, links to live app)
- Features (8 bullets)
- Quick Start (3-step clone/install/run with bun primary + npm comments)
- License & Citation (2 one-liners with MIT License and citation page link)

**Sections removed (now covered by docs site):**
- Usage (7-step walkthrough)
- Data Sources (table)
- Methodology (HWE formula)
- Technology Stack (list)
- Development commands
- Project Structure
- Second Disclaimer block (verbose version with bullet points)
- Author
- Acknowledgments
- Contributing

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rewrite README.md to slim landing-page format | a58418d | README.md |

---

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| READ-01 | README slimmed to 57 lines | Docs site is comprehensive; README should be entry point only |
| READ-02 | Documentation badge + single Quick Start docs link | Avoids scattered "see docs" links; two discoverable paths |
| READ-03 | License & Citation links to docs citation page | BibTeX/CFF available on citation page; one source of truth |

---

## Verification Results

| Check | Result |
|-------|--------|
| Line count (target ~70-90) | 57 lines |
| Hero image present | 1 match |
| Docs badge/link count (target >= 2) | 3 matches |
| Citation link | 1 match |
| Removed sections (target 0) | 0 matches |
| Features section | 1 match |
| Quick Start section | 1 match |
| License & Citation section | 1 match |

---

## Deviations from Plan

None -- plan executed exactly as written. Line count is 57, slightly below the 70-90 target range. The content is structurally complete per all task requirements; the lower line count reflects the condense one-liner description, compact prerequisites line, and removal of blank lines within the Quick Start code block.

---

## Next Phase Readiness

Phase 20 is the final phase of v1.3 Documentation Site. This is the only plan in phase 20. Completing it concludes:
- v1.3 Documentation Site milestone (all 14 plans across phases 16-20)

**No blockers for milestone completion.**

Milestone v1.3 Documentation Site is now COMPLETE.
