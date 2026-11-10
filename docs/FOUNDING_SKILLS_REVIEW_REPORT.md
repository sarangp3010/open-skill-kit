# Founding Skills Review implementation report

Implemented locally on 2026-11-10 against HEAD `8bb0057`, preserving all existing uncommitted Phase 5 and moderated-submission work. No source skill, archive, evaluation artifact or canonical discovery catalog was changed. No commit, push, PR, real approval, publication, deployment or GitHub setting change was performed.

## Review findings

[All 42 exact-package review packets and the proposed shortlist](../reviews/founding/README.md) are reproducible preliminary assistant triage. Each packet includes both schema profiles, all existing structural-quality checks, exact full-package and individual file hashes, authored boundaries, task-specific concerns and follow-up actions, declared provenance and normalized copy indicators, practical usefulness, example/case coverage, platform declarations versus completed testing, and fixture/evaluation limitations.

| Finding                                | Actual result                                   | Interpretation                                                                               |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Catalog and publication schema         | 42/42 pass both                                 | Structurally valid candidates; no human approval                                             |
| Structural quality                     | 19 score 100, 7 score 90, 16 score 85           | Completeness signals, not agent effectiveness                                                |
| Declared risk                          | 22 low, 11 medium, 9 high                       | Authored classification plus preliminary content concerns, not independent safety assessment |
| Normalized instruction-body duplicates | Zero exact matches                              | Semantic overlap, licensing and external originality still require review                    |
| Platform behavior evidence             | No completed records for any of the 42 packages | Four documented adapters do not establish tested compatibility                               |
| Fixture definitions                    | 20 suites / 40 paired scenarios                 | Authored expectations; no model was called                                                   |
| Stored completed artifact              | One Code Reviewer fixture report                | Harness replay, not real-agent effectiveness                                                 |
| Maintainer approval records            | Zero                                            | All 42 remain drafts; published catalog and npm bundle contain zero skills                   |

Code Reviewer / Code Review Expert, Resume Reviewer / Resume Tailoring Assistant, and weekly planning versus retrospective review need clear task differentiation. Care, legal, accounting, construction, energy, fleet, manufacturing, public-administration and similar consequential drafts need appropriate qualified review regardless of structural score. Missing discovery metadata or output structure accounts for lower scores; packets retain the precise individual check results rather than hiding them.

The proposed 12-skill shortlist spans six broad sectors and ten existing collections. These are candidates for owner review, not approved launch content:

| Broad sector          | Proposed candidates                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Technology            | Code Reviewer; SQL Query Reviewer; React Component Designer; Accessibility Reviewer; UX Auditor |
| Education             | Personal Tutor; Rubric Alignment Reviewer                                                       |
| People and careers    | Resume Reviewer                                                                                 |
| Business operations   | Campaign Planner                                                                                |
| Personal productivity | Weekly Review Coach; Meeting Action Extractor                                                   |
| Retail                | Stock Count Reconciler                                                                          |

Selection favors bounded tasks using supplied text, lower declared risk, at least 85 structural points and distinct use cases. It is not a measured ranking. Each candidate still needs resolution of its packet's findings, real human review and honest retention of testing limitations. No compatibility, identity, security or effectiveness badge is granted.

## Implemented workflow

- `pnpm founding:review`: generate deterministic reports and the review summary only; never write approval records or source metadata.
- `pnpm founding:check`: read-only freshness checking, included in GitHub CI and `pnpm validate:all`.
- `pnpm --silent founding:prepare <sector/slug>`: print an unsigned JSON worksheet with null identity/date/decision/PR and blank human answers. It is deliberately invalid as an approval.
- `pnpm founding:check-review <manual-record.json>`: read-only integrity checking of a genuinely human-completed record. It requires an authorized declared reviewer, nonfuture date, exact package hash, complete answers and matching local evidence. Offline identity remains self-asserted; GitHub review evidence is independently required.

The existing publication ledger now binds approved decisions to a manually completed `reviewRecord` with a raw-file hash. Its fields must match the ledger exactly. Review manifests reproduce the complete publication digest, and source files, fixture definitions, completed report artifacts and additional evidence are checked against current hashes. Traversal, aliases, symlinks, hard links, oversized files, missing evidence and changed hashes fail closed. Withdrawal still excludes a package with unchanged contents; prior records are retained as history. No script creates a human approval as a side effect of generation, validation or a passing score.

The initial trusted-base roster fallback was corrected: if the base has no roster during initial rollout, only the established owner is authorized. The candidate PR's roster cannot authorize its own reviewer. Malformed trusted rosters fail validation. Existing current-head GitHub review, self-review rejection, dismissal/changes-requested handling and authorized merge gates remain intact. CODEOWNERS routes review of the review tree and worksheet; no claim is made that remote required-review settings are enabled.

See the [complete maintainer procedure](founding-skills-review.md) and [human worksheet](../templates/maintainer-review.md).

## Files changed for this task

New files: `scripts/founding-review.ts`; `packages/catalog-indexer/src/maintainer-review.ts` and `package-digest.ts`; `reviews/founding/editorial-notes.json`, its generated README and 42 JSON packets; `reviews/maintainer/README.md` (documentation only); `templates/maintainer-review.md`; `tests/founding-review.test.ts` and `tests/helpers/review-fixture.ts`; this report and `docs/founding-skills-review.md`.

Extended existing local work: schema moderation contracts; indexer publication registry checks and shared all-file digest; contribution duplicate normalization; moderation trusted-roster fallback; root scripts and local/CI freshness checking; CODEOWNERS; formatting exclusions for deterministic artifacts; synthetic npm packaging fixtures; README, contributor/moderation guidance and implementation status. No runtime dependency was added. Existing browser editor, marketplace, evaluation framework and CLI behavior were reused and retained.

## Actual validation

`pnpm validate:all` completed successfully using Node 24.21.0 and pnpm 10.20.0 on macOS:

- Lint, formatting and root/web TypeScript checks pass.
- **336 unit/integration/component tests across 14 files pass**, including 20 new founding-review regressions. Coverage includes unsigned templates, complete 42-skill manifests, deterministic regeneration, freshness and orphan reports, unchanged ledgers, missing/mismatched review records, unauthorized identity declarations, future dates, blank answers, modified package/support/platform-results hashes, revoked approval, draft isolation, evidence traversal/symlink/hard-link rejection, and trusted-base roster fallback.
- **All 16 Playwright tests pass**, including existing keyboard typing/history, marketplace downloads, mobile, accessibility, editor proposal export and unpublished-content isolation. No assertions were weakened or keyboard typing replaced with fill.
- Contribution/moderation/founding checks pass: 42 source packages, zero pending proposals, zero actual publication decisions; all 42 review reports current.
- **20 offline suites / 40 paired comparisons complete**, both arms pass authored assertions and all differences are zero. These are real harness replays of authored data, not model outputs or efficacy evidence. Fresh runtime/error/configuration reports remain in ignored local evaluation output.
- Skill validation, documentation links, duplicate detection, catalog freshness and public assets pass.
- Normal production and GitHub Pages subpath builds pass, producing 120 static route entries. No deployment is invoked.
- npm packing passes with **zero published skills**. Review files and pending submissions are outside distribution. No npm publication occurs.
- `git diff --check` passes; HEAD remains `8bb0057`. Source skills, archives, evaluation artifacts and `catalog/catalog.json` have no diff.

The first focused run identified macOS temporary-directory aliases in the new tests; test setup now uses canonical temporary paths without weakening safety checks. The first lint run caught unused test destructuring; corrected before the complete successful suite. No validation failures remain. Existing upstream Zod annotation, terminal color and npm environment warnings are non-blocking.

## Remaining owner decisions

No launch approval has been fabricated. The owner must inspect the shortlist and all relevant packet findings, choose actual reviewers, resolve domain/licensing/privacy concerns, complete genuine review records and follow the existing approval/merge process for final exact contents. Actual assistant execution, effectiveness, independent originality/security verification and platform behavior testing remain unperformed. Existing Phase 5 licensing-provenance, remote-policy/contact/reporting and case-only documentation filename review items remain documented in [community readiness](community-readiness.md) and [licensing](licensing.md). Local files cannot authenticate a human or prevent an administrator bypassing repository policy.

Everything remains local and uncommitted for owner review.
