# Phase 20: README Streamlining - Research

**Researched:** 2026-02-23
**Domain:** Markdown content reorganization, GitHub README conventions
**Confidence:** HIGH

## Summary

This phase is pure Markdown editing with no new library dependencies. The current README is 167 lines across 12 top-level sections. The target is a slim landing-page README that keeps 7 sections (title + badges, description, disclaimer, hero screenshot, features, quick start, license + citation) and removes or replaces with links 5 sections (Usage, Data Sources, Methodology, Technology Stack, Development/Project Structure, Author, Acknowledgments, Contributing).

The documentation site already exists and is fully deployed at `https://gnomad-carrier-frequency.kidney-genetics.org/docs/`. Both the Documentation badge and Live App badge already exist in the current README with correct URLs. No new infrastructure is needed -- this is a targeted rewrite of `README.md` only.

The current README already partially implements the desired state: it has the Documentation badge, the custom domain URLs, and a reasonable Quick Start section. The main work is removing the 5 deferred sections and converting them to single-line "see docs" references where appropriate.

**Primary recommendation:** Rewrite `README.md` in a single edit, targeting approximately 80-90 lines. No new files needed, no config changes needed.

## Standard Stack

This phase has no library dependencies. It is a Markdown file edit only.

### Core
| Tool | Purpose | Notes |
|------|---------|-------|
| Markdown (GitHub Flavored) | README format | GitHub renders GFM directly |
| shields.io badges | Status badges | Already in use, no changes needed |

### No Installation Required

No packages to install. No build tooling changes needed.

## Architecture Patterns

### Final README Structure (Ordered by Decision)

The slim README should follow this section order, producing approximately 80-90 lines total:

```
1. Title (h1)
2. Tech badges (Vue, TypeScript, Vite, Vuetify, License)  -- flat row
3. App + Docs badges (Live App, Documentation)            -- second row
4. One-line description
5. Disclaimer blockquote (For Research Use Only)
6. Hero screenshot (clickable, links to live app)
7. ## Features  (bullet list, ~8 bullets)
8. ## Quick Start  (prerequisites line + 3-step code block)
9. ## License & Citation  (two one-liners with links)
```

Sections **not** present in final README (removed or linked):
- Usage (7-step walkthrough) -- removed, docs URL: `https://gnomad-carrier-frequency.kidney-genetics.org/docs/guide/`
- Data Sources -- removed, docs URL: `https://gnomad-carrier-frequency.kidney-genetics.org/docs/reference/data-sources`
- Methodology -- removed, docs URL: `https://gnomad-carrier-frequency.kidney-genetics.org/docs/reference/methodology`
- Technology Stack -- removed entirely
- Development commands -- removed entirely
- Project Structure -- removed entirely
- Author -- decision: fold into footer line or omit
- Acknowledgments -- removed entirely
- Contributing -- link to docs: `https://gnomad-carrier-frequency.kidney-genetics.org/docs/about/contributing`

### Pattern: Clickable Hero Image

GitHub Flavored Markdown supports wrapping an image in a link using this syntax:

```markdown
[![App screenshot](docs/public/screenshots/hero-preview.webp)](https://gnomad-carrier-frequency.kidney-genetics.org/)
```

The relative path `docs/public/screenshots/hero-preview.webp` resolves correctly from the repo root on GitHub. The file exists and is 26 KB (confirmed at `docs/public/screenshots/hero-preview.webp`).

To control display width on GitHub, use HTML:

```html
<a href="https://gnomad-carrier-frequency.kidney-genetics.org/">
  <img src="docs/public/screenshots/hero-preview.webp" alt="gnomAD Carrier Frequency Calculator screenshot" width="800">
</a>
```

Both approaches work on GitHub. The HTML approach allows width control. The Markdown approach is cleaner. Recommendation: use HTML form for width control since this is meant as a landing page hero.

### Pattern: Dual bun/npm Commands

Per the decision: bun primary, npm as inline comment alternatives.

```bash
# Clone the repository
git clone https://github.com/berntpopp/gnomad-carrier-frequency.git
cd gnomad-carrier-frequency

# Install dependencies
bun install          # or: npm install

# Start development server
bun run dev          # or: npm run dev
```

This is cleaner than the current README which uses two separate blocks. The app URL in the "available at" note should use the custom domain or omit the base path detail.

### Pattern: Existing Badges (Keep As-Is)

The current README already has all required badges in the correct format:

```markdown
![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?logo=vuedotjs&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)
![Vuetify](https://img.shields.io/badge/Vuetify-1867C0?logo=vuetify&logoColor=fff)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

[![Live App](https://img.shields.io/badge/Live_App-gnomad--carrier--frequency-blue?logo=googlechrome&logoColor=white)](https://gnomad-carrier-frequency.kidney-genetics.org/)
[![Documentation](https://img.shields.io/badge/Docs-VitePress-747bff?logo=vitepress&logoColor=white)](https://gnomad-carrier-frequency.kidney-genetics.org/docs/)
```

No changes needed to badge URLs or styles. The Documentation badge already exists with the correct VitePress branding and color `747bff`.

### Pattern: License & Citation Section

```markdown
## License & Citation

This project is licensed under the [MIT License](LICENSE).
To cite this tool, see the [Citation page](https://gnomad-carrier-frequency.kidney-genetics.org/docs/about/citation).
```

Or as a single combined block:

```markdown
## License & Citation

[MIT License](LICENSE) | [Cite this tool](https://gnomad-carrier-frequency.kidney-genetics.org/docs/about/citation)
```

### Confirmed Docs URLs

These URLs are confirmed from the VitePress config (`docs/.vitepress/config.ts`, `base: '/docs/'`):

| Page | Full URL |
|------|---------|
| Docs home | `https://gnomad-carrier-frequency.kidney-genetics.org/docs/` |
| Guide | `https://gnomad-carrier-frequency.kidney-genetics.org/docs/guide/` |
| Citation | `https://gnomad-carrier-frequency.kidney-genetics.org/docs/about/citation` |
| Contributing | `https://gnomad-carrier-frequency.kidney-genetics.org/docs/about/contributing` |
| Methodology | `https://gnomad-carrier-frequency.kidney-genetics.org/docs/reference/methodology` |
| Data Sources | `https://gnomad-carrier-frequency.kidney-genetics.org/docs/reference/data-sources` |
| App (live) | `https://gnomad-carrier-frequency.kidney-genetics.org/` |

The docs site is served from `dist/docs/` path in the deploy workflow (`cp -r docs/.vitepress/dist dist/docs`), meaning the docs live under the custom domain at `/docs/`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Badge styling | Custom SVG badges | shields.io (already in use) | Already correct, no changes needed |
| Image hosting | External CDN for screenshot | Relative path in repo | GitHub renders relative paths from repo root; already confirmed working path |

**Key insight:** Everything needed is already in place. The work is subtraction (removing sections), not addition.

## Current README State vs Target State

### What Already Exists and is Correct (keep verbatim)
- All 7 tech/app/docs badges -- correct URLs, correct styles
- `## Quick Start` section -- structure is close to target; needs consolidation of two code blocks into one
- `## Features` section -- already a bullet list; may need slight trimming/reordering
- Disclaimer blockquote -- already present at line 14
- `## License` -- exists, needs Citation link added, combined into one section

### What Needs Removal (per CONTEXT.md decisions)
- `## Usage` (lines 62-70, 7-step walkthrough) -- remove entirely
- `## Data Sources` (lines 72-79, table) -- remove entirely
- `## Methodology` (lines 80-88, HWE formula) -- remove entirely
- `## Technology Stack` (lines 90-99, list) -- remove entirely
- `## Development` / `### Project Structure` (lines 101-130) -- remove entirely
- `## Author` (lines 147-151) -- remove or fold into footer
- `## Acknowledgments` (lines 153-157) -- remove entirely
- `## Contributing` (lines 159-168, 5-step PR instructions) -- remove, replace with link

### What Needs Modification
- **One-line description** (line 12): Current text is "A research tool for exploring carrier frequencies for autosomal recessive conditions using population allele frequency data from the Genome Aggregation Database (gnomAD)." Needs shortening per decision.
- **Quick Start**: Consolidate from two separate code blocks (Clone+Install+Dev in one, Build+Preview in a second) into a single 3-step block. Remove Build for Production sub-section entirely.
- **License section**: Add Citation link, combine into "License & Citation"
- **Hero screenshot**: Currently absent -- needs adding after the description/disclaimer

### What Needs Adding
- Hero screenshot (clickable image linking to live app) -- between disclaimer and Features

## Common Pitfalls

### Pitfall 1: Relative Image Paths and GitHub Rendering
**What goes wrong:** Relative image paths work on GitHub but may break if the README is rendered in other contexts (npm, pkg sites).
**Why it happens:** GitHub resolves relative paths from the repo root. Other renderers may not.
**How to avoid:** The path `docs/public/screenshots/hero-preview.webp` is correct for GitHub. No action needed -- the `hero-preview.webp` file is committed to the repository at this path (confirmed: 26 KB file exists).
**Warning signs:** If the image shows a broken icon on GitHub after commit, check the path casing on case-sensitive systems.

### Pitfall 2: Removing Sections That Are Linked Elsewhere
**What goes wrong:** Other files or docs may link to README sections using anchor links like `#usage` or `#methodology`.
**Why it happens:** Inter-document links to README anchors break silently.
**How to avoid:** The docs site links away from README (README links to docs, not vice versa). The CONTEXT.md deferred sections are self-contained -- no cross-linking risk identified. LOW risk.

### Pitfall 3: Losing the Disclaimer Visibility
**What goes wrong:** Disclaimer gets buried below the fold or removed.
**Why it happens:** Content reorganization may accidentally deprioritize important text.
**How to avoid:** Per decision, disclaimer stays inline and near the top. In the target structure it appears right after the one-line description, before the hero screenshot.

### Pitfall 4: Breaking the "Prerequisites" mention
**What goes wrong:** Quick start section loses the prerequisites mention.
**Why it happens:** Current README has Prerequisites as a sub-section with Node.js and browser mentions. Target is a single one-liner.
**How to avoid:** Target format: A plain line above the code block: "Requires [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)." Keep it as a line, not a sub-header.

## Code Examples

### Target README Structure (annotated)

```markdown
# gnomAD Carrier Frequency Calculator

![Vue.js](...) ![TypeScript](...) ![Vite](...) ![Vuetify](...) ![License: MIT](...)

[![Live App](...)](https://gnomad-carrier-frequency.kidney-genetics.org/)
[![Documentation](...)](https://gnomad-carrier-frequency.kidney-genetics.org/docs/)

Calculate carrier frequencies for autosomal recessive conditions using gnomAD population data.

> **For Research Use Only** - This tool is intended for research and educational purposes only.
> It is not a validated clinical diagnostic tool. Outputs must be independently reviewed by
> qualified professionals before any clinical use.

<a href="https://gnomad-carrier-frequency.kidney-genetics.org/">
  <img src="docs/public/screenshots/hero-preview.webp" alt="gnomAD Carrier Frequency Calculator" width="800">
</a>

## Features

- **Direct gnomAD Queries** - ...
- ...

## Quick Start

Requires [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/).

```bash
git clone https://github.com/berntpopp/gnomad-carrier-frequency.git
cd gnomad-carrier-frequency
bun install          # or: npm install
bun run dev          # or: npm run dev
```

The app opens at `http://localhost:5173/gnomad-carrier-frequency/`.

For full documentation, visit [gnomad-carrier-frequency.kidney-genetics.org/docs](https://gnomad-carrier-frequency.kidney-genetics.org/docs/).

## License & Citation

[MIT License](LICENSE) | [Cite this tool](https://gnomad-carrier-frequency.kidney-genetics.org/docs/about/citation)
```

### Clickable Image with Width Control (HTML approach)

```html
<a href="https://gnomad-carrier-frequency.kidney-genetics.org/">
  <img src="docs/public/screenshots/hero-preview.webp"
       alt="gnomAD Carrier Frequency Calculator screenshot"
       width="800">
</a>
```

Source: GitHub Flavored Markdown spec, confirmed working pattern for hero screenshots.

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Long README with all docs inline | Slim README linking to dedicated docs site | Industry standard for projects with docs sites |
| Single bun block, separate npm block | Inline dual commands with `# or: npm ...` comment | Cleaner, less vertical space |
| Separate License and Citation sections | Combined "License & Citation" one-liner | Reduces section count |

## Open Questions

1. **Author section disposition**
   - What we know: Context says "Whether to keep the Author section or fold it into a simpler footer" is Claude's discretion
   - Recommendation: Fold into the License & Citation line or omit. The GitHub profile link is available on the repository page itself. A minimal line like "By [Bernt Popp](https://github.com/berntpopp)" could be added to the License & Citation section, or omitted entirely since GitHub shows the author prominently. Recommend omitting to keep README minimal -- the docs contributing page has author info.

2. **Exact one-line description wording**
   - What we know: Decision provides a candidate: "Calculate carrier frequencies for autosomal recessive conditions using gnomAD population data"
   - Recommendation: Use the provided candidate exactly -- it is concise (< 80 chars), accurate, and keyword-rich for GitHub search.

3. **Features bullet list ordering and wording**
   - What we know: Current list has 8 bullets; all are well-worded; no specific ordering was mandated
   - Recommendation: Keep current 8 bullets as-is (they already describe the key value props in a logical order). The current list starts with Direct gnomAD Queries -> Population-Specific -> Configurable Filters -> Variant Details -> ClinGen Validation -> Gene Constraint Scores -> Text Generation -> Dark/Light Theme. This ordering (core function first, secondary features last) is appropriate for a landing-page README.

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `README.md` (167 lines, current state confirmed)
- Direct file inspection: `docs/.vitepress/config.ts` (VitePress base `/docs/`, URL structure confirmed)
- Direct file inspection: `docs/public/screenshots/hero-preview.webp` (26 KB file confirmed present)
- Direct file inspection: `docs/about/citation.md`, `docs/about/contributing.md` (pages confirmed to exist)
- Direct file inspection: `public/CNAME` (`gnomad-carrier-frequency.kidney-genetics.org` confirmed)
- Direct file inspection: `.github/workflows/deploy.yml` (docs served at `/docs/` path, confirmed)

### Secondary (MEDIUM confidence)
- GitHub GFM documentation: relative image paths in markdown render correctly from repo root on GitHub

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; pure Markdown edit
- Architecture: HIGH - All URLs, file paths, and current README state verified from files
- Pitfalls: HIGH - Based on direct inspection of current README and repo structure

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable domain; file content won't change)
