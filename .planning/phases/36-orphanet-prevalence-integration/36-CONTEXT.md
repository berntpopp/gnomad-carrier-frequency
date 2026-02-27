# Phase 36: Orphanet Prevalence Integration - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Display published Orphanet disease prevalence data alongside calculated carrier frequency in the results step, providing a clinical reference point. The Orphanet client lives in @gnomad-cf/core (platform-neutral) so both web and CLI can use it. Graceful degradation when the Orphanet API is unavailable. This phase does NOT add new calculation logic or modify existing carrier frequency math.

</domain>

<decisions>
## Implementation Decisions

### Reference card presentation
- Orphanet data embedded inside the existing summary card (not a separate card)
- New section at the bottom of the summary card, below the hero stats and range text
- Compact inline format: disease name + prevalence range on one line (e.g., "Cystic fibrosis — 1:2,000–1:3,500 (Europe)")
- Skeleton placeholder visible while loading — user knows data is coming
- Disease name is a direct link to the Orphanet disease page (opens in new tab), no tooltip/popover

### Multi-disease handling
- Primary disease shown by default, with a "+N more" chip that expands to show the rest
- Primary selection: prefer diseases matching autosomal recessive inheritance IF the Orphanet API provides inheritance data natively (no string parsing); among matches, sort by highest prevalence
- If Orphanet returns zero diseases for a gene: hide the section entirely (no empty state message)
- Orphanet data is visual reference only — summary card only, not included in clinical text output

### Disclaimer & interpretation guidance
- Inline subtle note below the Orphanet line (small text, not a warning chip)
- English only — not bilingual, since Orphanet data is scientific reference
- Just state the difference: "Orphanet reports clinical prevalence (diagnosed cases), not genetic carrier prevalence." No explanation of why they differ.
- Label the value as "Orphanet Prevalence" to clearly distinguish from the existing "Genetic Prevalence" calculated stat

### Offline & error behavior
- Eager fetch: start Orphanet lookup on gene selection, before user reaches results step
- 5-second timeout — don't block the user experience for reference data
- On API failure/timeout: hide the section entirely (remove skeleton, as if Orphanet data doesn't exist)
- Both web and CLI get Orphanet data — core client in @gnomad-cf/core, wired into both platforms
- Session-level caching: same gene is not fetched twice per session

### Claude's Discretion
- Exact skeleton placeholder design (width, animation style)
- Transition animation when section appears or hides
- How the "+N more" expand/collapse animates
- Orphanet API endpoint selection and response parsing
- CLI output format for Orphanet data (table row, separate section, etc.)

</decisions>

<specifics>
## Specific Ideas

- User's initial instinct was "in the top gene card left somehow" — confirmed as inside the summary card
- Compact inline format prioritized over structured rows — genetic counselors want scannable data, not verbose cards
- The existing summary card has a responsive grid (cols="12" sm="4") for hero stats; Orphanet section goes below that grid as a new row

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-orphanet-prevalence-integration*
*Context gathered: 2026-02-27*
