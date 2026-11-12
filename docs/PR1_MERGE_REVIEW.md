# PR #1 merge-readiness review — 2026-11-11

This is an assistant review and local documentation cleanup, not a maintainer approval, GitHub review event, merge authorization or release decision. No CI implementation was changed during this review. All documentation edits remain uncommitted and are not yet part of the remote PR.

## Scope and verified evidence

Reviewed all **17 changed files** between develop `2799067a6a68680cbdc5ad514c1263ad9ce7866f` and PR head `48951e86e5c6d3411a41da63caf10d413a34025c`, checking the live PR metadata/complete patch and local three-dot diff. PR #1 remains open, Draft, author sarangp3010, mergeable, unmerged, with eight commits and no submitted GitHub reviews. The head and base were unchanged at inspection.

- [CI 43050871016](https://github.com/sarangp3010/open-skill-kit/actions/runs/43050871016): checks, e2e and validate all succeeded on attempt 1. **368 unit/integration tests across 17 files; 22 Playwright/accessibility cases**. The exact image, Linux container startup and Node/pnpm execution are now exercised; the successful run took approximately 4m27s.
- [Dependency security 43050871139](https://github.com/sarangp3010/open-skill-kit/actions/runs/43050871139): audit succeeded. No new advisory query was needed for this documentation review.
- Native portability was skipped under the existing private-repository condition. This is not Windows/macOS execution evidence.
- All 42 skill packages, canonical catalog, actual publication ledger, maintainer roster, dependency manifests and lockfile are unchanged by the PR. All skills remain drafts and the real decision list is empty. No content approval, effectiveness, provenance clearance or real-agent test is inferred from CI.

The source changes are coherent with the CI/release-safety purpose; no unrelated product feature or skill change was found. No new failing-code or exploitable publication-bypass blocker was found. The following distinction matters: this head is technically green, but develop does not enforce the intended required-CI policy.

## Blockers / owner decisions before calling the merge protected

**B1 — develop does not require validate.** Read-only inspection of [Protect Develop Branch](https://github.com/sarangp3010/open-skill-kit/rules/26980031), including the effective branch rules, found no required_status_checks rule. A successful validate check exists but is advisory for this PR's target branch. This is a pre-existing repository-policy gap, not a regression caused by the renamed job graph. If required-CI enforcement is a merge criterion, hold until the owner separately approves/configures it. Green checks alone must not be described as enforced protection.

Exact proposed owner-only addition to ruleset 26980031, preserving all existing rules, conditions and bypass settings:

```json
{
  "type": "required_status_checks",
  "parameters": {
    "strict_required_status_checks_policy": true,
    "do_not_enforce_on_create": false,
    "required_status_checks": [
      { "context": "validate", "integration_id": 15368 }
    ]
  }
}
```

No settings request was sent. The existing rulesets are active; no new plan, paid feature or visibility change is proposed. Draft status and absent maintainer approval remain owner-controlled procedural steps, not permission for this assistant to mark ready or merge. Existing launch/provenance/content approval blockers remain release blockers, separate from this CI-only PR.

## Recommended improvements

**R1 — generic independent review is not enforced.** Both active rulesets require zero approving reviews and disable Code Owner review, stale-review dismissal and latest-push approval. Both have an empty bypass list and report current_user_can_bypass=never. Thus these are actual review-policy gaps, not an administrator bypass discovered here. The script still requires a genuine authorized main-targeting exact-head review when publication decisions exist; generic PR review requirements do not replace that check.

Proposed owner policy, only with genuine reviewer capacity: require at least one independent review, Code Owner review, stale-review dismissal and latest-push approval. A sole owner listed as Code Owner cannot independently approve their own promotion PR. Establish legitimate reviewer/ownership coverage before enabling an unsatisfiable requirement; do not fabricate identities/approvals or purchase a feature. Nothing was changed.

**R2 — Docker socket presence requires honest boundaries, not an untested workaround.** The successful e2e log's docker create command bind-mounts `/var/run/docker.sock` despite no explicit YAML socket volume. Runner **2.338.2** adds this for job containers; [its version-specific source](https://github.com/actions/runner/blob/v2.338.2/src/Runner.Worker/Container/ContainerInfo.cs) confirms the default. Docker explains that daemon control can permit unrestricted host filesystem access in [its security guide](https://docs.docker.com/engine/security/).

The workflow requests UID 1001; the completed run did not record socket mode/group or test access. Presence is proven; accessibility, exploitability, denial and secret exfiltration are not. The YAML regression only rejects explicit privileged options/socket references; it does not inspect runner-injected mounts. Do not claim that non-root execution or a passing browser suite certifies isolation.

**Hardening verdict:** no immediate passing-workflow change is necessary solely on socket-presence evidence for this disposable, standard GitHub-hosted, read-only job design without configured repository/environment secrets. The VM is the boundary; GitHub documents its ephemeral isolation in [secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use). There are no persistent/self-hosted runners, production secrets, write/publish/deploy tokens, cache exchanges or privileged downstream artifact consumers. Keep those constraints. Socket access on a persistent/secret-bearing runner would require a different assessment. This is not a complete security certification.

Optional diagnostics in a future separately authorized run could print id, socket ownership/mode and the result of test -w without contacting the daemon. If owner policy requires denial of Docker access, verify an execution model without socket sharing before adopting it. No chmod, sudo escalation, mount override, container experiment, diagnostic workflow change or new run was performed here.

**R3 — audit is successful but not required by either ruleset.** Main requires only validate; develop requires no checks. An owner-approved future rule can add context audit from app 15368 to both branches if advisory success must block merges. Do not require skipped native jobs as evidence in this private repository. No audit check or current protection was removed by the PR.

**R4 — ledger comparison has a pre-existing serialization edge case.** scripts/check-moderation.ts compares JSON.stringify(previous.decisions) and per-record strings, while the previous ledger is raw JSON and the current ledger is schema-parsed. Zod emits fields in schema order. A pure in-memory withdrawn fixture with unchanged semantic values but reviewer first in the raw object reproduced rejection on develop (must target main) and on an unrelated main PR (changed decisions must reference this PR). Schema-normalizing both values proved they were equal. No approval or file was created. The per-record JSON-string comparison already exists in the base branch; the new develop guard inherits the same sensitivity. The empty current ledger is unaffected, so this is a pre-publication availability issue, not an approval bypass or a failed current check.

Exact proposed follow-up: schema-validate/normalize both previous and current registries before comparison, preserving invalid-input rejection and genuine decision-change/main/current-PR/history rules. Add regressions for unchanged reordered JSON keys surviving unrelated main/develop validation, while changed reviewer/digest/decision/PR and deleted history still fail correctly. Current tests pass the same already-normalized object as both arguments for historical decisions, so they do not exercise the raw-base/schema-output distinction. No implementation fix was made in this review.

**R5 — review-routing coverage can be extended.** Existing CODEOWNERS covers workflows, moderation scripts, ledgers and provenance, but not all test/root test-configuration files. Proposed lines, after owner review, are:

```text
/tests/ @sarangp3010
/playwright.config.ts @sarangp3010
/vitest.config.ts @sarangp3010
```

These are routing proposals, not independent-review enforcement, and do not resolve R1. Neither CODEOWNERS nor reviewer registries were changed.

## Required-check and publication compatibility

| Observation                                       | develop                                                                         | main                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| Ruleset                                           | 26980031, active                                                                | 26979060, active; default branch main       |
| Required status checks                            | None                                                                            | validate / integration 15368, strict        |
| Matching head check                               | validate passed from app 15368                                                  | Same name/provider retained by the new gate |
| Required approving reviews                        | 0                                                                               | 0                                           |
| Code Owner / stale dismissal / last-push approval | Disabled                                                                        | Disabled                                    |
| Bypass actors                                     | None                                                                            | None                                        |
| Other rules                                       | PR, resolved conversations, squash-only, linear history; no deletion/force push | Same                                        |

Classic branch-protection GETs returned 404, while branch metadata marks protected and effective rules list active rulesets. This is compatible with ruleset-based protection; it is not evidence of absent protections. Ruleset details/effective rules were read, not edited. The passing validate check is associated with GitHub Actions app 15368 on the exact PR head, matching main's existing requirement. No required-check rename is needed.

Publication decision changes still require target main and this PR's identity. Trusted-base maintainer authorization, independent current-head GitHub review, authorized historical merge, exact package/review/evidence hashes and fail-closed stale/revoked receipts remain. Empty/unchanged develop ledgers can validate. No automatic Pages deployment or package/skill publication exists. PRs changing approval policy/code still need human review; a green workflow cannot certify its own policy against a malicious trusted writer.

## Complete 17-file review

| File                                  | Review conclusion                                                                                                                                                                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| .github/workflows/ci.yml              | Main/develop validation; no Pages deployment; checks/e2e/fail-closed validate; standard runners, pinned image/actions, bounded jobs and read-only permissions. No implementation change needed by this review.                                                                                |
| .github/workflows/security.yml        | Same advisory audit, pinned Linux host, target filters and cancellation; weekly schedule retained; no paid security action.                                                                                                                                                                   |
| CONTRIBUTING.md                       | Architecture link in scope; wording refreshed locally from proposal/pending Linux to successful evidence.                                                                                                                                                                                     |
| README.md                             | Same documentation cleanup; no product/skill behavior change.                                                                                                                                                                                                                                 |
| docs/CI_ARCHITECTURE.md               | Architecture/evidence in scope; stale uncommitted/unverified-Linux and socket-absence implications corrected locally.                                                                                                                                                                         |
| docs/CI_PR1_VALIDATION.md             | Historical investigation in scope; current-status banner and hosted outcome distinguish old failures and local-only stages.                                                                                                                                                                   |
| docs/IMPLEMENTATION_STATUS.md         | Actual validation history retained; current status and review observations added; historical local-only entries clearly scoped.                                                                                                                                                               |
| docs/community-readiness.md           | Correct removal of deployment claims; current checks and policy observations refreshed locally.                                                                                                                                                                                               |
| docs/launch/CHECKLIST.md              | Release still blocked; no automatic deployment restored. CI success and review-policy gaps clarified locally.                                                                                                                                                                                 |
| docs/launch/GITHUB_SETTINGS.md        | Guidance separated from read-only observed ruleset/check facts; socket boundaries corrected locally.                                                                                                                                                                                          |
| docs/launch/PROVENANCE_INVENTORY.json | 67 obsolete versions removed, zero added, retained records byte-equivalent as data; only dependencies and unresolvedDependencyNotices fields differ. Old keyv/stackback notice cases disappear with absent versions. Skill hashes/rights/evidence unchanged; no provenance approval invented. |
| playwright.config.ts                  | Fixed local port validation, CI focused-test prevention, zero retries and suite limit; no relaxed individual assertions/timeouts.                                                                                                                                                             |
| scripts/check-moderation.ts           | Narrow main-only decision change guard plus existing GitHub evidence checks preserved. Serialization edge R4 noted; no unsafe authorization regression found.                                                                                                                                 |
| tests/community.test.ts               | Actual gate executed for all sixteen result combinations; retained commands/permissions/action and image/version invariants. Runtime socket access not covered; not a blocker by itself.                                                                                                      |
| tests/founding-review.test.ts         | Copies inputs rather than generated artifacts; retains all freshness/ledger/content assertions. Explicit 20-second budget is limited to five full 42-package integration passes, not a global timeout increase.                                                                               |
| tests/moderated-submissions.test.ts   | Main/develop/history/authorization regressions added; R4 is a missing nonempty raw-ledger normalization case.                                                                                                                                                                                 |
| tests/release-readiness.test.ts       | Removes duplicate scans and isolates operations; preserves all 42 hashes and ledger/attribution/draft invariants with unchanged default timeouts.                                                                                                                                             |

## Documentation cleanup made locally

Updated current status in CI_ARCHITECTURE.md, CI_PR1_VALIDATION.md, IMPLEMENTATION_STATUS.md, community-readiness.md, launch/GITHUB_SETTINGS.md, launch/CHECKLIST.md, launch/UNRESOLVED_BLOCKERS.md, README.md and CONTRIBUTING.md. The separate hyphenated implementation-status.md remains a historical foundation record and now points to the current hosted evidence rather than appearing to leave hosted acceptance permanently open. Earlier stage results were not rewritten as if Linux verification or commits existed at that time. This report records the complete file review and exact proposals. The passing workflows, scripts, tests, manifests, skill files, ledgers and provenance inventory are unchanged by this follow-up.

## Validation and remaining authorization

Relevant local formatting, documentation links, workflow/moderation/release-readiness regressions, founding/owner summaries and catalog/skill/reference checks are run for this documentation-only follow-up. Exact completed results are recorded below; no new GitHub run or full-platform/security certification is implied. Existing successful head evidence remains the two linked runs; any future documentation commit would be a new head and need fresh validation after separately approved push.

No commit, push, merge, approval record, ready-for-review change, workflow dispatch/rerun, deployment, publication, billing, branch-protection or repository-setting mutation was performed. The owner-reported $0 budget remains untouched. The original working tree's separate owner-decision work remains preserved.

### Completed local checks

All checks passed using the existing Node 22.23.4/pnpm 10.20.0 installation in offline mode:

- pnpm format:check and pnpm check:links.
- Focused Vitest: community, moderated-submissions and release-readiness — **40 tests across 3 files**.
- pnpm founding:check, pnpm release:check, pnpm catalog:check, pnpm validate:skills, pnpm moderation:check and pnpm check:duplicates.
- git diff --check and a tracked-path check confirming that only Markdown documentation differs from the passing head. All actual source/catalog/approval files remain unchanged.

The pure in-memory R4 reproduction produced the documented false rejections; it was not an approval creation, a failing added test or a changed gate. No full browser/build/advisory suite was repeated for Markdown-only edits; the exact successful remote head retains the linked complete CI evidence. Formatting/local-link checks were repeated after the final report edits.

## Final documentation-only commit preparation

Prepared for owner review; no staging, commit or push is authorized by this preparation. Proposed single commit message:

```text
docs: reconcile verified CI evidence and develop ruleset guidance
```

Exact proposed path manifest (eleven Markdown files, including this new report):

```text
CONTRIBUTING.md
README.md
docs/CI_ARCHITECTURE.md
docs/CI_PR1_VALIDATION.md
docs/IMPLEMENTATION_STATUS.md
docs/PR1_MERGE_REVIEW.md
docs/community-readiness.md
docs/implementation-status.md
docs/launch/CHECKLIST.md
docs/launch/GITHUB_SETTINGS.md
docs/launch/UNRESOLVED_BLOCKERS.md
```

The proposed contents reconcile verified Linux/commit evidence, distinguish historical local-only stages, correct stale inventory counts without changing the inventory, report the actual ruleset/security findings, and provide [the exact existing-develop-ruleset edit procedure](launch/GITHUB_SETTINGS.md). No runtime or CI implementation, dependency, skill, approval, secret, generated catalog, log or temporary artifact belongs in this commit. The original working tree's separate owner-decision changes are excluded.

Final read-only recheck confirmed validate completed/success on PR #1 head 48951e8 from GitHub Actions app 15368. Develop remains at 2799067 and is an ancestor of that head. Existing ruleset 26980031 still requires no status checks; the proposed edit is not an applied setting. Strict checking would require an up-to-date branch and successful required validation; later base/head changes may require a separately approved update/push/new CI. The current PR remains Draft and merge authorization is withheld. No settings edit, dispatch, rerun, billing change or remote mutation was performed.

Remaining readiness items: owner application/verification of the narrowly specified develop rule; approval before any documentation commit or push; successful validation on any future pushed head; and an explicit later decision to leave Draft/merge. Independent-review/audit enforcement and the pre-existing nonempty-ledger comparison case remain separate recommendations/pre-publication follow-ups, not implementation edits in this preparation. Release/provenance/content approvals are still outstanding and are not granted by CI-only readiness.
