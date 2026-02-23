# Phase 20: README Streamlining - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Slim the current README (~160 lines, 13 sections) to essentials and direct users to the live documentation site for detailed information. No new features or capabilities — this is content reorganization only.

</domain>

<decisions>
## Implementation Decisions

### Content retention
- **Keep inline:** Title, badges, one-line description, hero screenshot, quick start, features (as short bullet list), disclaimer ("For Research Use Only"), license, citation
- **Defer to docs (with link):** Contributing (link to docs contributing page), Acknowledgments, Usage (7-step walkthrough), Data Sources, Methodology, Technology Stack, Development commands, Project Structure
- Features section stays as a concise bullet list (sells the project to visitors)
- Disclaimer stays inline — important legal/safety info must be immediately visible

### Badge & header design
- Keep all existing tech badges (Vue, TypeScript, Vite, Vuetify, License)
- Add a documentation badge linking to the live docs site
- No deploy status badge
- Update Live Demo URL from `berntpopp.github.io` to custom domain `https://gnomad-carrier-frequency.kidney-genetics.org/`
- Shorten the one-line description (current is too long) — something like "Calculate carrier frequencies for autosomal recessive conditions using gnomAD population data"

### Hero screenshot
- Use `hero-preview.webp` as the hero image
- Reference from existing path: `docs/public/screenshots/hero-preview.webp` (relative path, works on GitHub)
- Make the screenshot clickable — links to the live app at `https://gnomad-carrier-frequency.kidney-genetics.org/`

### Quick start format
- 3 steps: Clone / Install / Run
- Show dual bun/npm commands (bun primary, npm as comment alternatives)
- Include a one-line prerequisites mention ("Requires Node.js 18+ or Bun") above the code block
- No build or preview commands — keep it to getting the dev server running

### License & Citation
- One-liner for license: MIT License with link to LICENSE file
- One-liner for citation: link to docs citation page for full details
- No inline BibTeX or CITATION.cff content in README

### Claude's Discretion
- Exact wording of the shortened description
- Feature bullet ordering and wording
- Docs badge style and color
- Exact structure/ordering of the slim README sections
- Whether to keep the Author section or fold it into a simpler footer

</decisions>

<specifics>
## Specific Ideas

- Docs site URL: `https://gnomad-carrier-frequency.kidney-genetics.org/docs/`
- App URL: `https://gnomad-carrier-frequency.kidney-genetics.org/`
- The README should feel like a landing page — hero screenshot draws the eye, quick start gets people running, docs link captures everyone who wants more

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-readme-streamlining*
*Context gathered: 2026-02-23*
