# PR #1 CI investigation — 2026-11-11

## Scope and isolation

Reviewed the complete four-file PR diff from develop `2799067` to head `eaeab02`, its five commits, and the four failed hosted CI runs below. Fixes are uncommitted in the isolated checkout `.open-skill-kit/ci-pr1-eaeab02-Z2LHER` on `ci/develop-validation-release-safety`. The original working tree on `development/marketplace-v1`, including its uncommitted owner-decision work, is preserved. No hosted workflow was dispatched or rerun, and no commit, push, merge, publication, deployment or remote setting change was performed.

## Confirmed failures and resolutions

| Hosted run  | Root cause                                                                                                                                                   | Resolution                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 42899596976 | The event-level moderation guard rejected all PRs targeting develop, including ordinary validation with an empty ledger.                                     | Ordinary develop validation is allowed. The decision-change validator now explicitly rejects any ledger change outside main, before GitHub approval verification. Historical records still require authorized current-head reviews and merged main PRs.                                                                                         |
| 42899820365 | Two tests dereferenced removed Pages jobs; the five-pass founding filesystem integration exceeded Vitest's default 5-second budget (5.254 seconds reported). | Assert deployment jobs/actions/permissions are absent, across all workflows. Copy only founding-review inputs, in parallel, instead of generated catalogs/reports. Retain the existing PR's per-test 20-second integration budget for five complete 42-package scans; no further timeout increase, sleeps, skipped tests or relaxed assertions. |
| 42900248010 | The revised workflow assertions were not Prettier-formatted.                                                                                                 | Format edited files and run the full formatting check.                                                                                                                                                                                                                                                                                          |
| 42900591147 | Workflow event values were typed unknown and dereferenced as objects.                                                                                        | Model optional push/pull_request branch configuration explicitly; missing configuration still fails the exact branch-array assertions. No any suppression or TypeScript bypass.                                                                                                                                                                 |

Full local validation also found a clean-install provenance failure on macOS: the committed installed-dependency inventory retained 67 obsolete versions from earlier dependency trees. Regenerated it from the frozen lockfile installation: no added versions, no lockfile changes and no skill/package hash changes. This is a local finding; the hosted Linux job had not reached licensing and uses the existing cross-platform inventory comparison.

## Changes

- `scripts/check-moderation.ts`: require the PR base branch when validating changed publication decisions; restrict changes to main without rejecting unchanged develop validation.
- `tests/moderated-submissions.test.ts`: cover unchanged develop ledgers, addition/removal/withdrawal rejection, valid main changes, and valid-looking GitHub approvals targeting develop or another branch being rejected. Existing authorization, historical approval, exact-head and withdrawal checks remain.
- `tests/community.test.ts`: fix workflow event typing; remove the former deployment permission exception; reject Pages actions and deployment environments across workflows. Keep main/develop branch, read-token isolation, runner, action pin and frozen-install assertions.
- `tests/founding-review.test.ts`: avoid copying generated output and parallelize independent input copies, retaining all freshness, mutation, ledger isolation and unexpected-output checks.
- `docs/launch/PROVENANCE_INVENTORY.json`: refresh the installed inventory from a clean frozen install, removing obsolete dependency records and their obsolete notice cases.
- `docs/launch/GITHUB_SETTINGS.md`, `docs/launch/CHECKLIST.md`: remove obsolete automatic deployment guidance; explain validation/publication separation, future hosting authorization and account-level spending controls.
- `docs/IMPLEMENTATION_STATUS.md` and this report: record actual findings, validation and limitations.

The PR's workflow branch filters and deletion of Pages jobs are retained unchanged. No workflow or package dependency has been added by this fix.

## Local validation

Environment: macOS arm64, Node **22.23.4** (matching the observed CI version), pnpm **10.20.0**, clean frozen install with lifecycle scripts disabled, Chromium Playwright. Full `pnpm validate:all` **PASS**. Every command in that suite completed:

| Command                   | Result                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| pnpm lint                 | PASS                                                                                                          |
| pnpm format:check         | PASS                                                                                                          |
| pnpm typecheck            | PASS, root and React app                                                                                      |
| pnpm test                 | PASS, 364 tests / 17 files                                                                                    |
| pnpm portability:check    | PASS, repository filename checks                                                                              |
| pnpm licensing:check      | PASS, clean-install inventory                                                                                 |
| pnpm contributions:check  | PASS                                                                                                          |
| pnpm moderation:check     | PASS, zero real decisions                                                                                     |
| pnpm founding:check       | PASS, all 42 review packages                                                                                  |
| pnpm release:check        | PASS                                                                                                          |
| pnpm evaluate:fixtures    | PASS, 20 offline suites / 40 paired comparisons                                                               |
| pnpm validate:skills      | PASS, 42 packages                                                                                             |
| pnpm check:links          | PASS                                                                                                          |
| pnpm check:duplicates     | PASS                                                                                                          |
| pnpm catalog:check        | PASS                                                                                                          |
| pnpm build:marketplace    | PASS, moderated exporter                                                                                      |
| pnpm build                | PASS, 120 static route entries                                                                                |
| pnpm catalog:check-assets | PASS                                                                                                          |
| pnpm test:e2e             | PASS, 22 tests, including light/dark accessibility, keyboard/history, mobile, downloads and publication gates |
| pnpm pack:npm             | PASS, local artifact only                                                                                     |
| pnpm build:pages          | PASS, local subpath build only                                                                                |
| pnpm audit:dependencies   | PASS, no known vulnerabilities returned                                                                       |
| pnpm licensing:artifacts  | PASS                                                                                                          |

Additional local CI-event-path moderation checks for main and develop both pass using the real empty ledger and develop base SHA. Git diff checks confirm skills, real approval ledger and generated catalog are unchanged. Temporary synthetic test approvals are isolated fixtures, never real approval records.

## Security review and remaining limits

No automatic deployment or publication exists. All jobs remain read-only, checkout credentials are not persisted, no privileged pull_request_target/workflow_run path is introduced, and the read token remains confined to moderation. New/changed publication decisions require main and this PR's identity; genuine current-head independent authorized reviews and authorized historical merges remain required. Structural/fixture checks do not manufacture human approval or agent-effectiveness evidence.

No local validation failure remains. Hosted confirmation of these uncommitted changes is pending approval to commit/push; existing remote checks still describe eaeab02. Native Linux/Windows execution was not performed locally. Private-repository Windows/macOS jobs remain deliberately gated off; skipped jobs are not evidence.

No Actions runs or paid features were introduced. Standard public runners are free; private runs consume included allowances and can incur overage depending on account configuration. A workflow cannot enforce an account-wide $0 spending guarantee: the owner must confirm an applicable stop-usage budget before paid overage. No billing settings were changed or verified. See [GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) and [budget enforcement](https://docs.github.com/en/billing/how-tos/set-up-budgets).

Existing launch/content/provenance owner decisions remain separate from CI readiness; all 42 skills remain drafts and the publication ledger remains empty. Recommendation: the local fixes are ready for maintainer review, pending an authorized push and fresh hosted validation; this is not release or merge authorization.

## Local-only follow-up: release-readiness timeouts

After separate explicit approvals, 557e6c27b9829e65cf95ad86a0af3cacf5c3aaf3 was committed and normally pushed to the existing branch. PR #1 contains that head and remains an open draft. Hosted CI run 43038084702 then failed at pnpm test: two tests in tests/release-readiness.test.ts (original lines 28 and 51) exceeded 5000 ms, at 5008 and 5047 ms respectively. Dependency security passed; subsequent validation steps were skipped. No automatic retry was requested. This follow-up is local only under the owner's new strict $0/no-hosted-operations instruction.

### Diagnosis and changes

Both tests bundled five full-library scans into one default 5-second case. The summary case called ownerReleaseReview, foundingReports and generateOwnerReview; both owner calls independently check founding reports and scan packages again through moderation. The mutation case performed foundingReports, generateFoundingReview, generateOwnerReview and regenerateCatalog serially, as well as copying the fixture tree and re-reading all packages. Local baseline timings (1534/1730 ms) did not reproduce the hosted runner's 5-second failures; duplicated filesystem/validation work explains the timing sensitivity, without establishing any exact guarantee for another machine.

Only tests/release-readiness.test.ts changed in code. The summary case now uses the returned content of generateOwnerReview(root, true), retaining exact freshness validation and all twelve content/hash/risk/evidence assertions while eliminating duplicate summary generation. The operation test now independently exercises founding generation, owner generation and catalog validation in separate temporary trees. Each retains all 42 package hash checks, draft-only catalog and empty published output checks, unsigned human fields, ledger/attribution byte comparisons and maintainer-record directory checks. Recorded packet hashes are checked against actual source bytes both before and after each operation. Independent fixture copies run in parallel. No production validation, workflow, schema, package, publication rule, timeout or assertion was disabled. Default 5000 ms timeouts remain unchanged.

### Offline results

Node 22.23.4 / pnpm 10.20.0; installed tools only, npm_config_offline=true. All **22 offline commands** from the original local suite pass: lint, format:check, typecheck, test, portability:check, licensing:check, contributions:check, moderation:check, founding:check, release:check, evaluate:fixtures, validate:skills, check:links, check:duplicates, catalog:check, build:marketplace, build, catalog:check-assets, test:e2e, pack:npm, build:pages and licensing:artifacts. This includes **366 unit/integration tests / 17 files**, **22 Playwright tests** including accessibility, and all 42 source packages. Three additional focused runs passed all five release-readiness cases in each run, with the slowest case about 1.1 seconds locally.

The external advisory API command audit:dependencies was deliberately not run again. This is the complete offline subset, not a claim that pnpm validate:all (which contacts that API) ran under the new restriction. Final documentation formatting and link checks also pass. Skills, real publication decisions and generated catalog remain unchanged. The original separate working tree and its owner-decision work remain preserved.

### Spending and authorization boundary

No commit, push, hosted run, remote API query, deployment, publication or GitHub setting change was performed during this follow-up. Current account billing controls have not been verified, so no further push or hosted Actions operation is authorized. Continue using these existing local checks as the $0 alternative. Before any future operation that could incur charges, stop for explicit owner approval; previous push approval is not a spending approval. No application behavior or genuine review/effectiveness claim is changed. Hosted confirmation of the local test refactor remains pending and must not be triggered until the owner's billing condition and separate authorization are satisfied.
