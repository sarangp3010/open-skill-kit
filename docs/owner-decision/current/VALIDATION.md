# PR #4 local validation — unsigned receipt

Observed 2026-11-12 on macOS, Node 22.23.4 / pnpm 10.20.0. Baseline e869c81e6bf47e7d741ca974b3af957271c4efc4 contains merged PR #3; development remains on development/marketplace-v1-release-controls. Source checks/builds use the existing validated isolated 395-record installation, with no dependency installation or canonical regeneration. Owner generation/freshness runs in the original checkout against byte-matching isolated diagnostic artifacts. HEAD is a baseline observation, not an attestation that dirty source/artifacts came from a clean commit.

## Checks executed for this revision

| Command | Observed result |
| --- | --- |
| `pnpm exec vitest run tests/release-license-gate.test.ts tests/npm-cli.test.ts` | PASS, 30 tests |
| `pnpm test` | PASS, 431 tests / 19 files, 5.87 seconds; no skipped tests or relaxed existing limits |
| `pnpm typecheck` | PASS, root and web |
| `pnpm lint` | PASS |
| `pnpm format:check` | PASS |
| `pnpm portability:check` | PASS on this host only |
| `pnpm licensing:check` | PASS, isolated validated dependencies |
| `pnpm contributions:check` | PASS |
| `pnpm moderation:check` | PASS, zero actual decisions/attributions |
| `pnpm founding:check` | PASS |
| `pnpm release:check` | PASS, review report consistency, not release clearance |
| `pnpm validate:skills` | PASS, all 42 drafts; existing duplicate/reference validation included |
| `pnpm check:links` | PASS; rerun after this receipt was restored |
| `pnpm catalog:check` | PASS |
| `pnpm evaluate:fixtures` | PASS, 20 suites / 40 deterministic replay comparisons; not real-agent evidence |
| `pnpm build:marketplace` | PASS, zero approved static downloads |
| `pnpm build` | PASS, local diagnostic browser build with limitations disclosed |
| `pnpm catalog:check-assets` | PASS |
| `pnpm pack:npm` | PASS, local private diagnostic package, zero skills; no registry upload |
| `pnpm licensing:artifacts` | PASS, notice/artifact integrity, not legal clearance |
| `CI=true PLAYWRIGHT_PORT=5187 pnpm test:e2e` | PASS, all 22 browser/accessibility cases in 36.1 seconds; existing Chromium, no browser download |
| `OPEN_SKILL_KIT_RELEASE_BUILD=1 pnpm --filter @osh/web exec vite build --outDir ../../.open-skill-kit/rejected-web-release` | EXPECTED REJECTION, exit 1: react-remove-scroll-bar@2.3.8 unresolved provenance and differing sourceVersion 2.3.7 |
| `pnpm exec tsx scripts/build-npm.ts --release` | EXPECTED REJECTION, exit 1: no reviewed published skill; the independent one-approved-skill test separately proves licensing rejection |
| `node --import tsx scripts/owner-decision-package.ts` / `--check` | PASS in original checkout; repeated prepare/check reproduces all six generated files byte-for-byte |
| `git diff --check` | PASS |

The rejected browser build writes no index.html or JavaScript bundle. Vite copies three existing public files (_redirects, catalog.json and published.json) into its separate ignored scratch directory before its generateBundle preflight fails; this incomplete diagnostic directory is not an authorized release. Npm release preflight fails before output writes. Ordinary npm output is private and its generated publication guard rejects diagnostic artifacts. Tests also exercise sufficient ordinary packaged notices, missing/changed/invalid evidence, empty/whitespace/binary notices, independent valid publication authorization and license-file tampering. No limitation note, manifest declaration or matching hash is accepted as a waiver.

The original installation's read-only `node --import tsx scripts/audit-provenance.ts --check` remains an EXPECTED exit 1: 67 extra records, zero missing records, zero changed retained manifest/notice/version evidence and unchanged source fields; its unresolved-notice scope also differs because it retains obsolete historical records. It was preserved rather than normalized or used to regenerate canonical evidence. No claim is made that the original obsolete installation passes licensing validation.

## Preservation and reproducibility

All seven previous current-packet files and all seven original parent-packet files were checked against committed bytes and archived with verified per-file SHA-256 hashes in the ignored `.open-skill-kit/owner-evidence-preservation/pr4-20261112T115852561176/` area before refresh. Earlier ignored artifacts were retained there before copying fresh isolated diagnostic outputs; copied files were compared byte-for-byte. No owner-authored content was overwritten. The original seven parent files, current skill-decision worksheet and current release-authorization worksheet retain their reviewed bytes. Only the current baseline README, unsigned manifest and this receipt change.

Current source snapshot SHA-256: `c77c3cbe17ec5873016f1b404aa4b2b53e4a7b31117ed5e125dbdb49007be5d4`; 644 source files and 156 artifact references. Freshness includes newly added source, preserved original worksheets and observed output hashes; this mutable receipt is excluded by the existing generator. Repeated preparation does not alter bytes and cannot populate decisions, reviewers, review dates, signatures or authorization. All authorization values remain null/unsigned, all 42 skills are drafts, approvals and publications remain zero.

Canonical inventory remains unchanged: nine active unresolved notice cases, with keyv@4.5.4 and stackback@0.0.2 retained only as historical evidence. The real 2.3.7-source notice for react-remove-scroll-bar@2.3.8 remains human-confirmation-required. No dependency, lockfile, skill content, approval/publication ledger, trusted roster, workflow, remote setting or owner decision was changed.

## Remaining limitations

Genuine exact-release runtime notice provenance, ownership/consent/domain review, independent authorized approvals, confidential reporting/settings confirmation and explicit release authorization remain human blockers. Unbundled development/native tooling requires evidence if redistributed. The preflight is a strict negative technical check, not legal clearance or a new licensing approval model. A maintainer able to edit source or manually upload diagnostic files can bypass procedure; no automatic upload path exists.

The online advisory audit, new hosted Linux/Windows validation and real-agent execution were not run. No native cross-platform or agent-effectiveness results are fabricated. The existing Vite PID 9302 on port 5173 remains running; only the separate test server was used. No paid services, remote Git operations, Actions runs, staging, commits, pushes, PRs, merge, deployments, publication or settings/billing changes occurred. This receipt grants no authority.

## Exact proposed PR #4 file scope

| File | Purpose |
| --- | --- |
| `CHANGELOG.md` | Release notes for attribution and license boundaries. |
| `apps/web/src/components/contributor-attribution.tsx` | Distinguish recorded attribution from independent identity/rights proof. |
| `apps/web/vite.config.ts` | Run shared provenance gate in explicit browser release builds. |
| `docs/IMPLEMENTATION_STATUS.md` | Record implementation and executed validation without release authorization. |
| `docs/PR4_IMPLEMENTATION_REPORT.md` | Explain trust boundaries, results and remaining blockers. |
| `docs/attributions/README.md` | Document existing roster and independent review requirements. |
| `docs/npm-distribution.md` | Explain private diagnostic packages and explicit licensed release preparation. |
| `docs/owner-decision/current/README.md` | Refresh observed merged baseline only. |
| `docs/owner-decision/current/VALIDATION.md` | Record this local execution and preservation receipt. |
| `docs/owner-decision/current/release-manifest.unsigned.json` | Refresh unsigned source/artifact observations only. |
| `docs/releases.md` | Document strict negative release preflight and remaining human authority. |
| `packages/catalog-indexer/src/attributions.ts` | Enforce existing maintainer authorization and valid dates. |
| `packages/catalog-indexer/src/index.ts` | Require attribution options to match authorized recorded evidence. |
| `scripts/build-npm.ts` | Preflight before release writes; private diagnostic artifacts; retain integrity guard. |
| `scripts/check-moderation.ts` | Bind attribution to its PR and genuine independent current-head reviews. |
| `scripts/release-license-gate.ts` | Shared reject-only canonical and actual-notice provenance preflight. |
| `scripts/third-party-notices.ts` | Validate declared versions/limitations and expose package locations to the gate. |
| `tests/community.test.ts` | Regress authorization, date, PR review and override evidence failures. |
| `tests/marketplace.test.tsx` | Assert attribution evidence limitations in the UI. |
| `tests/npm-cli.test.ts` | Exercise release mode and detect post-build notice tampering. |
| `tests/release-license-gate.test.ts` | Exercise licensing independently, including valid publication authorization. |

Final review: no blocking correctness/security finding in the proposed diff. Existing publication-to-main enforcement and trusted-base review sources are preserved. Only the 21 intended files appear, nothing is staged, and scans of added content found no secrets, machine-local paths, backup files or temporary artifacts. A broad full-file path scan also matched a pre-existing generic /home/auth-directory sentence in historical status documentation; it is unchanged and is not a new machine path.
