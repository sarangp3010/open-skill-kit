# First public release preparation

Historical preparation results below predate the portable-notice/hash changes. Current decisions are in [unresolved owner blockers](UNRESOLVED_BLOCKERS.md). The earlier case-only filename warning was incorrect (underscore versus hyphen); both paths are preserved.

Prepared locally on HEAD `8bb0057`, preserving the existing Phase 5, moderated-submission and founding-review changes. All 42 skills remain unchanged drafts. The 42 reports and 12-skill shortlist were inspected; no actual reviewer, approval, compatibility result or real-agent test was invented. See the [owner summaries](SHORTLIST_REVIEW.md), [checklist and blockers](CHECKLIST.md) and [GitHub permission audit/settings](GITHUB_SETTINGS.md).

## Changes

Added a deterministic owner summary generator (`scripts/release-review.ts`) and release:review/release:check commands. Summaries include each shortlisted package's purpose, exact all-file SHA-256, source status, declared risk, structural quality gaps, specific concerns and follow-up work, authored fixtures versus actual stored evidence, and remaining human/GitHub approval steps. Generation touches only the summary document; freshness checks are read-only and run locally/in CI. Neither operation writes approval records or promotes packages.

A legacy build:marketplace command used a second, older catalog shape and generated downloads for drafts. It now delegates to the same canonical generator and exact-content approval gate used by the marketplace/npm pipeline. It preserves the current typed discovery catalog for labeled source previews, emits a separate approved catalog, and creates static ZIP artifacts only for approved packages. Existing source URLs and browser-local draft ZIP export remain explicitly labeled and usable. The obsolete export schema no longer overwrites the app's current catalog contract.

Added six Playwright flows using disposable **fictional** publication states. They invoke the real generation/export pipeline and route only the static catalog responses to its temporary output; React, navigation and browser ZIP exports run normally. Tests cover approved-only admission, exclusion of drafts/pending packages, every downloaded file and full package digest, rejected proposal/decision handling, withdrawn approvals and removed static archives, stale hashes blocking replacement artifacts, and an unavailable approved catalog refusing to fall back to source drafts. No live GitHub review or actual approval is created. The real ledger and all 42 draft statuses are asserted unchanged after the suite.

Added integration coverage for all 12 owner summaries and reproducibility/snapshot checks around automated report/template/catalog operations, performed in copied temporary repositories to avoid mutating concurrent tests or user work. Strengthened workflow tests for build/deploy dependencies, protected environment name, step-scoped read-token use and release-summary freshness checking. The existing full local suite now also exercises the legacy export and the existing free dependency advisory audit.

Updated contributor/release entry points and current unreleased documentation. Added exact desired owner settings, with all remote values explicitly unverified; no repository setting, collaborator, secret, visibility, PR, commit, push, package publication or deployment was changed.

## Validation

`pnpm validate:all` passes on Node 24.21.0 / pnpm 10.20.0 on macOS:

| Validation                                   | Actual result                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint, Prettier, root/web TypeScript        | PASS                                                                                                                                    |
| Unit/integration/component tests             | **340 pass across 15 files**, including three new release-readiness cases and one strengthened workflow-boundary case                   |
| Playwright                                   | **22 pass**, including six new publication/download flows and all previous typing/history/accessibility/mobile/editor/URL tests         |
| Contribution and source validation           | **42 valid source drafts**, zero pending real proposals, no duplicate normalized bodies                                                 |
| Moderation/founding/release checks           | Zero actual publication decisions; 42 current packets and 12 current owner summaries                                                    |
| Offline evaluation                           | **20 suites / 40 paired comparisons** complete with authored assertions passing and zero differences; no real agents or efficacy claims |
| Links, duplicates, catalog and public assets | PASS                                                                                                                                    |
| Legacy export and normal/Pages builds        | PASS; canonical typed catalogs retained, zero approved static ZIPs, 120 static route entries                                            |
| npm packaging                                | PASS; local tarball contains zero published skills; the actual generated empty-release guard exits 1 as expected, refusing publication  |
| Free dependency audit                        | PASS; registry reports **no known vulnerabilities** at execution time                                                                   |
| Preservation / diff                          | git diff --check passes; HEAD stays 8bb0057; skills, archive, evaluations and catalog/catalog.json have no diff                         |

A limited working-tree credential-pattern scan checked 576 tracked/untracked working-tree files and found no matches. It does not cover ignored secrets, complete history, all credential formats or independent security assurance. Before-public-history review remains an owner responsibility.

The first targeted browser run passed five cases and exposed one new locator expecting a banner phrase that differs from the existing UI. The locator now asserts the real explicit draft/publication disclaimer. The focused six-case rerun and the complete 22-case suite pass. No existing assertions were weakened, no keyboard test was changed to fill, and no arbitrary typing delay was introduced. Upstream Zod annotation, npm environment and terminal-color warnings remain non-blocking. There are **no remaining local validation failures**. Hosted Node 22/Actions, real review/merge evidence and remote controls are unverified; local success is not a claim of hosted CI/deployment success.

New files for this task: scripts/release-review.ts; tests/release-readiness.test.ts; tests/e2e/release-gates.spec.ts; tests/helpers/release-fixture.ts; and docs/launch/{SHORTLIST_REVIEW,CHECKLIST,GITHUB_SETTINGS,PREPARATION_REPORT}.md. Extended existing work: canonical/legacy catalog scripts, synthetic review-fixture helper, community workflow tests, root scripts, local/CI checks, generated-file formatting exclusions, README, changelog, release/npm guidance and implementation status. No runtime dependency, paid service, account or backend was introduced.

## Limitations and blockers

The owner must genuinely review and approve final package contents, resolve the existing licensing-source and case-only filename issues, verify protected reviews/Actions/Pages/reporting controls, inspect final artifacts and explicitly authorize release actions. Current approved catalog/npm contents remain empty; npm's existing empty-release guard prevents publication. Local green checks do not authorize hosting, authenticate a named reviewer, guarantee GitHub policy enforcement or certify skill effectiveness/security/originality.

A stale package causes generation to fail before replacing approved artifacts. Tests confirm the previous artifact retains only its old reviewed bytes; an unsuccessful build must never be deployed. Already downloaded packages cannot be remotely revoked. Source previews remain distinct from published distribution and are not confidential when the repository/site is public.

All existing local work and new preparation changes remain uncommitted for owner review.
