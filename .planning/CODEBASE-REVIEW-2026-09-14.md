# Codebase review: gnomad-carrier-frequency

**Review date:** 2026-09-14 (Europe/Berlin). **Mode:** audit and reporting only.

## Executive assessment

The current application builds and its 530 workspace tests pass, but verified output and state defects deserve attention before relying on its generated reports. Population TSV exports halve recurrence risk for an affected index patient; source breakdowns disregard the selected homozygote-exclusion formula; quality exclusions are misrepresented in exports. Configuration changes during fetching can be discarded, condition-profile filters do not reach active calculation state, and history restoration can lose patient/source settings and the saved dataset version.

The April review substantially overstated security and performance conclusions. Its claimed exclusion-URL-to-GraphQL injection route is not present: decoded exclusion IDs are membership filters, while submission-query IDs come from upstream ClinVar records. The query builder still interpolates strings unsafely, but this is a different, weaker trust-boundary issue. The current clean dependency graph has no audit findings, no open Dependabot alerts, and one VueUse major version in the application bundle. SheetJS has been removed.

The weekly ClinGen updater also targets a pre-monorepo path and leaves the shipped February CSV unchanged.

The principal enforcement gap remains: all three unit-test steps tolerate failure, deployment does not depend on tests, and GitHub reports no protection on `main`. Current coverage commands fail **only their thresholds**, not assertions. Green workflow badges therefore cannot establish future assertion success. The clean documentation build also reports unsupported plugin operations and produces missing preload assets; browser hydration and navigation still work.

**Inventory:** 43 unique April findings/action items reconciled: **6 resolved, 8 partially resolved, 25 still present, 4 unsupported/incorrect, 0 regressed, 0 unverified**. Thus **33 prior items remain at least partly outstanding**, including optional improvements and low-priority debt. **13 newly documented findings** appear below; “new” means newly identified in this audit, not necessarily newly introduced. NEW-01 is a concrete consequence of prior ARCH-5, so these inventories must not be added as independent defect counts. No arbitrary score or “critical” finding is assigned.

## Baseline, scope, and historical comparison

| Item | Observed state |
|---|---|
| Checkout | `/home/bernt-popp/development/gnomad-carrier-frequency` |
| Branch | `main` |
| Full reviewed SHA | `d2be909c42407ddfee673e447c050a86c7f12180` |
| Initial worktree | No tracked changes. Existing untracked `.planning/CODEBASE-REVIEW-2026-04-08.md` preserved. |
| Fetched `origin/main` | `dcd008b53c953ece60ec878f89aaf0a8da9802d9` |
| Divergence | `git rev-list --left-right --count HEAD...origin/main` → `0 1`; remote-only commit changes 14 documentation screenshot binaries, no source/manifests/workflows. No checkout/pull/merge performed. |
| Workspace versions | Root, web, core, CLI all `1.7.2`; all private. Built CLI `--version` nevertheless prints `1.5.0` (`packages/cli/src/cli.ts:11`). |
| Package manager | Declared `bun@1.3.9`; executed Bun `1.3.11` (`af24e281`). |
| Host tools | Linux x64; Node `v24.15.0`, npm `11.12.1`, Git `2.53.0`, GitHub CLI `2.46.0`. |
| Verified clean tools | TypeScript `5.9.3`, Vite `8.1.3`, tsdown `0.22.3`, Vitest and coverage-v8 `4.1.11`, Playwright `1.61.1`, ESLint `10.6.0`, Prettier `3.8.1`. |
| Selected clean dependencies | Vue `3.5.39`, Vuetify `3.12.9`, Pinia `3.0.4`, villus `3.3.4`, GraphQL `16.14.2`, VueUse core/integrations `14.3.0`, Zod `4.3.5`, lz-string `1.5.0`, write-excel-file `4.1.1`, VitePress `1.6.4`, sharp `0.35.4`. |
| Lockfile | Only `bun.lock` tracked. SHA-256 `40f2424570b7ff7bd010497f2149c6ac78ed4ead4fb0433e709007894cbfc228`. |
| Original report hash | SHA-256 `9cd0e19599a381a5d2584e01efedef74e154a9b6db73963aff4884d245cd6c65`. |

Read the April report and `CLAUDE.md`. No applicable `AGENTS.md` was found in the repository or its ancestor directories. `CLAUDE.md` is useful architecture guidance but stale about tool versions, the “forthcoming” CLI, and the removed `useGeneVariants` composable. Six independent reviewers covered architecture/state; calculations/provenance; security; tests/workflows; performance/cache; and accessibility/UX/docs, in two waves with three reviewer slots. The primary reviewer reran numerical/state probes, audited actual dependency resolution, inspected CI logs, and challenged overclaims before inclusion.

The April report contains no commit SHA or time, so an exact report-to-commit comparison cannot be established. Actual history brackets that date:

- `ebdfe9314ebf744336745b14a145d5366505140d` (April 8, 08:19 +02:00): screenshot selector fix, before the worker migration.
- `79cbf068a8cac687b5de7f598612e2d8e2c3d56a` (April 8, 11:50 +02:00, PR #23): worker pipeline/IndexedDB, shallow refs, logging cleanup, removal of `useGeneVariants`, dependency changes including SheetJS → ExcelJS. `git blame` attributes NEW-02's discarded-refilter guard and NEW-07's incomplete watch sources to this commit.
- `c899f37c2eff0b37280fd64183fed4d4af653b24`, then screenshot commit `a44f326f689a7c51a76cfe30f9bfaca4ccb1a53c`: version 1.7.0 on April 8.
- `89882000fb7a35ae481ab749616051d391b60a15` (July 3, PR #26): consolidated dependency security changes, including export dependency work; `506aff0f25074fe90734094531ac11740a2f13b5` (PR #27): version 1.7.1; screenshot commits follow.
- `d2be909c42407ddfee673e447c050a86c7f12180` (September 14, PR #28): additional security/dependency updates and 1.7.2. Remote screenshot commit follows.

`git diff a44f326..HEAD --stat` reports 27 files, 835 insertions, 15,568 deletions, heavily influenced by deleting `package-lock.json`. Review also inspected the April 8 worker commit separately. These are historical facts, not proof that an April recommendation was implemented. NEW-01's `/4` export code traces to February 27 commit `cb26ec91`, illustrating why newly found does not mean recently introduced.

### Current GitHub evidence

Read-only `git fetch origin`, GitHub PR/release/run APIs, raw job logs, branch-protection and ruleset APIs were available.

- No open PRs. Latest PR [#28](https://github.com/berntpopp/gnomad-carrier-frequency/pull/28) is merged; #27/#26/#23 are also merged; #25/#24 closed unmerged.
- Latest release [v1.7.2](https://github.com/berntpopp/gnomad-carrier-frequency/releases/tag/v1.7.2) published `2026-09-14T15:26:01Z`, tag resolves to reviewed local SHA. It has **no uploaded release assets**, only GitHub source archives. There is a 1.7.1 version commit but no fetched v1.7.1 tag/release. Do not assume a published standalone CLI.
- At fetched `origin/main`, [CI](https://github.com/berntpopp/gnomad-carrier-frequency/actions/runs/34861630449), [Tests](https://github.com/berntpopp/gnomad-carrier-frequency/actions/runs/34861630319), [Pages deployment](https://github.com/berntpopp/gnomad-carrier-frequency/actions/runs/34861630314), and [Lighthouse CI](https://github.com/berntpopp/gnomad-carrier-frequency/actions/runs/34861630309) report success. Tests logs explicitly show 263 core + 79 CLI + 188 web assertions passing and three coverage-threshold failures. Push runs skip E2E. The latest reviewed [PR Tests run](https://github.com/berntpopp/gnomad-carrier-frequency/actions/runs/34861115409) reports 31 E2E passes.
- `GET .../branches/main/protection` returned HTTP 404 with **“Branch not protected”**; `GET .../rulesets` returned `[]`. These are observed API responses, not an inference from YAML. Repository rules were not changed; organization/account policy outside the inspected APIs was not exhaustively examined.
- Dependabot returned **62 alerts, all fixed, zero open**. `bun audit --json` returned `{}` with exit 0 in both the existing and a fresh installation. Each of the 62 historical vulnerable ranges was compared with actual versions in a clean installed graph; no vulnerable match remained.

### Why a clean installation was necessary

`bun install --frozen-lockfile` in the existing checkout reported “Checked 957 installs across 866 packages (no changes).” Direct filesystem/package resolution nevertheless found stale extras such as `lodash@4.17.21`, `basic-ftp@5.1.0`, several old `tmp`/Vite copies, and a workspace CLI Vitest `4.1.3`. `bun pm ls` describes the lock graph and did not expose all those leftover files. Their mere presence does not establish that the application imports them.

To avoid misattributing that environment to current source, `git archive HEAD` was extracted to `/tmp/gnomad-review/clean-checkout`, followed by another frozen install: **753 packages installed**, no lockfile change. Its three workspaces execute Vitest `4.1.11`; `bun run ci`, workspace tests and coverage were repeated there. The advisory scan found 693 distinct installed package names and no matches to historical alert ranges. Many former vulnerable dependencies are **absent**, not merely overridden. The clean and original application builds have identical asset hashes/sizes. Existing user dependencies were not deleted or repaired.

SheetJS is absent from manifests, lockfile and clean graph. The [SheetJS advisory](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) also explicitly distinguishes vulnerable file-reading workflows from unaffected export-only use; an advisory's maximum severity was never sufficient evidence of this application's exploitability. The installed `sharp@0.35.4` meets the patch version in the current [upstream sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c). “No reported advisories” is not a proof of absence of all security defects.

## Severity and evidence conventions

**High:** demonstrated materially wrong result/state or absent release enforcement that can allow those defects through. **Medium:** scoped output/provenance, feature failure, input-integrity or keyboard-access barrier. **Low:** maintainability, hardening, limited operational defect or optional optimization. Severity measures this application's demonstrated impact, not an upstream CVSS score. **High confidence:** executable reproduction or complete direct source/config trace; **medium confidence:** bounded static evidence or impact dependent on untested circumstances. Optional improvements are identified explicitly.

All file references below are relative to the reviewed SHA, with current line numbers. Unqualified `use*.ts` files refer to `apps/web/src/composables/` (store files to `apps/web/src/stores/`), wizard components to `apps/web/src/components/wizard/`, and calculation files to `packages/core/src/calculations/`. Resolved findings have no current defect severity. Prior claims retain their original IDs; previously unnumbered rows receive `PERF-1`–`PERF-7`, `DX-1`–`DX-8`, and action-only `DX-9` in their original order. Original scores and byte-saving estimates are retired because no comparable rubric/measurement was supplied.

## Complete April finding reconciliation

| ID and original claim | Status | Current severity / confidence | Current evidence and explanation |
|---|---|---|---|
| CRIT-1: exclusion URL reaches unsafe GraphQL interpolation | unsupported/incorrect | Low residual hardening / high | `packages/core/src/queries/clinvar-submissions.ts:34` still interpolates. But `apps/web/src/workers/variant-pipeline.ts:139` only tests excluded-ID membership; submission IDs separately originate in API/cache ClinVar records (`useCarrierFrequency.ts:356`). Full trace below refutes alleged URL reachability. |
| CRIT-2: tests do not block CI | still present | High / high | `.github/workflows/tests.yml:24`, `:28`, `:32` tolerate failures. Deploy `:4`, `:18` has no test dependency. Current assertions pass; thresholds fail. No protection/rulesets observed. |
| CRIT-3: mismatched VueUse majors duplicate app runtime | resolved | None / high | `apps/web/package.json:22`–`:23` align 14.3.0; clean emitted module graph contains only that version. VitePress owns separate 12.8.2; it is absent from app chunks. Prior runtime-bug/savings claim lacked bundle proof. |
| CRIT-4: CLI externalizes undeclared Zod | still present | Low packaging / high | `packages/cli/tsdown.config.ts:9`, `packages/cli/package.json:14`; compiled CLI imports Zod directly. Strict isolated dependency layout fails on Zod. Private source-workspace distribution works; copying one JS file is not intended dependency installation. See reproduction below. |
| ARCH-1: StepResults is 1,539 lines | still present | Low debt / high | Current `apps/web/src/components/wizard/StepResults.vue` is 1,575 lines; export handler `:1112`, source aggregation `:1011`, table `:470`, script `:787`. Large responsibility set remains; line count alone is not a defect. |
| ARCH-2: Vuetify color helpers violate neutral core | still present | Low presentation coupling / high | `packages/core/src/filters/quality-flags.ts:238`–`:276` return color strings, with no Vuetify/Vue import or browser dependency. Semantic UI coupling remains; claimed runtime platform violation is overstated. |
| ARCH-3: 165-line global computed duplicates core | partially resolved | Low debt / high | Old computed removed; global aggregation now `apps/web/src/workers/variant-pipeline.ts:196` and `packages/cli/src/utils/gene-query.ts:209`, alongside core population aggregation. Related calculations, not identical data inputs. Centralization incomplete. |
| ARCH-4: singleton has no cleanup | still present | Low lifecycle debt / medium | `useCarrierFrequency.ts:127`, `:507` retain cached instance without reset/dispose. Root initializes it (`App.vue:158`, `:172`), so normal wizard transitions are not proof of leaks. Mount/remount/HMR lifecycle remains weak. |
| ARCH-5: recurrence formula repeated instead of core helper | still present | High demonstrated consequence / high | Core `frequency-calc.ts:52`; `useCarrierFrequency.ts:479`, `useTextGenerator.ts:33`, `StepResults.vue:1329`, export `export-utils.ts:200`. NEW-01 demonstrates a real mismatch; repetition alone was only debt. |
| SEC-1: template import uses assertions without full validation | still present | Medium / high | `useTemplateStore.ts:177`–`:211`; actual malformed import accepted and renderer throws; another invalid import partially mutates state. See security finding. |
| SEC-2: unmaintained xlsx 0.18.5 | resolved | None / high | `apps/web/package.json:33`, `utils/xlsx-export.ts:1`; write-excel-file 4.1.1 replaces it; SheetJS absent clean/locked graph, no open alerts. |
| SEC-3: no CSP meta | still present | Low hardening / high | `apps/web/index.html:1`; none found. Production HTTP HEAD also returned no CSP header. No demonstrated script-execution exploit. Policy needs browser/worker compatibility testing. |
| SEC-4: GitHub gene config lacks integrity verification | partially resolved | Low provenance / high | `apps/web/src/main.ts:28`–`:42` bundles known configs first; fixed HTTPS fallback for misses. `packages/core/src/gene-config/loader.ts:64` validates schema, but no content/version pin. This is not arbitrary-origin, wholly unvalidated loading. |
| TEST-1: 24/25 composables have zero unit tests | still present | Medium gap / high | Now 24 production `use*.ts`, one dedicated suite (`composables/__tests__/useClinvarSubmissions.test.ts:1`): 23/24 lack direct suites. Component tests give indirect coverage. `useGeneVariants` was removed; do not keep recommending its test file. |
| TEST-2: frequency-calc/source-frequency have no tests | partially resolved | Medium gap / high | `frequency-calc.ts:77`, `source-frequency.ts:45`: each 0% in core's suite. Worker/CLI exercise aggregation indirectly, so zero testing everywhere is incorrect. Source-formula divergence remains uncovered; golden tests target another module. |
| TEST-3: ESLint covers only web | still present | Low tooling / high | Root `package.json:17` delegates to web ESLint. Core/CLI are formatted and typechecked, but not linted by root command. |
| TEST-4: 0% branch/function/statement thresholds | still present | Medium assurance / high | `packages/core/vitest.config.ts:13`, CLI `:14`, web `:25`; line thresholds 90/80/40 exist but all fail and are tolerated in CI. Measured coverage below. |
| TEST-5: emit tests call $emit directly | still present | Medium quality gap / high | `components/__tests__/AppBar.test.ts:78`–`:94`, `FilterPanel.test.ts:115`, `:135`, `:154`; assertions would survive removal of actual UI handlers. Shared setup `src/test/setup.ts:4` also leaves real Vuetify controls unresolved in many mounts. |
| A11Y-1: clickable population rows not keyboard operable | still present | Medium / high | `StepResults.vue:512`–`:518`; browser saw eight clickable rows with no role/tabindex; nested expansion button is a different action. Pointer click opens drilldown. |
| A11Y-2: SVG bars lack keyboard access | still present | Medium / high | `PopulationBarChart.vue:42`–`:50`; browser saw eight interactive groups with no role/tabindex; pointer opens modal. |
| A11Y-3: no wizard transition focus management | still present | Medium / high | `WizardStepper.vue:212`–`:228` announces steps but does not move focus. Browser Enter transitions 1→2 and 3→4 left focus on BODY after 500 ms. |
| A11Y-4: no error boundary means every exception whitescreens | partially resolved | Low resilience / medium | No global `onErrorCaptured`/`errorHandler` in `App.vue:126` or `main.ts:56`. Local errors/retry views exist. Missing global recovery remains, but the universal white-screen conclusion was unsupported. |
| BUILD-1: bun.lock and package-lock both tracked | resolved | None / high | `git ls-files '*lock*'` lists only `bun.lock`; `.gitignore:37` ignores npm lockfile. History confirms removal. |
| BUILD-2: Vitest root/web/CLI versions mismatch | resolved | None / high | Root `package.json:31`, web `:59`, CLI `:23` align 4.1.11. Clean and remote execution confirm all three. Existing CLI 4.1.3 was stale local install state. |
| BUILD-3: opaque caches exhaust quota, ~7 MB each | unsupported/incorrect | Low config hardening / high | `vite.config.ts:84`, `:99`, `:114`, `:129` permit status 0, but actual fetches are CORS, not no-cors. gnomAD POST is not matched by GET runtime rule. No opaque-entry storage consumption reproduced; browser-specific padding is not app measurement. |
| BUILD-4: root omits CLI so typechecking incomplete | partially resolved | Low consistency / high | `tsconfig.json:3` still omits CLI, but root `package.json:18` explicitly runs `tsc --build packages/cli`; verified typecheck covers it. Bare `tsc -b` still differs from documented root command. |
| BUILD-5: core lacks noUnusedLocals/Parameters | still present | Low consistency / high | Core `tsconfig.json:2`–`:15` omits them; web `tsconfig.app.json:24`–`:26` includes them. Core still uses strict TypeScript. |
| PERF-1 (unnumbered): full Vuetify import, no tree shaking, ~300 KB savings | partially resolved | Low optimization / high | `main.ts:11`–`:12`, `:50`–`:52` broadly registers namespaces. Module pruning exists; global registration retains many components. Large bundle measured below; no counterfactual 300 KB saving verified. |
| PERF-2 (unnumbered): eager xlsx, ~400 KB lazy saving | partially resolved | Low optimization / high | SheetJS gone, replacement still statically imported in `xlsx-export.ts:1` → `useExport.ts:10` and `VariantModal.vue:111`. Dependency participates in initial bundle; old size estimate is obsolete. |
| PERF-3 (unnumbered): full MDI font, ~200 KB saving | still present | Low optimization / high | `main.ts:9`; actual WOFF2 is 403.21 kB and precached. Alternative build/savings not measured; emitted fallback fonts are not all downloaded by a modern browser. |
| PERF-4 (unnumbered): no manual vendor chunks | still present | Low optional / high | `vite.config.ts:154`–`:163`; one principal JS bundle plus worker/Workbox chunks. Manual splitting alone does not reduce total first-load bytes. |
| PERF-5 (unnumbered): stats serializes on every access | unsupported/incorrect | None demonstrated / high | `useLogStore.ts:29`–`:48`: Pinia computed getter is cached until dependencies change. Serialization is linear when invalidated/read, not every access; buffer capped by `:22`, `:75`. |
| PERF-6 (unnumbered): six URL watchers should be one | unsupported/incorrect | Low optional / medium | `useUrlState.ts:384`–`:406` has six watches, but no measured harmful overhead. Count alone establishes neither a bug nor savings. Consolidation only if measured duplicate synchronization matters. |
| PERF-7 (unnumbered): no shallowRef for large API data | resolved | None / high | `useCarrierFrequency.ts:197`–`:205` now shallow refs arrays/maps/sets/results; processing moved to worker. |
| DX-1 (unnumbered): no Git hooks | still present | Low optional / high | No tracked hooks config or install script (`package.json:12`–`:25`). Convenience only; cannot replace required CI. |
| DX-2 (unnumbered): production console.log in history/ClinGen | resolved | None / high | None in named files; `useClingenValidity.ts:97`, `:123`, `:139`, `:144` use logger. Intentional CLI stdout is not a regression. |
| DX-3 (unnumbered): README omits monorepo | still present | Low docs / high | `README.md:31`–`:49` omits layout/CLI. Also stale Node 18 requirement `:33`, development path `:47`, screenshot path `:17`; `CLAUDE.md` partially fills architecture gap but is stale. |
| DX-4 (unnumbered): text hardcodes gnomAD v4 | still present | Medium / high | `useTextGenerator.ts:194`–`:203` contains German/English literal v4 irrespective of result.version; wrong attribution for v2/v3. |
| DX-5 (unnumbered): submissions API URL hardcoded | still present | Low debt / high | `useClinvarSubmissions.ts:14`, `:80`; configured endpoints currently identical (`gnomad.json:7`, `:25`, `:43`). NEW-05 is the material assembly bug. |
| DX-6 (unnumbered): UI only English, text DE/EN | still present | Low optional / high | English wizard/settings labels (`WizardStepper.vue:17`, `SettingsDialog.vue:6`), text-language options separate. No requirement establishes UI translation as correctness defect. |
| DX-7 (unnumbered): deploy repeats lint/typecheck instead of requiring CI | still present | High enforcement consequence / high | `deploy.yml:30`–`:48` repeats checks and independently publishes. Fold into CRIT-2, not a separate redundant-work emergency. |
| DX-8 (unnumbered): no dependency caching in CI | partially resolved | Low optional / high | Main CI/Tests/Deploy lack dependency caches; screenshots does cache browser binaries (`screenshots.yml:34`). April blanket “no caching” overstated; NEW-11 checks its invalidation bug. No speedup estimated. |
| DX-9 (action-only): remove unused jsdom | still present | Low optional / high | `apps/web/package.json:48` lists jsdom 29.1.1; `apps/web/vitest.config.ts:9` selects happy-dom. No direct production/test import found. Check tool consumers before removal. |

### Recommended-action crosswalk (all April checklist entries)

This crosswalk avoids counting repeated recommendations as additional findings. Status is the linked reconciliation row's disposition; detailed acceptance conditions follow.

| April phase | Every action, in original order |
|---|---|
| 1 | GraphQL → CRIT-1; test tolerance → CRIT-2; VueUse alignment → CRIT-3; CLI Zod → CRIT-4; npm lock removal → BUILD-1. |
| 2 | Template schema → SEC-1; evaluate Excel replacement/lazy load → SEC-2/PERF-2; CSP → SEC-3; core calculation suites → TEST-2; top four composables → TEST-1 (test worker replacement, not removed useGeneVariants); broaden lint → TEST-3; hooks → DX-1. |
| 3 | Split StepResults → ARCH-1; extract global aggregator → ARCH-3; color mappings → ARCH-2; shared recurrence helper → ARCH-5/NEW-01; Vuetify auto-import → PERF-1; lazy Excel → PERF-2; vendor chunks → PERF-4; error boundary → A11Y-4. |
| 4 | Keyboard rows/bars → A11Y-1/A11Y-2; wizard focus → A11Y-3; console cleanup → DX-2; clinical source text → DX-4; config endpoint → DX-5; Vitest alignment → BUILD-2; unused flags → BUILD-5; remove jsdom → DX-9; opaque caching → BUILD-3; dependency cache → DX-8. |

## New findings, ordered by demonstrated impact

### NEW-01 — Population TSV halves recurrence risk for affected index patients

**High; high confidence.** `apps/web/src/utils/export-utils.ts:198`–`:205` always divides CF by four. `StepResults.vue:1125`–`:1144` passes an export object without index status, whereas UI `:1324`–`:1335` and core `frequency-calc.ts:52` distinguish heterozygous from homozygous/compound-heterozygous index status.

**Reproduction:** choose an affected index patient and export population TSV. Direct execution with CF `0.04` yields `Recurrence Risk = 0.01` (1:100); core/UI give `0.02` (1:50). The TSV function has no status input with which to correct this. The difference follows Mendelian transmission: an affected parent's transmitted allele is pathogenic with probability 1; a carrier partner transmits theirs with probability 1/2. For a carrier index parent the additional factor is 1/2, giving CF/4. This is a derivation under the app's stated AR assumptions, not independent validation of a disease-specific penetrance model. [MedlinePlus inheritance risk explanation](https://medlineplus.gov/genetics/understanding/inheritance/riskassessment/); the affected-by-carrier case is also stated for CF in [GeneReviews](https://www.ncbi.nlm.nih.gov/books/NBK1250/?report=printable).

**Impact:** a downloaded risk silently understates the UI result by 50%. **Fix:** include index status in export data/metadata and use the shared risk helper. **Acceptance:** independent fixtures for every supported index status agree across UI, text, TSV and exported metadata; CF .04 gives .02 for affected and .01 for a heterozygous carrier. Related prior item: ARCH-5.

### NEW-02 — Configuration changes during a fetch can be discarded

**High; high confidence.** `useCarrierFrequency.ts:253`–`:265` snapshots inputs for the worker; `:278`–`:281` discards refilter dispatches while loading; `:220`–`:237` publishes the old snapshot's result without replaying pending changes. Watch callbacks at `:331`–`:353` do not queue them.

**Reproduction:** delay a fetch beyond the 300 ms filter debounce, change a filter, let the debounce fire, then resolve the fetch. A probe transpiling the actual composable with real Vue scheduling and a mocked worker observed `{dispatchedMissense:false,currentMissense:true,refilters:0}`. Exclusion edits have an analogous 500 ms window. Probe lets initial exclusion debounce settle before fetching, avoiding an unrelated callback masking the bug.

**Impact:** displayed settings and computed/exported frequencies can describe different analyses. **Fix:** retain an input revision/dirty flag and apply the latest input atomically, or replay the latest refilter before marking results current. **Acceptance:** delayed-fetch tests changing filter/calculation/quality/manual exclusions yield the final chosen settings without another user action; concurrent gene switches cannot replay against the wrong gene.

### NEW-03 — Condition-profile filters do not update the active calculation

**High; high confidence.** `useGeneConfig.ts:42`–`:55` writes profile overrides to `filterStore.defaults`; `useCarrierFrequency.ts:145`–`:154` copied these defaults into a separate ref only at initialization. Only `setFilterConfig` (`:156`) changes that active ref; no bridge applies subsequent profile defaults. Profile selector `FilterPanel.vue:36`–`:50` calls `selectProfile` directly.

**Reproduction:** with initial defaults, apply profile filter overrides after composable creation. Actual-state probe observed store LoF false while active LoF remained true. Bundled profiles such as `configs/genes/CFTR.json:18`–`:21` also enable missense, unlike the factory default. **Impact:** a profile can appear selected while its condition-specific filtering is not used. **Fix:** define one active analysis configuration and apply profile overrides there, with explicit separation from future-session preferences. **Acceptance:** loading CFTR and switching between profiles with distinct overrides changes actual worker inputs/results; dismiss/reset restores a defined state and preserves intentional user choices.

### NEW-04 — History restoration loses saved state and ignores dataset version

**High; high confidence for reset reproduction, high for version source trace.** `useHistoryRestore.ts:55`–`:83` clears the gene, sets saved fields/step 4, and restores the gene synchronously. `useWizard.ts:35`–`:46` sees a non-null old gene after Vue batches assignments and resets fields. Saved version exists in `useHistoryAutoSave.ts:134`–`:137` but the entire restore function (`:38`–`:97`) never restores it.

**Reproduction:** restore a homozygous/literature entry while another gene is active. Executing the actual wizard watcher with the restore sequence and awaiting `nextTick` yielded `{step:1,index:'heterozygous',source:'gnomad',literature:null}`. Separately, restoring a v2 entry while v4 is active fetches using current version (`useCarrierFrequency.ts:255`–`:257`), not the stored version; its v2 exclusions may refer to another assembly.

**Impact:** history is not a reliable reconstruction of patient/source/data choices and can change recurrence assumptions. **Fix:** implement an explicit restoration transaction with downstream-reset suppression and restore dataset before gene selection/fetch. **Acceptance:** restoration from empty and already-populated wizards retains step, genotype, source, PMID, frequency, filters and exclusions after all watchers settle; v2↔v4 restoration requests the stored dataset/reference genome.

### NEW-05 — v2 ClinVar submission queries use GRCh38 instead of GRCh37

**Medium; high confidence in wrong request, magnitude of frequency effect unmeasured.** `useClinvarSubmissions.ts:131` calls `getReferenceGenome()` without the selected version. Default is v4/GRCh38 (`packages/core/src/config/index.ts:28`, `:73`; `gnomad.json:2`, `:9`); v2 needs GRCh37 (`gnomad.json:45`). Caller `useCarrierFrequency.ts:369` supplies only variant IDs.

**Trigger:** select v2 and include conflicting classifications requiring individual submissions. **Evidence:** full request-construction trace sends v2-position IDs with `GRCh38`. No live request was necessary or sent to test malformed coordinates. **Impact:** missing or unrelated submissions can change conflicting-variant eligibility; no measured real-gene effect is claimed. **Fix:** pass selected assembly/version and scope submissions cache/request ownership by it; use the configured endpoint. **Acceptance:** intercepted v2 queries contain GRCh37, v3/v4 GRCh38; switching versions while a batch is pending never imports old-assembly results into the new analysis.

### NEW-06 — Source breakdown and variant TSV use formulas inconsistent with results

**Medium; high confidence.** `packages/core/src/calculations/source-frequency.ts:107`–`:115` uses only the HWE switch, ignoring `useHomExclusion`; UI passes the full configuration at `StepResults.vue:1011`–`:1026`. Variant TSV separately uses `AF*2` (`export-utils.ts:233`–`:240`) irrespective of calculation metadata.

**Reproduction:** a single HC LoF variant with joint AC=100, AN=10,000, homozygote count=40. Default homozygote-excluded parent CF is `(100−2×40)/(10000/2)=0.004` (0.4%). Its only source row returns `2×.01×.99=.0198` (1.98%), **4.95 times its parent**. Variant TSV returns .02 (2%). Both functions were executed locally with that same fixture.

**Impact:** users cannot reconcile source/export values with the selected formula. **Fix:** share effective per-group/per-variant calculation logic and clearly label any intentional alternative statistic. **Acceptance:** single-source equality for homozygote exclusion on/off, HWE and simplified settings; multi-source output explains that nonlinear category frequencies are not additive; TSV honors or explicitly identifies its formula.

### NEW-07 — Changing quality settings leaves flags/exclusions stale

**Medium; high confidence.** Worker input includes `qualityStore.defaults` (`useCarrierFrequency.ts:259`, `:292`), but watched sources (`:333`) omit it. Settings controls modify it (`SettingsDialog.vue:627`, `:665`, `:673`, `:692`, `:712`, threshold setter `:1034`).

**Reproduction:** after a completed calculation, change a quality threshold/flag enablement. Real Vue/composable probe observed **zero additional refilters**. **Impact:** flags and, when enabled, quality-excluded variants/frequency remain based on old criteria until another trigger. **Fix:** watch the effective quality settings through the same revision-safe path as NEW-02. **Acceptance:** a variant between old/new AF thresholds changes flag, eligibility and frequency immediately after settings changes, including edits while fetching.

The probe also found in-place calc-store setters are not observed by the shallow getter watch. Ordinary FilterPanel controls replace the whole config, so this audit does **not** claim all HWE/homozygote toggles are broken.

### NEW-08 — Exports mark quality-excluded variants as included

**Medium; high confidence.** `StepResults.vue:1112`–`:1132` exports all pathogenic candidates but passes only manual exclusions; `export-utils.ts:127`–`:149` derives `excluded` from that set. Metadata `:157`–`:172` omits quality configuration. Variant TSV's quality/source columns are empty placeholders (`:242`–`:246`).

**Reproduction:** enable high-homozygote quality exclusion for the AC100/AN10000/hom40 fixture. Actual pipeline returns `qualityExcludedIds=['1-100-A-T']`, zero qualifying variants. Actual export conversion returns that row as `excluded:false, exclusionReason:null`.

**Impact:** exports cannot reproduce the summary and affirm the wrong inclusion status. **Fix:** record effective manual and quality exclusions, their reasons/flags, and quality settings; retain all candidate rows if desirable but identify them accurately. **Acceptance:** recomputing from exported included variants agrees with summary; JSON/XLSX/TSV preserve effective inclusion and configuration, including all-excluded and no-data cases.

### NEW-09 — Built CLI cannot load clinical-text templates

**Medium; high confidence.** `packages/core/src/templates/load-templates.ts:35`–`:47` resolves `../.. /src/config/templates` from `packages/core/dist`, incorrectly reaching `packages/src`. `packages/core/tsdown.config.ts:3`–`:26` does not emit the template JSON assets; CLI formatter consumes the loader (`packages/cli/src/output/clinical-formatter.ts:189`).

**Reproduction after clean build:** importing `loadTemplateContent` from `@gnomad-cf/core/templates` and calling both `en` and `de` throws `ENOENT` for `/tmp/gnomad-review/clean-checkout/packages/src/config/templates/{lang}.json`. The same failure occurred in the original workspace and when invoking clinical formatting with a valid result. CLI commands expose `--text`/`--clinical`.

**Impact:** clinical-text generation fails even inside the supported repository workflow; this is independent of standalone distribution. **Fix:** bundle/copy and resolve templates relative to emitted code, or import static data through an appropriate Node/browser boundary. **Acceptance:** built core loader and built CLI clinical formatting work for both languages from an arbitrary cwd, using only documented installed package files.

### NEW-12 — Touch interaction suppresses chart drilldown

**Medium; high confidence.** `apps/web/src/components/PopulationBarChart.vue:50` handles `touchstart.prevent` only by showing a tooltip (`:255`–`:257`), suppressing the synthesized click used for drilldown (`:265`–`:266`).

**Reproduction:** production build, Chromium mobile context at 375×812 with `hasTouch:true,isMobile:true`; real Playwright `tap()` on a population group, followed by 500 ms wait, produces zero variant dialogs. Equivalent desktop click opens one. The primary reviewer repeated the mobile probe with the same result. **Impact:** the chart's drilldown action is unavailable through ordinary touch; switching to the table offers a workaround. This is distinct from keyboard inaccessibility and does not imply general mobile overflow.

**Fix:** define consistent tap/pointer behavior, or provide an explicit touch-accessible drilldown control alongside the tooltip. **Acceptance:** touch users can open the intended population dialog exactly once, scroll normally, close and return; desktop click and keyboard activation remain usable.

### NEW-13 — Weekly ClinGen updater writes outside the shipped web asset path

**Medium; high confidence.** `.github/workflows/update-clingen-data.yml:20`–`:22` downloads to root `public/data/clingen-gene-validity.csv`; `:38` checks that path and `:45` would stage it. The only tracked/shipped file is `apps/web/public/data/clingen-gene-validity.csv`; web fetches that bundled asset first (`useClingenValidity.ts:12`, `:110`–`:124`). Its header at line 2 still says **FILE CREATED: 2026-02-23**. The last commit touching it is the February 24 monorepo move `c613a9a5e5328dc4c01f1daa706ab0e192d90b2a`.

**Reproduction/evidence:** create a harmless diagnostic CSV at the workflow's wrong path in the temporary archive; using the original index read-only with `git --work-tree=/tmp/gnomad-review/clean-checkout diff --quiet -- public/data/clingen-gene-validity.csv` returns 0, while `ls-files --others` identifies it as untracked. Git diff does not notice this new file, so the workflow emits changed=false. The [September 7 scheduled job](https://github.com/berntpopp/gnomad-carrier-frequency/actions/runs/34089129888) reports successful download/change check and skipped commit. Its full log request returned empty output; step metadata, source and local reproduction establish the path defect independently.

**Impact:** repeated successful updater runs do not refresh the shipped ClinGen curation data, and a successful local fetch prevents use of the external fallback. No particular outdated clinical classification was compared or asserted. **Fix:** download, validate, compare and stage the actual web public asset; ensure publication consumes the updated data and explicitly handle initially untracked files. **Acceptance:** a differing fixture CSV causes a detected change to the exact built web asset; identical content is a no-op; invalid/HTML downloads are rejected; a fresh production artifact serves the updated creation date/content.

### NEW-10 — Clean docs build references 19 missing JavaScript preloads

**Low; high confidence.** Root `package.json:63` overrides Vite to 8.1.3 while web `package.json:58` uses VitePress 1.6.4. Clean docs build reports VitePress `generateBundle` assignment unsupported by Rolldown and ignored. Installed VitePress attempts to assign lean page bundles; the artifact contains **19 referenced `.lean.js` files that do not exist**, including `/docs/assets/index.md.DU7M9_uH.lean.js`.

**Reproduction:** clean `bun run docs:build`; enumerate `/docs/assets/` JS references in generated HTML and compare with files. Serving the untouched artifact at a local `/docs/` prefix yields a browser HTTP 404 for the homepage lean preload. **Impact is bounded:** Vue hydrates, Guide navigation works, and no uncaught page error was observed. This is an artifact/toolchain compatibility defect, not a demonstrated docs outage.

**Fix:** select a mutually supported docs/Vite combination or scope overrides appropriately while retaining security fixes. **Acceptance:** clean docs build has no ignored bundle operations; every emitted HTML JS/CSS reference exists; direct entry, navigation and search work without missing-asset requests.

### NEW-11 — Screenshot workflow cache never keys on the actual lockfile

**Low; high confidence in configuration consequence; future failure not triggered remotely.** `.github/workflows/screenshots.yml:12`, `:39` refer to absent `bun.lockb`, but only `bun.lock` is tracked. Therefore `hashFiles('bun.lockb')` is empty. On exact browser-cache hit `:44` skips browser installation and `:48` installs system dependencies only.

**Trigger/evidence:** upgrade Playwright while retaining an older exact cache entry: the key remains unchanged, leaving the required browser revision absent. Lock-only changes also miss the workflow path trigger. Current screenshot run succeeded; this audit did not modify dependencies or invalidate GitHub caches to induce failure.

**Impact:** later browser upgrades can break automated screenshots. **Fix:** key/trigger on `bun.lock` and let browser installation repair missing revisions after restore. **Acceptance:** a deliberately older cache plus updated lock provisions the current browser and generates screenshots; lock-only dependency changes trigger intended work.

## Outstanding security, testing, UX, and maintenance actions

The following entries supply impact, remediation and acceptance criteria for outstanding prior items not fully covered by the new findings. Their primary evidence/severity/confidence are in the reconciliation table; grouped IDs are related work, not silently dropped findings.

### CRIT-1: full trust-boundary trace and bounded hardening

`useUrlState.ts:56`, `:75` reads/parses URL state → `packages/core/src/types/url-state.ts:52` permits the exclusion string → `useUrlState.ts:174`–`:179` calls `decodeExclusions` → `exclusion-url.ts:39`–`:48` decompresses/splits → `useExclusionState.ts:129`–`:136` stores a Set → `useCarrierFrequency.ts:171`–`:184`, `:262`, `:295` passes excluded IDs → `variant-pipeline.ts:139`–`:143` removes matching existing variants. That path does not construct ClinVar records.

Separately, `variant-worker.ts:205` reads API `geneData.clinvar_variants` (cache equivalent `:128`); pipeline returns them unchanged (`variant-pipeline.ts:175`); composable assigns them (`useCarrierFrequency.ts:227`) → `getConflictingVariantIds` (`variant-filters.ts:98`–`:103`) maps those records to IDs → `useCarrierFrequency.ts:356`–`:372` fetches missing submissions → `useClinvarSubmissions.ts:78`–`:85` calls the interpolating builder and sends JSON to a fixed public HTTPS endpoint.

Local helper-only payload, never sent to gnomAD:

```text
x") { variant_id } injected: __typename vextra: clinvar_variant(variant_id: "x
```

Actual exclusion encoding/decoding preserves it; actual `getConflictingVariantIds` on a benign upstream record returns only `1-123-A-G`. Directly calling `buildSubmissionsQuery([payload], 'GRCh38')` and `graphql.parse` yields selections `v0`, `injected`, `vextra`. Thus **unsafe interpolation is proven; URL reachability is not**. A malicious API response/cache record or direct core caller can alter the query, but already has a different capability. Demonstrated practical impact is malformed/additional permitted read selections against public data, not credentials, privilege escalation, mutations, or code execution.

**Recommended hardening:** use GraphQL variables for IDs and validate the reference enum. **Acceptance:** special-character IDs cannot add selections; URL exclusion regression proves exclusion strings never become submission IDs. Do not substitute an underspecified `\w` regular expression for a genomic-ID contract. Decode resource limits are a reasonable future boundary review; no URL decompression DoS was demonstrated here.

### SEC-1: validate imports before mutating state

Malformed local file accepted by actual store:

```json
{"version":"1.0","language":"en","customSections":{"affected.geneIntro":42},"enabledSections":{"affected":["geneIntro"]}}
```

`importTemplates` returns true; `renderTemplate` (`packages/core/src/templates/template-renderer.ts:23`) throws `TypeError: template.replace is not a function`. A scalar section list (`enabledSections.affected=7`) throws after language/custom sections already changed. UI import confirmation exists (`SettingsDialog.vue:1117`–`:1152`); this requires user file selection/confirmation and is not remote XSS. Store persistence (`useTemplateStore.ts:252`) can retain bad state, although a reload was not part of the probe.

**Impact:** user-imported template data breaks output and failed import can corrupt current preferences. **Fix/acceptance:** fully validate version, language, string-valued section map and section-ID arrays before any mutation; invalid import returns a useful error and preserves exact prior state; test malformed nested values and valid export/import round trip. Intentional custom text remains allowed.

### CRIT-2, DX-7, TEST-1–TEST-5: enforce meaningful checks

**Impact:** a real assertion regression can be tolerated and deployed. This is supported by YAML and protection responses; current passing assertions are not reclassified as failures. GitHub documents that step-level [continue-on-error](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepscontinue-on-error) prevents a step failure from failing the job.

**Fix:** required assertion jobs, advisory coverage separated if policy still calls for it, and deployment requiring checks for the same SHA. Establish achievable coverage baselines and stricter critical-path thresholds; do not simply demand unattained 90/80/40 figures. Broaden root lint to core/CLI. Replace direct-emitter assertions with actual input/click behavior and meaningful Vuetify stubs/components. Add focused tests for worker-state coordination, URL restore, history/version changes, formula/export agreement and built CLI resources.

**Acceptance:** deliberately broken calculation/UI behavior fails a required check and cannot publish that SHA; reduced coverage below an adopted baseline fails; each package is linted; removing a button handler breaks its test. Tests for NEW-01–NEW-09 should fail against this checkout before the corresponding repair. Existing E2E `phase37-subcontinental.spec.ts:478`–`:505` claims frequency/count verification but only checks row visibility/cell count; assert independent fixture values too. Target direct tests at existing components/composables, not deleted `useGeneVariants`.

### CRIT-4: distribution-aware CLI dependency reproduction

The CLI is private with a `workspace:*` core dependency (`packages/cli/package.json:5`, `:15`); README documents cloning/installing, and the latest release has no executable asset. tsdown normally [externalizes declared runtime dependencies](https://tsdown.dev/options/dependencies). Built CLI imports commander, core, p-limit and prompts in addition to Zod. Their externalization is expected for an installed Node package, not proof of a broken standalone executable.

**Reproduction:** `node packages/cli/dist/cli.mjs --help` works in the repository. Copying only that file to an empty `/tmp` directory fails first on commander. A controlled layout supplying just its declared direct dependency packages (symlinked to their real installed trees, preserving their own dependencies) then fails specifically on **Zod**, because CLI imports it without declaring it. Adding a Zod link makes help work. This models strict dependency visibility, not a real npm publication, which private/workspace settings do not currently support.

**Impact:** a phantom direct dependency under strict package layouts; low urgency for current workspace use. **Fix:** declare Zod directly or bundle that import, then document intended distribution. **Acceptance:** strict isolated package layout can execute help and fixture query/clinical text without root hoisting; a raw one-file copy need only work if explicitly made a supported artifact. NEW-09 remains an independent, currently reproducible workspace failure.

### A11Y-1–A11Y-4: keyboard access, focus, and recovery

**Impact:** keyboard users cannot directly activate per-population row/bar drilldowns, and step changes lose a useful focus location. Browser testing used the production build with deterministic API fixtures. Eight table rows and eight chart groups lacked focusability/roles; pointer activation opened the respective dialogs. Existing nested expansion controls and screen-reader announcements do not provide the same drilldown action. [WCAG keyboard guidance](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) concerns equivalent functionality, not mandatory `role=button` on every table row.

**Fix/acceptance:** provide native, named buttons/links within table cells or another keyboard equivalent without destroying table semantics; chart controls support Tab/Enter/Space and focus indication; test modal opening and focus return. After step transitions, focus the new heading/first relevant control while retaining announcements; verify forward/back/validation and mobile layouts. For A11Y-4, add a recoverable unexpected-error state only after choosing what state can safely survive; injected render failure should show recovery and preserve a usable restart path. Absence of a global boundary alone did not prove all errors cause a white screen.

### DX-4: correct generated dataset attribution

**Impact:** v2/v3 calculations generate German and English strings claiming “gnomAD v4” (`useTextGenerator.ts:202`–`:203`). **Fix:** obtain display name from `data.result.version` using config. **Acceptance:** both languages identify v2.1.1/v3.1.2/v4.1 correctly; default-assumption and literature attribution remain explicit. Do not infer output accuracy from a correctly labelled results card.

### Lower-priority maintenance and optional improvements

| IDs | Concrete evidence/trigger and impact | Recommended change and acceptance |
|---|---|---|
| ARCH-1, ARCH-2, ARCH-3 | Large results component, core color strings, repeated global aggregation; modifications require editing multiple places. | Extract coherent results/export sections and explicit shared aggregation; map colors in web. Accept unchanged fixtures, cross-platform results and keyboard behavior, no new platform import in core. No refactor justified solely by line count. |
| ARCH-4, A11Y-4 | Cached singleton lacks reset; PWA media listener (`usePwaInstall.ts:77`–`:93`) and hourly interval (`usePwaUpdate.ts:49`–`:55`) lack complete disposal on unmount. Root-lifetime use limits demonstrated impact. | Define ownership/dispose/reset; acceptance mount/unmount/remount yields one active watcher/listener/timer and handles offline update rejection. No production leak magnitude measured. |
| SEC-3 | No source CSP or observed production CSP header; no exploitable sink established. | Test a constrained policy accounting for inline bootstrap/styles, workers, API origins and downloads before enforcing. Accept normal app/PWA/export flow with no unintended violations. Optional hardening. |
| SEC-4 | Missing runtime configs fetched from mutable main despite HTTPS/schema checks. | If release reproducibility required, pin reviewed config version/hash and export provenance; validate returned symbol. Accept changed unpinned data cannot silently alter a pinned analysis; bundled and runtime paths retain validation. |
| BUILD-3 | Broad status-0 allowance; obsolete gnomAD/ClinGen runtime rules (`vite.config.ts:75`, `:90`) miss POST and actual CSV/download URLs. | Remove misleading rules or implement/document actual offline policy; do not naively cache GraphQL POST with Cache API. Accept offline tests for actual endpoints and no promise of unused 24h response caching. |
| BUILD-4, BUILD-5, TEST-3 | Bare tsc graph differs from root script; unused checks/lint vary. | Align documented commands/project references and supported checks. Accept deliberate CLI type errors fail advertised check; intentional unused/lint violations fail whichever policy is adopted. |
| PERF-1–PERF-4 | Measured main JS/CSS/font footprint and eager workbook writer on every first visit. | Prefer explicit Vuetify registration and lazy export boundary; consider per-icon SVG and chunks only with measured benefit. Accept preserved E2E/export fixtures and recorded before/after initial transfer/module graph. No fixed KB savings promised. |
| PERF-5, PERF-6 | Getter recomputes on invalidation; six URL watches may repeat synchronization. No user-visible delay measured. | Optional profiling only; if optimized, acceptance is fewer measured serializations/updates with identical log stats and URL restoration. Not correctness defects. |
| DX-1, DX-8, DX-9 | No local hooks, repeated installs in main workflows, unused direct jsdom. | Optional hooks/cache/dependency pruning after confirming consumers. Accept hook behavior, valid lock-key invalidation and measured CI benefit, and clean install/tests after removal. Required CI remains authoritative. |
| DX-3 | Stale README image/path/Node floor, docs contributor tree and CLAUDE CLI/tool descriptions; CLI prints old 1.5.0. | Update published setup/layout/version provenance from manifests. Accept fresh clone instructions work with a compatible toolchain, image resolves, and CLI version equals manifest. Installed tsdown requires Node `^22.18.0 || >=24.11.0`; do not promise Node 18 support based on old text. [Current Vite setup requirements](https://vite.dev/guide/). |
| DX-5 | Hardcoded submissions endpoint equals current configured endpoints. | Centralize alongside NEW-05 assembly fix; accept every version uses its configured endpoint. No present wrong-endpoint failure asserted. |
| DX-6 | UI English while generated letters DE/EN. | Translate UI only if product scope calls for it; acceptance language consistently covers labels/errors/accessible names. Optional improvement, not mixed-language calculation defect. |

## Verification commands and outcomes

Commands executed from the original checkout unless marked clean. Temporary logs, coverage, browser traces and diagnostic scripts stayed under `/tmp/gnomad-review` or `/tmp/gnomad-*`; normal build outputs are ignored. This report is the only new source-diff artifact. No fixes, dependency upgrades, commits, pushes, issues, PRs, messages to third parties, releases or settings changes were made.

| Exact command/check | Outcome |
|---|---|
| `git status --short`; `git branch --show-current`; `git rev-parse HEAD`; `date --iso-8601=seconds` | Baseline above; April file was already untracked. |
| `git fetch origin`; `git rev-parse origin/main`; `git rev-list --left-right --count HEAD...origin/main`; `git show --stat origin/main` | Read-only remote tracking update; one screenshot commit behind. |
| `git log --since=2026-04-08T00:00:00 --format='%H %aI %s' origin/main`; `git diff a44f326f689a7c51a76cfe30f9bfaca4ccb1a53c..HEAD --stat`; `git show 79cbf068...`; targeted `git blame` | Historical changes verified, not inferred from versions. |
| `gh pr list --state all --limit 20 --json number,title,state,mergedAt,headRefName,baseRefName,url` | Current PR states above. |
| `gh api repos/berntpopp/gnomad-carrier-frequency/dependabot/alerts --paginate`; analogous `/branches/main/protection`, `/rulesets`, `/releases/latest` | 62 fixed/0 open; unprotected; no rulesets; latest release no uploaded assets. |
| `gh release list --limit 10`; `gh run list --limit 30 --json databaseId,workflowName,headSha,status,conclusion,event,url,createdAt`; `gh run view 34861630319 --log`; `gh run view 34861115409 --log` | Success conclusions interpreted using job logs, including tolerated thresholds and PR-only E2E. |
| `bun install --frozen-lockfile` | Original exit 0/no changes; fresh archive exit 0/753 installed. |
| `git archive HEAD \| tar -x -C /tmp/gnomad-review/clean-checkout` | Exact tracked snapshot; no new branch or checkout. |
| `bun audit --json` (original + clean); `bun pm ls --all`; Node filesystem/semver comparison against 62 returned advisory ranges | Audit `{}`/exit 0; clean actual installed ranges have zero vulnerable matches. Stale original extras separately identified. |
| `bun run lint`; `bun run format:check`; `bun run typecheck`; `bun run build`; `bun run docs:build` | Each original command exit 0. Typecheck includes CLI; lint scope limited to web. |
| `bun scripts/validate-gene-configs.ts` (clean) | Exit 0; CFTR (2 profiles), GJB2 and HEXA (1 each) all pass schema validation. This does not validate their scientific assertions. |
| `bun run ci` (clean) | Exit 0: lint, format, typecheck, core/CLI/web build and docs. Warnings include ignored VitePress/Rolldown operations; missing preload artifacts separately reproduced. |
| `bun run test --run` | Final original and clean: exit 0, **35 files / 530 tests passed**. Initial original run overlapped a clean-output build and transiently failed four CLI suites resolving dist modules; rerun after build passed. This scheduling artifact is not classified as a source defect. |
| `bun run --filter @gnomad-cf/core test -- --coverage --coverage.reportsDirectory=/tmp/gnomad-review/clean-coverage-core` (clean) | 10 files / 263 tests pass; exit 1 solely line threshold. |
| `bun run --filter @gnomad-cf/cli test -- --coverage --coverage.reportsDirectory=/tmp/gnomad-review/clean-coverage-cli` (clean) | 4 files / 79 tests pass; exit 1 solely line threshold. |
| `bun run --filter gnomad-cf-web test -- --coverage --coverage.reportsDirectory=/tmp/gnomad-review/clean-coverage-web` (clean) | 21 files / 188 tests pass; exit 1 solely line threshold. Original coverage runs used the same commands with `coverage-*` directories and agreed numerically. |
| `CI=1 bunx playwright test --output=/tmp/gnomad-review/playwright-results --reporter=line` (original) | Exit 0: 30 passed, 1 flaky passing retry; 31 cases, approximately 1 minute. Flaky case: Orphanet link accessibility at phase36:746, timed out reaching frequency step. |
| `CI=1 bunx playwright test --output=/tmp/gnomad-review/clean-playwright-results --reporter=line` (clean) | Exit 0: **29 passed, 2 flaky passing retry**, 31 cases, 54.5 s. Flaky cases phase36:558 (Orphanet link), url-sharing:157 (restore Step 4). This is not 31 first-attempt passes. |
| `node packages/cli/dist/cli.mjs --version`; built `loadTemplateContent('en'/'de')` import | Version 1.5.0; both template loads ENOENT on clean and original builds. |
| `node /tmp/gnomad-architecture-probe.cjs`; `bun /tmp/gnomad-review-calculations-check.ts` | Actual-source/real-Vue state probes and independent numeric/export fixtures reproduced findings. Dependencies mocked only to isolate scheduling/API data; no live clinical test. |
| Helper-only GraphQL encode/decode/build/parse and actual Pinia template imports | Confirmed altered helper AST but disconnected URL route; confirmed invalid import/render/partial mutation. No attack requests. |
| `node /tmp/gnomad-review/bundle-graph.mjs`; `node /tmp/gnomad-review/clean-bundle-graph.mjs` (Vite `generateBundle` module capture, outputs `/tmp`) | Original/clean asset hashes identical; single VueUse 14.3.0 application module family; docs VueUse absent. |
| `node /tmp/gnomad-a11y-browser.mjs`; `node /tmp/gnomad-a11y-touch.mjs`; `node /tmp/gnomad-review/check-docs.mjs` against local previews | Keyboard/focus findings, mobile tap and width checked; docs missing preload 404 but hydration/navigation pass. |
| `gh run view 34089129888 --json jobs,conclusion,url,headSha`; read-only alternate-worktree `git diff --quiet -- public/data/clingen-gene-validity.csv` | Scheduled updater commit skipped; wrong-path diagnostic file untracked and diff returns 0. Full scheduled log request returned empty output. |
| `curl -sSI https://gnomad-carrier-frequency.kidney-genetics.org/` | HTTP 200, GitHub Pages response; no CSP header in returned response. |

### Coverage measurements (clean Vitest 4.1.11 / V8)

| Workspace | Statements | Branches | Functions | Lines | Configured line floor | Result |
|---|---:|---:|---:|---:|---:|---|
| Core | 43.88% | 48.75% | 47.88% | 42.92% | 90% | Threshold failure; 263 assertions pass |
| CLI | 28.21% | 26.96% | 45.45% | 28.17% | 80% | Threshold failure; 79 assertions pass |
| Web | 34.12% | 26.56% | 30.03% | 34.74% | 40% | Threshold failure; 188 assertions pass |

These are **separate workspace coverage scopes**, not a meaningful weighted overall percentage. Core's `frequency-calc.ts` and `source-frequency.ts` are both 0% in its own suite. Cross-workspace tests exercise some aggregation indirectly; that does not supply independent expected-value coverage for all branches. Web composables together: 23.86% lines / 10.62% branches. Specific line/branch values: carrier-frequency composable 38.03%/5.33%, URL state 16.77%/3.63%, wizard 39.13%/5.40%. Main bootstrap/API modules are excluded by web coverage config. Browser tests are not counted in these V8 unit percentages.

### Measured bundle and cache behavior

| Artifact | Raw build size | Build-reported gzip |
|---|---:|---:|
| Main JS `index-ramyoWNo.js` | 1,066.13 kB | 322.83 kB |
| Main CSS `index-B2Ga-2zl.css` | 838.75 kB | 119.12 kB |
| Worker `variant-worker-DWR46YmD.js` | 85.59 kB | Not reported |
| Workbox-window chunk | 5.65 kB | 2.20 kB |
| MDI WOFF2 | 403.21 kB | Not reported |
| CLI `cli.mjs` | 52.60 kB | 15.13 kB |

PWA build reports **25 precache entries / 2,467.77 KiB**. These are emitted/precache measurements, not throttled first-load timings or installed storage quota usage. Font fallback WOFF/TTF/EOT are also emitted (587.98/1,307.66/1,307.88 kB) but are not summed as normal modern-browser downloads. No empirical counterfactual bundle savings or TTN latency improvement percentage is asserted.

Module evidence separates the app's root VueUse 14.3.0 from VitePress's nested 12.8.2. Library module `renderedLength` attribution is before final minification and must not be treated as gzip savings. The workbook writer is eager; dynamic splitting is measurable work to propose, not a promised byte reduction.

Workbox routes default to GET unless configured otherwise ([official routing documentation](https://developer.chrome.com/docs/workbox/modules/workbox-routing)); the gnomAD worker requests POST (`variant-worker.ts:159`). The ClinGen `/api` rule misses actual `/data` and `/kb/gene-validity/download` fetches (`useClingenValidity.ts:12`, `:116`, `:124`). Actual variant caching is IndexedDB. It is keyed by gene/dataset/reference (`workers/cache.ts:18`) and has manual refresh/cache badge (`StepResults.vue:62`), but no TTL/capacity eviction and no query-schema/ClinVar revision key. Cache writes failing are caught and calculations still return. Indefinite freshness is an explicit April design decision, not proven corruption; whether to adopt an age/schema policy remains a product/scientific question. No quota exhaustion was induced.

Chrome's [opaque-response documentation](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime/) describes browser-specific storage padding, not universal response bytes. Current source does not request these data using no-cors, so the old ~7 MB quota assertion is not a measured current problem.

## Calculation assumptions, provenance, and remaining domain limits

The review inspected the complete main variant/filter/aggregation flow, core formulas, worker and CLI global calculations, export conversion and clinical text. It did not validate gnomAD scientifically for each supported disease.

- **Denominators:** main paths prefer joint AC/AN, otherwise combine available exome/genome counts. Aggregation sums each variant's AC/AN; it does not simply divide summed AC by summed AN. Reported `alleleNumber=maxAN` is a sample-size summary and is **not** a valid denominator for the summed allele count. gnomAD v4.1 introduced joint AN across called sites, supporting the importance of joint-first handling ([official release explanation](https://gnomad.broadinstitute.org/news/2024-04-gnomad-v4-1)). Missing/joint/fallback branches still need broader independent fixtures.
- **Formula assumptions:** homozygote exclusion uses observed heterozygote counts/VCR and an independence-based GCR combination; otherwise HWE `2q(1−q)` or simplified `2q` uses summed AF. Prevalence uses raw `q²`, with configured penetrance adjustment. These are model choices under autosomal-recessive assumptions, not phase-aware per-individual compound-heterozygote counts or universal clinical recurrence predictions. Matching algebraic unit tests does not validate pathogenicity assignments, linkage, ancestry representativeness or penetrance.
- **Zero vs missing:** executed fixture with AC=0/AN=10,000 and AC=0/AN=0 produces null aggregated CF/prevalence in both, while preserving maxAN 10,000 versus 0. UI uses “Not detected.” This is a documented semantic ambiguity to clarify, not evidence that a observed zero proves zero biological risk. All-homozygote VCR zero similarly becomes null.
- **Defaults/cross-platform differences:** web may use a labelled 1% fallback when no qualifying pathogenic variants remain, while CLI returns null. Treat it as a prior assumption, not a measured gene frequency; export metadata should expose `usingDefault`/source explicitly. NEW-08 includes reproducibility acceptance for such cases.
- **Dataset selection:** primary web worker and CLI correctly map v2→gnomad_r2_1/GRCh37, v3→gnomad_r3/GRCh38, v4→gnomad_r4/GRCh38. NEW-05 is the exception in submissions; DX-4 is a text-attribution exception. Population configuration varies by dataset and v2 subcontinental groups are separately represented.
- **Filtering:** manual/quality exclusions are applied after pathogenicity selection in worker; ClinVar and LoF overlap is classified. Whether a gene's disease mechanism supports every LoF/missense/ClinVar inclusion remains a clinical content review. Bundled gene configs have schema checks but schema validity is not scientific validity.
- **Unpromoted CLI observations:** `clinical-formatter.ts:122`–`:135` always uses CF/4 even for its optional affected perspective; commands do not expose that perspective, and loader failure prevents full command-level validation. CLI numeric flags parse penetrance without the config-file schema's full range validation (`commands/query.ts:67`, `config/user-config.ts:141`); command defaults can override saved defaults. These warrant focused follow-up, but no live erroneous query/output was claimed or counted as an additional verified finding.

## Evidence-backed strengths and April strength revalidation

| Prior positive assertion | Current evidence-based assessment |
|---|---|
| Zero production any / validation everywhere | Strong static typing and clean typecheck retained; scanned production code has no explicit any annotations. `response.json()` assertions and malformed import demonstrate that this does not imply runtime validation everywhere. No absolute type-safety/security guarantee. |
| All thresholds/config; no magic numbers | Typed JSON configuration is useful (`packages/core/src/config/index.ts:1`, config files), but duplicated `/4`, `AF*2` and hardcoded version labels disprove the absolute “all” claim. |
| Golden tests anchored to real CFTR/GJB2 data | `packages/core/tests/carrier-frequency.test.ts:12`, `:36`–`:44` verify arithmetic for labelled q values. They do not cite an exact variant set, release extraction or independently curated dataset; real-world calibration is **unverified**, not established by “GOLDEN” in test names. |
| Screen-reader excellence | Announcements and named controls are real; keyboard/focus failures limit any blanket excellence assertion. Browser checks confirm both strengths and omissions. |
| Clean neutral core | No runtime Vue/Vuetify or DOM access found in core; string color mappings are semantic debt, not platform imports. Node-only template loader uses dynamic built-ins and is excluded from web behavior, but its built resource path is defective. |
| Seven comprehensive E2E tests | Current Chromium suite contains **31 cases**, not seven. Fixtures cover wizard/URL/history/Orphanet/subcontinental scenarios; 2 clean-run flakes and weak numerical assertions limit comprehensiveness. |
| Responsive design | Browser result/chart at 375 px had document/body width 375, no page overflow; responsive dialogs/useDisplay are present. NEW-12 also identifies a touch-action gap. This is a checked viewport, not every device/orientation. |
| Bounded history/log storage | Buffer bounds in `useLogStore.ts:22`, `:75` and history actions constrain retained entries. This is not a byte quota guarantee or a bound on the separate IndexedDB variant cache. |
| Smart API PWA caching | App-shell precache, IndexedDB cache and refresh affordance work structurally. gnomAD/ClinGen Workbox rules do not match their active requests, so the old endpoint-caching praise was overbroad. |
| Colorblind-safe chart palette | Okabe–Ito-style palette/light-dark mapping exists in chart config; palette choice alone is not proof of all contrast, color-vision or assistive-technology requirements. No full color-vision evaluation performed. |

Other substantiated strengths include joint-first count handling, deterministic fixture interception, explicit research-use labeling (`README.md:14`), complete clean build/typecheck, export-writer regression tests, and current security updates confirmed against both locked and clean installed dependencies.

## Prioritized remediation plan

1. **Correct outputs and state first:** NEW-01/02/03/04; then NEW-05/06/07/08/13 and DX-4. Add independent numerical/state regressions before repairs. Keep index status, dataset, filters, quality settings, inclusion set and result revision together as explicit analysis provenance.
2. **Make those checks enforceable:** CRIT-2/DX-7, TEST-1/2/4/5. Gate deployment on assertion/E2E success for the exact SHA; explicitly decide how advisory coverage differs from required checks. Nothing in this audit changes GitHub settings.
3. **Repair bounded feature failures/accessibility:** NEW-09/12, SEC-1, A11Y-1/2/3. Treat packaging resources and input validation separately from bundle optimization. Fix docs asset compatibility NEW-10 and screenshot cache NEW-11 without reintroducing vulnerable dependencies.
4. **Then address maintainability and measured performance:** shared calculation/formatting boundaries, root lint, documentation/provenance, scoped cleanup and optional hardening. Use the measured build as baseline before Vuetify/icon/lazy-export work. Hooks, translations, manual chunks and dependency caching are optional decisions, not release blockers by themselves.

## Methodology, limitations, and unresolved questions

Evidence includes current source with line numbers, real Git history, read-only GitHub metadata/logs, frozen installs, clean and existing builds, unit/coverage/E2E runs, module graphs, local browser inspection, and non-destructive actual-source probes. Reviewers' claims were not accepted wholesale: the URL injection path, opaque quota claim, universal white-screen claim, normal calc-toggle failure, duplicate app VueUse, and docs hydration failure were rejected or narrowed based on contrary evidence.

No required install/lint/format/typecheck/build/unit/coverage/Chromium check was unavailable. The selected scheduled ClinGen job’s full text log was empty/unavailable, but its step metadata was accessible. **Coverage targets were not met; E2E had retry-resolved flakes.** No new Lighthouse performance measurement, throttled network benchmark, full TTN stress/heap profile, persistent-storage quota exhaustion, screen-reader audio session, axe sweep, Firefox/WebKit run, every responsive breakpoint, production service-worker upgrade matrix, npm/global publishing trial, or independent disease-by-disease clinical validation was completed. Existing Lighthouse workflow success is recorded only as workflow state, not as a verified numerical performance score. Documentation build success does not establish artifact integrity; the missing preloads are explicitly reported.

Browser and calculation probes use deterministic fixtures; this audit did not send crafted GraphQL to production, alter live accounts, test upstream compromise, or validate every live API schema variant. The report has no exact April commit baseline, so it cannot reliably score changes against that report's numeric grades. Historical “four critical” and scorecard numbers have no transferable rubric and are not reproduced as current ratings.

Open design questions: supported CLI distribution model; acceptable cached annotation age/schema invalidation; explicit distinction between no observation, no data and prior fallback in exported evidence; scope of UI translation; and scientifically supported disease-specific assumptions. None blocks this completed audit. Temporary diagnostic logs/scripts are local evidence aids, not committed project assets; the findings and commands above are self-contained for review.
