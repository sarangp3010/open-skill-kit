# Marketplace V1 — isolated local integration

## Preservation and baseline

The original development checkout remains on `development/marketplace-v1` at `2799067a6a68680cbdc5ad514c1263ad9ce7866f`. Its six tracked edits and nine untracked files implement unsigned owner decision tooling and paperwork; there were no new React source edits in that development diff. Existing ignored dependencies, builds, reports and the separate CI clone were also retained. The original Vite server on port 5173 was not stopped or changed. Preservation applies to development content; subsequent Codex Git bookkeeping differences are described below.

The complete preservation snapshot is retained outside the repository and is not commit content. Within that snapshot, `checkout/` contains the original tree, and adjacent `manifest.json` and `VERIFIED.json` record the successful pre-integration comparison: 48,986 entries, 38,510 regular files, 2,846 symlinks, 7,630 directories and 543,125,787 regular-file bytes. Content SHA-256, file modes/mtime/size, symlink targets and tree membership matched the original before and after copying. Regular files have independent inodes. macOS ditto preserved resource metadata, extended attributes and ACLs; these were not separately cryptographically inventoried. Manifest SHA-256: `72e41c2e19a8af09639a3b28f4fd92cd2c0adafacb99f7bbd53476debdabda14`.

All repository-relative paths in this report start at the isolated integration checkout root. Branch: `integration/marketplace-v1-24dc135-20261111T141607-0500`. Baseline: `24dc135a95a8fd4e65a37c3de727c9057735af95`. It was cloned without hardlinks from the preserved donor, avoiding worktree-registration writes in the original repository. No merge, rebase or new commit was performed. Dependencies were installed offline with the existing frozen lockfile and no lifecycle scripts.

## Follow-up preservation investigation

The original tracked, untracked and ignored development content still matches the verified preservation manifest, including all seven original owner packet files. The preservation snapshot itself remains fully unchanged. The original Git branch ref, HEAD, index and config are unchanged. The original checkout as a whole is **not** byte-identical in Git metadata: the follow-up comparison found 22 existing loose-object timestamp changes, six added paths and six removed paths under `.git/refs/codex/turn-diffs/`, counting directories as well as ref files.

The changed namespace belongs to Codex turn-diff captures/checkpoints. All existing Git object bytes still match the snapshot and their decompressed object IDs validate. Timestamp-only object changes are consistent with Git object freshening during snapshot bookkeeping; they do not change blob/commit contents. This identifies the affected metadata and its role, not an independently audited process attribution. No source, branch/index/config or other unexplained content difference was found. No attempt was made to restore or rewrite metadata, and no Git mutation command was run in the original checkout. Future tool sessions may update this internal bookkeeping again.

Before correcting machine-local documentation references, all seven refreshed packet files were retained byte-for-byte in a uniquely named directory under the integration checkout's ignored `.open-skill-kit/owner-evidence-preservation/` area. Its local manifest records each file SHA-256 and successful verification. The archive and its machine-local location are excluded from the proposed commit. The seven original parent worksheets remain untouched; only the separately refreshed current packet is regenerated.

## Transfer and conflict resolutions

- `README.md`: retain the merged CI architecture and verification evidence; add the owner tooling entry point, pointing at the separate refreshed packet and linking the unchanged historical packet.
- `IMPLEMENTATION_STATUS.md`: retain merged development/CI history, label the original owner preparation as historical, and append the isolated integration status.
- `launch/GITHUB_SETTINGS.md`: retain hosted CI evidence and the existing develop ruleset instructions, add the original private/free-plan and confidential-reporting walkthrough, and replace obsolete automatic Pages deployment descriptions. Distinguish historical API observations from the owner's independently reported strict develop rule. No remote settings were inspected or changed during integration.
- Preserve the original `.github/CODEOWNERS`, `.prettierignore`, owner package commands, generator, regression tests and all seven original owner packet files. Extend the transferred tool/tests only as necessary for the merged baseline and separate output directory.

## Owner package compatibility

The [refreshed packet](owner-decision/current/README.md) is written under `owner-decision/current/`. The seven original files in its parent remain byte-for-byte unchanged, including original worksheets, evidence and validation history. Historical automatic-deployment statements in those immutable records are not current operational guidance.

The merged provenance inventory contains nine active missing-notice cases. Retain all original eleven review cases, classifying `keyv@4.5.4` and `stackback@0.0.2` as historical-only, never as installed/locked/distributed current dependencies. Pin their original evidence JSON SHA-256 and record its reference. The remaining active scope must match exactly; changed scope, altered history or restored obsolete versions fails closed. `react-remove-scroll-bar@2.3.8` remains an unresolved runtime notice case; historical 2.3.7 evidence is not converted into exact-release provenance.

Fresh source, bundle and tarball hashes come from this isolated checkout's actual bytes. The manifest records the observed baseline, not an attested clean build commit. Freshness requires that baseline to remain an ancestor and source/artifact bytes to match; a future commit alone does not invalidate identical bytes. Content edits invalidate the packet. Regeneration refuses to overwrite changed worksheets. No importer treats this paperwork as publication approval.

All skill decisions, reviewers, dates, signatures, dependency dispositions and release action authorizations remain blank. The original skill sources, exact skill hashes, publication ledgers, CI workflows, lockfile and dependency versions remain unchanged from merged develop. All 42 skills remain drafts with zero actual publication approvals.

## Local validation and next step

Observed successful checks: lint, formatting, root/web TypeScript, 379 unit/integration tests across 18 files (including eleven owner regressions), portability, licensing inventory, contributions, moderation, founding/release freshness, deterministic fixture evaluations, all source skill and duplicate checks, catalog freshness, marketplace/web build, public asset checks, local npm packing and artifact licensing. Full logs are local temporary files, not repository content.

See the [integration validation receipt](owner-decision/current/VALIDATION.md) for checks rerun after path cleanup and separately identified prior full-suite/browser results. Browser checks use port 5184 and installed local Chromium; no downloads or real-agent calls are part of this work. The external vulnerability advisory audit and hosted/native cross-platform runs are not newly claimed. No GitHub API, billing, Actions or other remote service was used.

Remaining release blockers are genuine owner/provenance/content decisions, any required real platform/domain evidence, and separately authorized remote configuration/release actions. The original task's unfinished owner approvals remain deliberately unfinished. Recommended next step: owner review of the refreshed twelve-candidate packet and this isolated diff, followed by separate authorization for any commit. No commit, push, publication, deployment, PR or GitHub setting change is authorized or performed by this integration.
