# PR #7 historical draft-baseline migration

This temporary admission imports source drafts only. It is not publication approval, ownership verification, legal clearance or release authorization. No skill status, review record or publication decision is written.

## Fixed scope

Only sarangp3010/open-skill-kit (repository ID 1451647247), PR #7, develop into main qualifies. The base and live main must remain ffe6fc876373ea8f3152fff165e234f29a742ed7. Historical identity comes from 8bb0057a860e0dbd1ec4217df6b4786a891ba505; the complete current library is pinned to cd221b2a49579045ecede39942d4d15c44f67c72.

The [manifest](../../scripts/migrations/pr7-historical-drafts.json) records the exact 19 packages, historical/current complete-file digests, individual raw SHA-256 hashes and Git modes. Validation reproduces the manifest from immutable Git objects instead of trusting editable declarations. Each package has seven unchanged historical files plus exactly the retained root LICENSE.txt notice. That addition does not prove ownership or licensing clearance. All 42 source packages, including the other 23, must remain byte-identical drafts.

Only the seven paths in the helper's migrationPaths may change after the snapshot. Every introduced commit is checked, including changes subsequently reverted; final committed and working changes are checked too. Protected workflows, dependencies, inventories, license evidence, release configuration, owner documents, rosters and ledgers cannot piggyback on this migration. Unexpected skill files, symlinks and Git mode changes fail closed.

## Existing enforcement and expiry

The exception applies only to new-source admission. Local moderation, genuine publication/attribution review enforcement, contribution validation, licensing and release gates continue normally. The generated published catalog remains empty; unresolved dependency provenance still blocks release builds. There is no generic flag, environment permission, label or publication importer for this manifest.

GitHub Actions must be validating the exact PR merge checkout. Event identity, merge parents and current PR head/base must agree. The existing pull_request and pull_request_review triggers are supported. Live read-only PR and main-reference requests use existing token permissions; missing/malformed responses or API errors reject admission. No request writes GitHub state.

The live PR must be open and unmerged, with live main still at the exact original base. After merge, those conditions fail even for a replay of an old event. Repeated validation before merge is allowed. These are point-in-time checks; keep existing required checks/protections and reverify the exact reviewed head/base immediately before merging. Repository-authorized changes to the validator itself still require normal human code review.

## Manual procedure

1. Review the complete seven-file implementation and all 19 manifest entries. Confirm the two pinned historical commits are present and the current branch descends from the develop snapshot. Never substitute a different baseline silently.
2. Run the local validation below using the existing validated dependencies; preserve other work and the port 5173 server. No remote dispatch or rerun is needed for local tests.
3. Review the final diff. All skills, workflows, dependencies, inventories, owner files and publication/attribution ledgers must be unchanged. Owner-source freshness is separate; do not regenerate or claim currency of unsigned owner paperwork automatically.
4. The owner performs Git operations manually. Commit/push only after separate approval and confirmation that the existing $0 spending controls cover any automatic CI. Use an ordinary reviewed PR into develop; the feature PR itself receives no migration exception.
5. After the fix reaches develop, PR #7's automatic checks must validate its actual new merge candidate. Do not bypass failed checks or change required protections. Stop if main, the package snapshot or other pinned conditions change.
6. Before merging, read-only verify Pages is not independently configured to deploy from main; stop for separate settings authorization if it is. The owner reviews and decides whether to merge PR #7. No publication or deployment is authorized. Verify the resulting main contains 42 drafts, zero decisions and zero published catalog entries.
7. Prepare a separately reviewed cleanup PR removing the migration hook, helper and active JSON manifest. Retain this historical explanation and adjust the migration tests to assert normal rejection/no remaining exception. Do not delete unrelated moderation tests. The live-state expiry is effective before cleanup; cleanup must not be relied upon for safety.

## Local validation and limits

Run formatting, lint, root/web TypeScript, the full unit/integration suite, contribution/moderation/founding/release checks, portability, licensing, deterministic evaluation replay, skill/catalog/link checks, diagnostic production builds, local npm packaging, artifact checks and Playwright on another port. Exact execution results are recorded in [implementation status](../IMPLEMENTATION_STATUS.md); no unexecuted checks are passes.

Tests model the exact merge graph over real pinned read-only Git objects, with temporary copied skill files and mocked GitHub responses. Subprocess cases verify successful admission and nonzero replay rejection; actual moderation CLI cases preserve ordinary success and reject unrelated source-addition PRs. Fixtures do not create real Git commits, approvals, reviews or remote state. An actual successful hosted migration cannot be claimed before the owner commits and GitHub validates PR #7. No paid API, service, browser download or automatic deployment is introduced.

## Commands for the owner after review

These instructions do not grant push, merge or release permission. First confirm the current branch is fix/pr7-historical-draft-baseline and HEAD still descends from the pinned snapshot. Stage only the approved scope, inspect every new file in the staged diff, and commit locally using your verified identity:

```sh
git status --short
git merge-base --is-ancestor cd221b2a49579045ecede39942d4d15c44f67c72 HEAD
git diff --check
git add -- scripts/check-moderation.ts scripts/migrations/pr7-historical-drafts.ts scripts/migrations/pr7-historical-drafts.json tests/historical-draft-baseline.test.ts docs/migrations/PR7_HISTORICAL_DRAFT_BASELINE.md docs/IMPLEMENTATION_STATUS.md CHANGELOG.md
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "fix: admit pinned historical drafts for PR 7"
```

Stop if unrelated files, stale pins or identity problems appear. A later owner-approved normal push/PR into develop may trigger CI and must stay within verified $0 spending controls. Do not force-push, manually dispatch/rerun workflows, merge failed checks, or import the old deployment workflow. Cleanup is a separate owner-approved change after the synchronization, not part of these commands.
