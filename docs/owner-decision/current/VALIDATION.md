# Integration readiness follow-up — unsigned validation receipt

Local checks rerun after path cleanup on 2026-11-11 in the isolated integration branch, using macOS, Node 22.23.4 and pnpm 10.20.0. This receipt grants no approval or release action. It is excluded from the source snapshot so observed final results can be recorded after preparation. The original parent receipt and the previous refreshed receipt are preserved unchanged.

## Checks rerun for this revision

| Command or check | Observed result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm format:check` | PASS |
| `pnpm typecheck` | PASS, root and web |
| `pnpm test` | PASS, 379 tests across 18 files, including all 11 owner-package regressions |
| `pnpm validate:skills` | PASS, all 42 drafts |
| `pnpm catalog:check` | PASS |
| `pnpm catalog:check-assets` | PASS |
| `pnpm moderation:check` | PASS, zero recorded decisions |
| `pnpm contributions:check` | PASS |
| `pnpm licensing:check` | PASS, inventory consistency; genuine rights questions remain unresolved |
| `pnpm licensing:artifacts` | PASS, existing local artifacts |
| `pnpm founding:check` | PASS |
| `pnpm release:check` | PASS |
| `pnpm owner:prepare` and `pnpm owner:check` | PASS, separate unsigned current packet |
| Repeat preparation and freshness | PASS, deterministic generated file bytes; preserved worksheets not overwritten |
| `pnpm check:links` | PASS, local file links only; external URLs and anchors not fetched |
| `git diff --check` | PASS |
| Proposed commit scope and sensitive/path scan | PASS, exactly 23 intended files; no actual machine-local paths, credential-pattern matches, logs or backup directories |
| Original parent owner packet | PASS, seven files byte-identical to the preservation snapshot |
| Previous refreshed packet archive | PASS, all seven files retained with verified SHA-256 in an ignored, uniquely named local archive |
| Original development content | PASS, tracked/untracked/ignored source content matches the preservation manifest |
| Complete preservation snapshot | PASS, all 48,986 entries still match its manifest |
| Original Git metadata | Bookkeeping differs: 22 unchanged Git objects have updated mtimes; six added and six removed Codex capture/checkpoint paths at the observed comparison; branch/index/config unchanged |
| Protected baseline paths | PASS, skills, catalog, review/approval ledgers, workflows, application, packages, active inventory and lockfile unchanged |
| Original server | Existing PID 9302 still listens on port 5173; not stopped or modified |

The sensitive/path scan covers all 23 proposed files, including JSON-embedded instructions. Public repository URLs and the existing maintainer handle are intentional attribution/configuration, not local usernames or fabricated reviewers. Synthetic Windows traversal paths in the existing safety regression are deliberate test data. No actual user-home, local temporary-directory or credential-pattern finding remains. This is a bounded pattern scan, not a complete independent secrets audit.

## Refreshed evidence

Current source snapshot SHA-256: `5757f7c32f1b6b12a45e95b12371479c10322df6994085eb2a7f8dc7c0ba9a7f`. The unsigned manifest binds 641 source files and the same 150 observed artifact files. Compared with the preserved previous refreshed packet, only the source snapshot changes in generated evidence; shortlisted skills, package hashes and observed artifacts remain identical. The validation receipt is updated separately. Baseline `24dc135a95a8fd4e65a37c3de727c9057735af95` remains an ancestor; it is not an attested clean build commit.

Nine active notice cases remain active. `keyv@4.5.4` and `stackback@0.0.2` remain historical-only, absent from the active inventory, current lockfile headings and observed distribution. The runtime `react-remove-scroll-bar@2.3.8` provenance question remains explicit. All skill decisions, dependency dispositions, named reviewers, dates, signatures and release authorizations are blank. All 42 skills are drafts, with zero approvals and zero published skills.

The previous refreshed packet is archived under the integration checkout's ignored `.open-skill-kit/owner-evidence-preservation/` area with its per-file SHA-256 manifest. It is not proposed commit content. The seven original parent worksheets have not been rewritten. Any later source/artifact edit invalidates the packet and requires deliberate preservation and refresh; regenerating refuses to overwrite changed worksheets.

## Prior evidence reused

The preceding integration run passed 22 Playwright/accessibility tests on port 5184 in 36.2 seconds, production build, local npm packing, portability checks and 20 deterministic fixture suites / 40 comparisons. These are prior results, not new executions in this follow-up. No application, dependency or skill changes were made, and this revision rechecks catalog assets and licensing against byte-identical existing artifacts. No browser download, build, real-agent call or native Linux/Windows execution is newly claimed. The online dependency advisory audit was not run.

The snapshot remains fully intact. The original development content is unchanged, but its whole Git directory is not byte-identical because of the Codex bookkeeping described in the [integration report](../../MARKETPLACE_V1_INTEGRATION.md). Object bytes and validated object IDs match; timestamp updates are consistent with object freshening during internal captures. No independent process audit establishes the exact writer, and no metadata was restored or rewritten. No unexplained source-content differences were found.

No remaining local readiness-check failure was observed. Genuine owner/content/provenance and separately authorized release actions remain release blockers. Nothing in this receipt grants those approvals. No commit, push, PR, merge, rebase, workflow run, remote setting/billing change, paid service, deployment or publication was performed.
